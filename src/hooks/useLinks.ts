import { useEffect, useState } from 'react'
import { subscribeToLinks } from '../lib/links'
import type { LinkItem } from '../types/link'

interface UseLinksResult {
  links: LinkItem[]
  loading: boolean
  error: string | null
}

export function useLinks(): UseLinksResult {
  const [links, setLinks] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeToLinks(
      (nextLinks) => {
        setLinks(nextLinks)
        setLoading(false)
        setError(null)
      },
      (err) => {
        console.error('Error al leer los links desde Firestore:', err)
        setError('No se pudieron cargar los links. Intenta de nuevo más tarde.')
        setLoading(false)
      },
    )

    return unsubscribe
  }, [])

  return { links, loading, error }
}
