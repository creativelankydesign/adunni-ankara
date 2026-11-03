import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { weaveTile } from '../lib/patterns.js'
import { fabricMeters, fabricTile } from '../lib/fabrics.js'
import {
  COLS,
  LAND,
  STYLES,
  bodyKeys,
  formRowsY,
  pieceIndex,
  pieceRows,
  pieceUV,
  shoulderPoint,
  surfaceAt,
  writeForm,
  writePiece,
} from './body.js'

const FORM_COLS = 65

function useFabric(product) {
  return useMemo(() => {
    const map = new THREE.CanvasTexture(fabricTile(product, 512))
    map.colorSpace = THREE.SRGBColorSpace
    map.wrapS = map.wrapT = THREE.RepeatWrapping
    // garment UVs are laid out in 0.2 m units
    const k = 0.2 / fabricMeters(product)
    map.repeat.set(k, k)
    map.anisotropy = 8
    const bump = new THREE.CanvasTexture(weaveTile())
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping
    bump.repeat.set(120, 120)
    const fabric = new THREE.MeshPhysicalMaterial({
      map,
      bumpMap: bump,
      bumpScale: 0.3,
      roughness: 0.8,
      sheen: 0.6,
      sheenRoughness: 0.5,
      sheenColor: new THREE.Color('#ffe6c4'),
      side: THREE.DoubleSide,
    })
    const accent = new THREE.MeshPhysicalMaterial({
      color: product.accent,
      roughness: 0.55,
      sheen: 1,
      sheenColor: new THREE.Color('#ffffff'),
      sheenRoughness: 0.35,
      side: THREE.DoubleSide,
    })
    return { fabric, accent }
  }, [product])
}

function Piece({ piece, keysRef, motionRef, material }) {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    const rows = pieceRows(piece)
    const pos = new Float32Array(rows * COLS * 3)
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('uv', new THREE.BufferAttribute(pieceUV(piece), 2))
    g.setIndex(pieceIndex(piece))
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.9, 0), 1.5)
    return g
  }, [piece])
  useFrame(() => {
    const pos = geo.attributes.position
    writePiece(piece, keysRef.current, pos.array, motionRef.current)
    pos.needsUpdate = true
    geo.computeVertexNormals()
  })
  useEffect(() => () => geo.dispose(), [geo])
  return <mesh geometry={geo} material={material} castShadow receiveShadow />
}

function DressForm({ keysRef }) {
  const ys = useMemo(formRowsY, [])
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(ys.length * FORM_COLS * 3), 3))
    const idx = []
    for (let r = 0; r < ys.length - 1; r++) {
      for (let c = 0; c < FORM_COLS - 1; c++) {
        const a = r * FORM_COLS + c
        idx.push(a, a + FORM_COLS, a + 1, a + 1, a + FORM_COLS, a + FORM_COLS + 1)
      }
    }
    g.setIndex(idx)
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1.2, 0), 0.8)
    return g
  }, [ys])
  const last = useRef(null)
  useFrame(() => {
    if (last.current === keysRef.current) return
    last.current = keysRef.current
    writeForm(keysRef.current, geo.attributes.position.array, ys, FORM_COLS)
    geo.attributes.position.needsUpdate = true
    geo.computeVertexNormals()
  })
  const jersey = useMemo(() => {
    const bump = new THREE.CanvasTexture(weaveTile())
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping
    bump.repeat.set(40, 40)
    return new THREE.MeshPhysicalMaterial({ color: '#2d2421', roughness: 0.9, sheen: 0.4, sheenColor: new THREE.Color('#a08070'), bumpMap: bump, bumpScale: 0.2 })
  }, [])
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c08a38', metalness: 1, roughness: 0.3 }), [])
  const wood = useMemo(() => new THREE.MeshStandardMaterial({ color: '#5a3216', roughness: 0.5 }), [])
  return (
    <group>
      <mesh geometry={geo} material={jersey} castShadow receiveShadow />
      <mesh position={[0, LAND.neckTop + 0.02, 0]} material={wood} castShadow>
        <sphereGeometry args={[0.035, 24, 16]} />
      </mesh>
      <mesh position={[0, LAND.formBottom / 2, 0]} material={brass} castShadow>
        <cylinderGeometry args={[0.012, 0.012, LAND.formBottom, 12]} />
      </mesh>
      {[0, 1, 2].map((k) => (
        <mesh key={k} position={[Math.sin((k * Math.PI * 2) / 3) * 0.13, 0.03, Math.cos((k * Math.PI * 2) / 3) * 0.13]} rotation={[0, (k * Math.PI * 2) / 3, 0]} material={wood} castShadow>
          <boxGeometry args={[0.04, 0.03, 0.3]} />
        </mesh>
      ))}
    </group>
  )
}

