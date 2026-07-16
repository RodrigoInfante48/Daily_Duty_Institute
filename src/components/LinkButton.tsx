import type { LinkItem } from '../data/links'

export function LinkButton({ label, url, description }: LinkItem) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block w-full rounded-xl border border-neutral-200 bg-white px-5 py-4 text-center shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-700 dark:bg-neutral-900"
    >
      <span className="font-medium text-neutral-900 dark:text-neutral-100">
        {label}
      </span>
      {description && (
        <span className="block text-xs text-neutral-500 dark:text-neutral-400">
          {description}
        </span>
      )}
    </a>
  )
}
