import type { LinkItem } from '../data/links'
import { Card } from './ui'

export function LinkButton({ icon, title, subtitle, url }: LinkItem) {
  return (
    <Card
      as="a"
      href={url}
      target="_blank"
      rel="noreferrer"
      hover
      className="flex w-full items-center gap-space-sm px-space-md py-space-sm text-left"
    >
      <span
        aria-hidden="true"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-glass-strong text-xl"
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
