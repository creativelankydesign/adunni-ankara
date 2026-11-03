// Real fabric photos. A product with `photo` (a URL or a path under /public)
// uses that photo as its cloth, and one with `cutout` hangs that real garment; everything else
// falls back to the procedural wax print. Photos are mirrored into a 2x2 tile
// so they repeat down long gowns without visible seams.
import { patternTile } from './patterns.js'

const loaded = new Map()
const PROCEDURAL_METERS = 0.2

function mirrorTile(img, max = 1024) {
  const side = Math.min(img.naturalWidth, img.naturalHeight)
  const n = Math.min(max / 2, side)
  const c = document.createElement('canvas')
  c.width = c.height = n * 2
  const ctx = c.getContext('2d')
  const sx = (img.naturalWidth - side) / 2
  const sy = (img.naturalHeight - side) / 2
  for (const [fx, fy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
    ctx.save()
    ctx.translate(fx < 0 ? n * 2 : 0, fy < 0 ? n * 2 : 0)
    ctx.scale(fx, fy)
    ctx.drawImage(img, sx, sy, side, side, 0, 0, n, n)
    ctx.restore()
  }
  return c
}

const cutouts = new Map()

function loadImage(src) {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = () => resolve(null)
    img.src = src
  })
}

/** Load every fabric photo and garment cut-out before the scenes build their textures. */
export function preloadFabrics(products, timeout = 8000) {
  const jobs = products.flatMap((p) => [
    p.photo && loadImage(p.photo).then((img) => img && loaded.set(p.id, mirrorTile(img))),
    p.cutout && loadImage(p.cutout).then((img) => img && cutouts.set(p.id, img)),
  ])
  return Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, timeout))])
}

/** The real garment cut out of its photo, if there is one. */
export const cutoutImage = (product) => cutouts.get(product.id) || null

export const hasPhoto = (product) => loaded.has(product.id)

/** Square, seamlessly repeating tile for the product's cloth. */
export function fabricTile(product, size = 256) {
  return loaded.get(product.id) || patternTile(product.pattern, size)
}

/** How many metres of real cloth one tile covers. */
export function fabricMeters(product) {
  return loaded.has(product.id) ? 1.2 * (product.photoMeters || 0.3) : PROCEDURAL_METERS
}
