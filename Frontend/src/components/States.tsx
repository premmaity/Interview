import { AlertCircle, LoaderCircle } from 'lucide-react'

import { ApiError } from '../lib/api'

export function LoadingState({ label = 'Loading' }: { label?: string }) {
  return (
    <div className="state-card" role="status" aria-live="polite">
      <LoaderCircle className="spin" aria-hidden="true" />
      <span>{label}…</span>
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : 'Something went wrong'
  const requestId = error instanceof ApiError ? error.requestId : undefined
  return (
    <div className="state-card error" role="alert">
      <AlertCircle aria-hidden="true" />
      <div>
        <strong>{message}</strong>
        {requestId && <small>Request ID: {requestId}</small>}
      </div>
      {onRetry && <button onClick={onRetry}>Try again</button>}
    </div>
  )
}

