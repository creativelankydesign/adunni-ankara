import { useMemo } from 'react'
import { BRAND, naira, productById } from '../lib/catalog.js'
import { swatchImage } from '../lib/images.js'

export default function ThankYou({ orderId }) {
  const order = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('adunni.orders') || '{}')[orderId]
    } catch {
      return null
    }
  }, [orderId])

  if (!order) {
    return (
      <main className="thanks">
        <h1>We couldn’t find that order</h1>
        <a className="btn primary" href="#/">Back to the rail</a>
      </main>
    )
  }

  const first = order.items.map((i) => productById(i.id)).find(Boolean)
  const maker = first?.maker || 'Mama Titi'
  const status = {
    paid: 'Payment received (test mode).',
    'awaiting-transfer': `Waiting for your transfer of ${naira(order.total)}. Use ${order.id} as the narration.`,
    whatsapp: 'We’ve opened WhatsApp with your order. Send the message and we’ll confirm.',
  }[order.status]

  return (
    <main className="thanks">
      <div className="ribbon" aria-hidden="true">
        {order.items.map((i, k) => {
          const p = productById(i.id)
          return p ? <span key={k} style={{ backgroundImage: `url(${swatchImage(p)})` }} /> : null
        })}
      </div>
      <p className="eyebrow">Order {order.id}</p>
      <h1>Thank you, {order.customer.first}.</h1>
      <p className="lede">
        {maker} will start cutting your fabric tomorrow morning. You’ll get a WhatsApp photo when it’s on the sewing machine, and another when it’s ready to travel.
      </p>
      <p className="status">{status}</p>
      <div className="thanks-card">
        {order.items.map((i) => (
          <div className="row" key={i.key}>
            <span>
              {i.name} · UK {i.size} × {i.qty}
            </span>
          </div>
        ))}
        <div className="row"><span>Delivery: {order.delivery?.label}</span><span>{order.fee ? naira(order.fee) : 'Free'}</span></div>
        <div className="row total"><span>Total</span><strong>{naira(order.total)}</strong></div>
      </div>
      <div className="thanks-actions">
        <a className="btn primary" href="#/">Back to the rail</a>
        <a className="btn" href={`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent('Hello! Checking on order ' + order.id)}`} target="_blank" rel="noreferrer">
          Message us on WhatsApp
        </a>
      </div>
    </main>
  )
}
