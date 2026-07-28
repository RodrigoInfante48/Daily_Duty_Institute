import { useCallback, useRef, type PointerEvent } from 'react'

/**
 * Imperatively drives --glow-x/--glow-y/--glow-opacity/--tilt-x/--tilt-y CSS
 * vars from the pointer position, skipping re-renders entirely (mousemove
 * fires far too often for React state).
 *
 * Mouse gets the continuous follow-the-cursor version (pointermove).
 * Touch has no hover, so instead it gets a "press" version: the glow lands
 * where the finger touches down and fades out on release, via pointerdown/
 * pointerup/pointercancel rather than pointermove.
 */
export function usePointerGlow<T extends HTMLElement>(maxTilt = 7) {
  const ref = useRef<T | null>(null)

  const setFromEvent = useCallback(
    (event: PointerEvent) => {
      const el = ref.current
      if (!el) return
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

  const reset = useCallback(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--glow-opacity', '0')
    el.style.setProperty('--tilt-x', '0deg')
    el.style.setProperty('--tilt-y', '0deg')
  }, [])

  const handleMove = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      setFromEvent(event)
    },
    [setFromEvent],
  )

  const handleDown = useCallback(
    (event: PointerEvent) => {
      if (event.pointerType === 'mouse') return
      setFromEvent(event)
    },
    [setFromEvent],
  )

  return {
    ref,
    handleMove,
    handleLeave: reset,
    handleDown,
    handleUp: reset,
  }
}
