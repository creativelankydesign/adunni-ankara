// Position-based (Verlet) cloth: a grid of particles joined by stretch, shear
// and bend constraints, pinned along a hanger. Folds are baked into the rest
// shape so skirts keep their drape instead of hanging flat like paper.
import * as THREE from 'three'
import { rng } from '../lib/patterns.js'

const G = -9.8

export class Cloth {
  constructor({ w, l, nx = 22, ny = 34, folds = 0.04, seed = 1, hangerHalf = 0.21 }) {
    this.w = w
    this.l = l
    this.nx = nx
    this.ny = ny
    const n = nx * ny
    this.pos = new Float32Array(n * 3)
    this.prev = new Float32Array(n * 3)
    this.pinned = new Uint8Array(n)
    this.pinRest = []
    const r = rng(seed)
    const phase = r() * Math.PI * 2
    const k = 3 + Math.floor(r() * 2)

    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const u = i / (nx - 1)
        const v = j / (ny - 1)
        const idx = (j * nx + i) * 3
        const x = (u - 0.5) * w
        // drape folds grow toward the hem
        const fz = folds * Math.sin(u * Math.PI * k + phase) * Math.pow(v, 1.1)
        const fz2 = folds * 0.25 * Math.sin(u * Math.PI * k * 2.3 + phase * 2) * v
        this.pos[idx] = x
        this.pos[idx + 1] = -v * l
        this.pos[idx + 2] = fz + fz2 + 0.02 * Math.sin(u * Math.PI) * v
      }
    }
    // pin the top row along the hanger (sloped shoulders)
    for (let i = 0; i < nx; i++) {
      const x = this.pos[i * 3]
      if (Math.abs(x) <= hangerHalf) {
        this.pinned[i] = 1
        const y = -Math.abs(x) * 0.18
        this.pos[i * 3 + 1] = y
        this.pinRest.push([i, x, y, 0])
      }
    }
    this.prev.set(this.pos)

    // constraints
    const A = []
    const B = []
    const add = (a, b) => {
      A.push(a)
      B.push(b)
    }
    const id = (i, j) => j * nx + i
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        if (i < nx - 1) add(id(i, j), id(i + 1, j))
        if (j < ny - 1) add(id(i, j), id(i, j + 1))
        if (i < nx - 1 && j < ny - 1) {
          add(id(i, j), id(i + 1, j + 1))
          add(id(i + 1, j), id(i, j + 1))
        }
        if (i < nx - 2) add(id(i, j), id(i + 2, j))
        if (j < ny - 2) add(id(i, j), id(i, j + 2))
      }
    }
    this.ca = Int32Array.from(A)
    this.cb = Int32Array.from(B)
    this.rest = new Float32Array(A.length)
    for (let c = 0; c < A.length; c++) {
      const a = A[c] * 3
      const b = B[c] * 3
      this.rest[c] = Math.hypot(this.pos[b] - this.pos[a], this.pos[b + 1] - this.pos[a + 1], this.pos[b + 2] - this.pos[a + 2])
    }

    // geometry shares the particle buffer
    const geo = new THREE.BufferGeometry()
    this.attr = new THREE.BufferAttribute(this.pos, 3)
    this.attr.setUsage(THREE.DynamicDrawUsage)
    geo.setAttribute('position', this.attr)
    const uv = new Float32Array(n * 2)
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        uv[(j * nx + i) * 2] = i / (nx - 1)
        uv[(j * nx + i) * 2 + 1] = 1 - j / (ny - 1)
      }
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    const index = []
    for (let j = 0; j < ny - 1; j++) {
      for (let i = 0; i < nx - 1; i++) {
        const a = id(i, j)
        const b = id(i + 1, j)
        const c = id(i, j + 1)
        const d = id(i + 1, j + 1)
        index.push(a, c, b, b, c, d)
      }
    }
    geo.setIndex(index)
    geo.computeVertexNormals()
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -l / 2, 0), Math.max(l, w))
    this.geometry = geo
  }

  /** Push particles near (u,v) by an impulse along z (and a little sideways). */
  poke(u, v, strength, radius = 0.18, side = 0) {
    const { nx, ny, w, l } = this
    const cx = u * w
    const cy = v * l
    for (let j = 0; j < ny; j++) {
      for (let i = 0; i < nx; i++) {
        const idx = j * nx + i
        if (this.pinned[idx]) continue
        const dx = (i / (nx - 1)) * w - cx
        const dy = (j / (ny - 1)) * l - cy
        const d2 = (dx * dx + dy * dy) / (radius * radius)
        if (d2 > 4) continue
        const f = Math.exp(-d2) * strength
        this.prev[idx * 3 + 2] += f
        this.prev[idx * 3] -= f * side
      }
    }
  }

  /**
   * Advance one step. `wind(x, y, t)` returns a z-force, `swing` rotates the
   * pin positions (hanger swaying on its hook), `shove` is an x acceleration
   * (e.g. the camera panning past).
   */
  step(dt, t, wind, swing = 0, shove = 0, iterations = 8) {
    const { pos, prev, pinned } = this
    const n = this.nx * this.ny
    const dt2 = dt * dt
    const damp = 0.985
    for (let p = 0; p < n; p++) {
      if (pinned[p]) continue
      const i = p * 3
      const x = pos[i]
      const y = pos[i + 1]
      const z = pos[i + 2]
      const depth = Math.min(1, -y / this.l)
      const wz = wind(x, y, t) * (0.25 + depth)
      const nx = x + (x - prev[i]) * damp + shove * depth * dt2
      const ny = y + (y - prev[i + 1]) * damp + G * dt2
      const nz = z + (z - prev[i + 2]) * damp + wz * dt2
      prev[i] = x
      prev[i + 1] = y
      prev[i + 2] = z
      pos[i] = nx
      pos[i + 1] = ny
      pos[i + 2] = nz
    }
    // hanger pins (rotate around the hook above the centre)
    const hookY = 0.13
    const cs = Math.cos(swing)
    const sn = Math.sin(swing)
    for (const [p, x, y, z] of this.pinRest) {
      const i = p * 3
      const ry = y - hookY
      pos[i] = x * cs - ry * sn
      pos[i + 1] = x * sn + ry * cs + hookY
      pos[i + 2] = z
      prev[i] = pos[i]
      prev[i + 1] = pos[i + 1]
      prev[i + 2] = pos[i + 2]
    }
    const { ca, cb, rest } = this
    const m = ca.length
    for (let it = 0; it < iterations; it++) {
      for (let c = 0; c < m; c++) {
        const a = ca[c]
        const b = cb[c]
        const ia = a * 3
        const ib = b * 3
        const dx = pos[ib] - pos[ia]
        const dy = pos[ib + 1] - pos[ia + 1]
        const dz = pos[ib + 2] - pos[ia + 2]
        const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6
        const diff = (len - rest[c]) / len
        const pa = pinned[a]
        const pb = pinned[b]
        if (pa && pb) continue
        const wa = pa ? 0 : pb ? 1 : 0.5
        const wb = pb ? 0 : pa ? 1 : 0.5
        pos[ia] += dx * diff * wa
        pos[ia + 1] += dy * diff * wa
        pos[ia + 2] += dz * diff * wa
        pos[ib] -= dx * diff * wb
        pos[ib + 1] -= dy * diff * wb
        pos[ib + 2] -= dz * diff * wb
      }
    }
    // keep cloth in front of the hanger plane-ish and off the wall
    for (let p = 0; p < n; p++) {
      const i = p * 3
      if (pos[i + 2] < -0.35) pos[i + 2] = -0.35
    }
    this.attr.needsUpdate = true
    this.geometry.computeVertexNormals()
  }
}