function Puffs({ keysRef, material, r }) {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(1, 48, 32)
    const p = g.attributes.position
    const v = new THREE.Vector3()
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i)
      // gathers radiating from the shoulder seam
      const a = Math.atan2(v.z, v.x)
      const g1 = 1 + 0.06 * Math.sin(a * 16) * (1 - Math.abs(v.y))
      v.x *= g1
      v.z *= g1
      if (v.y < -0.55) v.multiplyScalar(0.92) // the cuff band
      p.setXYZ(i, v.x, v.y, v.z)
    }
    g.computeVertexNormals()
    return g
  }, [])
  const L = useRef()
  const R = useRef()
  useFrame(() => {
    const [sx, sy] = shoulderPoint(keysRef.current)
    const grow = 1 + (sx - 0.172) * 2.5
    for (const [ref, side] of [[L, -1], [R, 1]]) {
      if (!ref.current) continue
      ref.current.position.set(side * (sx + r[0] * 0.55), sy - 0.045, 0)
      ref.current.scale.set(r[0] * grow, r[1] * grow, r[2] * grow)
      ref.current.rotation.set(0, 0, side * 0.35)
    }
  })
  return (
    <>
      <mesh ref={L} geometry={geo} material={material} castShadow />
      <mesh ref={R} geometry={geo} material={material} castShadow />
    </>
  )
}

function Band({ piece, keysRef, y, h = 0.04, material, out = 0.006 }) {
  const ref = useRef()
  const geo = useMemo(() => new THREE.CylinderGeometry(1, 1, h, 64, 1, true), [h])
  useFrame(() => {
    const p = surfaceAt(piece, keysRef.current, y, Math.PI / 2)
    const f = surfaceAt(piece, keysRef.current, y, 0)
    if (ref.current) ref.current.scale.set(p[0] + out, 1, f[2] + out * 0.6)
  })
  return <mesh ref={ref} geometry={geo} material={material} position={[0, y, 0]} castShadow />
}

function Bow({ piece, keysRef, y, material }) {
  const ref = useRef()
  useFrame(() => {
    const b = surfaceAt(piece, keysRef.current, y, Math.PI)
    if (ref.current) ref.current.position.set(0, y, b[2] - 0.012)
  })
  return (
    <group ref={ref}>
      {[-1, 1].map((s) => (
        <mesh key={s} material={material} position={[s * 0.055, 0.005, -0.01]} rotation={[0, 0, s * 0.25]} scale={[1.6, 0.85, 0.5]} castShadow>
          <torusGeometry args={[0.032, 0.012, 12, 32]} />
        </mesh>
      ))}
      <mesh material={material} scale={[1, 0.9, 0.6]} position={[0, 0, -0.012]}>
        <sphereGeometry args={[0.02, 16, 12]} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={'t' + s} material={material} position={[s * 0.03, -0.11, -0.012]} rotation={[0, 0, s * 0.18]} castShadow>
          <boxGeometry args={[0.035, 0.2, 0.004]} />
        </mesh>
      ))}
    </group>
  )
}

function Zip({ piece, keysRef }) {
  const ref = useRef()
  const last = useRef(null)
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1c1410', roughness: 0.6 }), [])
  useFrame(() => {
    if (!ref.current || last.current === keysRef.current) return
    last.current = keysRef.current
    const yTop = LAND.neck - (piece.neckline?.[1] || 0) - 0.005
    const yEnd = Math.max(piece.hem + 0.02, 0.9)
    const pts = []
    for (let k = 0; k <= 24; k++) {
      const y = yTop - ((yTop - yEnd) * k) / 24
      const p = surfaceAt(piece, keysRef.current, y, Math.PI)
      pts.push(new THREE.Vector3(p[0], p[1], p[2] - 0.002))
    }
    const old = ref.current.geometry
    ref.current.geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.0025, 6, false)
    old?.dispose()
  })
  return <mesh ref={ref} material={mat} />
}

function Garment({ product, keysRef, motionRef }) {
  const style = STYLES[product.style] || STYLES.mini
  const { fabric, accent } = useFabric(product)
  const main = style.pieces.find((p) => p.top === 'neck') || style.pieces[0]
  const banded = style.pieces.find((p) => p.band)
  return (
    <group>
      {style.pieces.map((piece, i) => (
        <Piece key={product.id + i} piece={piece} keysRef={keysRef} motionRef={motionRef} material={fabric} />
      ))}
      {style.pieces.filter((p) => p.zip).map((p, i) => (
        <Zip key={'z' + i} piece={p} keysRef={keysRef} />
      ))}
      {style.puff && <Puffs keysRef={keysRef} material={fabric} r={style.puff.r} />}
      {(style.belt || style.sash) && <Band piece={main} keysRef={keysRef} y={LAND.waist} material={accent} h={style.sash ? 0.055 : 0.04} />}
      {style.sash && <Bow piece={main} keysRef={keysRef} y={LAND.waist} material={accent} />}
      {banded && <Band piece={banded} keysRef={keysRef} y={banded.top - 0.018} h={0.04} material={fabric} out={0.008} />}
    </group>
  )
}

