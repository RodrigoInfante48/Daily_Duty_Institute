import type { ImgHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type AvatarSize = 'sm' | 'md' | 'lg'

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'h-10 w-10 text-sm',
  md: 'h-20 w-20 text-xl',
  lg: 'h-28 w-28 text-3xl',
}

interface AvatarProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src?: string
  size?: AvatarSize
  monogram?: string
}

export function Avatar({
  src,
  size = 'md',
  monogram = 'DD',
  className,
  alt = 'Daily Duty Institute',
  ...props
}: AvatarProps) {
  return (
    <div className={cn('relative shrink-0', sizeClasses[size], className)}>
      <div
        aria-hidden="true"
        className="animate-iris-spin absolute inset-[-3px] rounded-full bg-[conic-gradient(from_0deg,var(--color-violet),var(--color-magenta),var(--color-cyan),var(--color-violet))]"
      />
      <div className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-full border border-glass-border bg-void shadow-glow-iris">
        {src ? (
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            {...props}
          />
        ) : (
          <span className="bg-[linear-gradient(135deg,var(--color-violet),var(--color-cyan))] bg-clip-text font-display font-bold text-transparent">
            {monogram}
          </span>
        )}
      </div>
    </div>
  )
}
