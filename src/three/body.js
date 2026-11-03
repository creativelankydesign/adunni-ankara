// Parametric body (dress form) and garments for the try-on viewer.
//
// The body is a stack of elliptical cross-sections derived from the chosen
// size's bust / waist / hip, plus bust and seat bulges. A garment is a surface
// laid over that body: at every height it is the body section plus ease,
// skirt flare and animated folds. Because everything is computed from the
// measurements, changing size morphs both the form and the garment smoothly.

const IN = 0.0254
const TAU = Math.PI * 2

function axes(C, k) {
  const a = C / (Math.PI * Math.sqrt(2 * (1 + k * k)))
  return [a, a * k]
}

const cr = (p0, p1, p2, p3, t) => {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

export const LAND = { neckTop: 1.62, neck: 1.49, shoulder: 1.42, bust: 1.26, waist: 1.06, hip: 0.88, formBottom: 0.78 }

export function bodyKeys(m) {
  const s = (m.bust - 31) / 22.5
  const [bx, bz] = axes(m.bust * IN * 0.92, 0.6)
  const [ubx, ubz] = axes(m.bust * IN * 0.86, 0.66)
  const [wx, wz] = axes(m.waist * IN, 0.72)
  const [hhx, hhz] = axes(((m.waist + m.hip) / 2) * IN, 0.7)
  const [hx, hz] = axes(m.hip * IN * 0.94, 0.66)
  const sx = 0.172 + s * 0.04
  const sz = 0.072 + s * 0.035
  const nr = 0.055 + s * 0.008
  return [
    { y: 1.625, rx: 0.0, rz: 0.0, fb: 0, bb: 0 },
    { y: 1.62, rx: nr, rz: nr, fb: 0, bb: 0 },
    { y: 1.53, rx: nr * 1.03, rz: nr * 1.0, fb: 0, bb: 0 },
    { y: 1.485, rx: nr * 1.6, rz: nr * 1.25, fb: 0, bb: 0.004 },
    { y: 1.455, rx: sx * 0.86, rz: sz * 0.95, fb: 0, bb: 0.006 },
    { y: 1.415, rx: sx, rz: sz + 0.01, fb: 0.004, bb: 0.008 },
    { y: 1.34, rx: Math.max(sx * 0.95, bx * 0.98), rz: bz * 0.86, fb: 0.012 + s * 0.01, bb: 0.01 },
    { y: 1.26, rx: bx, rz: bz, fb: 0.034 + s * 0.035, bb: 0.004 },
    { y: 1.17, rx: ubx, rz: ubz, fb: 0.012 + s * 0.012, bb: 0 },
    { y: 1.06, rx: wx, rz: wz, fb: s * 0.016, bb: 0 },
    { y: 0.97, rx: hhx, rz: hhz, fb: s * 0.014, bb: 0.014 },
    { y: 0.88, rx: hx, rz: hz, fb: 0.002, bb: 0.034 + s * 0.02 },
    { y: 0.78, rx: hx * 0.94, rz: hz * 0.9, fb: 0, bb: 0.018 },
    { y: 0.45, rx: hx * 0.74, rz: hz * 0.64, fb: 0, bb: 0 },
    { y: 0.0, rx: hx * 0.52, rz: hz * 0.46, fb: 0, bb: 0 },
  ]
}

const FIELDS = ['rx', 'rz', 'fb', 'bb']

export function bodyAt(keys, y, out = {}) {
  const n = keys.length
  if (y >= keys[0].y) {
    Object.assign(out, keys[0])
    return out
  }
  if (y <= keys[n - 1].y) {
    Object.assign(out, keys[n - 1])
    return out
  }
  let i = 0
  while (i < n - 2 && y < keys[i + 1].y) i++
  const t = (keys[i].y - y) / (keys[i].y - keys[i + 1].y)
  const k0 = keys[Math.max(0, i - 1)]
  const k1 = keys[i]
  const k2 = keys[i + 1]
  const k3 = keys[Math.min(n - 1, i + 2)]
  for (const f of FIELDS) out[f] = Math.max(0, cr(k0[f], k1[f], k2[f], k3[f], t))
  out.y = y
  return out
}

// smooth piecewise-linear lookup for [[y, value], ...] sorted top-down
function track(arr, y) {
  if (!arr || !arr.length) return 0
  if (y >= arr[0][0]) return arr[0][1]
  for (let i = 0; i < arr.length - 1; i++) {
    const [y0, v0] = arr[i]
    const [y1, v1] = arr[i + 1]
    if (y <= y0 && y >= y1) {
      let t = (y0 - y) / (y0 - y1)
      t = t * t * (3 - 2 * t)
      return v0 + (v1 - v0) * t
    }
  }
  return arr[arr.length - 1][1]
}

/** Point on a body section at angle θ (0 = front, +π/2 = wearer's left / +x). */
export function sectionPoint(sec, theta, extra, wing, bustSmooth, out) {
  const c = Math.cos(theta)
  const sn = Math.sin(theta)
  const front = c > 0 ? c * c : 0
  const back = c < 0 ? c * c : 0
  // two gentle lobes on the form; cloth bridges across them
  const d = Math.atan2(sn, c)
  const l = Math.exp(-(((d - 0.5) / 0.42) ** 2)) + Math.exp(-(((d + 0.5) / 0.42) ** 2))
  const lobes = 0.45 * front + 0.75 * l
  const fb = sec.fb * (bustSmooth ? Math.max(front * 1.05, lobes) : lobes)
  out[0] = (sec.rx + extra + wing) * sn
  out[2] = (sec.rz + extra) * c + fb - sec.bb * back
  return out
}

// ---- garment styles -----------------------------------------------------
// neckline: [frontDepth, backDepth, width(rad), 'scoop'|'v']
// ease / flare / folds / wing: [[y, value]] tracks (metres)

const bodiceEase = [[1.5, 0.006], [1.26, 0.01], [1.06, 0.008], [0.88, 0.012]]

export const STYLES = {
  mermaid: {
    pieces: [
      {
        top: 'neck', hem: 0.02, neckline: [0.11, 0.05, 0.75, 'scoop'],
        ease: bodiceEase,
        flare: [[0.88, 0], [0.5, -0.005], [0.38, 0.04], [0.2, 0.16], [0.02, 0.3]],
        folds: [[0.5, 0], [0.3, 0.012], [0.02, 0.028]], nFolds: 13, zip: true,
      },
    ],
  },
  puffMidi: {
    pieces: [
      {
        top: 'neck', hem: 0.38, neckline: [0.1, 0.04, 0.8, 'scoop'],
        ease: bodiceEase,
        flare: [[1.06, 0], [0.97, 0.03], [0.88, 0.06], [0.38, 0.24]],
        folds: [[1.06, 0.003], [0.9, 0.01], [0.38, 0.026]], nFolds: 15, zip: true,
      },
    ],
    puff: { r: [0.075, 0.07, 0.08] },
  },
  offShoulder: {
    pieces: [
      {
        top: 1.335, hem: 0.0, neckline: [0.025, 0.0, 0.6, 'scoop'],
        ease: [[1.34, 0.004], [1.06, 0.006], [0.88, 0.012]],
        flare: [[1.06, 0], [0.9, 0.04], [0.5, 0.18], [0.0, 0.42]],
        folds: [[1.06, 0.002], [0.8, 0.012], [0.0, 0.035]], nFolds: 14, zip: true,
      },
      {
        top: 1.37, hem: 1.235, ease: [[1.37, 0.012], [1.235, 0.03]], flare: [[1.37, 0.0], [1.235, 0.045]],
        folds: [[1.37, 0.004], [1.235, 0.014]], nFolds: 24, wing: [[1.37, 0.03], [1.235, 0.035]], ruffle: true,
      },
    ],
  },
  peplum: {
    pieces: [
      {
        top: 1.07, hem: 0.42, ease: [[1.07, 0.003], [0.88, 0.005]],
        flare: [[0.88, 0], [0.55, -0.01], [0.42, -0.012]], folds: [], nFolds: 0, slit: true,
      },
      {
        top: 'neck', hem: 0.92, neckline: [0.07, 0.05, 0.7, 'scoop'],
        ease: [[1.5, 0.006], [1.26, 0.011], [1.06, 0.01]],
        flare: [[1.06, 0], [1.0, 0.03], [0.92, 0.085]],
        folds: [[1.04, 0.0], [0.92, 0.014]], nFolds: 11, zip: true,
      },
    ],
  },
  kaftan: {
    pieces: [
      {
        top: 'neck', hem: 0.05, neckline: [0.1, 0.03, 0.55, 'v'],
        ease: [[1.5, 0.008], [1.42, 0.04], [1.26, 0.06], [0.88, 0.07]],
        wing: [[1.44, 0.2], [1.38, 0.26], [1.22, 0.15], [1.0, 0.03], [0.85, 0.0]],
        flare: [[0.88, 0], [0.05, 0.12]],
        folds: [[1.42, 0.004], [1.0, 0.012], [0.05, 0.02]], nFolds: 10,
      },
    ],
  },
  iroBuba: {
    pieces: [
      {
        top: 1.03, hem: 0.08, ease: [[1.03, 0.012], [0.88, 0.016]],
        flare: [[0.88, 0], [0.45, 0.05], [0.08, 0.1]],
        folds: [[1.0, 0.004], [0.08, 0.008]], nFolds: 7, wrap: true,
      },
      {
        top: 'neck', hem: 0.84, neckline: [0.06, 0.03, 0.7, 'scoop'],
        ease: [[1.5, 0.008], [1.42, 0.02], [1.26, 0.04], [1.06, 0.05], [0.84, 0.05]],
        wing: [[1.43, 0.06], [1.36, 0.1], [1.25, 0.04], [1.15, 0.0]],
        flare: [[1.06, 0], [0.84, 0.03]],
        folds: [[1.3, 0.004], [0.84, 0.01]], nFolds: 9,
      },
    ],
  },
  mini: {
    pieces: [
      {
        top: 'neck', hem: 0.66, neckline: [0.12, 0.08, 0.7, 'scoop'],
        ease: bodiceEase,
        flare: [[1.06, 0], [0.88, 0.035], [0.66, 0.11]],
        folds: [[1.0, 0.002], [0.66, 0.016]], nFolds: 12, zip: true,
      },
    ],
  },
  cropFlare: {
    pieces: [
      {
        top: 1.08, hem: 0.32, ease: [[1.08, 0.006], [0.88, 0.012]],
        flare: [[1.08, 0], [0.97, 0.06], [0.88, 0.1], [0.32, 0.34]],
        folds: [[1.08, 0.003], [0.9, 0.014], [0.32, 0.034]], nFolds: 16, band: true,
      },
      {
        top: 'neck', hem: 1.13, neckline: [0.08, 0.05, 0.8, 'scoop'],
        ease: [[1.5, 0.006], [1.26, 0.011], [1.13, 0.01]], flare: [], folds: [], nFolds: 0, zip: true,
      },
    ],
  },
  wrap: {
    pieces: [
      {
        top: 'neck', hem: 0.36, neckline: [0.2, 0.05, 0.7, 'v'],
        ease: bodiceEase,
        flare: [[1.06, 0], [0.9, 0.05], [0.36, 0.2]],
        folds: [[1.04, 0.003], [0.36, 0.022]], nFolds: 13,
      },
    ],
    sash: true,
  },
  puffMaxi: {
    pieces: [
      {
        top: 'neck', hem: 0.03, neckline: [0.09, 0.04, 0.8, 'scoop'],
        ease: bodiceEase,
        flare: [[1.06, 0], [0.9, 0.05], [0.5, 0.17], [0.03, 0.32]],
        folds: [[1.04, 0.003], [0.6, 0.016], [0.03, 0.032]], nFolds: 15, zip: true,
      },
    ],
    puff: { r: [0.07, 0.06, 0.075] },
    belt: true,
  },
}

export const COLS = 97 // includes the duplicated seam column
// the seam (where the column ring closes) sits at the centre back
const thetaOf = (c) => Math.PI + (c / (COLS - 1)) * TAU

/** Start height of a column at angle θ, cut by the neckline. */
function topAt(piece, theta) {
  if (piece.top !== 'neck') {
    if (!piece.neckline) return piece.top
    const [front, , width] = piece.neckline
    const d = Math.atan2(Math.sin(theta), Math.cos(theta))
    return piece.top - front * Math.exp(-((d / width) ** 2))
  }
  const [front, back, width, kind] = piece.neckline
  const d = Math.atan2(Math.sin(theta), Math.cos(theta)) // -π..π, 0 = front
  const base = LAND.neck
  let dip
  if (kind === 'v') dip = Math.max(0, 1 - Math.abs(d) / width) ** 1.2
  else dip = Math.exp(-((d / width) ** 2))
  const bd = Math.PI - Math.abs(d)
  const bdip = Math.exp(-((bd / (width * 0.9)) ** 2))
  return base - front * dip - back * bdip
}

export function pieceRows(piece) {
  const len = topAt(piece, Math.PI / 2) - piece.hem
  return Math.max(24, Math.round(len * 95))
}

export function pieceUV(piece) {
  const rows = pieceRows(piece)
  const uv = new Float32Array(rows * COLS * 2)
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < COLS; c++) {
      const theta = thetaOf(c)
      const yTop = topAt(piece, theta)
      const s = r / (rows - 1)
      const y = yTop - (yTop - piece.hem) * Math.pow(s, 1.25)
      const i = (r * COLS + c) * 2
      uv[i] = (c / (COLS - 1)) * 5
      uv[i + 1] = y / 0.2
    }
  }
  return uv
}

