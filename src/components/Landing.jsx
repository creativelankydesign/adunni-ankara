import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { PRODUCTS, naira } from '../lib/catalog.js'
import { SIZES } from '../lib/sizes.js'
import { garmentImage, swatchImage } from '../lib/images.js'
import RackScene, { layoutRack } from '../three/RackScene.jsx'
import { go } from '../App.jsx'

function hasWebGL() {
  try {
    const c = document.createElement('canvas')
    return !!(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

function Hero({ paused }) {
  const xs = useMemo(() => layoutRack(PRODUCTS), [])
  const bounds = [xs[0] + 0.9, xs[xs.length - 1] - 0.9]
  // start off to the left and glide in, so the clothes sway as the rail "arrives"
  const panRef = useRef({ x: bounds[0] - 3, target: bounds[0] + 1.8 })
  const [tip, setTip] = useState(null)
  const drag = useRef(null)
  const webgl = useMemo(hasWebGL, [])
  const copyRef = useRef()

  // the headline drifts up and fades as you scroll past the rail
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let raf
    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const y = Math.min(window.scrollY, 700)
        const el = copyRef.current
        if (!el) return
        el.style.transform = y ? `translateY(${y * -0.22}px)` : ''
        el.style.opacity = y ? String(Math.max(0, 1 - y / 520)) : ''
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(raf)
    }
  }, [])

  const nudge = (dir) => {
    panRef.current.target += dir * 1.6
  }

  return (
    <section className="hero">
      <div className="hero-copy" ref={copyRef}>
        <h1 data-reveal>
          Cut by hand.
          <br />
          <em>Made to be loved loudly.</em>
        </h1>
        <p className="lede" data-reveal style={{ '--d': '120ms' }}>
          Ankara gowns, two-pieces and kaftans sewn one at a time in Lagos, for every woman from UK 6 to 26.
        </p>
      </div>
      <p className="eyebrow hero-eyebrow" data-reveal style={{ '--d': '220ms' }}>
        <span>New on the rail · Harmattan ’26</span>
      </p>

      <div className="hero-rack">
        <div
          className="rack-stage"
          onPointerDown={(e) => {
            drag.current = { x: e.clientX }
          }}
          onPointerMove={(e) => {
            if (!drag.current || e.buttons === 0) return
            const dx = e.clientX - drag.current.x
            drag.current.x = e.clientX
            panRef.current.target -= (dx / e.currentTarget.clientWidth) * 4.5
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerLeave={() => {
            drag.current = null
            setTip(null)
          }}
          onWheel={(e) => {
            const d = e.shiftKey ? e.deltaY : e.deltaX
            if (Math.abs(d) > 0) panRef.current.target += d * 0.004
          }}
        >
          {webgl ? (
            <Suspense fallback={<div className="rack-loading">Hanging the clothes…</div>}>
              <RackScene products={PRODUCTS} panRef={panRef} onOpen={(id) => go(`/piece/${id}`)} onHover={setTip} paused={paused} />
            </Suspense>
          ) : (
            <div className="rack-loading">Your browser can’t show the 3D rack, but the full collection is just below.</div>
          )}
        </div>

        <button className="pan pan-left" onClick={() => nudge(-1)} aria-label="Slide the rail left">‹</button>
        <button className="pan pan-right" onClick={() => nudge(1)} aria-label="Slide the rail right">›</button>
        <p className="hero-hint">
          <span className="dot" /> Brush the fabric. Drag to slide the rail. Tap a piece to try it on.
        </p>
      </div>

      {tip && (
        <div className="rack-tip" style={{ left: tip.x, top: tip.y }}>
          <strong>{tip.product.name}</strong>
          <span>{tip.product.kind}</span>
          <span className="tip-price">{naira(tip.product.price)}</span>
        </div>
      )}
    </section>
  )
}

function Collection() {
  return (
    <section className="section" id="collection">
      <div className="section-head">
        <p className="eyebrow" data-reveal>The collection</p>
        <h2 data-reveal style={{ '--d': '80ms' }}>Ten pieces, ten stories</h2>
        <p data-reveal style={{ '--d': '160ms' }}>Each fabric is chosen by hand at Balogun and Ọ̀jà Ọba, and each piece is made only once it is ordered. That’s how we keep waste low and fit high.</p>
      </div>
      <div className="grid">
        {PRODUCTS.map((p, i) => (
          <a key={p.id} className="card" href={`#/piece/${p.id}`} data-reveal style={{ '--d': `${(i % 4) * 90}ms` }}>
            <div className="card-img" style={{ backgroundImage: `url(${swatchImage(p)})` }}>
              <div className="card-veil" />
              <img src={garmentImage(p)} alt={`${p.name}, ${p.kind}`} loading="lazy" />
            </div>
            <div className="card-body">
              <div>
                <h3>{p.name}</h3>
                <p>{p.kind}</p>
              </div>
              <span className="price">{naira(p.price)}</span>
            </div>
          </a>
        ))}
      </div>
    </section>
  )
}

function Story() {
  const steps = [
    ['Chosen', 'We walk the market at dawn and choose every six yards by hand: the colour, the weight, the smell of fresh wax.'],
    ['Cut', 'Mama Titi has been cutting Ankara for 31 years. She still lays every pattern so the motifs meet at the seams.'],
    ['Sewn', 'Our team of five sews each piece from start to finish. The same hands, all the way through.'],
    ['Sent', 'Wrapped in tissue with a handwritten note, and sent to you anywhere in Nigeria.'],
  ]
  return (
    <section className="section story" id="story">
      <div className="story-grid">
        <div>
          <p className="eyebrow" data-reveal>Our story</p>
          <h2 data-reveal style={{ '--d': '80ms' }}>From the market to your doorstep, by hand</h2>
          <blockquote data-reveal="left" style={{ '--d': '180ms' }}>
            “When a woman wears our cloth she should feel like her mother’s daughter and her own woman at the same time.”
            <cite>Adùnní, founder</cite>
          </blockquote>
        </div>
        <ol className="steps">
          {steps.map(([t, d], i) => (
            <li key={t} data-reveal="right" style={{ '--d': `${i * 110}ms` }}>
              <span className="step-n">0{i + 1}</span>
              <div>
                <h3>{t}</h3>
                <p>{d}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <div className="promises">
        <div data-reveal="zoom">
          <strong>Free alteration</strong>
          <span>within 14 days if the fit isn’t right</span>
        </div>
        <div data-reveal="zoom" style={{ '--d': '90ms' }}>
          <strong>Made to measure</strong>
          <span>send your measurements for ₦5,000 extra</span>
        </div>
        <div data-reveal="zoom" style={{ '--d': '180ms' }}>
          <strong>UK 6 – 26</strong>
          <span>every style, every size, same price</span>
        </div>
        <div data-reveal="zoom" style={{ '--d': '270ms' }}>
          <strong>Nationwide</strong>
          <span>Lagos, Abuja, PH, Ibadan, Enugu and beyond</span>
        </div>
      </div>
    </section>
  )
}

export function SizeTable({ highlight }) {
  return (
    <div className="size-table-wrap">
      <table className="size-table">
        <thead>
          <tr>
            <th>UK</th>
            <th>US</th>
            <th>Bust</th>
            <th>Waist</th>
            <th>Hips</th>
          </tr>
        </thead>
        <tbody>
          {SIZES.map((s) => (
            <tr key={s.uk} className={s.uk === highlight ? 'hl' : ''}>
              <td>{s.uk}</td>
              <td>{s.us}</td>
              <td>{s.bust}″</td>
              <td>{s.waist}″</td>
              <td>{s.hip}″</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SizeGuide() {
  return (
    <section className="section" id="sizes">
      <div className="size-guide">
        <div data-reveal="left">
          <p className="eyebrow">Size guide</p>
          <h2>Every body, UK 6 to 26</h2>
          <p>Measure over your underwear with a soft tape, keeping it snug but not tight.</p>
          <ul className="measure-list">
            <li><strong>Bust</strong>: around the fullest part of your chest.</li>
            <li><strong>Waist</strong>: around the narrowest part, usually just above the navel.</li>
            <li><strong>Hips</strong>: around the fullest part of your hips and bum.</li>
          </ul>
          <p>Between sizes? Choose the bigger one. We take in up to an inch for free. Or choose <em>made to measure</em> on any piece.</p>
        </div>
        <div data-reveal="right" style={{ '--d': '120ms' }}>
          <SizeTable />
        </div>
      </div>
    </section>
  )
}

export default function Landing({ paused }) {
  return (
    <main>
      <Hero paused={paused} />
      <Collection />
      <Story />
      <SizeGuide />
    </main>
  )
}
