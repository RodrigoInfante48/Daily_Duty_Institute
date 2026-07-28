import { profile } from '../data/links'
import { Avatar } from './ui'
import { SocialLinks } from './SocialLinks'

export function ProfileHeader() {
  return (
    <header className="flex flex-col items-center gap-space-sm text-center">
      <Avatar size="lg" />
      <h1 className="bg-[linear-gradient(135deg,var(--color-ink)_0%,var(--color-chrome)_45%,var(--color-ink)_100%)] bg-clip-text font-display text-xl font-semibold text-transparent">
        {profile.name}
      </h1>
      <p className="text-sm text-ink-muted">{profile.tagline}</p>
      <SocialLinks />
    </header>
  )
}
