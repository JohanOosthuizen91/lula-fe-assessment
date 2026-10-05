// Plain-language text for attention reasons. Short labels go on the list's chips.

import { CATEGORY_THRESHOLD } from './assessment.ts'
import type { AttentionReason } from './assessment.ts'
import { formatPercent } from './format.ts'

/** A key that's unique within one business's reasons (conflicts can be raised for two kinds of record). */
export function reasonKey(reason: AttentionReason): string {
  return reason.code === 'conflicting-records' ? `${reason.code}-${reason.records}` : reason.code
}

export function reasonLabel(reason: AttentionReason): string {
  switch (reason.code) {
    case 'conflicting-records':
      return `${reason.count} ${reason.records} found`
    case 'no-assessment':
      return 'No assessment'
    case 'pending':
      return 'Pending assessment'
    case 'unrecognised-status':
      return `Unrecognised status “${reason.raw}”`
    case 'high-risk':
      return 'High risk band'
    case 'unrecognised-band':
      return `Unrecognised band “${reason.raw}”`
    case 'thin-file':
      return 'Thin file'
    case 'low-net-share':
      return reason.netShareOfCredits === null
        ? 'No money in'
        : `Net ${formatPercent(reason.netShareOfCredits)} of money in`
    case 'weak-categories': {
      const count = reason.categories.length
      return `${count} ${count === 1 ? 'category' : 'categories'} below ${CATEGORY_THRESHOLD}`
    }
  }
}
