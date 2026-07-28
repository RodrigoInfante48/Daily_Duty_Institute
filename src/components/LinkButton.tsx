import type { LinkItem } from '../types/link'
import { trackLinkClick } from '../lib/analytics'
import { Card } from './ui'

export function LinkButton({ id, icon, title, subtitle, url }: LinkItem) {
  return (
    <Card
      as="a"
      href={url}
      target="_blank"
      rel="noreferrer"
      hover
      onClick={() => trackLinkClick({ id, title, url })}
      className="flex w-full items-center gap-space-sm px-space-md py-space-sm text-left"
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-glass-strong text-xl transition-transform duration-300 ease-out group-hover:-rotate-6 group-hover:scale-110"
      >
        {icon}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="font-display text-base font-semibold text-ink">
          {title}
        </span>
        {subtitle && (
          <span className="mt-0.5 truncate text-sm text-ink-muted">
            {subtitle}
          </span>
        )}
      </span>
    </Card>
  )
}
