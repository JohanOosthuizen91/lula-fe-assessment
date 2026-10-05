import type { AssessmentStatus, RiskBand, Unrecognised } from '../api/types.ts'
import type { AttentionReason } from '../lib/assessment.ts'
import { reasonLabel } from '../lib/reasons.ts'

const BAND_CLASS: Record<RiskBand, string> = {
  Low: 'pill pill--low',
  Medium: 'pill pill--medium',
  High: 'pill pill--high',
}

/** The band as Lula sets it. An unrecognised band shows its raw text in a neutral style, never a guessed colour. */
export function RiskBandPill({ band }: { band: RiskBand | Unrecognised }) {
  if (typeof band === 'object') {
    return (
      <span className="pill pill--neutral" title="Not a band this dashboard recognises">
        {band.unrecognised} (unrecognised)
      </span>
    )
  }
  return <span className={BAND_CLASS[band]}>{band} risk</span>
}

export function StatusPill({ status }: { status: AssessmentStatus | Unrecognised | null }) {
  if (status === null) return <span className="pill pill--neutral">Not assessed</span>
  if (typeof status === 'object') return <span className="pill pill--neutral">{status.unrecognised} (unrecognised)</span>
  if (status === 'Pending') return <span className="pill pill--pending">Pending</span>
  return <span className="pill pill--plain">Complete</span>
}

export function ReasonChip({ reason }: { reason: AttentionReason }) {
  // Pending needs action rather than signalling risk, so it uses the pending colour, not the attention red.
  return <span className={reason.code === 'pending' ? 'chip chip--pending' : 'chip'}>{reasonLabel(reason)}</span>
}
