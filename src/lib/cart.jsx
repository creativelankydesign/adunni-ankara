import { createContext, useContext, useEffect, useMemo, useReducer } from 'react'
import { productById } from './catalog.js'

const CartContext = createContext(null)
const KEY = 'adunni.cart.v1'

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

function reducer(items, action) {
  switch (action.type) {
    case 'add': {
      const key = `${action.id}|${action.size}|${action.custom ? 'c' : ''}`
      const found = items.find((i) => i.key === key)
      if (found) return items.map((i) => (i.key === key ? { ...i, qty: i.qty + action.qty } : i))
      return [...items, { key, id: action.id, size: action.size, custom: action.custom || null, qty: action.qty }]
    }
    case 'qty':
      return items.map((i) => (i.key === action.key ? { ...i, qty: Math.max(1, action.qty) } : i))
    case 'remove':
      return items.filter((i) => i.key !== action.key)
    case 'clear':
      return []
    default:
      return items
  }
}

export const CUSTOM_FEE = 5000

export function lineTotal(item) {
  const p = productById(item.id)
  return ((p?.price || 0) + (item.custom ? CUSTOM_FEE : 0)) * item.qty
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, undefined, load)
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {}
  }, [items])
  const value = useMemo(() => {
    const count = items.reduce((n, i) => n + i.qty, 0)
    const subtotal = items.reduce((n, i) => n + lineTotal(i), 0)
    return { items, count, subtotal, dispatch }
  }, [items])
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)
