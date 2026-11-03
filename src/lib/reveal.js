// Scroll reveal: anything marked data-reveal fades and rises into place the first
// time it scrolls into view. data-reveal="left" | "right" | "zoom" picks the motion,
// and a --d custom property staggers it. Elements added later (route changes,
// the product page) are picked up by a MutationObserver.
import { useEffect } from 'react'

export function useReveal() {
  useEffect(() => {
    const root = document.documentElement
    if (!('IntersectionObserver' in window)) return
    root.classList.add('js-reveal')
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue
          e.target.classList.add('in')
          io.unobserve(e.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    const scan = () => document.querySelectorAll('[data-reveal]:not(.in)').forEach((el) => io.observe(el))
    scan()
    const mo = new MutationObserver(scan)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      io.disconnect()
      mo.disconnect()
      root.classList.remove('js-reveal')
    }
  }, [])
}
