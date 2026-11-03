// Procedural textures for the studio room: white lime-washed wall, pale oak floorboards,
// and the louvre-window "gobo" the afternoon sun shines through.
import * as THREE from 'three'
import { rng } from '../lib/patterns.js'

function tex(canvas, repeat = [1, 1]) {
  const t = new THREE.CanvasTexture(canvas)
  t.colorSpace = THREE.SRGBColorSpace
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(...repeat)
  t.anisotropy = 8
  return t
}

export function plasterTexture() {
  const S = 512
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#f4f1ec'
  ctx.fillRect(0, 0, S, S)
  const r = rng(5)
  for (let i = 0; i < 260; i++) {
    const x = r() * S
    const y = r() * S
    const rad = 20 + r() * 90
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      const g = ctx.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad)
      const light = r() > 0.5
      g.addColorStop(0, light ? 'rgba(255,255,255,0.35)' : 'rgba(150,130,110,0.05)')
      g.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = g
      ctx.fillRect(x + ox - rad, y + oy - rad, rad * 2, rad * 2)
    }
  }
  const img = ctx.getImageData(0, 0, S, S)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (r() - 0.5) * 6
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
  return tex(c, [3, 1.5])
}

export function floorTexture() {
  const W = 512
  const H = 512
  const c = document.createElement('canvas')
  c.width = W
  c.height = H
  const ctx = c.getContext('2d')
  const r = rng(12)
  const boards = 6
  const bh = H / boards
  for (let b = 0; b < boards; b++) {
    const base = 196 + r() * 18
    ctx.fillStyle = `rgb(${base + 22},${base + 14},${base})`
    ctx.fillRect(0, b * bh, W, bh)
    for (let g = 0; g < 40; g++) {
      ctx.strokeStyle = `rgba(120,90,60,${0.04 + r() * 0.07})`
      ctx.lineWidth = 0.5 + r() * 1.5
      ctx.beginPath()
      const y0 = b * bh + r() * bh
      ctx.moveTo(0, y0)
      for (let x = 0; x <= W; x += 32) ctx.lineTo(x, y0 + Math.sin(x * 0.02 + g) * 3)
      ctx.stroke()
    }
    ctx.fillStyle = 'rgba(110,85,60,0.35)'
    ctx.fillRect(0, b * bh, W, 2)
    const joint = r() * W
    ctx.fillRect(joint, b * bh, 2, bh)
  }
  return tex(c, [4, 2])
}

export function louvreGobo() {
  const S = 256
  const c = document.createElement('canvas')
  c.width = c.height = S
  const ctx = c.getContext('2d')
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, S, S)
  ctx.filter = 'blur(3px)'
  ctx.fillStyle = '#fff'
  // two window frames of slanted louvre blades
  for (const x0 of [S * 0.1, S * 0.55]) {
    for (let k = 0; k < 9; k++) {
      ctx.fillRect(x0, S * 0.12 + k * S * 0.085, S * 0.36, S * 0.05)
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}
