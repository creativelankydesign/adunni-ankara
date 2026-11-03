import { useMemo, useState } from 'react'
import { BRAND, naira, productById } from '../lib/catalog.js'
import { useCart } from '../lib/cart.jsx'
import { CartLines } from './CartDrawer.jsx'
import { go } from '../App.jsx'

export const STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT – Abuja', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo',
  'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara',
]

function deliveryOptions(state) {
  if (!state) return []
  if (state === 'Lagos')
    return [
      { id: 'lagos', label: 'Lagos doorstep delivery', note: '1–3 days after your piece is ready', fee: 3500 },
      { id: 'pickup', label: 'Pick up at our Surulere studio', note: 'We’ll call when it’s ready', fee: 0 },
    ]
  const near = ['Ogun', 'Oyo', 'Osun', 'Ondo', 'Ekiti', 'FCT – Abuja', 'Rivers', 'Edo', 'Delta', 'Enugu', 'Anambra']
  return [
    { id: 'standard', label: 'Courier to your door', note: '3–5 days after your piece is ready', fee: near.includes(state) ? 6000 : 8500 },
    { id: 'park', label: 'Collect at the nearest courier office', note: '3–5 days, we’ll send the address', fee: near.includes(state) ? 4000 : 5500 },
  ]
}

const PAYMENTS = [
  { id: 'paystack', label: 'Card, bank or USSD with Paystack', note: 'Test mode in this demo' },
  { id: 'flutterwave', label: 'Flutterwave', note: 'Test mode in this demo' },
  { id: 'transfer', label: 'Bank transfer', note: 'We confirm within 1 hour' },
  { id: 'whatsapp', label: 'Order on WhatsApp', note: 'Chat with us to confirm and pay' },
]

const phoneOk = (p) => /^(\+?234|0)[789][01]\d{8}$/.test(p.replace(/[\s-]/g, ''))
const emailOk = (e) => !e || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)

function saveOrder(order) {
  try {
    const all = JSON.parse(localStorage.getItem('adunni.orders') || '{}')
    all[order.id] = order
    localStorage.setItem('adunni.orders', JSON.stringify(all))
  } catch {}
}

