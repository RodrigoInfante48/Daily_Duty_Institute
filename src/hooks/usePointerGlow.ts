import { useCallback, useRef, type PointerEvent } from 'react'

/**
 * Imperatively drives --glow-x/--glow-y/--glow-opacity/--tilt-x/--tilt-y CSS
 * vars from the pointer position, skipping re-renders entirely (mousemove
 * fires far too often for React state). Touch is ignored: tilt/glow are a
 * hover-only affordance and touch has no hover.
 */
export function usePointerGlow<T extends HTMLElement>(maxTilt = 7) {
  const ref = useRef<T | null>(null)

  const handleMove = useCallback(
    (event: PointerEvent) => {
      const el = ref.current
      if (!el || event.pointerType !== 'mouse') return
      const rect = el.getBoundingClientRect()
      const px = (event.clientX - rect.left) / rect.width
      const py = (event.clientY - rect.top) / rect.height
      el.style.setProperty('--glow-x', `${px * 100}%`)
      el.style.setProperty('--glow-y', `${py * 100}%`)
      el.style.setProperty('--glow-opacity', '1')
      el.style.setProperty('--tilt-x', `${(0.5 - py) * maxTilt}deg`)
      el.style.setProperty('--tilt-y', `${(px - 0.5) * maxTilt}deg`)
    },
    [maxTilt],
  )

  const handleLeave = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--glow-opacity', '0')
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
  }, [])

  return { ref, handleMove, handleLeave }
}
