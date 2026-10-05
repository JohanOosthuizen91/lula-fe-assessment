import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  FUTURE_DATE_NOTE,
  PLACEHOLDER,
  formatCategoryScore,
  formatCreditScore,
  formatDate,
  formatMoney,
  formatMoneyCompact,
  formatMonthsAgo,
  formatPercent,
} from './format.ts'

// No-break spaces are written as \u00a0 escapes on purpose, so the bytes are checked exactly.

describe('formatMoney', () => {
  it('uses R, a no-break space between thousands and a decimal comma', () => {
    assert.equal(formatMoney(206666.666667), 'R\u00a0206\u00a0666,67')
    assert.equal(formatMoney(3000), 'R\u00a03\u00a0000,00')
    assert.equal(formatMoney(1240000), 'R\u00a01\u00a0240\u00a0000,00')
  })
  it('shows a real zero as R 0,00 and a negative with a minus sign', () => {
    assert.equal(formatMoney(0), 'R\u00a00,00')
    assert.equal(formatMoney(-3000), '-R\u00a03\u00a0000,00')
  })
})

describe('values that round to zero', () => {
  // Built from its code point, so no editor or tool can silently swap it for a plain space.
  const NBSP = String.fromCharCode(0xa0)

  it('show no minus sign, while real negatives keep theirs', () => {
    assert.equal(formatMoney(-0), `R${NBSP}0,00`)
    assert.equal(formatMoney(-0.001), `R${NBSP}0,00`)
    assert.equal(formatMoneyCompact(-0.001), `R${NBSP}0`)
    assert.equal(formatPercent(-0.0001), '0,0%')
    assert.equal(formatPercent(-0), '0,0%')
    assert.equal(formatMoney(-3000), `-R${NBSP}3${NBSP}000,00`)
    assert.equal(formatPercent(-0.07), '-7,0%')
  })
})

describe('formatMoneyCompact', () => {
  it('abbreviates with one decimal', () => {
    assert.equal(formatMoneyCompact(206666.67), 'R\u00a0206,7K')
    assert.equal(formatMoneyCompact(1240000), 'R\u00a01,2M')
  })
})

describe('scores', () => {
  it('shows a credit score as given, with no invented decimals', () => {
    assert.equal(formatCreditScore(612), '612')
    assert.equal(formatCreditScore(384), '384')
  })
  it('shows category scores with at least one decimal so they line up', () => {
    assert.equal(formatCategoryScore(68.5), '68,5')
    assert.equal(formatCategoryScore(32), '32,0')
    assert.equal(formatCategoryScore(28.5), '28,5')
  })
})

describe('formatPercent', () => {
  it('turns a fraction into a percentage with one decimal and a decimal comma', () => {
    assert.equal(formatPercent(0.0703125), '7,0%')
    assert.equal(formatPercent(0.35670103), '35,7%')
    assert.equal(formatPercent(-0.05), '-5,0%')
  })
})

describe('formatDate', () => {
  it('writes the day, short month and year', () => {
    assert.equal(formatDate('2024-11-15'), '15 Nov 2024')
    assert.equal(formatDate('2024-03-02'), '02 Mar 2024')
    assert.equal(formatDate('2024-09-02'), '02 Sept 2024')
  })
  it('gives the same day in every time zone', () => {
    const original = process.env.TZ
    try {
      for (const zone of ['UTC', 'Africa/Johannesburg', 'America/Los_Angeles', 'Pacific/Kiritimati']) {
        process.env.TZ = zone
        assert.equal(formatDate('2024-11-15'), '15 Nov 2024', zone)
        assert.equal(formatDate('2024-01-01'), '01 Jan 2024', zone)
      }
    } finally {
      if (original === undefined) delete process.env.TZ
      else process.env.TZ = original
    }
  })
})

describe('formatMonthsAgo', () => {
  const today = new Date(2026, 9, 5) // 5 Oct 2026, local time

  it('counts whole months to today', () => {
    assert.equal(formatMonthsAgo('2024-11-15', today), '22 months ago')
    assert.equal(formatMonthsAgo('2024-10-30', today), '23 months ago')
    assert.equal(formatMonthsAgo('2024-10-05', today), '24 months ago')
  })
  it('uses plain words for recent dates', () => {
    assert.equal(formatMonthsAgo('2026-09-05', today), 'last month')
    assert.equal(formatMonthsAgo('2026-09-20', today), 'this month')
    assert.equal(formatMonthsAgo('2026-10-05', today), 'this month')
  })
  it('marks a date after today as a likely data error, and the date itself still shows as given', () => {
    assert.equal(formatMonthsAgo('2026-10-20', today), FUTURE_DATE_NOTE)
    assert.equal(formatMonthsAgo('2026-10-06', today), FUTURE_DATE_NOTE)
    assert.equal(formatMonthsAgo('2027-01-01', today), FUTURE_DATE_NOTE)
    assert.equal(FUTURE_DATE_NOTE, 'future date, check data')
    assert.equal(formatDate('2026-10-20'), '20 Oct 2026')
  })
})

describe('missing values', () => {
  it('every formatter shows the placeholder for null, never 0', () => {
    assert.equal(formatMoney(null), PLACEHOLDER)
    assert.equal(formatMoneyCompact(null), PLACEHOLDER)
    assert.equal(formatCreditScore(null), PLACEHOLDER)
    assert.equal(formatCategoryScore(null), PLACEHOLDER)
    assert.equal(formatPercent(null), PLACEHOLDER)
    assert.equal(formatDate(null), PLACEHOLDER)
    assert.equal(formatMonthsAgo(null), PLACEHOLDER)
    assert.equal(PLACEHOLDER, '\u2014')
  })
})
