import type { ComponentPropsWithoutRef, ElementType } from 'react'
import { usePointerGlow } from '../../hooks/usePointerGlow'
import { cn } from '../../lib/utils'

type CardProps<T extends ElementType> = {
  as?: T
  hover?: boolean
} & Omit<ComponentPropsWithoutRef<T>, 'as'>

export function Card<T extends ElementType = 'div'>({
  as,
  hover = false,
  className,
  ...props
}: CardProps<T>) {
  const Component = as ?? 'div'
  const { ref, handleMove, handleLeave } = usePointerGlow<HTMLElement>()

  const interactiveProps = hover
    ? { ref, onPointerMove: handleMove, onPointerLeave: handleLeave }
    : {}

  return (
    <Component
      className={cn(
        'glass-sheen group relative overflow-hidden rounded-card border border-glass-border bg-glass shadow-glass backdrop-blur-xl',
        hover &&
          'tilt-card hover:border-violet/40 hover:bg-glass-strong hover:shadow-glow-iris',
        className,
      )}
      {...(interactiveProps as object)}
      {...props}
    />
  )
}