export function pieceIndex(piece) {
  const rows = pieceRows(piece)
  const idx = []
  for (let r = 0; r < rows - 1; r++) {
    for (let c = 0; c < COLS - 1; c++) {
      const a = r * COLS + c
      const b = a + 1
      const d = a + COLS
      const e = d + 1
      idx.push(a, d, b, b, d, e)
    }
  }
  return idx
}

const tmpSec = {}
const tmpP = [0, 0, 0]

/**
 * Write the piece's vertex positions for body keys `keys`.
 * motion: { t, twist, flareBoost } — twist/flare come from spinning the form.
 */
export function writePiece(piece, keys, positions, motion) {
  const rows = pieceRows(piece)
  const { t, twist, flareBoost } = motion
  for (let c = 0; c < COLS; c++) {
    const theta0 = thetaOf(c)
    const yTop = topAt(piece, theta0)
    for (let r = 0; r < rows; r++) {
      const s = r / (rows - 1)
      const y = yTop - (yTop - piece.hem) * Math.pow(s, 1.25)
      // swing below the waist: skirts lag behind and flare out when spun
      const h = Math.max(0, Math.min(1, (LAND.waist - y) / 1.0))
      const h2 = h * h
      const theta = theta0 - twist * h2
      bodyAt(keys, y, tmpSec)
      let extra = track(piece.ease, y) + track(piece.flare, y) + flareBoost * h2 * (piece.ruffle ? 0 : 1)
      const foldA = track(piece.folds, y)
      if (foldA) {
        const ph = t * 0.7 + y * 2.3
        extra += foldA * (Math.sin(piece.nFolds * theta0 + ph * 0.3) * 0.8 + Math.sin(piece.nFolds * 2 * theta0 + 1.7 + ph) * 0.25)
      }
      if (piece.wrap) {
        // overlap where the wrapper is tied, at the wearer's left front
        const d = Math.atan2(Math.sin(theta0 - 0.6), Math.cos(theta0 - 0.6))
        extra += 0.006 * Math.exp(-((d / 0.25) ** 2))
      }
      const wing = track(piece.wing, y) * Math.abs(Math.sin(theta0)) ** 1.5
      sectionPoint(tmpSec, theta, extra, wing, true, tmpP)
      const i = (r * COLS + c) * 3
      positions[i] = tmpP[0]
      positions[i + 1] = y
      positions[i + 2] = tmpP[2]
    }
  }
}

