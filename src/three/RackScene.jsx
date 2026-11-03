import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Cloth } from './Cloth.js'
import { drawGarment, rackSize, shapeInfo } from './garmentTexture.js'
import { weaveTile } from '../lib/patterns.js'
import { cutoutImage } from '../lib/fabrics.js'
import { floorTexture, louvreGobo, plasterTexture } from './roomTextures.js'

const RAIL_Y = 1.98
const HOOK = 0.13

export function layoutRack(products) {
  const xs = []
  let x = 0
  products.forEach((p, i) => {
    if (i > 0) x += ((rackSize(products[i - 1]).w + rackSize(p).w) / 2) * 0.82 + 0.1
    xs.push(x)
  })
  const mid = (xs[0] + xs[xs.length - 1]) / 2
  return xs.map((v) => v - mid)
}

function Environment() {
  const { gl, scene } = useThree()
  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl)
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environment = env
    scene.environmentIntensity = 0.35
    return () => {
      env.dispose()
      pmrem.dispose()
    }
  }, [gl, scene])
  return null
}

function Room({ span }) {
  const wall = useMemo(plasterTexture, [])
  const floor = useMemo(floorTexture, [])
  return (
    <group>
      <mesh position={[0, 2.5, -0.95]} receiveShadow>
        <planeGeometry args={[span + 14, 6]} />
        <meshStandardMaterial map={wall} roughness={0.95} />
      </mesh>
      <mesh position={[0, 0.06, -0.93]} receiveShadow>
        <boxGeometry args={[span + 14, 0.12, 0.04]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 1.5]} receiveShadow>
        <planeGeometry args={[span + 14, 5]} />
        <meshStandardMaterial map={floor} roughness={0.55} />
      </mesh>
    </group>
  )
}

function Plant({ x }) {
  const leaves = useMemo(() => {
    const shape = new THREE.Shape()
    shape.moveTo(0, 0)
    shape.quadraticCurveTo(0.06, 0.35, 0.0, 0.85)
    shape.quadraticCurveTo(-0.06, 0.35, 0, 0)
    const g = new THREE.ShapeGeometry(shape, 12)
    return Array.from({ length: 9 }, (_, i) => ({
      g,
      rot: [((i % 3) - 1) * 0.18, (i / 9) * Math.PI * 2, ((i % 2) - 0.5) * 0.3],
      s: 0.75 + ((i * 37) % 10) / 25,
    }))
  }, [])
  return (
    <group position={[x, 0, -0.45]}>
      <mesh position={[0, 0.2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.2, 0.15, 0.4, 32]} />
        <meshStandardMaterial color="#b85a32" roughness={0.85} />
      </mesh>
      {leaves.map((l, i) => (
        <mesh key={i} geometry={l.g} position={[0, 0.38, 0]} rotation={l.rot} scale={l.s} castShadow>
          <meshStandardMaterial color={i % 2 ? '#2f6b3a' : '#3f7d3c'} side={THREE.DoubleSide} roughness={0.6} />
        </mesh>
      ))}
    </group>
  )
}

function Rail({ x0, x1 }) {
  const brass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#c08a38', metalness: 1, roughness: 0.32 }), [])
  const len = x1 - x0
  return (
    <group>
      <mesh position={[(x0 + x1) / 2, RAIL_Y, 0]} rotation-z={Math.PI / 2} material={brass} castShadow>
        <cylinderGeometry args={[0.018, 0.018, len, 20]} />
      </mesh>
      {[x0, x1].map((x) => (
        <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, RAIL_Y / 2, 0]} material={brass} castShadow>
            <cylinderGeometry args={[0.02, 0.02, RAIL_Y, 16]} />
          </mesh>
          <mesh position={[0, RAIL_Y, 0]} material={brass}>
            <sphereGeometry args={[0.032, 20, 16]} />
          </mesh>
          <mesh position={[0, 0.02, 0]} material={brass} castShadow>
            <boxGeometry args={[0.06, 0.04, 0.6]} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

const hangerGeo = (() => {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-0.22, -0.045, -0.02),
    new THREE.Vector3(-0.1, -0.012, -0.02),
    new THREE.Vector3(0, 0.005, -0.02),
    new THREE.Vector3(0.1, -0.012, -0.02),
    new THREE.Vector3(0.22, -0.045, -0.02),
  ])
  return new THREE.TubeGeometry(curve, 40, 0.012, 10, false)
})()

