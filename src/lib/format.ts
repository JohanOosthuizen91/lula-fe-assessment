// The only place values are formatted for display. Official South African convention (en-ZA):
// R 206 666,67 with a no-break space as the thousands separator, a decimal comma, and 15 Nov 2024.
// Every formatter takes null and returns the same placeholder; null is never shown as 0.

const LOCALE = 'en-ZA'

/** Shown wherever a value is missing. */
export const PLACEHOLDER = '—'

const money = new Intl.NumberFormat(LOCALE, { style: 'currency', currency: 'ZAR' })
const compactMoney = new Intl.NumberFormat(LOCALE, {
  style: 'currency',
  currency: 'ZAR',
  notation: 'compact',
  maximumFractionDigits: 1,
})
// Credit scores have no fixed scale; show the number as given, without inventing decimals.
const creditScore = new Intl.NumberFormat(LOCALE, { maximumFractionDigits: 2 })
// Category scores always show one decimal so a column lines up (32,0 next to 28,5); a second decimal is kept if sent.
const categoryScore = new Intl.NumberFormat(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 2 })
const percent = new Intl.NumberFormat(LOCALE, { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 })
// Formatted in UTC from the date's own parts, so the viewer's time zone can't move the day.
const calendarDate = new Intl.DateTimeFormat(LOCALE, { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' })
const relative = new Intl.RelativeTimeFormat(LOCALE, { numeric: 'auto' })

function orPlaceholder(value: number | null, format: (value: number) => string): string {
  return value === null || !Number.isFinite(value) ? PLACEHOLDER : format(value)
}

/** R 206 666,67 */
export function formatMoney(value: number | null): string {
  return orPlaceholder(value, (v) => money.format(v))
}

/** R 206,7K */
export function formatMoneyCompact(value: number | null): string {
  return orPlaceholder(value, (v) => compactMoney.format(v))
}

/** 612 */
export function formatCreditScore(value: number | null): string {
  return orPlaceholder(value, (v) => creditScore.format(v))
}

/** 68,5 and 32,0 */
export function formatCategoryScore(value: number | null): string {
  return orPlaceholder(value, (v) => categoryScore.format(v))
}

/** A fraction as a percentage: 0.0703 gives 7,0% */
export function formatPercent(fraction: number | null): string {
  return orPlaceholder(fraction, (v) => percent.format(v))
}

// YYYY-MM-DD, already validated at the API boundary; captured as year, month and day.
const DATE_PARTS = /^(\d{4})-(\d{2})-(\d{2})$/

function dateParts(isoDate: string): { year: number; month: number; day: number } | null {
  const match = DATE_PARTS.exec(isoDate)
  if (match === null) return null
  const [, year, month, day] = match
  if (year === undefined || month === undefined || day === undefined) return null
  return { year: Number.parseInt(year, 10), month: Number.parseInt(month, 10), day: Number.parseInt(day, 10) }
}

/** 15 Nov 2024 (en-ZA pads the day, 02 Mar, and writes September as Sept). */
export function formatDate(isoDate: string | null): string {
  const parts = isoDate === null ? null : dateParts(isoDate)
  if (parts === null) return PLACEHOLDER
  return calendarDate.format(Date.UTC(parts.year, parts.month - 1, parts.day))
}

/** Whole calendar months from the date to today: "22 months ago", "last month", "this month". */
export function formatMonthsAgo(isoDate: string | null, now: Date = new Date()): string {
  const parts = isoDate === null ? null : dateParts(isoDate)
  if (parts === null) return PLACEHOLDER
  // Today is the analyst's own calendar date.
  let months = (now.getFullYear() - parts.year) * 12 + (now.getMonth() + 1 - parts.month)
  if (now.getDate() < parts.day) months -= 1
  return relative.format(-months, 'month')
}
