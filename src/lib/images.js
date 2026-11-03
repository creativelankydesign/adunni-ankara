import { drawGarment } from '../three/garmentTexture.js'
import { fabricTile } from './fabrics.js'

const garmentCache = new Map()
const swatchCache = new Map()

/** Rendered front of a garment in its own cloth (data URL) for cards and the bag. */
export function garmentImage(product) {
  if (!garmentCache.has(product.id)) garmentCache.set(product.id, drawGarment(product, 360, { cutout: false }).canvas.toDataURL())
  return garmentCache.get(product.id)
}

export function swatchImage(product) {
  if (!swatchCache.has(product.id)) swatchCache.set(product.id, fabricTile(product, 256).toDataURL('image/jpeg', 0.85))
  return swatchCache.get(product.id)
}
