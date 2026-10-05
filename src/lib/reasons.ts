// Plain-language text for attention reasons. Short labels go on the list's chips.

import { CATEGORY_THRESHOLD, NET_SHARE_THRESHOLD } from './assessment.ts'
import type { AttentionReason, WeakCategory } from './assessment.ts'
import { formatCategoryScore, formatPercent } from './format.ts'

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
      return 'Awaiting assessment'
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

/** "Cash Flow (22,0), Credit Utilisation (28,5) and Payment History (32,0)" */
function listCategories(categories: readonly WeakCategory[]): string {
  const parts = categories.map((c) => `${c.category} (${formatCategoryScore(c.score)})`)
  const last = parts.pop()
  if (last === undefined) return ''
  return parts.length === 0 ? last : `${parts.join(', ')} and ${last}`
}

/** A full sentence for the detail view: what was found and why it matters. */
export function reasonDetail(reason: AttentionReason): string {
  switch (reason.code) {
    case 'conflicting-records':
      return `${reason.count} ${reason.records} came back for this assessment where one was expected, so none is shown. Check the source data.`
    case 'no-assessment':
      return 'This business hasn’t been assessed yet, so there’s nothing to base a decision on.'
    case 'pending':
      return 'The assessment is still pending. It has to be finished before any credit decision.'
    case 'unrecognised-status':
      return `The status “${reason.raw}” isn’t one this dashboard recognises. Check it before relying on this assessment.`
    case 'high-risk':
      return 'Lula has placed this business in the High risk band.'
    case 'unrecognised-band':
      return `The risk band “${reason.raw}” isn’t one this dashboard recognises, so no risk colour is shown. Check it before relying on the score.`
    case 'thin-file':
      return 'Thin credit file: there’s little history behind the score, so it’s less reliable than usual.'
    case 'low-net-share':
      return reason.netShareOfCredits === null
        ? 'No money came in over the statement period.'
        : `Net movement is ${formatPercent(reason.netShareOfCredits)} of money in each month, under the ${formatPercent(NET_SHARE_THRESHOLD)} guide, so little is left after outgoings.`
    case 'weak-categories':
      return `${listCategories(reason.categories)} ${reason.categories.length === 1 ? 'is' : 'are'} below ${CATEGORY_THRESHOLD} out of 100.`
  }
}
