import { profile } from '../data/links'
import { Avatar } from './ui'
import { SocialLinks } from './SocialLinks'

export function ProfileHeader() {
  return (
    <header className="flex flex-col items-center gap-space-sm text-center">
      <div className="animate-fade-up">
        <Avatar size="lg" />
      </div>
      <h1 className="animate-fade-up bg-[linear-gradient(135deg,var(--color-ink)_0%,var(--color-chrome)_45%,var(--color-ink)_100%)] bg-clip-text font-display text-xl font-semibold text-transparent [animation-delay:90ms]">
        {profile.name}
      </h1>
      <p className="animate-fade-up text-sm text-ink-muted [animation-delay:180ms]">
        {profile.tagline}
      </p>
      <div className="animate-fade-up [animation-delay:270ms]">
        <SocialLinks />
      </div>
    </header>
  )
}
