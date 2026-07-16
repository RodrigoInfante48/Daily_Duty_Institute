import type { ComponentPropsWithoutRef, ElementType } from 'react'
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

  return (
    <Component
      className={cn(
        'rounded-card border border-glass-border bg-glass shadow-glass backdrop-blur-xl',
        hover &&
          'transition duration-200 ease-out hover:-translate-y-0.5 hover:border-teal/30 hover:bg-glass-strong hover:shadow-glow-teal',
        className,
      )}
      {...props}
    />
  )
}
