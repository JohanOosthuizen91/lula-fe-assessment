// Which business is selected, from the ?business= URL parameter.

export type Selection = { kind: 'none' } | { kind: 'invalid'; raw: string } | { kind: 'business'; id: number }

export const BUSINESS_PARAM = 'business'

// A positive whole number with no sign, leading zero, exponent or decimals. Number() alone would accept 1e2 or 0x10.
const POSITIVE_INTEGER = /^[1-9]\d*$/

export function parseSelection(search: string): Selection {
  const raw = new URLSearchParams(search).get(BUSINESS_PARAM)
  if (raw === null || raw === '') return { kind: 'none' }
  if (!POSITIVE_INTEGER.test(raw)) return { kind: 'invalid', raw }
  const id = Number.parseInt(raw, 10)
  return Number.isSafeInteger(id) ? { kind: 'business', id } : { kind: 'invalid', raw }
}

/** The search string for a selection, keeping any other parameters. */
export function searchFor(currentSearch: string, businessId: number | null): string {
  const params = new URLSearchParams(currentSearch)
  if (businessId === null) params.delete(BUSINESS_PARAM)
  else params.set(BUSINESS_PARAM, String(businessId))
  const next = params.toString()
  return next === '' ? '' : `?${next}`
}
