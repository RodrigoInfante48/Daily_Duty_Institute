import { profile } from '../data/links'

export function ProfileHeader() {
  return (
    <header className="flex flex-col items-center gap-3 text-center">
      <img
        src={profile.avatarUrl}
        alt={profile.name}
        className="h-20 w-20 rounded-full border border-neutral-200 object-cover dark:border-neutral-700"
      />
      <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-100">
        {profile.name}
      </h1>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        {profile.tagline}
      </p>
    </header>
  )
}
