// Procedural Ankara (African wax print) textures.
// Every motif is drawn onto a seamless square tile, then "aged" with the
// tell-tale marks of real wax print: resin crackle veins, dye mottling and
// a slightly mis-registered second colour layer.

export function rng(seed) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TAU = Math.PI * 2

function circle(ctx, x, y, r, fill) {
  ctx.beginPath()
  ctx.arc(x, y, Math.max(r, 0.1), 0, TAU)
  ctx.fillStyle = fill
  ctx.fill()
}

// ---- motifs -------------------------------------------------------------
// Each motif draws one period of the pattern into [0,S]x[0,S]. Elements may
// spill past the edges; the caller redraws the motif at the 8 neighbouring
// offsets so the tile wraps without seams.

const motifs = {
  rings(ctx, S, c, r) {
    const n = 2
    const cell = S / n
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = col * cell + (row % 2 ? cell / 2 : 0) + cell / 2
        const y = row * cell + cell / 2
        const R = cell * 0.47
        const seq = [c[1], c[2], c[3], c[0], c[4], c[2]]
        const radii = [1, 0.82, 0.64, 0.5, 0.34, 0.16]
        radii.forEach((k, i) => circle(ctx, x, y, R * k, seq[i % seq.length]))
        // dotted halo
        for (let a = 0; a < 18; a++) {
          const ang = (a / 18) * TAU
          circle(ctx, x + Math.cos(ang) * R * 0.57, y + Math.sin(ang) * R * 0.57, R * 0.035, c[1])
        }
      }
    }
    // little diamonds in the gaps
    for (let row = 0; row < n; row++) {
      const y = row * cell
      for (let col = 0; col < n; col++) {
        const x = col * cell + (row % 2 ? 0 : cell / 2)
        ctx.save()
        ctx.translate(x + cell / 2, y)
        ctx.rotate(Math.PI / 4)
        ctx.fillStyle = c[3]
        ctx.fillRect(-cell * 0.06, -cell * 0.06, cell * 0.12, cell * 0.12)
        ctx.restore()
      }
    }
  },

  fans(ctx, S, c) {
    const rows = 4
    const cols = 3
    const w = S / cols
    const h = S / rows
    for (let row = rows; row >= -1; row--) {
      for (let col = -1; col <= cols; col++) {
        const x = col * w + (row % 2 ? w / 2 : 0) + w / 2
        const y = row * h + h
        const R = w * 0.62
        const seq = [c[1], c[0], c[2], c[0], c[3], c[4]]
        for (let i = 0; i < 6; i++) {
          ctx.beginPath()
          ctx.moveTo(x, y)
          ctx.arc(x, y, R * (1 - i * 0.15), Math.PI, TAU)
          ctx.closePath()
          ctx.fillStyle = seq[i]
          ctx.fill()
        }
        // rays across the fan
        ctx.strokeStyle = c[0]
        ctx.lineWidth = w * 0.025
        for (let k = 1; k < 8; k++) {
          const a = Math.PI + (k / 8) * Math.PI
          ctx.beginPath()
          ctx.moveTo(x + Math.cos(a) * R * 0.25, y + Math.sin(a) * R * 0.25)
          ctx.lineTo(x + Math.cos(a) * R * 0.55, y + Math.sin(a) * R * 0.55)
          ctx.stroke()
        }
      }
    }
  },

  leaves(ctx, S, c) {
    const n = 3
    const cell = S / n
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = col * cell + cell / 2
        const y = row * cell + cell / 2
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(((row + col) % 2 ? 1 : -1) * Math.PI / 4)
        const L = cell * 0.5
        const W = cell * 0.22
        ctx.beginPath()
        ctx.moveTo(0, -L)
        ctx.bezierCurveTo(W * 1.6, -L * 0.4, W * 1.6, L * 0.4, 0, L)
        ctx.bezierCurveTo(-W * 1.6, L * 0.4, -W * 1.6, -L * 0.4, 0, -L)
        ctx.fillStyle = (row + col) % 2 ? c[1] : c[2]
        ctx.fill()
        ctx.strokeStyle = c[3]
        ctx.lineWidth = cell * 0.03
        ctx.beginPath()
        ctx.moveTo(0, -L * 0.9)
        ctx.lineTo(0, L * 0.9)
        ctx.stroke()
        ctx.lineWidth = cell * 0.018
        for (let k = -3; k <= 3; k++) {
          const yy = k * L * 0.22
          ctx.beginPath()
          ctx.moveTo(0, yy)
          ctx.lineTo(W * 0.9, yy - L * 0.15)
          ctx.moveTo(0, yy)
          ctx.lineTo(-W * 0.9, yy - L * 0.15)
          ctx.stroke()
        }
        ctx.restore()
        circle(ctx, col * cell, row * cell, cell * 0.09, c[4])
        circle(ctx, col * cell, row * cell, cell * 0.045, c[3])
      }
    }
  },

  diamonds(ctx, S, c) {
    const n = 2
    const cell = S / n
    for (let row = 0; row <= n; row++) {
      for (let col = 0; col <= n; col++) {
        for (const off of [0, 0.5]) {
          const x = (col + off) * cell
          const y = (row + off) * cell
          const seq = off ? [c[2], c[0], c[4], c[0]] : [c[1], c[3], c[0], c[1], c[4]]
          seq.forEach((fill, i) => {
            const k = (cell / 2) * (1 - i / seq.length) * 0.98
            ctx.beginPath()
            ctx.moveTo(x, y - k)
            ctx.lineTo(x + k, y)
            ctx.lineTo(x, y + k)
            ctx.lineTo(x - k, y)
            ctx.closePath()
            ctx.fillStyle = fill
            ctx.fill()
          })
        }
      }
    }
    ctx.strokeStyle = c[3]
    ctx.lineWidth = S * 0.008
    for (let row = 0; row < n * 2; row++) {
      const y = (row + 0.5) * (cell / 2)
      ctx.beginPath()
      for (let x = 0; x <= S; x += cell / 8) {
        ctx.lineTo(x, y + ((x / (cell / 8)) % 2 ? cell * 0.03 : -cell * 0.03))
      }
      ctx.globalAlpha = 0.5
      ctx.stroke()
      ctx.globalAlpha = 1
    }
  },

  swirls(ctx, S, c) {
    const n = 2
    const cell = S / n
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = col * cell + (row % 2 ? cell / 2 : 0) + cell / 2
        const y = row * cell + cell / 2
        circle(ctx, x, y, cell * 0.46, c[1])
        const dir = (row + col) % 2 ? 1 : -1
        for (const [stroke, w] of [[c[3], 0.09], [c[2], 0.05]]) {
          ctx.beginPath()
          for (let t = 0; t < 1; t += 0.01) {
            const a = dir * t * TAU * 2.4
            const rr = cell * 0.4 * t
            ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
          }
          ctx.strokeStyle = stroke
          ctx.lineWidth = cell * w
          ctx.lineCap = 'round'
          ctx.stroke()
        }
      }
    }
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        circle(ctx, i * (S / 4), j * (S / 4) + S / 8, S * 0.018, c[4])
      }
    }
  },

  stripes(ctx, S, c) {
    // kente-like bands with woven blocks
    const bands = [0.14, 0.06, 0.22, 0.06, 0.16, 0.08, 0.2, 0.08]
    let y = 0
    bands.forEach((h, i) => {
      const H = h * S
      ctx.fillStyle = c[(i % 4) + 1]
      ctx.fillRect(0, y, S, H)
      if (h > 0.12) {
        const blocks = 8
        const bw = S / blocks
        for (let b = 0; b < blocks; b++) {
          ctx.fillStyle = c[((i + b) % 3) + 2]
          if (b % 2 === 0) {
            ctx.beginPath()
            ctx.moveTo(b * bw, y + H)
            ctx.lineTo(b * bw + bw / 2, y)
            ctx.lineTo(b * bw + bw, y + H)
            ctx.fill()
          } else {
            ctx.fillStyle = c[0]
            ctx.fillRect(b * bw + bw * 0.3, y + H * 0.3, bw * 0.4, H * 0.4)
          }
        }
      } else {
        ctx.fillStyle = c[0]
        for (let x = 0; x < S; x += S / 16) ctx.fillRect(x, y + H * 0.35, S / 32, H * 0.3)
      }
      y += H
    })
  },

  eggs(ctx, S, c) {
    const n = 3
    const cell = S / n
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = col * cell + (row % 2 ? cell / 2 : 0) + cell / 2
        const y = row * cell + cell / 2
        ctx.save()
        ctx.translate(x, y)
        ctx.rotate((row % 2 ? 0.5 : -0.5))
        const seq = [c[1], c[2], c[3]]
        seq.forEach((fill, i) => {
          ctx.beginPath()
          ctx.ellipse(0, 0, cell * 0.3 * (1 - i * 0.28), cell * 0.44 * (1 - i * 0.28), 0, 0, TAU)
          ctx.fillStyle = fill
          ctx.fill()
        })
        for (let k = 0; k < 5; k++) circle(ctx, 0, (k - 2) * cell * 0.06, cell * 0.02, c[4])
        ctx.restore()
      }
    }
  },

  flowers(ctx, S, c) {
    const n = 2
    const cell = S / n
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = col * cell + (row % 2 ? cell / 2 : 0) + cell / 2
        const y = row * cell + cell / 2
        const petals = 8
        for (let p = 0; p < petals; p++) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate((p / petals) * TAU)
          ctx.beginPath()
          ctx.ellipse(0, -cell * 0.22, cell * 0.09, cell * 0.2, 0, 0, TAU)
          ctx.fillStyle = p % 2 ? c[1] : c[2]
          ctx.fill()
          ctx.beginPath()
          ctx.ellipse(0, -cell * 0.22, cell * 0.035, cell * 0.12, 0, 0, TAU)
          ctx.fillStyle = c[0]
          ctx.fill()
          ctx.restore()
        }
        circle(ctx, x, y, cell * 0.11, c[3])
        circle(ctx, x, y, cell * 0.06, c[4])
        // leaves in the gaps
        ctx.save()
        ctx.translate(x + cell / 2, y + cell / 2)
        ctx.rotate(Math.PI / 4)
        ctx.beginPath()
        ctx.ellipse(0, 0, cell * 0.05, cell * 0.14, 0, 0, TAU)
        ctx.fillStyle = c[4]
        ctx.fill()
        ctx.restore()
      }
    }
  },

  sunburst(ctx, S, c) {
    const n = 2
    const cell = S / n
    for (let row = 0; row < n; row++) {
      for (let col = 0; col < n; col++) {
        const x = col * cell + (row % 2 ? cell / 2 : 0) + cell / 2
        const y = row * cell + cell / 2
        const rays = 16
        ctx.fillStyle = c[2]
        for (let k = 0; k < rays; k++) {
          const a = (k / rays) * TAU
          const a2 = a + TAU / rays / 2
          ctx.beginPath()
          ctx.moveTo(x + Math.cos(a) * cell * 0.22, y + Math.sin(a) * cell * 0.22)
          ctx.lineTo(x + Math.cos(a + TAU / rays / 4) * cell * 0.47, y + Math.sin(a + TAU / rays / 4) * cell * 0.47)
          ctx.lineTo(x + Math.cos(a2) * cell * 0.22, y + Math.sin(a2) * cell * 0.22)
          ctx.fill()
        }
        circle(ctx, x, y, cell * 0.24, c[1])
        circle(ctx, x, y, cell * 0.17, c[3])
        circle(ctx, x, y, cell * 0.1, c[1])
        circle(ctx, x, y, cell * 0.04, c[4])
      }
    }
  },
}

