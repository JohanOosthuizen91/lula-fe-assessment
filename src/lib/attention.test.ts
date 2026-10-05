import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { Assessment, BankStatement, CreditReport, ScoreItem } from '../api/types.ts'
import { checkAttention, uncheckedText } from './attention.ts'

// Acme Traders from data.json: a complete assessment that raises no flags.
const acme: Assessment = { id: 101, businessId: 1, createdDate: '2024-11-15', status: 'Complete' }
const acmeReport: CreditReport = { id: 201, assessmentId: 101, score: 612, riskBand: 'Medium', isThinFile: false }
const acmeStatement: BankStatement = { id: 301, assessmentId: 101, totalCredits: 485000, totalDebits: 312000, monthsAnalysed: 3 }
const acmeItems: ScoreItem[] = [
  { id: 401, assessmentId: 101, category: 'Payment History', score: 68.5 },
  { id: 402, assessmentId: 101, category: 'Credit Utilisation', score: 55 },
  { id: 403, assessmentId: 101, category: 'Business Age', score: 72 },
  { id: 404, assessmentId: 101, category: 'Cash Flow', score: 61.5 },
]
// Bright Construction's statement: net 7,0% of money in, which is flagged.
const brightStatement: BankStatement = { id: 302, assessmentId: 102, totalCredits: 128000, totalDebits: 119000, monthsAnalysed: 3 }

describe('checkAttention', () => {
  it('never gives an all-clear when a section failed, even if the loaded data raises no flags', () => {
    const result = checkAttention({
      assessment: acme,
      creditReport: { status: 'loaded', data: acmeReport },
      bankStatement: { status: 'failed' },
      scoreItems: { status: 'loaded', data: acmeItems },
    })
    assert.deepEqual(result, { kind: 'not-fully-checked', unchecked: ['bank statement'] })
    assert.notEqual(result.kind, 'clear')
  })

  it('gives the all-clear only when every section loaded and nothing is flagged', () => {
    const result = checkAttention({
      assessment: acme,
      creditReport: { status: 'loaded', data: acmeReport },
      bankStatement: { status: 'loaded', data: acmeStatement },
      scoreItems: { status: 'loaded', data: acmeItems },
    })
    assert.deepEqual(result, { kind: 'clear' })
  })

  it('still lists the flags it found, alongside what it couldn’t check', () => {
    const result = checkAttention({
      assessment: acme,
      creditReport: { status: 'failed' },
      bankStatement: { status: 'loaded', data: brightStatement },
      scoreItems: { status: 'failed' },
    })
    assert.equal(result.kind, 'flagged')
    if (result.kind !== 'flagged') return
    assert.deepEqual(result.reasons.map((r) => r.code), ['low-net-share'])
    assert.deepEqual(result.unchecked, ['credit report', 'category scores'])
  })

  it('waits while any section is still loading', () => {
    const result = checkAttention({
      assessment: acme,
      creditReport: { status: 'loaded', data: acmeReport },
      bankStatement: { status: 'loading' },
      scoreItems: { status: 'failed' },
    })
    assert.deepEqual(result, { kind: 'checking' })
  })
})

describe('uncheckedText', () => {
  it('names the rules that couldn’t be checked and why', () => {
    assert.equal(uncheckedText('bank statement'), 'Couldn’t check monthly net: the bank statement didn’t load.')
    assert.equal(uncheckedText('credit report'), 'Couldn’t check risk band and thin file: the credit report didn’t load.')
    assert.equal(uncheckedText('category scores'), 'Couldn’t check categories: the category scores didn’t load.')
  })
})
