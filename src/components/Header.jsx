import { useEffect, useState } from 'react'
import { BRAND } from '../lib/catalog.js'
import { useCart } from '../lib/cart.jsx'

export default function Header({ onCart, solid }) {
  const { count } = useCart()
  const [menu, setMenu] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  useEffect(() => {
    const close = () => setMenu(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])
  const jump = (id) => (e) => {
    setMenu(false)
    if (window.location.hash.replace(/^#\/?/, '') === '') e.preventDefault()
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 30)
  }
  return (
    <header className={'site-header' + (solid ? ' solid' : '') + (scrolled ? ' scrolled' : '') + (menu ? ' menu-open' : '')}>
      <a className="logo" href="#/">
        <span className="logo-mark" aria-hidden="true" />
        <span>
          {BRAND.name}
          <small>Ankara · handmade in Lagos</small>
        </span>
      </a>
      <nav>
        <div className="nav-links" id="site-menu">
          <a href="#/" onClick={jump('collection')}>Collection</a>
          <a href="#/" onClick={jump('sizes')}>Size guide</a>
          <a href="#/" onClick={jump('story')}>Our story</a>
        </div>
        <button className="bag-btn" onClick={onCart} aria-label={`Open bag, ${count} items`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <path d="M5 8h14l-1 12H6L5 8Z" />
            <path d="M9 8V6a3 3 0 0 1 6 0v2" />
          </svg>
          <span className="bag-label">Bag</span>{count > 0 && <span className="bag-count">{count}</span>}
        </button>
        <button className="menu-btn" onClick={() => setMenu(!menu)} aria-expanded={menu} aria-controls="site-menu" aria-label={menu ? 'Close menu' : 'Open menu'}>
          <span />
          <span />
        </button>
      </nav>
    </header>
  )
}
