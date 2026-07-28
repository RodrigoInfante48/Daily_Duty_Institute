import { useEffect, useRef } from 'react'

const NOISE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E"

/**
 * Fixed decorative layer: blurred color blobs + two organic morphing
 * shapes + a slow halo ring, each wrapped so the pointer/scroll-driven
 * parallax transform (set via CSS vars on .liquid-bg, read by .liquid-layer)
 * never fights the element's own keyframe animation on the same property.
 */
export function LiquidBackground() {
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    let raf = 0
    let px = 0.5
    let py = 0.5

    function apply() {
      raf = 0
      root!.style.setProperty('--px', String(px))
      root!.style.setProperty('--py', String(py))
      root!.style.setProperty('--sy', String(window.scrollY))
    }

    function schedule() {
      if (!raf) raf = requestAnimationFrame(apply)
    }

    function onPointerMove(event: PointerEvent) {
      if (event.pointerType !== 'mouse') return
      px = event.clientX / window.innerWidth
      py = event.clientY / window.innerHeight
      schedule()
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('scroll', schedule, { passive: true })
    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('scroll', schedule)
      if (raf) cancelAnimationFrame(raf)
    }
  }, [])

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="liquid-bg fixed inset-0 z-0 overflow-hidden bg-void-deep"
    >
      <div className="liquid-layer liquid-layer--1 absolute left-[-15%] top-[-15%] h-[60vw] w-[60vw] max-h-[560px] max-w-[560px]">
        <div className="animate-liquid-drift-1 h-full w-full rounded-full bg-violet/40 mix-blend-screen blur-[90px]" />
      </div>

      <div className="liquid-layer liquid-layer--2 absolute right-[-20%] top-[10%] h-[55vw] w-[55vw] max-h-[480px] max-w-[480px]">
        <div className="animate-liquid-drift-2 h-full w-full rounded-full bg-magenta/35 mix-blend-screen blur-[90px]" />
      </div>

      <div className="liquid-layer liquid-layer--3 absolute bottom-[-20%] left-[5%] h-[65vw] w-[65vw] max-h-[600px] max-w-[600px]">
        <div className="animate-liquid-drift-3 h-full w-full rounded-full bg-cyan/25 mix-blend-screen blur-[100px]" />
      </div>

      <div className="liquid-layer liquid-layer--ring absolute left-1/2 top-[6%] h-72 w-72 -translate-x-1/2">
        <div className="animate-halo-spin h-full w-full rounded-full border border-white/10" />
      </div>

      <div className="liquid-layer liquid-layer--shape1 absolute left-1/2 top-[9%] h-56 w-56 -translate-x-1/2">
        <div
          className="animate-shape-morph-1 h-full w-full blur-[6px]"
          style={{
            background:
              'linear-gradient(135deg, rgb(139 92 246 / 35%), rgb(34 211 238 / 20%))',
          }}
        />
      </div>

      <div className="liquid-layer liquid-layer--shape2 absolute bottom-[8%] right-[8%] h-40 w-40">
        <div
          className="animate-shape-morph-2 h-full w-full blur-[4px]"
          style={{
            background:
              'linear-gradient(135deg, rgb(236 72 153 / 25%), rgb(139 92 246 / 15%))',
          }}
        />
      </div>

      <div className="absolute inset-0 bg-void-deep/45" />
      <div
        className="absolute inset-0 opacity-[0.05] mix-blend-overlay"
        style={{ backgroundImage: `url("${NOISE}")` }}
      />
    </div>
  )
}
