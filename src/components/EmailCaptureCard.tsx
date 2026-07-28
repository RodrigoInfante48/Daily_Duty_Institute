import { useState, type FormEvent } from 'react'
import { Card, Button } from './ui'
import { submitLead } from '../lib/leads'
import { trackLeadCaptured, getUtmSource } from '../lib/analytics'

const DISMISSED_KEY = 'ddi_lead_capture_dismissed'

function isDismissed() {
  try {
    return localStorage.getItem(DISMISSED_KEY) === '1'
  } catch {
    return false
  }
}

function dismiss() {
  try {
    localStorage.setItem(DISMISSED_KEY, '1')
  } catch {
    // localStorage no disponible (modo privado, etc.) — no es crítico.
  }
}

type Status = 'idle' | 'submitting' | 'success' | 'error'

export function EmailCaptureCard() {
  const [hidden, setHidden] = useState(isDismissed)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  if (hidden) {
    return null
  }

  function handleDismiss() {
    dismiss()
    setHidden(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!consent || status === 'submitting') return

    setStatus('submitting')

    try {
      await submitLead({ email })
      trackLeadCaptured(getUtmSource())
      dismiss()
      setStatus('success')
    } catch (err) {
      console.error('Error al guardar el lead:', err)
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <Card className="flex w-full flex-col items-center gap-1 px-space-md py-space-lg text-center">
        <p className="font-display text-base font-semibold text-ink">
          ¡Gracias por suscribirte!
        </p>
        <p className="text-sm text-ink-muted">
          Pronto vas a recibir contenido gratis en tu email.
        </p>
      </Card>
    )
  }

  return (
    <Card className="relative flex w-full flex-col gap-space-sm px-space-md py-space-md">
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Cerrar"
        className="absolute right-3 top-3 text-ink-muted transition hover:text-ink"
      >
        ✕
      </button>

      <div className="pr-6">
        <p className="font-display text-base font-semibold text-ink">
          Recibe contenido gratis
        </p>
        <p className="mt-0.5 text-sm text-ink-muted">
          Sumate a la lista y te avisamos cuando publiquemos algo nuevo.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-space-xs">
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="tu@email.com"
          aria-label="Email"
          className="w-full rounded-button border border-glass-border bg-glass-strong px-space-sm py-space-xs text-sm text-ink placeholder-ink-muted outline-none focus-visible:ring-2 focus-visible:ring-violet/50"
        />

        <label className="flex items-start gap-2 text-xs text-ink-muted">
          <input
            type="checkbox"
            required
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-glass-border bg-glass-strong accent-violet"
          />
          Acepto recibir contenido por email.
        </label>

        {status === 'error' && (
          <p className="text-xs text-amber">
            No pudimos guardar tu email. Intenta de nuevo.
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!consent || status === 'submitting'}
          className="disabled:pointer-events-none disabled:opacity-40"
        >
          {status === 'submitting' ? 'Enviando…' : 'Quiero recibirlo'}
        </Button>
      </form>
    </Card>
  )
}
