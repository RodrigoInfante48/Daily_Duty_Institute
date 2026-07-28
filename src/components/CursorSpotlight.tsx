import { useEffect, useRef } from 'react'

/**
 * A soft radial glow that follows the mouse across the whole page.
 * Desktop-only affordance: fine-pointer check keeps it off on touch, where
 * there's no cursor to spotlight and the listener would just burn battery.
 */
export function CursorSpotlight() {
  const ref = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!window.matchMedia('(pointer: fine)').matches) return
    const el = ref.current
    if (!el) return

    let raf = 0

    function onMove(event: PointerEvent) {
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        el!.style.setProperty('--spot-x', `${event.clientX}px`)
        el!.style.setProperty('--spot-y', `${event.clientY}px`)
        el!.style.setProperty('--spot-opacity', '1')
      })
    }

    function onLeave() {
      el!.style.setProperty('--spot-opacity', '0')
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[1] transition-opacity duration-500"
      style={{
        opacity: 'var(--spot-opacity, 0)',
        background:
          'radial-gradient(600px circle at var(--spot-x, 50%) var(--spot-y, 50%), rgb(139 92 246 / 14%), rgb(34 211 238 / 7%) 35%, transparent 65%)',
      }}
    />
  )
}
