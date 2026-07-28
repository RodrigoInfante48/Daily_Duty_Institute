import type {
  AnchorHTMLAttributes,
  ButtonHTMLAttributes,
  ReactNode,
} from 'react'
import { cn } from '../../lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'glass'
type ButtonSize = 'sm' | 'md' | 'lg'

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[linear-gradient(135deg,var(--color-violet),var(--color-magenta)_55%,var(--color-cyan))] text-white shadow-glow-iris hover:brightness-110 hover:-translate-y-0.5',
  secondary:
    'bg-[linear-gradient(135deg,#f4f4f8,#c8c7d8_45%,#9392a8)] text-void-deep shadow-glow-chrome hover:brightness-105 hover:-translate-y-0.5',
  glass:
    'border border-glass-border bg-glass text-ink backdrop-blur-xl hover:border-violet/40 hover:bg-glass-strong hover:shadow-glow-iris hover:-translate-y-0.5',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-space-sm py-space-xs text-sm',
  md: 'px-space-md py-space-sm text-base',
  lg: 'px-space-lg py-space-md text-lg',
}

interface BaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children?: ReactNode
}

type ButtonAsButton = BaseProps &
  ButtonHTMLAttributes<HTMLButtonElement> & { href?: undefined }

type ButtonAsAnchor = BaseProps &
  AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }

export type ButtonProps = ButtonAsButton | ButtonAsAnchor

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 rounded-button font-display font-semibold tracking-tight transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet/50 focus-visible:ring-offset-2 focus-visible:ring-offset-void-deep',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )

  if (props.href) {
    const { href, ...anchorProps } = props as ButtonAsAnchor
    return (
      <a href={href} className={classes} {...anchorProps}>
        {children}
      </a>
    )
  }

  return (
    <button
      className={classes}
      {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
    >
      {children}
    </button>
  )
}
