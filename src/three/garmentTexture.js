// Draws a flat, hanging garment (front view) as an RGBA texture: the Ankara
// print clipped to the garment silhouette, with seams, hem stitching, inner
// shadow and a glimpse of the back neckline. Transparent outside the garment,
// so the cloth mesh can be a simple rectangle cut out with alphaTest.
import { cutoutImage, fabricMeters, fabricTile } from '../lib/fabrics.js'

// Silhouettes are given as the right half (u: 0..1 across, v: 0..1 down),
// from top-centre around to bottom-centre, and mirrored.
const SHAPES = {
  mermaid: {
    parts: [
      { kind: 'main', pts: [[0.5, 0.075], [0.585, 0.004], [0.73, 0.02], [0.715, 0.1], [0.69, 0.15], [0.705, 0.22], [0.655, 0.36], [0.715, 0.5], [0.665, 0.7], [0.75, 0.86], [0.9, 0.995], [0.5, 0.985]] },
    ],
    backNeck: 0.03,
    seams: [0.36],
    folds: 0.035,
  },
  puffMidi: {
    parts: [
      { kind: 'main', pts: [[0.5, 0.1], [0.59, 0.005], [0.7, 0.03], [0.69, 0.16], [0.71, 0.27], [0.64, 0.42], [0.8, 0.8], [0.87, 0.985], [0.5, 1.0]] },
      { kind: 'sleeve', ellipse: [0.775, 0.1, 0.105, 0.085] },
    ],
    backNeck: 0.03,
    seams: [0.42],
    folds: 0.05,
  },
  offShoulder: {
    parts: [
      { kind: 'main', pts: [[0.5, 0.06], [0.69, 0.06], [0.69, 0.16], [0.655, 0.33], [0.73, 0.6], [0.92, 0.995], [0.5, 1.0]] },
      { kind: 'ruffle', pts: [[0.5, 0.0], [0.84, 0.005], [0.86, 0.07], [0.83, 0.1], [0.79, 0.085], [0.75, 0.11], [0.7, 0.095], [0.66, 0.12], [0.62, 0.1], [0.58, 0.125], [0.54, 0.105], [0.5, 0.125]] },
    ],
    seams: [0.33],
    folds: 0.05,
  },
  peplum: {
    parts: [
      { kind: 'skirt', pts: [[0.5, 0.36], [0.655, 0.36], [0.725, 0.55], [0.69, 0.97], [0.5, 0.975]] },
      { kind: 'main', pts: [[0.5, 0.09], [0.59, 0.005], [0.725, 0.025], [0.71, 0.14], [0.715, 0.24], [0.655, 0.37], [0.82, 0.48], [0.66, 0.475], [0.5, 0.47]] },
    ],
    backNeck: 0.03,
    seams: [0.37],
    folds: 0.02,
  },
  kaftan: {
    parts: [
      { kind: 'main', pts: [[0.5, 0.075], [0.56, 0.0], [0.97, 0.055], [0.985, 0.32], [0.72, 0.42], [0.75, 0.995], [0.5, 1.0]] },
    ],
    backNeck: 0.025,
    seams: [],
    folds: 0.04,
  },
  iroBuba: {
    parts: [
      { kind: 'skirt', pts: [[0.5, 0.43], [0.71, 0.43], [0.745, 0.7], [0.74, 0.985], [0.5, 0.99]], wrap: true },
      { kind: 'main', pts: [[0.5, 0.075], [0.58, 0.0], [0.8, 0.04], [0.92, 0.22], [0.76, 0.27], [0.765, 0.52], [0.5, 0.53]] },
    ],
    backNeck: 0.025,
    seams: [],
    folds: 0.03,
  },
  mini: {
    parts: [
      { kind: 'main', pts: [[0.5, 0.11], [0.59, 0.005], [0.71, 0.04], [0.69, 0.2], [0.71, 0.32], [0.655, 0.47], [0.84, 0.985], [0.5, 1.0]] },
    ],
    backNeck: 0.04,
    seams: [0.47],
    folds: 0.035,
  },
  cropFlare: {
    parts: [
      { kind: 'skirt', pts: [[0.5, 0.3], [0.645, 0.3], [0.78, 0.6], [0.9, 0.985], [0.5, 1.0]] },
      { kind: 'main', pts: [[0.5, 0.075], [0.59, 0.005], [0.72, 0.03], [0.7, 0.15], [0.715, 0.22], [0.68, 0.275], [0.5, 0.285]] },
    ],
    backNeck: 0.03,
    seams: [0.3],
    folds: 0.055,
  },
  wrap: {
    parts: [
      { kind: 'main', pts: [[0.5, 0.25], [0.585, 0.005], [0.715, 0.03], [0.7, 0.16], [0.71, 0.27], [0.645, 0.4], [0.82, 0.8], [0.86, 0.985], [0.5, 1.0]] },
    ],
    backNeck: 0.035,
    sash: 0.4,
    seams: [],
    folds: 0.045,
  },
  puffMaxi: {
    parts: [
      { kind: 'main', pts: [[0.5, 0.075], [0.59, 0.004], [0.7, 0.022], [0.69, 0.12], [0.705, 0.2], [0.645, 0.315], [0.79, 0.68], [0.9, 0.995], [0.5, 1.0]] },
      { kind: 'sleeve', ellipse: [0.775, 0.075, 0.1, 0.07] },
    ],
    backNeck: 0.03,
    belt: 0.315,
    seams: [],
    folds: 0.05,
  },
}