function HangingGarment({ product, x, z, env, onOpen, onHover, hoveredRef }) {
  const meshRef = useRef()
  const pivotRef = useRef()
  const swing = useRef({ a: 0, v: 0 })
  const last = useRef({ x: 0, y: 0, t: 0 })

  const { cloth, material, depthMat, mask } = useMemo(() => {
    const { w, l } = rackSize(product)
    const { shape } = product.rack
    const info = shapeInfo(shape)
    const drawn = drawGarment(product)
    const map = new THREE.CanvasTexture(drawn.canvas)
    map.colorSpace = THREE.SRGBColorSpace
    map.anisotropy = 8
    const bump = new THREE.CanvasTexture(weaveTile())
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping
    bump.repeat.set(w * 70, l * 70)
    const material = new THREE.MeshPhysicalMaterial({
      map,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.82,
      sheen: 0.5,
      sheenRoughness: 0.55,
      sheenColor: new THREE.Color('#ffe6c4'),
      bumpMap: bump,
      bumpScale: 0.35,
    })
    const depthMat = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map, alphaTest: 0.5 })
    const cloth = new Cloth({
      w,
      l,
      nx: shape === 'kaftan' ? 28 : 22,
      ny: Math.round(18 + l * 12),
      // a photographed garment already carries its own folds and shading
      folds: info.folds * (cutoutImage(product) ? 0.3 : 0.7),
      seed: product.pattern.seed + 3,
      hangerHalf: shape === 'kaftan' ? w * 0.4 : 0.21,
    })
    return { cloth, material, depthMat, mask: drawn }
  }, [product])

  const phase = useMemo(() => product.pattern.seed * 1.7, [product])

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const s = swing.current
    s.v += (-s.a * 28 - s.v * 2.2) / 60
    s.a += s.v / 60
    const breeze = 0.16 + env.current.breeze
    const wind = (wx, wy, tt) =>
      breeze * (Math.sin(tt * 0.8 + phase + wx * 2.0) * 0.9 + Math.sin(tt * 1.9 + phase * 1.3 + wy * 3.1) * 0.45 + Math.sin(tt * 0.31 + phase) * 0.6)
    cloth.step(1 / 60, t, wind, s.a, env.current.shove, 14)
    if (pivotRef.current) pivotRef.current.rotation.z = s.a
  })

  const visibleAt = (uv) => {
    if (!uv) return false
    const px = Math.min(mask.W - 1, Math.max(0, Math.floor(uv.x * mask.W)))
    const py = Math.min(mask.H - 1, Math.max(0, Math.floor((1 - uv.y) * mask.H)))
    return mask.mask[py * mask.W + px] > 100
  }

  const handleMove = (e) => {
    if (!visibleAt(e.uv)) {
      if (hoveredRef.current === product.id) {
        hoveredRef.current = null
        onHover(null)
      }
      return
    }
    e.stopPropagation()
    const now = performance.now()
    const L = last.current
    const dx = e.nativeEvent.clientX - L.x
    const dy = e.nativeEvent.clientY - L.y
    const dtm = Math.max(8, now - L.t)
    const speed = Math.min(3, Math.hypot(dx, dy) / dtm)
    L.x = e.nativeEvent.clientX
    L.y = e.nativeEvent.clientY
    L.t = now
    if (hoveredRef.current !== product.id) {
      hoveredRef.current = product.id
      swing.current.v += 0.12 * Math.sign(dx || 1)
    }
    // fingertips brushing the fabric
    cloth.poke(e.uv.x, 1 - e.uv.y, 0.0012 + speed * 0.0035, 0.16, Math.sign(dx) * 0.4)
    onHover({ product, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
  }

  const handleClick = (e) => {
    if (!visibleAt(e.uv) || e.delta > 6) return
    e.stopPropagation()
    cloth.poke(e.uv.x, 1 - e.uv.y, 0.02, 0.3)
    swing.current.v += 0.5
    onHover(null)
    setTimeout(() => onOpen(product.id), 420)
  }

  return (
    <group position={[x, RAIL_Y - HOOK - 0.012, z]}>
      <group position={[0, HOOK, 0]} ref={pivotRef}>
        <group position={[0, -HOOK, 0]}>
          <mesh geometry={hangerGeo} castShadow>
            <meshStandardMaterial color="#8a5a2b" roughness={0.45} />
          </mesh>
          <mesh position={[0, 0.06, -0.02]}>
            <cylinderGeometry args={[0.004, 0.004, 0.1, 8]} />
            <meshStandardMaterial color="#c9b48a" metalness={1} roughness={0.3} />
          </mesh>
          <mesh position={[0, HOOK, -0.02]} rotation={[0, Math.PI / 2, 0]}>
            <torusGeometry args={[0.026, 0.004, 8, 24, Math.PI * 1.35]} />
            <meshStandardMaterial color="#c9b48a" metalness={1} roughness={0.3} />
          </mesh>
        </group>
      </group>
      <mesh
        ref={meshRef}
        geometry={cloth.geometry}
        material={material}
        customDepthMaterial={depthMat}
        castShadow
        receiveShadow
        onPointerMove={handleMove}
        onPointerOut={() => {
          if (hoveredRef.current === product.id) {
            hoveredRef.current = null
            onHover(null)
          }
        }}
        onClick={handleClick}
      />
    </group>
  )
}

function CameraRig({ pan, env, bounds }) {
  const { camera, size } = useThree()
  const sunRef = useRef()
  const goboRef = useRef()
  const vel = useRef(0)
  const gobo = useMemo(louvreGobo, [])
  const mouse = useRef([0, 0])
  useEffect(() => {
    const mm = (e) => {
      mouse.current = [(e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1]
    }
    window.addEventListener('pointermove', mm)
    return () => window.removeEventListener('pointermove', mm)
  }, [])
  useEffect(() => {
    // frame the rail top to hem; on narrow screens step back so a couple of garments still fit
    const aspect = size.width / size.height
    const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    camera.position.z = Math.max(2.35 / (2 * t), 1.9 / (2 * t * aspect))
    camera.updateProjectionMatrix()
  }, [camera, size])

  useFrame(() => {
    const p = pan.current
    p.target = Math.min(bounds[1], Math.max(bounds[0], p.target))
    const prevX = p.x
    p.x += (p.target - p.x) * 0.045
    const v = p.x - prevX
    const accel = v - vel.current
    vel.current = v
    env.current.shove = THREE.MathUtils.clamp(-accel * 1500, -2.5, 2.5)
    env.current.breeze = Math.min(0.5, Math.abs(v) * 12)
    camera.position.x = p.x + mouse.current[0] * 0.12
    camera.position.y = 1.24 - mouse.current[1] * 0.06
    camera.lookAt(p.x, 1.2, 0)
    if (sunRef.current) {
      sunRef.current.position.set(p.x - 2.5, 4.2, 3)
      sunRef.current.target.position.set(p.x, 1, -0.9)
      sunRef.current.target.updateMatrixWorld()
    }
    if (goboRef.current) {
      goboRef.current.position.set(p.x * 0.6 - 3.2, 3.6, 2.5)
      goboRef.current.target.position.set(p.x * 0.6 + 0.6, 2.2, -0.95)
      goboRef.current.target.updateMatrixWorld()
    }
  })

  return (
    <>
      <hemisphereLight args={['#ffffff', '#e6ded4', 1.5]} />
      <directionalLight
        ref={sunRef}
        color="#fff2e0"
        intensity={1.5}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-4.5}
        shadow-camera-right={4.5}
        shadow-camera-top={3.2}
        shadow-camera-bottom={-1}
        shadow-camera-near={0.5}
        shadow-camera-far={12}
        shadow-bias={-0.0004}
        shadow-normalBias={0.02}
      />
      <spotLight ref={goboRef} map={gobo} color="#ffcf8f" intensity={3.2} angle={0.55} penumbra={0.4} decay={0} distance={0} />
      <directionalLight position={[3, 2, 5]} intensity={0.45} color="#ffeedd" />
    </>
  )
}

export default function RackScene({ products, onOpen, onHover, panRef, paused }) {
  const xs = useMemo(() => layoutRack(products), [products])
  const x0 = xs[0] - 0.55
  const x1 = xs[xs.length - 1] + 0.55
  const bounds = [xs[0] + 0.9, xs[xs.length - 1] - 0.9]
  const env = useRef({ shove: 0, breeze: 0 })
  const hoveredRef = useRef(null)

  return (
    <Canvas
      shadows
      frameloop={paused ? 'never' : 'always'}
      dpr={[1, 2]}
      camera={{ fov: 34, position: [bounds[0] - 3, 1.2, 4.7], near: 0.1, far: 40 }}
      gl={{ antialias: true }}
      onCreated={({ gl, scene }) => {
        gl.toneMapping = THREE.ACESFilmicToneMapping
        gl.toneMappingExposure = 1.12
        gl.shadowMap.type = THREE.PCFSoftShadowMap
        scene.background = new THREE.Color('#ffffff')
        scene.fog = new THREE.Fog('#ffffff', 8, 18)
      }}
      onPointerMissed={() => onHover(null)}
    >
      <Environment />
      <Room span={x1 - x0} />
      <Rail x0={x0} x1={x1} />
      <Plant x={x0 - 0.7} />
      <Plant x={x1 + 0.7} />
      {products.map((p, i) => (
        <HangingGarment
          key={p.id}
          product={p}
          x={xs[i]}
          z={i % 2 ? -0.05 : 0.03}
          env={env}
          onOpen={onOpen}
          onHover={onHover}
          hoveredRef={hoveredRef}
        />
      ))}
      <CameraRig pan={panRef} env={env} bounds={bounds} />
    </Canvas>
  )
}
