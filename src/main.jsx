import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { CartProvider } from './lib/cart.jsx'
import { PRODUCTS } from './lib/catalog.js'
import { preloadFabrics } from './lib/fabrics.js'
import './styles.css'

// fabric photos must be ready before the rack and viewer build their textures
preloadFabrics(PRODUCTS).then(() =>
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <CartProvider>
        <App />
      </CartProvider>
    </StrictMode>,
  ),
)
