// Shapes returned by the mock API. `null` means "not assessed yet" and must never be read as 0.

export type AssessmentStatus = 'Complete' | 'Pending'
export type RiskBand = 'Low' | 'Medium' | 'High'

/**
 * A text value the app doesn't recognise, such as a new band from the API. It's kept as the raw text,
 * shown in a neutral style and flagged for attention; it's never mapped onto a known value.
 */
export type Unrecognised = { unrecognised: string }

export type Business = {
  id: number
  name: string
  registrationNumber: string
  industry: string
}

export type Assessment = {
  id: number
  businessId: number
  /** Calendar date, YYYY-MM-DD. */
  createdDate: string
  status: AssessmentStatus | Unrecognised
}

export type CreditReport = {
  id: number
  assessmentId: number
  /** No fixed scale (confirmed by Lula). */
  score: number | null
  /** Pre-set by Lula; never derived from the score. */
  riskBand: RiskBand | Unrecognised | null
  isThinFile: boolean | null
}

export type BankStatement = {
  id: number
  assessmentId: number
  /** Total across monthsAnalysed months, in rand; not a monthly figure. */
  totalCredits: number | null
  /** Total across monthsAnalysed months, in rand; not a monthly figure. */
  totalDebits: number | null
  monthsAnalysed: number | null
}

export type ScoreItem = {
  id: number
  assessmentId: number
  category: string
  /** Out of 100, not weighted, and not a part of the overall score. */
  score: number
}