function Environment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.5
    return () => {
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function Stage({ product, size, ctl }) {
  const group = useRef()
  const keysRef = useRef(bodyKeys(size))
  const meas = useRef({ ...size })
  const motionRef = useRef({ t: 0, twist: 0, flareBoost: 0 })
  const { camera } = useThree()

  useFrame((state, delta) => {
    const dt = Math.min(delta, 1 / 30)
    const c = ctl.current
    // morph measurements toward the selected size
    const m = meas.current
    let moving = false
    for (const k of ['bust', 'waist', 'hip']) {
      const d = size[k] - m[k]
      if (Math.abs(d) > 0.01) {
        m[k] += d * Math.min(1, dt * 6)
        moving = true
      } else m[k] = size[k]
    }
    if (moving || !keysRef.current) keysRef.current = bodyKeys(m)

    // rotation: drag, inertia, or spring toward a chosen view
    if (!c.dragging) {
      if (c.target != null) {
        let diff = c.target - c.angle
        diff = Math.atan2(Math.sin(diff), Math.cos(diff))
        c.vel += (diff * 40 - c.vel * 9) * dt
        if (Math.abs(diff) < 0.002 && Math.abs(c.vel) < 0.01) c.target = null
      } else {
        c.vel *= Math.pow(c.twirl ? 0.55 : 0.12, dt)
        if (Math.abs(c.vel) < 0.3) c.twirl = false
        if (c.idle && Math.abs(c.vel) < 0.15) c.vel += (0.15 - c.vel) * dt
      }
      c.angle += c.vel * dt
    }
    group.current.rotation.y = c.angle

    const mo = motionRef.current
    mo.t = state.clock.elapsedTime
    // the skirt lags behind the spin and swings out
    mo.twist += (c.vel * 0.11 - mo.twist) * Math.min(1, dt * 4)
    mo.flareBoost += (Math.min(0.28, c.vel * c.vel * 0.004) - mo.flareBoost) * Math.min(1, dt * 3)

    // camera zoom
    const dist = c.zoom
    camera.position.lerp(new THREE.Vector3(0, 0.82 + (3.8 - dist) * 0.22, dist), 0.1)
    camera.lookAt(0, 0.74 + (3.8 - dist) * 0.24, 0)
  })

  return (
    <>
      <Environment />
      <hemisphereLight args={['#fff1de', '#6b3a22', 0.7]} />
      <directionalLight
        position={[1.2, 4.6, 2.2]}
        intensity={2.2}
        color="#ffe2bf"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={2}
        shadow-camera-bottom={-0.5}
        shadow-bias={-0.0003}
        shadow-normalBias={0.02}
      />
      <directionalLight position={[-3, 2, -2.5]} intensity={1.1} color="#9fc0ff" />
      <directionalLight position={[-2, 1.2, 3]} intensity={0.4} color="#ffffff" />
      <group ref={group}>
        <DressForm keysRef={keysRef} />
        <Garment key={product.id} product={product} keysRef={keysRef} motionRef={motionRef} />
      </group>
      <mesh rotation-x={-Math.PI / 2} receiveShadow>
        <circleGeometry args={[1.4, 64]} />
        <shadowMaterial opacity={0.28} />
      </mesh>
    </>
  )
}

/**
 * 3D try-on viewer. Exposes view('front'|'side'|'back'), twirl() via ref.
 */
const Viewer = forwardRef(function Viewer({ product, size }, ref) {
  const ctl = useRef({ angle: 0, vel: 0, target: null, dragging: false, zoom: 3.8, idle: false, twirl: false })
  const drag = useRef(null)

  useImperativeHandle(ref, () => ({
    view(name) {
      const map = { front: 0, side: Math.PI / 2, back: Math.PI }
      ctl.current.target = map[name] ?? 0
      ctl.current.idle = false
    },
    twirl() {
      ctl.current.target = null
      ctl.current.twirl = true
      ctl.current.vel = 11
    },
    zoom(z) {
      ctl.current.zoom = z
    },
  }))

  const onDown = (e) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, t: performance.now() }
    ctl.current.dragging = true
    ctl.current.target = null
    ctl.current.vel = 0
  }
  const onMove = (e) => {
    if (!drag.current) return
    const now = performance.now()
    const dx = e.clientX - drag.current.x
    const dt = Math.max(1, now - drag.current.t) / 1000
    const dA = dx * 0.012
    ctl.current.angle += dA
    ctl.current.vel = ctl.current.vel * 0.5 + (dA / dt) * 0.5
    drag.current = { x: e.clientX, t: now }
  }
  const onUp = () => {
    drag.current = null
    ctl.current.dragging = false
  }
  const onWheel = (e) => {
    ctl.current.zoom = Math.min(3.8, Math.max(1.6, ctl.current.zoom + e.deltaY * 0.002))
  }

  return (
    <div className="viewer-canvas" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onWheel={onWheel}>
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ fov: 30, position: [0, 0.9, 3.8], near: 0.05, far: 20 }}
        gl={{ antialias: true, alpha: true }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.05
          gl.shadowMap.type = THREE.PCFSoftShadowMap
        }}
      >
        <Stage product={product} size={size} ctl={ctl} />
      </Canvas>
    </div>
  )
})

export default Viewer
