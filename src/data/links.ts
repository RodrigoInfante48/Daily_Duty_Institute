export interface LinkItem {
  id: string
  label: string
  url: string
  description?: string
}

export const profile = {
  name: 'Daily Duty Institute',
  tagline: 'Hábitos, disciplina y crecimiento diario.',
  avatarUrl: '/favicon.svg',
}

export const links: LinkItem[] = [
  {
    id: 'website',
    label: 'Sitio web',
    url: 'https://example.com',
    description: 'Conoce más sobre Daily Duty Institute',
  },
  {
    id: 'instagram',
    label: 'Instagram',
    url: 'https://instagram.com',
  },
  {
    id: 'youtube',
    label: 'YouTube',
    url: 'https://youtube.com',
  },
]
