import type { LinkItem } from '../data/links'
import { Card } from './ui'

export function LinkButton({ label, url, description }: LinkItem) {
  return (
    <Card
      as="a"
      href={url}
      target="_blank"
      rel="noreferrer"
      hover
      className="block w-full px-space-md py-space-sm text-center"
    >
      <span className="font-display text-base font-semibold text-ink">
        {label}
      </span>
      {description && (
        <span className="mt-1 block text-xs text-ink-muted">
          {description}
        </span>
      )}
    </Card>
  )
}
