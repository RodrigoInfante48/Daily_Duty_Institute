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
    <div
      className={cn(
        'relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-glass-border bg-gradient-to-br from-teal to-gold shadow-glow-teal',
        sizeClasses[size],
        className,
      )}
    >
      {src ? (
        <img
          src={src}
          alt={alt}
          className="h-full w-full object-cover"
          {...props}
        />
      ) : (
        <span className="font-display font-bold text-navy-deep">
          {monogram}
        </span>
      )}
    </div>
  )
}
