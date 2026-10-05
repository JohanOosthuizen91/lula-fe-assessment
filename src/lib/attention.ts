// Whether the attention rules could all be checked. An all-clear is only ever given when every section loaded.

import type { Assessment, BankStatement, CreditReport, ScoreItem } from '../api/types.ts'
import { attentionReasons } from './assessment.ts'
import type { AttentionReason } from './assessment.ts'

export type SectionLoad<T> = { status: 'loaded'; data: T } | { status: 'failed' } | { status: 'loading' }

export type AttentionSection = 'credit report' | 'bank statement' | 'category scores'

/** The rules that depend on each section, in plain words. */
export const RULES_BY_SECTION: Record<AttentionSection, readonly string[]> = {
  'credit report': ['risk band', 'thin file'],
  'bank statement': ['monthly net'],
  'category scores': ['categories'],
}

export type AttentionCheck =
  | { kind: 'checking' }
  | { kind: 'clear' }
  | { kind: 'flagged'; reasons: AttentionReason[]; unchecked: AttentionSection[] }
  | { kind: 'not-fully-checked'; unchecked: AttentionSection[] }

export type AttentionCheckInput = {
  assessment: Assessment
  creditReport: SectionLoad<CreditReport | null>
  bankStatement: SectionLoad<BankStatement | null>
  scoreItems: SectionLoad<ScoreItem[]>
}

function loaded<T>(section: SectionLoad<T>, fallback: T): T {
  return section.status === 'loaded' ? section.data : fallback
}

export function checkAttention({ assessment, creditReport, bankStatement, scoreItems }: AttentionCheckInput): AttentionCheck {
  const sections: [AttentionSection, SectionLoad<unknown>][] = [
    ['credit report', creditReport],
    ['bank statement', bankStatement],
    ['category scores', scoreItems],
  ]
  if (sections.some(([, load]) => load.status === 'loading')) return { kind: 'checking' }

  const unchecked = sections.filter(([, load]) => load.status === 'failed').map(([name]) => name)
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
export function uncheckedText(section: AttentionSection): string {
  const rules = [...RULES_BY_SECTION[section]]
  const last = rules.pop()
  const list = rules.length === 0 ? (last ?? '') : `${rules.join(', ')} and ${last ?? ''}`
  return `Couldn’t check ${list}: the ${section} didn’t load.`
}
