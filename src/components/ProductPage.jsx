import { useEffect, useRef, useState } from 'react'
import Viewer from '../three/Viewer.jsx'
import { BRAND, PRODUCTS, naira, pexels, productById } from '../lib/catalog.js'
import { SIZES, recommendSize, sizeByUk } from '../lib/sizes.js'
import { CUSTOM_FEE, useCart } from '../lib/cart.jsx'
import { swatchImage } from '../lib/images.js'
import { go } from '../App.jsx'

const SIZE_KEY = 'adunni.size'

function FindMySize({ onPick }) {
  const [m, setM] = useState({ bust: '', waist: '', hip: '' })
  const [unit, setUnit] = useState('in')
  const conv = (v) => (v === '' ? 0 : unit === 'cm' ? Number(v) / 2.54 : Number(v))
  const ready = m.bust || m.waist || m.hip
  const rec = ready ? recommendSize({ bust: conv(m.bust), waist: conv(m.waist), hip: conv(m.hip) }) : null
  return (
    <div className="find-size">
      <div className="find-size-head">
        <strong>Find my size</strong>
        <div className="unit-toggle" role="group" aria-label="Units">
          {['in', 'cm'].map((u) => (
            <button key={u} className={unit === u ? 'on' : ''} onClick={() => setUnit(u)}>{u}</button>
          ))}
        </div>
      </div>
      <div className="find-size-fields">
        {['bust', 'waist', 'hip'].map((k) => (
          <label key={k}>
            <span>{k === 'hip' ? 'Hips' : k[0].toUpperCase() + k.slice(1)}</span>
            <input inputMode="decimal" placeholder={unit === 'in' ? '38' : '97'} value={m[k]} onChange={(e) => setM({ ...m, [k]: e.target.value.replace(/[^\d.]/g, '') })} />
          </label>
        ))}
      </div>
      {rec && (
        <button className="rec" onClick={() => onPick(rec.uk)}>
          We recommend <strong>UK {rec.uk}</strong>. Show it on the form →
        </button>
      )}
    </div>
  )
}

