export type SocialPlatform = 'whatsapp' | 'linkedin' | 'github' | 'tiktok'

export interface SocialLink {
  id: SocialPlatform
  label: string
  url: string
}

export const socials: SocialLink[] = [
  {
    id: 'whatsapp',
    label: 'WhatsApp',
    url: 'https://api.whatsapp.com/send?phone=573209974750',
  },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    url: 'https://www.linkedin.com/in/rodrigo-infante-00141a1a2/',
  },
  {
    id: 'github',
    label: 'GitHub',
    url: 'https://github.com/RodrigoInfante48',
  },
  { id: 'tiktok', label: 'TikTok', url: 'https://www.tiktok.com/@dailyduty.8' },
]
