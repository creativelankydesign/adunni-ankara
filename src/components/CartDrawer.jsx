import { naira, productById } from '../lib/catalog.js'
import { lineTotal, useCart } from '../lib/cart.jsx'
import { garmentImage, swatchImage } from '../lib/images.js'
import { go } from '../App.jsx'

export function CartLines({ editable = true }) {
  const { items, dispatch } = useCart()
  return (
    <ul className="cart-lines">
      {items.map((it) => {
        const p = productById(it.id)
        if (!p) return null
        return (
          <li key={it.key}>
            <div className="thumb" style={{ backgroundImage: `url(${swatchImage(p)})` }}>
              <img src={garmentImage(p)} alt="" />
            </div>
            <div className="line-info">
              <strong>{p.name}</strong>
              <span>
                {p.kind} · UK {it.size}
                {it.custom ? ' · made to measure' : ''}
              </span>
              {editable ? (
                <div className="line-actions">
                  <div className="qty small">
                    <button onClick={() => dispatch({ type: 'qty', key: it.key, qty: it.qty - 1 })} aria-label="Fewer">−</button>
                    <span>{it.qty}</span>
                    <button onClick={() => dispatch({ type: 'qty', key: it.key, qty: it.qty + 1 })} aria-label="More">+</button>
                  </div>
                  <button className="link" onClick={() => dispatch({ type: 'remove', key: it.key })}>Remove</button>
                </div>
              ) : (
                <span>Qty {it.qty}</span>
              )}
            </div>
            <span className="line-total">{naira(lineTotal(it))}</span>
          </li>
        )
      })}
    </ul>
  )
}

export default function CartDrawer({ open, onClose }) {
  const { items, subtotal } = useCart()
  return (
    <div className={'drawer-wrap' + (open ? ' open' : '')} aria-hidden={!open}>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Your bag">
        <div className="drawer-head">
          <h2>Your bag</h2>
          <button className="link" onClick={onClose} aria-label="Close bag">Close ✕</button>
        </div>
        {items.length === 0 ? (
          <div className="empty">
            <p>Your bag is empty, but the rail is full.</p>
            <button className="btn" onClick={onClose}>Keep browsing</button>
          </div>
        ) : (
          <>
            <CartLines />
            <div className="drawer-foot">
              <div className="row">
                <span>Subtotal</span>
                <strong>{naira(subtotal)}</strong>
              </div>
              <p className="muted">Delivery is worked out at checkout. Every piece is made for you after you order.</p>
              <button className="btn primary block" onClick={() => go('/checkout')}>
                Checkout
              </button>
            </div>
          </>
        )}
      </aside>
    </div>
  )
}
