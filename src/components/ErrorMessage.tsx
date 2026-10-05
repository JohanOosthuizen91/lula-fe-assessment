import { API_START_COMMAND, ApiError } from '../api/client.ts'

/** A plain-language error, with the next step when there is one, and a retry button. */
export function ErrorMessage({ title, error, onRetry }: { title: string; error: unknown; onRetry?: () => void }) {
  const unreachable = error instanceof ApiError && error.kind === 'unreachable'
  const detail = error instanceof Error ? error.message : 'Something went wrong.'
  return (
    <div className="error" role="alert">
      <p className="error-title">{title}</p>
      <p>{detail}</p>
      {unreachable ? (
        <p>
          Is the API running? Start it with <code>{API_START_COMMAND}</code>
        </p>
      ) : null}
      {onRetry ? (
        <button type="button" className="button" onClick={onRetry}>
          Try again
        </button>
      ) : null}
    </div>
  )
}
