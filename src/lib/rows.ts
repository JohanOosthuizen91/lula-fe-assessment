// Joins the API collections into one row per business: pure, so it can be tested without a server.

import type { Assessment, BankStatement, Business, CreditReport, ScoreItem } from '../api/types.ts'
import { ApiError } from '../api/client.ts'
import { attentionReasons, latestAssessment, monthlyFinancials } from './assessment.ts'
import type { AttentionReason, MonthlyFinancials } from './assessment.ts'

export type BusinessRow = {
  business: Business
  /** The current assessment (A6), or null if the business has none. */
  assessment: Assessment | null
  /** Null when there's no report, or when more than one came back (see reasons). */
  creditReport: CreditReport | null
  bankStatement: BankStatement | null
  scoreItems: ScoreItem[]
  monthly: MonthlyFinancials | null
  reasons: AttentionReason[]
}

export type Collections = {
  businesses: readonly Business[]
  assessments: readonly Assessment[]
  creditReports: readonly CreditReport[]
  bankStatements: readonly BankStatement[]
  scoreItems: readonly ScoreItem[]
}

/** The one record expected (A7). Zero gives null; more than one also gives null, with the count, so nothing is guessed. */
function onlyRecord<T>(records: readonly T[]): { record: T | null; count: number } {
  return { record: records.length === 1 ? (records[0] ?? null) : null, count: records.length }
}

export function buildBusinessRows(collections: Collections): BusinessRow[] {
  return collections.businesses.map((business) => {
    const assessment = latestAssessment(collections.assessments.filter((a) => a.businessId === business.id))
    if (assessment === null) {
      const empty = { assessment: null, creditReport: null, bankStatement: null, scoreItems: [] }
      return { business, ...empty, monthly: null, reasons: attentionReasons(empty) }
    }

    const reports = onlyRecord(collections.creditReports.filter((r) => r.assessmentId === assessment.id))
    const statements = onlyRecord(collections.bankStatements.filter((s) => s.assessmentId === assessment.id))
    const scoreItems = collections.scoreItems.filter((item) => item.assessmentId === assessment.id)

    const conflicts: AttentionReason[] = []
    if (reports.count > 1) conflicts.push({ code: 'conflicting-records', records: 'credit reports', count: reports.count })
    if (statements.count > 1) {
      conflicts.push({ code: 'conflicting-records', records: 'bank statements', count: statements.count })
    }

    const creditReport = reports.record
    const bankStatement = statements.record
    return {
      business,
      assessment,
      creditReport,
      bankStatement,
      scoreItems,
      monthly: monthlyFinancials(bankStatement),
      reasons: [...conflicts, ...attentionReasons({ assessment, creditReport, bankStatement, scoreItems })],
    }
  })
}

/**
 * For a detail section: the one record expected (A7), or null if there's none. More than one is an error the
 * section shows, rather than picking one.
 */
export function expectOne<T>(records: readonly T[], label: 'credit reports' | 'bank statements'): T | null {
  const { record, count } = onlyRecord(records)
  if (count > 1) {
    throw new ApiError('bad-shape', `Found ${count} ${label} for this assessment where one was expected, so none is shown.`)
  }
  return record
}