export const shapeInfo = (key) => SHAPES[key] || SHAPES.mini

function mirrorLoop(half) {
  const right = half
  const left = half
    .slice(1, -1)
    .reverse()
    .map(([u, v]) => [1 - u, v])
  return [...right, ...left]
}

// closed Catmull-Rom spline through the points, as a Path2D in pixels
function smoothPath(pts, W, H) {
  const p = new Path2D()
  const n = pts.length
  const P = (i) => {
    const [u, v] = pts[(i + n) % n]
    return [u * W, v * H]
  }
  p.moveTo(...P(0))
  for (let i = 0; i < n; i++) {
    const [x0, y0] = P(i - 1)
    const [x1, y1] = P(i)
    const [x2, y2] = P(i + 1)
    const [x3, y3] = P(i + 2)
    const t = 0.16
    p.bezierCurveTo(x1 + (x2 - x0) * t, y1 + (y2 - y0) * t, x2 - (x3 - x1) * t, y2 - (y3 - y1) * t, x2, y2)
  }
  p.closePath()
  return p
}

function ellipsePaths(e, W, H) {
  const [u, v, ru, rv] = e
  const out = []
  for (const cu of [u, 1 - u]) {
    const p = new Path2D()
    p.ellipse(cu * W, v * H, ru * W, rv * H, 0, 0, Math.PI * 2)
    out.push(p)
  }
  return out
}

function innerShade(ctx, path, W, strength = 0.35, blur = 10) {
  ctx.save()
  ctx.clip(path)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.filter = `blur(${blur}px)`
  ctx.strokeStyle = `rgba(20,8,2,${strength})`
  ctx.lineWidth = W * 0.05
  ctx.stroke(path)
  ctx.restore()
}

/**
 * Returns { canvas, mask } for a product. `mask` is the alpha channel as a
 * Uint8Array (row-major, top-down) so hover/touch can ignore empty corners.
 */
export function rackSize(product, { cutout = true } = {}) {
  const img = cutout && cutoutImage(product)
  const { l } = product.rack
  if (img) return { w: l * (img.naturalWidth / img.naturalHeight), l }
  return { w: product.rack.w ?? l * 0.5, l }
}

// the real garment, cut out of its photo
function drawCutout(img, width) {
  const W = width
  const H = Math.min(1400, Math.round((width * img.naturalHeight) / img.naturalWidth))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, W, H)
  const data = ctx.getImageData(0, 0, W, H).data
  const mask = new Uint8Array(W * H)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3]
  return { canvas, mask, W, H }
}

