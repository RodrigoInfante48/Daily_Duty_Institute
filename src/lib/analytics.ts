import { logEvent } from 'firebase/analytics'
import { analyticsReady } from './firebase'

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_content'] as const

function getUtmParams() {
  const params = new URLSearchParams(window.location.search)

  return UTM_PARAMS.reduce<Record<string, string>>((utm, key) => {
    const value = params.get(key)
    if (value) utm[key] = value
    return utm
  }, {})
}

export function getUtmSource(): string | null {
  return new URLSearchParams(window.location.search).get('utm_source')
}

export async function trackPageView() {
  const analytics = await analyticsReady
  if (!analytics) return

  logEvent(analytics, 'page_view', {
    page_location: window.location.href,
    page_path: window.location.pathname,
    page_title: document.title,
    ...getUtmParams(),
  })
}

interface TrackableLink {
  id: string
  title: string
  url: string
}

export async function trackLinkClick({ id, title, url }: TrackableLink) {
  const analytics = await analyticsReady
  if (!analytics) return

  logEvent(analytics, 'link_click', {
    link_id: id,
    link_title: title,
    destination_url: url,
  })
}

export async function trackLeadCaptured(sourceUtm: string | null) {
  const analytics = await analyticsReady
  if (!analytics) return

  logEvent(analytics, 'lead_captured', {
    source_utm: sourceUtm,
  })
}