export function formRowsY() {
  const ys = []
  for (let y = LAND.neckTop + 0.005; y >= LAND.formBottom - 0.0001; y -= 0.012) ys.push(y)
  ys.push(LAND.formBottom - 0.001)
  return ys
}

export function writeForm(keys, positions, ys, cols) {
  const sec = {}
  for (let r = 0; r < ys.length; r++) {
    const y = ys[r]
    bodyAt(keys, y, sec)
    const last = r === ys.length - 1
    for (let c = 0; c < cols; c++) {
      const theta = Math.PI + (c / (cols - 1)) * TAU
      sectionPoint(sec, theta, 0, 0, false, tmpP)
      const i = (r * cols + c) * 3
      positions[i] = last ? 0 : tmpP[0]
      positions[i + 1] = y
      positions[i + 2] = last ? 0 : tmpP[2]
    }
  }
}

/** Measurements of the garment (surface) at a height, for placing belts, bows and sleeves. */
export function surfaceAt(piece, keys, y, theta, motion = { t: 0, twist: 0, flareBoost: 0 }) {
  const sec = bodyAt(keys, y, {})
  const extra = track(piece.ease, y) + track(piece.flare, y)
  const out = [0, 0, 0]
  sectionPoint(sec, theta, extra, 0, true, out)
  out[1] = y
  return out
}

export function shoulderPoint(keys) {
  const sec = bodyAt(keys, LAND.shoulder, {})
  return [sec.rx, LAND.shoulder, 0]
}
