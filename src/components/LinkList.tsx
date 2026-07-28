import { useLinks } from '../hooks/useLinks'
import { LinkButton } from './LinkButton'
import { EmailCaptureCard } from './EmailCaptureCard'
import { Card, Button, Reveal } from './ui'

function LinkListSkeleton() {
  return (
    <ul className="flex w-full flex-col gap-3" aria-hidden="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <li key={index}>
          <Card className="flex h-[4.25rem] w-full items-center gap-space-sm px-space-md py-space-sm">
            <span className="h-11 w-11 shrink-0 animate-pulse rounded-full bg-glass-strong" />
            <span className="flex min-w-0 flex-1 flex-col gap-2">
              <span className="h-3.5 w-2/3 animate-pulse rounded-full bg-glass-strong" />
              <span className="h-3 w-1/3 animate-pulse rounded-full bg-glass-strong" />
            </span>
          </Card>
        </li>
      ))}
    </ul>
  )
}

export function LinkList() {
  const { links, loading, error } = useLinks()

  if (loading) {
    return <LinkListSkeleton />
  }

  if (error) {
    return (
      <Card className="flex w-full flex-col items-center gap-space-sm px-space-md py-space-lg text-center">
        <p className="text-sm text-ink-muted">{error}</p>
        <Button
          variant="glass"
          size="sm"
          onClick={() => window.location.reload()}
        >
          Reintentar
        </Button>
      </Card>
    )
  }

  if (links.length === 0) {
    return (
      <div className="flex w-full flex-col gap-3">
        <Card className="flex w-full items-center justify-center px-space-md py-space-lg text-center">
          <p className="text-sm text-ink-muted">
            Todavía no hay links disponibles.
          </p>
        </Card>
        <EmailCaptureCard />
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-3">
      <ul className="flex w-full flex-col gap-3">
        {links.map((link, index) => (
          <li key={link.id}>
            <Reveal delay={index * 70}>
              <LinkButton {...link} />
            </Reveal>
          </li>
        ))}
      </ul>
      <Reveal delay={links.length * 70}>
        <EmailCaptureCard />
      </Reveal>
    </div>
  )
}
