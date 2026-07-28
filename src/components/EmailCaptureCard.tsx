import { useEffect, useState, type FormEvent, type MouseEvent } from 'react'
import { Card, Button } from './ui'
import { submitLead } from '../lib/leads'
import { trackLeadCaptured, getUtmSource } from '../lib/analytics'

const DISMISSED_KEY = 'ddi_lead_capture_dismissed'
const SHOW_DELAY_MS = 3500
const AUTO_CLOSE_AFTER_SUCCESS_MS = 2500

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
  const [permanentlyDismissed, setPermanentlyDismissed] = useState(isDismissed)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [consent, setConsent] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  // Auto-open a few seconds in, independent of whether the link list is
  // still loading, errored, or empty — this used to live inside LinkList
  // and only rendered on the happy path, which is why it silently never
  // appeared on slow connections or Firestore errors.
  useEffect(() => {
    if (permanentlyDismissed) return
    const timer = window.setTimeout(() => setOpen(true), SHOW_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [permanentlyDismissed])

  useEffect(() => {
    if (!open) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
    }
  }, [open])

  useEffect(() => {
    if (status !== 'success') return
    const timer = window.setTimeout(() => setOpen(false), AUTO_CLOSE_AFTER_SUCCESS_MS)
    return () => window.clearTimeout(timer)
  }, [status])

  if (permanentlyDismissed || !open) {
    return null
  }

  function handleDismiss() {
    dismiss()
    setPermanentlyDismissed(true)
    setOpen(false)
  }

  function handleBackdropClick(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) handleDismiss()
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

  return (
    <div
      onClick={handleBackdropClick}
      className="animate-backdrop-in motion-reduce:animate-none fixed inset-0 z-50 flex items-end justify-center bg-void-deep/70 backdrop-blur-sm p-space-md sm:items-center"
    >
      <Card className="animate-sheet-up motion-reduce:animate-none relative flex w-full max-w-md flex-col gap-space-sm px-space-md py-space-md">
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Cerrar"
          className="absolute right-3 top-3 text-ink-muted transition hover:text-ink"
        >
          ✕
        </button>

        {status === 'success' ? (
          <div className="flex flex-col items-center gap-1 py-space-sm text-center">
            <p className="font-display text-base font-semibold text-ink">
              ¡Gracias por suscribirte!
            </p>
            <p className="text-sm text-ink-muted">
              Pronto vas a recibir contenido gratis en tu email.
            </p>
          </div>
        ) : (
          <>
            <div className="pr-6">
              <p className="font-display text-base font-semibold text-ink">
                Recibe contenido gratis
              </p>
              <p className="mt-0.5 text-sm text-ink-muted">
                Sumate a la lista y te avisamos cuando publiquemos algo nuevo.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-space-xs"
            >
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
          </>
        )}
      </Card>
    </div>
  )
}
