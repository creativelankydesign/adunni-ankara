import { BRAND, PHOTO_CREDITS } from '../lib/catalog.js'

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner" data-reveal>
        <div>
          <div className="footer-brand">{BRAND.full}</div>
          <p>{BRAND.meaning}. Every piece is cut, sewn and finished by hand in our studio in {BRAND.city}.</p>
        </div>
        <div>
          <h4>Talk to us</h4>
          <p>
            <a href={`https://wa.me/${BRAND.whatsapp}`} target="_blank" rel="noreferrer">WhatsApp</a> · <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
          </p>
          <p>Mon–Sat, 9am–6pm WAT</p>
        </div>
        <div>
          <h4>Delivery</h4>
          <p>Lagos in 1–3 days after your piece is ready. Everywhere else in Nigeria in 3–5 days. Free studio pickup in Surulere.</p>
        </div>
      </div>
      <p className="footer-note">
        Photos from Pexels:{' '}
        {PHOTO_CREDITS.map((url, i) => (
          <span key={url}>
            {i > 0 && ', '}
            <a href={url} target="_blank" rel="noreferrer">{i + 1}</a>
          </span>
        ))}
        .
      </p>
      <p className="footer-note">Demo store. Prices, products and payment are placeholders. No real payments are taken.</p>
    </footer>
  )
}
