// Whether the attention rules could all be checked. An all-clear is only ever given when every section loaded
// and had the data its rules need.

import type { Assessment, BankStatement, CreditReport, ScoreItem } from '../api/types.ts'
import { attentionReasons, monthlyFinancials } from './assessment.ts'
import type { AttentionReason } from './assessment.ts'

export type SectionLoad<T> = { status: 'loaded'; data: T } | { status: 'failed' } | { status: 'loading' }

export type AttentionSection = 'credit report' | 'bank statement' | 'category scores'

/** The rules that depend on each section, in plain words. */
export const RULES_BY_SECTION: Record<AttentionSection, readonly string[]> = {
  'credit report': ['risk band', 'thin file'],
  'bank statement': ['monthly net'],
  'category scores': ['categories'],
}

/** Why a section's rules couldn't be checked: it didn't load, or it loaded without the data the rules need. */
export type Unchecked = { section: AttentionSection; why: 'failed' | 'empty' }

export type AttentionCheck =
  | { kind: 'checking' }
  | { kind: 'clear' }
  | { kind: 'flagged'; reasons: AttentionReason[]; unchecked: Unchecked[] }
  | { kind: 'not-fully-checked'; unchecked: Unchecked[] }

export type AttentionCheckInput = {
  assessment: Assessment
  creditReport: SectionLoad<CreditReport | null>
  bankStatement: SectionLoad<BankStatement | null>
  scoreItems: SectionLoad<ScoreItem[]>
}

function loaded<T>(section: SectionLoad<T>, fallback: T): T {
  return section.status === 'loaded' ? section.data : fallback
}

// Loaded, but without what the section's rules need. Missing data never raises a flag, so it must not pass as checked.
const isEmpty = {
  'credit report': (report: CreditReport | null) => report === null || report.riskBand === null || report.isThinFile === null,
  'bank statement': (statement: BankStatement | null) => monthlyFinancials(statement) === null,
  'category scores': (items: ScoreItem[]) => items.length === 0,
}

export function checkAttention({ assessment, creditReport, bankStatement, scoreItems }: AttentionCheckInput): AttentionCheck {
  const loads = [creditReport, bankStatement, scoreItems]
  if (loads.some((load) => load.status === 'loading')) return { kind: 'checking' }

  // A pending assessment is expected to be empty; it's already flagged as pending, so emptiness isn't repeated.
  const expectData = assessment.status !== 'Pending'
  const unchecked: Unchecked[] = []
  const note = <T>(section: AttentionSection, load: SectionLoad<T>, empty: (data: T) => boolean) => {
    if (load.status === 'failed') unchecked.push({ section, why: 'failed' })
    else if (load.status === 'loaded' && expectData && empty(load.data)) unchecked.push({ section, why: 'empty' })
  }
  note('credit report', creditReport, isEmpty['credit report'])
  note('bank statement', bankStatement, isEmpty['bank statement'])
  note('category scores', scoreItems, isEmpty['category scores'])

  const reasons = attentionReasons({
    assessment,
    creditReport: loaded(creditReport, null),
    bankStatement: loaded(bankStatement, null),
    scoreItems: loaded(scoreItems, []),
  })

  if (reasons.length > 0) return { kind: 'flagged', reasons, unchecked }
  if (unchecked.length > 0) return { kind: 'not-fully-checked', unchecked }
  return { kind: 'clear' }
}

/** "Couldn’t check risk band and thin file: the credit report didn’t load." */
export function uncheckedText({ section, why }: Unchecked): string {
  const rules = [...RULES_BY_SECTION[section]]
  const last = rules.pop()
  const list = rules.length === 0 ? (last ?? '') : `${rules.join(', ')} and ${last ?? ''}`
  return `Couldn’t check ${list}: the ${section} ${why === 'failed' ? 'didn’t load' : 'came back without the data needed'}.`
}
