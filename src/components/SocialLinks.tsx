import { socials } from '../data/socials'
import { SocialGlyph } from './icons/SocialGlyphs'

export function SocialLinks() {
  return (
    <ul className="flex items-center gap-3">
      {socials.map((social) => (
        <li key={social.id}>
          <a
            href={social.url}
            target="_blank"
            rel="noreferrer"
            aria-label={social.label}
            title={social.label}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-glass-border bg-glass text-ink-muted backdrop-blur-xl transition duration-200 ease-out hover:-translate-y-0.5 hover:border-teal/40 hover:bg-glass-strong hover:text-teal hover:shadow-glow-teal"
          >
            <SocialGlyph platform={social.id} className="h-5 w-5" />
          </a>
        </li>
      ))}
    </ul>
  )
}
