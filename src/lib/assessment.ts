// Assessment logic: pure functions only. The attention rules and their thresholds live here and nowhere
// else; the reasons behind each rule are in the README.

import type { Assessment, BankStatement, CreditReport, ScoreItem } from '../api/types.ts'

/** Flag when monthly net movement is less than this share of monthly credits. A placeholder for analysts to tune. */
export const NET_SHARE_THRESHOLD = 0.1

/** Flag any category scoring less than this, out of 100. A placeholder for analysts to tune. */
export const CATEGORY_THRESHOLD = 40

/** The current assessment: newest createdDate, highest id on a tie. */
export function latestAssessment(assessments: readonly Assessment[]): Assessment | null {
  let latest: Assessment | null = null
  for (const assessment of assessments) {
    // YYYY-MM-DD strings sort in date order, so a string comparison is exact here.
    if (
      latest === null ||
      assessment.createdDate > latest.createdDate ||
      (assessment.createdDate === latest.createdDate && assessment.id > latest.id)
    ) {
      latest = assessment
    }
  }
  return latest
}

export type MonthlyFinancials = {
  /** The period the averages cover. */
  months: number
  credits: number
  debits: number
  /** Money in less money out; not profit. */
  net: number
  /** Net as a fraction of credits (0.07 is 7%); null when there were no credits. */
  netShareOfCredits: number | null
}

/** Monthly averages from period totals. Missing data gives null, never 0. */
export function monthlyFinancials(statement: BankStatement | null): MonthlyFinancials | null {
  if (statement === null) return null
  const { totalCredits, totalDebits, monthsAnalysed } = statement
  if (totalCredits === null || totalDebits === null || monthsAnalysed === null) return null

  const credits = totalCredits / monthsAnalysed
  const debits = totalDebits / monthsAnalysed
  const net = credits - debits
  return {
    months: monthsAnalysed,
    credits,
    debits,
    net,
    netShareOfCredits: credits === 0 ? null : net / credits,
  }
}

export type WeakCategory = { category: string; score: number }

export type AttentionReason =
  // Raised when rows are joined (src/lib/rows.ts), not by attentionReasons: more than one record came back
  // where one was expected (A7), so none is shown.
  | { code: 'conflicting-records'; records: 'credit reports' | 'bank statements'; count: number }
  | { code: 'no-assessment' }
  | { code: 'pending' }
  | { code: 'unrecognised-status'; raw: string }
  | { code: 'high-risk' }
  | { code: 'unrecognised-band'; raw: string }
  | { code: 'thin-file' }
  | { code: 'low-net-share'; netShareOfCredits: number | null }
  | { code: 'weak-categories'; categories: WeakCategory[] }

export type AttentionInput = {
  assessment: Assessment | null
  creditReport: CreditReport | null
  bankStatement: BankStatement | null
  scoreItems: readonly ScoreItem[]
}

/** Every reason this business needs a person to look, in a fixed order. Missing data never raises a flag on its own. */
export function attentionReasons({ assessment, creditReport, bankStatement, scoreItems }: AttentionInput): AttentionReason[] {
  const reasons: AttentionReason[] = []

  if (assessment === null) {
    reasons.push({ code: 'no-assessment' })
  } else if (assessment.status === 'Pending') {
    reasons.push({ code: 'pending' })
  } else if (typeof assessment.status === 'object') {
    reasons.push({ code: 'unrecognised-status', raw: assessment.status.unrecognised })
  }

  const band = creditReport?.riskBand ?? null
  if (band === 'High') {
    reasons.push({ code: 'high-risk' })
  } else if (band !== null && typeof band === 'object') {
    reasons.push({ code: 'unrecognised-band', raw: band.unrecognised })
  }

  if (creditReport?.isThinFile === true) reasons.push({ code: 'thin-file' })

  const monthly = monthlyFinancials(bankStatement)
  if (monthly !== null) {
    const share = monthly.netShareOfCredits
    if (share === null || share < NET_SHARE_THRESHOLD) {
      reasons.push({ code: 'low-net-share', netShareOfCredits: share })
    }
  }

  const weak = scoreItems
    .filter((item) => item.score < CATEGORY_THRESHOLD)
    .map(({ category, score }) => ({ category, score }))
    .sort((a, b) => a.score - b.score)
  if (weak.length > 0) reasons.push({ code: 'weak-categories', categories: weak })

  return reasons
}
