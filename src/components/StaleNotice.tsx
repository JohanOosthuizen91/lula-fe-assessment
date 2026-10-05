import { formatTime } from '../lib/format.ts'

/** Shown when a refresh fails but earlier data is still on screen: say so, and say how old it is. */
export function StaleNotice({ what, loadedAt, onRetry }: { what: string; loadedAt: number; onRetry: () => void }) {
  return (
    <div className="stale" role="status">
      <span>
        Couldn’t refresh {what}. Showing data loaded at {formatTime(loadedAt)}.
      </span>
      <button type="button" className="button button--quiet" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
