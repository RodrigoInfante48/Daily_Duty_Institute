import { profile } from '../data/links'
import { Avatar } from './ui'
import { SocialLinks } from './SocialLinks'

export function ProfileHeader() {
  return (
    <header className="flex flex-col items-center gap-space-sm text-center">
      <Avatar size="lg" />
      <h1 className="font-display text-xl font-semibold text-ink">
        {profile.name}
      </h1>
      <p className="text-sm text-ink-muted">{profile.tagline}</p>
      <SocialLinks />
    </header>
  )
}