// `cutout: false` draws the tailored silhouette in the garment's cloth instead of the photo cut-out
export function drawGarment(product, width = 512, { cutout = true } = {}) {
  const img = cutout && cutoutImage(product)
  if (img) return drawCutout(img, width)
  const { w, l } = rackSize(product, { cutout: false })
  const info = shapeInfo(product.rack.shape)
  const W = width
  const H = Math.min(1100, Math.round((width * l) / w))
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')

  const tile = fabricTile(product, 256)
  const pat = ctx.createPattern(tile, 'repeat')
  // one tile covers fabricMeters of real cloth
  const tilePx = (fabricMeters(product) / w) * W
  pat.setTransform(new DOMMatrix().scale(tilePx / tile.width))

  const fillPattern = (path, darken = 0) => {
    ctx.fillStyle = pat
    ctx.fill(path)
    if (darken) {
      ctx.fillStyle = `rgba(20,8,2,${darken})`
      ctx.fill(path)
    }
  }

  // inside of the back, seen through the neckline
  if (info.backNeck) {
    const main = info.parts.find((p) => p.kind === 'main')
    const back = mirrorLoop(main.pts.map(([u, v], i) => (i === 0 ? [u, info.backNeck] : [u, v])))
    fillPattern(smoothPath(back, W, H), 0.45)
  }

  for (const part of info.parts) {
    const paths = part.ellipse ? ellipsePaths(part.ellipse, W, H) : [smoothPath(mirrorLoop(part.pts), W, H)]
    for (const path of paths) {
      // soft drop shadow so overlapping pieces read as layers
      ctx.save()
      ctx.shadowColor = 'rgba(0,0,0,0.35)'
      ctx.shadowBlur = 14
      ctx.shadowOffsetY = 6
      fillPattern(path, part.kind === 'sleeve' ? 0.05 : 0)
      ctx.restore()
      fillPattern(path, part.kind === 'sleeve' ? 0.05 : 0)
      innerShade(ctx, path, W, part.kind === 'ruffle' ? 0.45 : 0.3, part.kind === 'sleeve' ? 6 : 10)

      if (part.kind === 'sleeve') {
        // gathers radiating from the shoulder
        const [u, v, ru, rv] = part.ellipse
        ctx.save()
        ctx.clip(path)
        ctx.strokeStyle = 'rgba(20,8,2,0.22)'
        ctx.lineWidth = 2
        const cx = paths.indexOf(path) === 0 ? u * W : (1 - u) * W
        for (let k = -4; k <= 4; k++) {
          ctx.beginPath()
          ctx.moveTo(cx, (v - rv) * H)
          ctx.quadraticCurveTo(cx + k * ru * W * 0.25, v * H, cx + k * ru * W * 0.2, (v + rv) * H)
          ctx.stroke()
        }
        ctx.restore()
      }
      if (part.wrap) {
        // the overlapping edge of a tied wrapper
        ctx.save()
        ctx.clip(path)
        ctx.strokeStyle = 'rgba(20,8,2,0.45)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.moveTo(0.66 * W, 0.43 * H)
        ctx.quadraticCurveTo(0.6 * W, 0.7 * H, 0.63 * W, 0.99 * H)
        ctx.stroke()
        ctx.restore()
      }
    }
  }

  // seams and hem stitching
  ctx.save()
  const silhouette = new Path2D()
  for (const part of info.parts) {
    if (part.ellipse) ellipsePaths(part.ellipse, W, H).forEach((p) => silhouette.addPath(p))
    else silhouette.addPath(smoothPath(mirrorLoop(part.pts), W, H))
  }
  ctx.clip(silhouette)
  for (const v of info.seams || []) {
    ctx.strokeStyle = 'rgba(20,8,2,0.35)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(0, v * H)
    ctx.lineTo(W, v * H)
    ctx.stroke()
    ctx.strokeStyle = 'rgba(255,240,210,0.35)'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, v * H + 5)
    ctx.lineTo(W, v * H + 5)
    ctx.stroke()
    ctx.setLineDash([])
  }
  // hem: darker band + stitches
  const hemV = 0.985
  ctx.fillStyle = 'rgba(20,8,2,0.18)'
  ctx.fillRect(0, hemV * H - H * 0.015, W, H)
  ctx.strokeStyle = 'rgba(255,240,210,0.4)'
  ctx.setLineDash([5, 5])
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(0, hemV * H - H * 0.02)
  ctx.lineTo(W, hemV * H - H * 0.02)
  ctx.stroke()
  ctx.setLineDash([])

  if (info.belt || info.sash) {
    const v = info.belt || info.sash
    ctx.fillStyle = product.accent
    ctx.fillRect(0, (v - 0.018) * H, W, 0.04 * H)
    ctx.fillStyle = 'rgba(255,255,255,0.12)'
    ctx.fillRect(0, (v - 0.018) * H, W, 0.008 * H)
  }
  ctx.restore()

  if (info.sash) {
    // bow tails hanging at one side
    ctx.save()
    ctx.fillStyle = product.accent
    ctx.shadowColor = 'rgba(0,0,0,0.35)'
    ctx.shadowBlur = 8
    const x = 0.62 * W
    const y = info.sash * H
    ctx.beginPath()
    ctx.ellipse(x, y, W * 0.05, H * 0.025, 0.3, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(x - 6, y)
    ctx.lineTo(x - W * 0.04, y + H * 0.2)
    ctx.lineTo(x - W * 0.005, y + H * 0.19)
    ctx.lineTo(x + 4, y)
    ctx.moveTo(x + 2, y)
    ctx.lineTo(x + W * 0.05, y + H * 0.17)
    ctx.lineTo(x + W * 0.085, y + H * 0.165)
    ctx.lineTo(x + 8, y)
    ctx.fill()
    ctx.restore()
  }

  // a woven care label peeking at the back neck
  if (info.backNeck) {
    ctx.fillStyle = '#f6ead2'
    ctx.fillRect(W * 0.47, info.backNeck * H + 2, W * 0.06, H * 0.02)
    ctx.fillStyle = '#7a1f2b'
    ctx.fillRect(W * 0.475, info.backNeck * H + 5, W * 0.05, 3)
  }

  const data = ctx.getImageData(0, 0, W, H).data
  const mask = new Uint8Array(W * H)
  for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3]
  return { canvas, mask, W, H }
}
