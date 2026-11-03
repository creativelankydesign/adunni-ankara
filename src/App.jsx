import { useEffect, useState } from 'react'
import Header from './components/Header.jsx'
import Landing from './components/Landing.jsx'
import ProductPage from './components/ProductPage.jsx'
import CartDrawer from './components/CartDrawer.jsx'
import Checkout from './components/Checkout.jsx'
import ThankYou from './components/ThankYou.jsx'
import Footer from './components/Footer.jsx'
import { useReveal } from './lib/reveal.js'

function parseHash() {
  const h = window.location.hash.replace(/^#\/?/, '')
  const [page, arg] = h.split('/')
  return { page: page || 'home', arg }
}

export const go = (path) => {
  window.location.hash = path
}

export default function App() {
  const [route, setRoute] = useState(parseHash)
  const [cartOpen, setCartOpen] = useState(false)
  useReveal()

  useEffect(() => {
    const on = () => {
      setRoute(parseHash())
      setCartOpen(false)
    }
    window.addEventListener('hashchange', on)
    return () => window.removeEventListener('hashchange', on)
  }, [])

  useEffect(() => {
    if (route.page === 'checkout' || route.page === 'thank-you') window.scrollTo(0, 0)
  }, [route.page])

  const productOpen = route.page === 'piece'

  return (
    <>
      <Header onCart={() => setCartOpen(true)} solid={route.page !== 'home'} />
      {route.page === 'checkout' ? (
        <Checkout />
      ) : route.page === 'thank-you' ? (
        <ThankYou orderId={route.arg} />
      ) : (
        <Landing paused={productOpen} />
      )}
      <Footer />
      {productOpen && <ProductPage key={route.arg} id={route.arg} onAdded={() => setCartOpen(true)} />}
      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  )
}
