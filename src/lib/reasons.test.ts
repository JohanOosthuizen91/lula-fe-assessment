import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { reasonDetail, reasonLabel } from './reasons.ts'

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
    assert.equal(reasonLabel({ code: 'pending' }), 'Awaiting assessment')
    assert.equal(reasonLabel({ code: 'no-assessment' }), 'No assessment')
    assert.equal(reasonLabel({ code: 'low-net-share', netShareOfCredits: null }), 'No money in')
    assert.equal(reasonLabel({ code: 'weak-categories', categories: [{ category: 'Cash Flow', score: 22 }] }), '1 category below 40')
    assert.equal(reasonLabel({ code: 'conflicting-records', records: 'credit reports', count: 2 }), '2 credit reports found')
  })
})

describe('reasonDetail', () => {
  it('explains Bright’s reasons in full sentences with the real figures', () => {
    assert.equal(
      reasonDetail({ code: 'low-net-share', netShareOfCredits: 0.0703125 }),
      'Net movement is 7,0% of money in each month, under the 10,0% guide, so little is left after outgoings.',
    )
    assert.equal(
      reasonDetail({
        code: 'weak-categories',
        categories: [
          { category: 'Cash Flow', score: 22 },
          { category: 'Credit Utilisation', score: 28.5 },
          { category: 'Payment History', score: 32 },
        ],
      }),
      'Cash Flow (22,0), Credit Utilisation (28,5) and Payment History (32,0) are below 40 out of 100.',
    )
  })
  it('handles a single weak category and a conflict', () => {
    assert.equal(
      reasonDetail({ code: 'weak-categories', categories: [{ category: 'Cash Flow', score: 39.5 }] }),
      'Cash Flow (39,5) is below 40 out of 100.',
    )
    assert.equal(
      reasonDetail({ code: 'conflicting-records', records: 'bank statements', count: 2 }),
      '2 bank statements came back for this assessment where one was expected, so none is shown. Check the source data.',
    )
  })
})
