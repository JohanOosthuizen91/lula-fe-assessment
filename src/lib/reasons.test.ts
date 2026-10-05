import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { reasonLabel } from './reasons.ts'

describe('reasonLabel', () => {
  it('gives Bright’s four reasons in plain words', () => {
    assert.equal(reasonLabel({ code: 'high-risk' }), 'High risk band')
    assert.equal(reasonLabel({ code: 'thin-file' }), 'Thin file')
    assert.equal(reasonLabel({ code: 'low-net-share', netShareOfCredits: 0.0703125 }), 'Net 7,0% of money in')
    assert.equal(
      reasonLabel({
        code: 'weak-categories',
        categories: [
          { category: 'Cash Flow', score: 22 },
          { category: 'Credit Utilisation', score: 28.5 },
          { category: 'Payment History', score: 32 },
        ],
      }),
      '3 categories below 40',
    )
  })
  it('shows unrecognised values as their raw text', () => {
    assert.equal(reasonLabel({ code: 'unrecognised-band', raw: 'Very High' }), 'Unrecognised band “Very High”')
  })
  it('covers the remaining reasons', () => {
    assert.equal(reasonLabel({ code: 'pending' }), 'Pending assessment')
    assert.equal(reasonLabel({ code: 'no-assessment' }), 'No assessment')
    assert.equal(reasonLabel({ code: 'low-net-share', netShareOfCredits: null }), 'No money in')
    assert.equal(reasonLabel({ code: 'weak-categories', categories: [{ category: 'Cash Flow', score: 22 }] }), '1 category below 40')
    assert.equal(reasonLabel({ code: 'conflicting-records', records: 'credit reports', count: 2 }), '2 credit reports found')
  })
})
