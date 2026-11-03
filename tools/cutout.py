"""Cut garments out of model photos and repair them so they look whole.

usage: repair.py <photos_dir> <out_dir> <id>...
Writes <out_dir>/<id>.webp (garment only, transparent elsewhere), <id>-swatch.jpg
and <id>-debug.jpg (magenta = filled-in cloth, for inspection).

Segmentation is rembg's u2net_cloth_seg run directly. Then hands, arms and
stray bits are removed, the silhouette is closed and smoothed (optionally
mirrored, for front-on shots), and every gap left behind is filled with real
cloth copied block by block from elsewhere on the same garment.
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
import onnxruntime as ort
from scipy import ndimage

photos, out = Path(sys.argv[1]), Path(sys.argv[2])
out.mkdir(parents=True, exist_ok=True)
MODEL = Path(__file__).parent / "model" / "u2net_cloth_seg.onnx"
session = ort.InferenceSession(str(MODEL), providers=["CPUExecutionProvider"])

# per photo: crop (x0, y0, x1, y1 fractions), erase boxes (fractions of the crop),
# mirror (fraction of the crop width where the garment's centre line is, for front-on
# shots), close (gap-closing radius as a fraction of garment width), skin (remove hands)
CFG = {
    "14764328": dict(crop=(0.25, 0.22, 0.8, 0.65), close=0.04, skin=False, dark=True, erase=[(0.0, 0.0, 1.0, 0.24)]),
    "18250133": dict(close=0.06),
    "25907202": dict(crop=(0.3, 0.2, 0.9, 0.85), close=0.04, skin=False, mirror=(0.0, 0.33), erase=[(0.0, 0.0, 0.42, 0.1), (0.6, 0.0, 1.0, 0.06)]),
    "30235258": dict(close=0.04, dark=True),
    "32945568": dict(crop=(0.2, 0.2, 0.72, 0.95), close=0.1, vclose=0.15, mirror=True, dark=85),
    "34417794": dict(close=0.06),
    "35549954": dict(crop=(0.15, 0.28, 0.65, 0.68), close=0.04, skin=False),
    "37550214": dict(crop=(0.2, 0.25, 0.8, 0.98), close=0.035, dark=True),
    "37993986": dict(close=0.06, dark=True),
    "7616577": dict(close=0.08, light=True),
}


def cloth_mask(img):
    im = np.asarray(img.resize((768, 768), Image.LANCZOS), dtype=np.float32)
    im = im / im.max()
    im = (im - [0.485, 0.456, 0.406]) / [0.229, 0.224, 0.225]
    x = im.transpose(2, 0, 1)[None].astype(np.float32)
    o = session.run(None, {session.get_inputs()[0].name: x})[0]
    cls = (np.argmax(o, axis=1)[0] > 0).astype(np.uint8) * 255
    return np.asarray(Image.fromarray(cls).resize(img.size, Image.LANCZOS)) > 127


def largest(mask, frac=0.25):
    lab, n = ndimage.label(mask)
    if n == 0:
        return mask
    sizes = ndimage.sum(mask, lab, range(1, n + 1))
    return np.isin(lab, [i + 1 for i, s in enumerate(sizes) if s >= sizes.max() * frac])


def disk(r):
    r = max(1, int(r))
    return cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * r + 1, 2 * r + 1))


def fill_from_cloth(rgb, need, valid, axis=None, block=24, reach=0.35):
    """Fill `need` pixels block by block with cloth copied from the nearest offset
    (or the mirror image) whose source pixels are all `valid` cloth."""
    H, W = need.shape
    outimg = rgb.copy()
    maxd = int(max(H, W) * reach)
    step = max(4, block // 3)
    offs = [(dy, dx) for dy in range(-maxd, maxd + 1, step) for dx in range(-maxd, maxd + 1, step) if dy or dx]
    # stay on the same side of the garment and prefer vertical moves: prints run down the cloth
    offs.sort(key=lambda o: abs(o[0]) + 2.2 * abs(o[1]))
    flip_valid = valid[:, ::-1] if axis is not None else None
    filled = 0
    for y0 in range(0, H, block):
        for x0 in range(0, W, block):
            y1, x1 = min(H, y0 + block), min(W, x0 + block)
            nb = need[y0:y1, x0:x1]
            if not nb.any():
                continue
            done = False
            if axis is not None:
                # mirror source: x' = 2*axis - x
                mx0, mx1 = 2 * axis - (x1 - 1), 2 * axis - x0 + 1
                if 0 <= mx0 and mx1 <= W:
                    src_ok = valid[y0:y1, mx0:mx1][:, ::-1]
                    if (src_ok | ~nb).all():
                        patch = rgb[y0:y1, mx0:mx1][:, ::-1]
                        outimg[y0:y1, x0:x1][nb] = patch[nb]
                        done = True
            if not done:
                for dy, dx in offs:
                    sy0, sx0 = y0 + dy, x0 + dx
                    if sy0 < 0 or sx0 < 0 or sy0 + (y1 - y0) > H or sx0 + (x1 - x0) > W:
                        continue
                    if (valid[sy0:sy0 + y1 - y0, sx0:sx0 + x1 - x0] | ~nb).all():
                        outimg[y0:y1, x0:x1][nb] = rgb[sy0:sy0 + y1 - y0, sx0:sx0 + x1 - x0][nb]
                        done = True
                        break
            if not done:
                # last resort: split into smaller blocks
                if block > 6:
                    sub = np.zeros_like(need)
                    sub[y0:y1, x0:x1] = nb
                    outimg = np.where(sub[..., None], fill_from_cloth(rgb, sub, valid, axis, block // 2, reach), outimg)
                    done = True
            filled += done
    return outimg


for pid in sys.argv[3:]:
    cfg = CFG.get(pid, {})
    img = Image.open(photos / f"{pid}.jpg").convert("RGB")
    if "crop" in cfg:
        x0, y0, x1, y1 = cfg["crop"]
        img = img.crop((round(x0 * img.width), round(y0 * img.height), round(x1 * img.width), round(y1 * img.height)))
    # work at about the output size
    scale = min(1.0, 1300 / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    rgb = np.asarray(img).copy()
    H, W = rgb.shape[:2]

    mask = cloth_mask(img)
    for bx0, by0, bx1, by1 in cfg.get("erase", []):
        mask[round(by0 * H):round(by1 * H), round(bx0 * W):round(bx1 * W)] = False
    mask = largest(mask)

    # hands and arms the model counted as cloth, or that cover it
    bad = np.zeros_like(mask)
    if cfg.get("skin", True):
        ycc = cv2.cvtColor(rgb, cv2.COLOR_RGB2YCrCb).astype(np.int16)
        Y, Cr, Cb = ycc[..., 0], ycc[..., 1], ycc[..., 2]
        skin = (Cr > 136) & (Cr < 178) & (Cb > 78) & (Cb < 128) & (Y > 25) & (Y < 215)
        skin = cv2.morphologyEx(skin.astype(np.uint8), cv2.MORPH_OPEN, disk(2)).astype(bool)
        skin = largest(skin, 0.0) if skin.any() else skin
        sl, sn = ndimage.label(skin)
        if sn:
            ss = ndimage.sum(skin, sl, range(1, sn + 1))
            near = cv2.dilate(mask.astype(np.uint8), disk(4)).astype(bool)
            touch = ndimage.maximum(near, sl, range(1, sn + 1))
            garment = mask.sum()
            keep_ids = [i + 1 for i in range(sn) if touch[i] and ss[i] > garment * 0.0015]
            bad = cv2.dilate(np.isin(sl, keep_ids).astype(np.uint8), disk(3)).astype(bool)
    if cfg.get("dark") or cfg.get("light"):
        # background seen through slits and gaps: big blobs that are very dark, or bare white
        hsv = cv2.cvtColor(rgb, cv2.COLOR_RGB2HSV)
        dark = np.zeros_like(mask)
        if cfg.get("dark"):
            dark |= hsv[..., 2] < (55 if cfg["dark"] is True else cfg["dark"])
        if cfg.get("light"):
            dark |= (hsv[..., 1] < 28) & (hsv[..., 2] > 190)
        dark &= mask
        dark = cv2.morphologyEx(dark.astype(np.uint8), cv2.MORPH_OPEN, disk(3)).astype(bool)
        dl, dn = ndimage.label(dark)
        if dn:
            ds = ndimage.sum(dark, dl, range(1, dn + 1))
            dark = np.isin(dl, [i + 1 for i, s in enumerate(ds) if s > mask.sum() * 0.002])
            mask &= ~dark

    cloth = mask & ~bad
    cloth = largest(cloth)
    gw = np.ptp(np.where(cloth.any(0))[0]) + 1
    # the whole garment: close notches and gaps, fill holes, smooth the outline
    shape = cv2.morphologyEx(cloth.astype(np.uint8), cv2.MORPH_CLOSE, disk(gw * cfg.get("close", 0.05)))
    if cfg.get("vclose"):
        # bridge notches down the sides (where arms hung against the cloth)
        kh = int(H * cfg["vclose"]) | 1
        k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, kh))
        padded = cv2.copyMakeBorder(shape, kh, kh, 0, 0, cv2.BORDER_CONSTANT, value=0)
        shape = cv2.morphologyEx(padded, cv2.MORPH_CLOSE, k)[kh:-kh] | shape
    axis = None
    if cfg.get("mirror"):
        cols = np.where(shape.any(0))[0]
        rows_w = shape.sum(0).astype(float)
        axis = int(round((rows_w * np.arange(W)).sum() / rows_w.sum()))
        flipped = np.zeros_like(shape)
        lo, hi = max(0, 2 * axis - W + 1), min(W, 2 * axis + 1)
        flipped[:, lo:hi] = shape[:, lo:hi][:, ::-1]
        if cfg["mirror"] is not True:  # only mirror these rows (fractions of the height)
            flipped[: round(cfg["mirror"][0] * H)] = 0
            flipped[round(cfg["mirror"][1] * H):] = 0
        shape = shape | flipped
    shape = ndimage.binary_fill_holes(shape)
    shape = cv2.morphologyEx(shape.astype(np.uint8), cv2.MORPH_OPEN, disk(gw * 0.012)).astype(bool)
    shape = largest(shape, 0.5)
    soft = cv2.GaussianBlur(shape.astype(np.float32), (0, 0), max(1.5, gw * 0.006))
    shape = soft > 0.5
    # cloth we may copy from: well inside the garment, not a hand
    valid = cv2.erode(cloth.astype(np.uint8), disk(3)).astype(bool)
    need = shape & ~cv2.erode(cloth.astype(np.uint8), disk(1)).astype(bool)
    filled = fill_from_cloth(rgb, need, valid, axis)
    # soften the seams between real and copied cloth
    seam = cv2.dilate(need.astype(np.uint8), disk(2)).astype(bool) & ~cv2.erode(need.astype(np.uint8), disk(2)).astype(bool)
    blur = cv2.GaussianBlur(filled, (0, 0), 1.2)
    filled[seam] = blur[seam]

    alpha = cv2.GaussianBlur(shape.astype(np.float32), (0, 0), 1.0)
    rgba = np.dstack([filled, (alpha * 255).astype(np.uint8)])
    ys, xs = np.where(shape)
    pad = 6
    box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(W, xs.max() + pad), min(H, ys.max() + pad))
    crop = Image.fromarray(rgba).crop(box)
    if crop.height > 1100:
        crop = crop.resize((round(crop.width * 1100 / crop.height), 1100), Image.LANCZOS)
    crop.save(out / f"{pid}.webp", quality=88, method=6)
    dbg = filled.copy()
    dbg[need] = (dbg[need] * 0.5 + np.array([255, 0, 255]) * 0.5).astype(np.uint8)
    dbg[~shape] = 255
    Image.fromarray(dbg).crop(box).save(out / f"{pid}-debug.jpg", quality=80)
    # fabric swatch: the largest square of untouched cloth
    dist = ndimage.distance_transform_edt(cloth)
    cy, cx = np.unravel_index(np.argmax(dist), dist.shape)
    half = int(dist[cy, cx] / 1.5)
    Image.fromarray(rgb).crop((cx - half, cy - half, cx + half, cy + half)).resize((512, 512), Image.LANCZOS).save(out / f"{pid}-swatch.jpg", quality=88)
    print(pid, "ok", crop.size, "filled", round(need.sum() / shape.sum(), 3))
