export type SocialPlatform = 'whatsapp' | 'linkedin' | 'github' | 'tiktok'

export interface SocialLink {
  id: SocialPlatform
  label: string
  url: string
}

export const socials: SocialLink[] = [
  { id: 'whatsapp', label: 'WhatsApp', url: 'https://wa.me/10000000000' },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    url: 'https://linkedin.com/company/daily-duty-institute',
  },
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com/daily-duty-institute',
  },
  { id: 'tiktok', label: 'TikTok', url: 'https://tiktok.com/@dailydutyinstitute' },
]