export const MOTIFS = Object.keys(motifs)

// ---- wax-print ageing ----------------------------------------------------

function waxEffects(ctx, S, c, seed) {
  const r = rng(seed * 7 + 3)
  // dye mottling: soft darker clouds
  const blobs = []
  for (let i = 0; i < 26; i++) blobs.push([r() * S, r() * S, S * (0.05 + r() * 0.14)])
  // resin crackle: thin wandering veins
  const veins = []
  for (let i = 0; i < 34; i++) {
    let x = r() * S
    let y = r() * S
    let a = r() * TAU
    const pts = [[x, y]]
    const len = 6 + Math.floor(r() * 18)
    for (let k = 0; k < len; k++) {
      a += (r() - 0.5) * 1.1
      x += Math.cos(a) * S * 0.012
      y += Math.sin(a) * S * 0.012
      pts.push([x, y])
    }
    veins.push(pts)
  }
  for (let ox = -S; ox <= S; ox += S) {
    for (let oy = -S; oy <= S; oy += S) {
      ctx.save()
      ctx.translate(ox, oy)
      ctx.globalCompositeOperation = 'multiply'
      for (const [x, y, rad] of blobs) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, rad)
        g.addColorStop(0, 'rgba(70,40,25,0.10)')
        g.addColorStop(1, 'rgba(70,40,25,0)')
        ctx.fillStyle = g
        ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2)
      }
      ctx.strokeStyle = 'rgba(25,12,6,0.22)'
      ctx.lineWidth = Math.max(0.6, S / 420)
      for (const pts of veins) {
        ctx.beginPath()
        pts.forEach(([x, y]) => ctx.lineTo(x, y))
        ctx.stroke()
      }
      ctx.restore()
    }
  }
  // fibre speckle
  const img = ctx.getImageData(0, 0, S, S)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (r() - 0.5) * 16
    d[i] += n
    d[i + 1] += n
    d[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
}

