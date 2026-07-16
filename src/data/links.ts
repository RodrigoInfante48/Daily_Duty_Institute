export interface LinkItem {
  id: string
  icon: string
  title: string
  subtitle?: string
  url: string
}

export const profile = {
  name: 'Daily Duty',
  tagline: 'Hábitos, disciplina y crecimiento diario.',
}

export const links: LinkItem[] = [
  {
    id: 'website',
    icon: '🌐',
    title: 'Sitio web',
    subtitle: 'Conoce Daily Duty Institute',
    url: 'https://example.com',
  },
  {
    id: 'booking',
    icon: '📅',
    title: 'Agenda tu clase',
    subtitle: 'Reserva un cupo disponible',
    url: 'https://example.com/agenda',
  },
  {
    id: 'courses',
    icon: '📚',
    title: 'Cursos y programas',
    subtitle: 'Explora nuestra oferta académica',
    url: 'https://example.com/cursos',
  },
  {
    id: 'community',
    icon: '💬',
    title: 'Comunidad',
    subtitle: 'Únete al grupo de la comunidad',
    url: 'https://example.com/comunidad',
  },
]