function PayModal({ method, total, onCancel, onPaid }) {
  const [stage, setStage] = useState('ready')
  const pay = () => {
    setStage('processing')
    setTimeout(onPaid, 1600)
  }
  const name = method === 'flutterwave' ? 'Flutterwave' : 'Paystack'
  return (
    <div className="modal-wrap">
      <div className="modal" role="dialog" aria-label={`${name} test payment`}>
        <div className={'pay-brand ' + method}>{name}</div>
        <span className="test-pill">TEST MODE · no money moves</span>
        <p className="pay-amount">{naira(total)}</p>
        <p className="muted">
          In the live store this window is the {name} inline checkout (card, bank transfer or USSD). Here it simulates a successful payment.
        </p>
        {stage === 'processing' ? (
          <div className="processing">
            <span className="spinner" /> Confirming payment…
          </div>
        ) : (
          <div className="modal-actions">
            <button className="btn primary block" onClick={pay}>Simulate successful payment</button>
            <button className="link" onClick={onCancel}>Cancel</button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function Checkout() {
  const { items, subtotal, dispatch } = useCart()
  const [f, setF] = useState({ first: '', last: '', phone: '', email: '', state: '', city: '', address: '', landmark: '', note: '' })
  const [delivery, setDelivery] = useState('')
  const [payment, setPayment] = useState('paystack')
  const [errors, setErrors] = useState({})
  const [paying, setPaying] = useState(false)

  const opts = useMemo(() => deliveryOptions(f.state), [f.state])
  const chosen = opts.find((o) => o.id === delivery) || null
  const fee = chosen?.fee ?? 0
  const total = subtotal + fee
  const set = (k) => (e) => {
    setF({ ...f, [k]: e.target.value })
    if (k === 'state') setDelivery('')
  }

  if (items.length === 0) {
    return (
      <main className="checkout empty-checkout">
        <h1>Your bag is empty</h1>
        <p>Go back to the rail and find something that makes you smile.</p>
        <a className="btn primary" href="#/">Back to the rail</a>
      </main>
    )
  }

  const validate = () => {
    const e = {}
    if (!f.first.trim()) e.first = 'Please tell us your first name'
    if (!f.last.trim()) e.last = 'Please tell us your surname'
    if (!phoneOk(f.phone)) e.phone = 'Use a Nigerian number, e.g. 0803 123 4567'
    if (!emailOk(f.email)) e.email = 'That email doesn’t look right'
    if (!f.state) e.state = 'Choose your state'
    if (delivery !== 'pickup') {
      if (!f.city.trim()) e.city = 'Which city or LGA?'
      if (!f.address.trim()) e.address = 'Where should we deliver?'
    }
    if (!delivery) e.delivery = 'Choose how you’d like to receive it'
    setErrors(e)
    if (Object.keys(e).length) {
      const first = document.querySelector(`[name="${Object.keys(e)[0]}"]`)
      first?.focus()
      return false
    }
    return true
  }

  const finish = (status) => {
    const id = 'ADN-' + Math.random().toString(36).slice(2, 7).toUpperCase()
    saveOrder({
      id,
      status,
      payment,
      customer: f,
      delivery: chosen,
      items: items.map((i) => ({ ...i, name: productById(i.id)?.name })),
      subtotal,
      fee,
      total,
      at: new Date().toISOString(),
    })
    dispatch({ type: 'clear' })
    go(`/thank-you/${id}`)
  }

  const submit = (e) => {
    e.preventDefault()
    if (!validate()) return
    if (payment === 'paystack' || payment === 'flutterwave') setPaying(true)
    else if (payment === 'transfer') finish('awaiting-transfer')
    else {
      const lines = items.map((i) => `• ${productById(i.id)?.name}, UK ${i.size} x${i.qty}${i.custom ? ' (made to measure)' : ''}`).join('\n')
      const text = `Hello ${BRAND.full}! I'd like to order:\n${lines}\nTotal ${naira(total)} incl. delivery (${chosen.label}).\nName: ${f.first} ${f.last}\nState: ${f.state}`
      window.open(`https://wa.me/${BRAND.whatsapp}?text=${encodeURIComponent(text)}`, '_blank', 'noopener')
      finish('whatsapp')
    }
  }

  const Field = ({ name, label, children, wide }) => (
    <label className={'field' + (wide ? ' wide' : '') + (errors[name] ? ' bad' : '')}>
      <span>{label}</span>
      {children}
      {errors[name] && <em>{errors[name]}</em>}
    </label>
  )

  return (
    <main className="checkout">
      <form className="checkout-form" onSubmit={submit} noValidate>
        <a href="#/" className="back-link">← Keep shopping</a>
        <h1>Checkout</h1>

        <fieldset>
          <legend>1 · Who is it for?</legend>
          <div className="fields">
            {Field({ name: 'first', label: 'First name', children: <input name="first" autoComplete="given-name" value={f.first} onChange={set('first')} /> })}
            {Field({ name: 'last', label: 'Surname', children: <input name="last" autoComplete="family-name" value={f.last} onChange={set('last')} /> })}
            {Field({ name: 'phone', label: 'Phone (WhatsApp if possible)', children: <input name="phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" value={f.phone} onChange={set('phone')} /> })}
            {Field({ name: 'email', label: 'Email (optional)', children: <input name="email" type="email" autoComplete="email" value={f.email} onChange={set('email')} /> })}
          </div>
        </fieldset>

        <fieldset>
          <legend>2 · Where should it go?</legend>
          <div className="fields">
            {Field({
              name: 'state',
              label: 'State',
              children: (
                <select name="state" value={f.state} onChange={set('state')}>
                  <option value="">Choose a state…</option>
                  {STATES.map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              ),
            })}
            {Field({ name: 'city', label: 'City / LGA', children: <input name="city" autoComplete="address-level2" placeholder="e.g. Ikeja" value={f.city} onChange={set('city')} /> })}
            {Field({ name: 'address', label: 'Street address', wide: true, children: <input name="address" autoComplete="street-address" placeholder="House number, street" value={f.address} onChange={set('address')} /> })}
            {Field({ name: 'landmark', label: 'Nearest landmark (helps the rider)', wide: true, children: <input name="landmark" placeholder="e.g. opposite the filling station" value={f.landmark} onChange={set('landmark')} /> })}
          </div>
          {opts.length > 0 && (
            <div className={'options' + (errors.delivery ? ' bad' : '')} role="radiogroup" aria-label="Delivery">
              {opts.map((o) => (
                <label key={o.id} className={'option' + (delivery === o.id ? ' on' : '')}>
                  <input type="radio" name="delivery" checked={delivery === o.id} onChange={() => setDelivery(o.id)} />
                  <span>
                    <strong>{o.label}</strong>
                    <small>{o.note}</small>
                  </span>
                  <b>{o.fee ? naira(o.fee) : 'Free'}</b>
                </label>
              ))}
              {errors.delivery && <em>{errors.delivery}</em>}
            </div>
          )}
        </fieldset>

        <fieldset>
          <legend>3 · How would you like to pay?</legend>
          <div className="options" role="radiogroup" aria-label="Payment">
            {PAYMENTS.map((p) => (
              <label key={p.id} className={'option' + (payment === p.id ? ' on' : '')}>
                <input type="radio" name="payment" checked={payment === p.id} onChange={() => setPayment(p.id)} />
                <span>
                  <strong>{p.label}</strong>
                  <small>{p.note}</small>
                </span>
              </label>
            ))}
          </div>
          {payment === 'transfer' && (
            <div className="transfer-box">
              <p>After you place the order, transfer <strong>{naira(total)}</strong> to:</p>
              <p className="acct">
                Adùnní Ankara Ltd · Demo Bank · <code>0000000000</code>
              </p>
              <p className="muted">Placeholder account. Use your order number as the narration.</p>
            </div>
          )}
          <label className="field wide">
            <span>A note for the tailor (optional)</span>
            <textarea rows={2} value={f.note} onChange={set('note')} placeholder="It’s for my sister’s wedding on the 20th 💛" />
          </label>
        </fieldset>
        <button className="btn primary block big" type="submit">
          {payment === 'whatsapp' ? 'Send my order on WhatsApp' : payment === 'transfer' ? 'Place order' : `Pay ${naira(total)}`}
        </button>
        <p className="muted center">Test store. No real payment will be taken.</p>
      </form>

      <aside className="summary">
        <h2>Order summary</h2>
        <CartLines editable={false} />
        <div className="row"><span>Subtotal</span><span>{naira(subtotal)}</span></div>
        <div className="row"><span>Delivery</span><span>{chosen ? (fee ? naira(fee) : 'Free') : '—'}</span></div>
        <div className="row total"><span>Total</span><strong>{naira(total)}</strong></div>
      </aside>

      {paying && <PayModal method={payment} total={total} onCancel={() => setPaying(false)} onPaid={() => finish('paid')} />}
    </main>
  )
}