const cache = new Map()

/** Seamless square tile for a pattern spec { motif, colors: [bg, c1..c4], seed }. */
export function patternTile(spec, S = 256) {
  const key = `${spec.motif}|${spec.colors.join(',')}|${spec.seed}|${S}`
  if (cache.has(key)) return cache.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')
  const c = spec.colors
  ctx.fillStyle = c[0]
  ctx.fillRect(0, 0, S, S)
  const draw = motifs[spec.motif] || motifs.rings
  for (let ox = -S; ox <= S; ox += S) {
    for (let oy = -S; oy <= S; oy += S) {
      ctx.save()
      ctx.translate(ox, oy)
      draw(ctx, S, c, rng(spec.seed || 1))
      ctx.restore()
    }
  }
  // mis-registration: faint ghost of the motif, nudged off-register
  ctx.save()
  ctx.globalAlpha = 0.12
  ctx.globalCompositeOperation = 'multiply'
  ctx.drawImage(canvas, 2, 1)
  ctx.drawImage(canvas, 2 - S, 1)
  ctx.drawImage(canvas, 2, 1 - S)
  ctx.restore()
  waxEffects(ctx, S, c, spec.seed || 1)
  cache.set(key, canvas)
  return canvas
}

/** Grayscale plain-weave texture used as a bump map so the cotton reads as cloth. */
let weave
export function weaveTile() {
  if (weave) return weave
  const S = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = S
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(S, S)
  const r = rng(99)
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const warp = Math.sin((x / 4) * Math.PI) ** 2
      const weft = Math.sin((y / 4) * Math.PI) ** 2
      const over = (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? warp : weft
      const v = 90 + over * 120 + (r() - 0.5) * 30
      const i = (y * S + x) * 4
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v
      img.data[i + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  weave = canvas
  return canvas
}