function PhotoGallery({ product }) {
  const [i, setI] = useState(0)
  const drag = useRef(null)
  const n = product.photos.length
  const go = (d) => setI((v) => (v + d + n) % n)
  return (
    <div
      className="gallery"
      onPointerDown={(e) => (drag.current = e.clientX)}
      onPointerUp={(e) => {
        if (drag.current != null && Math.abs(e.clientX - drag.current) > 40) go(e.clientX < drag.current ? 1 : -1)
        drag.current = null
      }}
    >
      <img className="gallery-bg" src={pexels(product.photos[i], 400)} alt="" aria-hidden="true" />
      {product.photos.map((id, k) => (
        <img key={id} className={'gallery-photo' + (k === i ? ' on' : '')} src={pexels(id, 1400)} alt={`${product.name}, photo ${k + 1} of ${n}`} draggable={false} />
      ))}
      {n > 1 && (
        <>
          <button className="gallery-nav prev" onClick={() => go(-1)} aria-label="Previous photo">‹</button>
          <button className="gallery-nav next" onClick={() => go(1)} aria-label="Next photo">›</button>
          <div className="gallery-thumbs">
            {product.photos.map((id, k) => (
              <button key={id} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Photo ${k + 1}`}>
                <img src={pexels(id, 160)} alt="" />
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function ProductPage({ id, onAdded }) {
  const product = productById(id) || PRODUCTS[0]
  const viewer = useRef()
  const { dispatch } = useCart()
  const [uk, setUk] = useState(() => {
    const saved = Number(localStorage.getItem(SIZE_KEY))
    return SIZES.some((s) => s.uk === saved) ? saved : 14
  })
  const [view, setView] = useState('front')
  const [mode, setMode] = useState('fit')
  const [qty, setQty] = useState(1)
  const [custom, setCustom] = useState(false)
  const [notes, setNotes] = useState('')
  const [added, setAdded] = useState(false)
  const size = sizeByUk(uk)

  useEffect(() => {
    try {
      localStorage.setItem(SIZE_KEY, String(uk))
    } catch {}
  }, [uk])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e) => e.key === 'Escape' && go('/')
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const choose = (v) => {
    setView(v)
    viewer.current?.view(v)
  }

  const add = () => {
    dispatch({ type: 'add', id: product.id, size: uk, qty, custom: custom ? notes || 'Measurements to follow on WhatsApp' : null })
    setAdded(true)
    setTimeout(() => {
      setAdded(false)
      onAdded()
    }, 650)
  }

  const unit = product.price + (custom ? CUSTOM_FEE : 0)
  const wa = `https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(
    `Hello ${BRAND.full}! I'd like to order "${product.name}" (${product.kind}), UK ${uk}, qty ${qty}${custom ? ', made to measure' : ''}. Total ${naira(unit * qty)}.`,
  )}`

  const idx = PRODUCTS.indexOf(product)
  const prev = PRODUCTS[(idx - 1 + PRODUCTS.length) % PRODUCTS.length]
  const next = PRODUCTS[(idx + 1) % PRODUCTS.length]

  return (
    <div className="pdp" role="dialog" aria-modal="true" aria-label={`${product.name}, ${product.kind}`}>
      <div className="pdp-stage" style={{ '--swatch': `url(${swatchImage(product)})` }}>
        {mode === 'photos' && product.photos ? (
          <PhotoGallery product={product} />
        ) : (
          <>
            <div className="pdp-glow" />
            <Viewer ref={viewer} product={product} size={size} />
            <div className="view-controls">
              {['front', 'side', 'back'].map((v) => (
                <button key={v} className={view === v ? 'on' : ''} onClick={() => choose(v)}>
                  {v[0].toUpperCase() + v.slice(1)}
                </button>
              ))}
              <button className="twirl" onClick={() => viewer.current?.twirl()}>Twirl ✦</button>
            </div>
            <p className="drag-hint">Drag to turn her around · scroll to look closer</p>
            <div className="fit-badge">
              <strong>UK {size.uk}</strong>
              <span>
                Bust {size.bust}″ · Waist {size.waist}″ · Hips {size.hip}″
              </span>
            </div>
          </>
        )}
        {product.photos && (
          <div className="mode-switch" role="tablist" aria-label="View">
            <button role="tab" aria-selected={mode === 'fit'} className={mode === 'fit' ? 'on' : ''} onClick={() => setMode('fit')}>
              3D · UK {size.uk}
            </button>
            <button role="tab" aria-selected={mode === 'photos'} className={mode === 'photos' ? 'on' : ''} onClick={() => setMode('photos')}>
              Photos
            </button>
          </div>
        )}
        <button className="pdp-close" onClick={() => go('/')} aria-label="Back to the rail">
          ← Back to the rail
        </button>
      </div>

      <aside className="pdp-info">
        <div className="pdp-nav">
          <a href={`#/piece/${prev.id}`}>‹ {prev.name}</a>
          <a href={`#/piece/${next.id}`}>{next.name} ›</a>
        </div>
        <p className="eyebrow">{product.kind}</p>
        <h1>{product.name}</h1>
        <p className="pdp-price">{naira(unit)}</p>
        <p className="pdp-story">{product.story}</p>

        <div className="pdp-block">
          <div className="pdp-label">
            <span>Size</span>
            <a href="#/" onClick={(e) => { e.preventDefault(); document.querySelector('.size-sheet')?.toggleAttribute('open') }}>Size chart</a>
          </div>
          <div className="size-chips" role="radiogroup" aria-label="UK size">
            {SIZES.map((s) => (
              <button key={s.uk} role="radio" aria-checked={uk === s.uk} className={uk === s.uk ? 'on' : ''} onClick={() => setUk(s.uk)}>
                {s.uk}
              </button>
            ))}
          </div>
          <input
            type="range"
            className="size-slider"
            min={0}
            max={SIZES.length - 1}
            value={SIZES.findIndex((s) => s.uk === uk)}
            onChange={(e) => setUk(SIZES[Number(e.target.value)].uk)}
            aria-label="Slide through sizes"
          />
          <details className="size-sheet">
            <summary>Size chart (inches)</summary>
            <table className="size-table compact">
              <thead><tr><th>UK</th><th>Bust</th><th>Waist</th><th>Hips</th></tr></thead>
              <tbody>
                {SIZES.map((s) => (
                  <tr key={s.uk} className={s.uk === uk ? 'hl' : ''}><td>{s.uk}</td><td>{s.bust}</td><td>{s.waist}</td><td>{s.hip}</td></tr>
                ))}
              </tbody>
            </table>
          </details>
          <FindMySize onPick={(v) => { setUk(v); setMode('fit') }} />
        </div>

        <label className="custom-toggle">
          <input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} />
          <span>
            <strong>Made to my measurements</strong> +{naira(CUSTOM_FEE)}
            <small>We’ll cut it to your exact body. Add notes or send measurements on WhatsApp.</small>
          </span>
        </label>
        {custom && (
          <textarea className="custom-notes" placeholder="e.g. Bust 44, waist 37, hips 50, height 5'6&quot;. Please make the sleeves a little longer." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
        )}

        <div className="buy-row">
          <div className="qty" aria-label="Quantity">
            <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Fewer">−</button>
            <span>{qty}</span>
            <button onClick={() => setQty(qty + 1)} aria-label="More">+</button>
          </div>
          <button className={'btn primary add' + (added ? ' added' : '')} onClick={add}>
            {added ? 'Added ✓' : `Add to bag · ${naira(unit * qty)}`}
          </button>
        </div>
        <a className="btn whatsapp" href={wa} target="_blank" rel="noreferrer">
          Order on WhatsApp instead
        </a>

        <ul className="pdp-details">
          {product.details.map((d) => (
            <li key={d}>{d}</li>
          ))}
          <li>Hand-made by {product.maker} · ready in about {product.days} working days</li>
        </ul>
      </aside>
    </div>
  )
}
