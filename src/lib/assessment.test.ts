import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import type { Assessment, BankStatement, CreditReport, ScoreItem } from '../api/types.ts'
import {
  CATEGORY_THRESHOLD,
  NET_SHARE_THRESHOLD,
  attentionReasons,
  latestAssessment,
  monthlyFinancials,
} from './assessment.ts'
import type { AttentionInput } from './assessment.ts'

// Fixtures: literal values copied from data.json.
type Key = 'acme' | 'bright' | 'cape' | 'delta' | 'echo'
const assessments: Record<Key, Assessment> = {
  acme: { id: 101, businessId: 1, createdDate: '2024-11-15', status: 'Complete' },
  bright: { id: 102, businessId: 2, createdDate: '2024-11-18', status: 'Complete' },
  cape: { id: 103, businessId: 3, createdDate: '2024-10-30', status: 'Complete' },
  delta: { id: 104, businessId: 4, createdDate: '2024-11-20', status: 'Complete' },
  echo: { id: 105, businessId: 5, createdDate: '2024-11-22', status: 'Pending' },
}

const reports: Record<Key, CreditReport> = {
  acme: { id: 201, assessmentId: 101, score: 612, riskBand: 'Medium', isThinFile: false },
  bright: { id: 202, assessmentId: 102, score: 384, riskBand: 'High', isThinFile: true },
  cape: { id: 203, assessmentId: 103, score: 741, riskBand: 'Low', isThinFile: false },
  delta: { id: 204, assessmentId: 104, score: 558, riskBand: 'Medium', isThinFile: false },
  echo: { id: 205, assessmentId: 105, score: null, riskBand: null, isThinFile: null },
}

const statements: Record<Key, BankStatement> = {
  acme: { id: 301, assessmentId: 101, totalCredits: 485000, totalDebits: 312000, monthsAnalysed: 3 },
  bright: { id: 302, assessmentId: 102, totalCredits: 128000, totalDebits: 119000, monthsAnalysed: 3 },
  cape: { id: 303, assessmentId: 103, totalCredits: 1240000, totalDebits: 780000, monthsAnalysed: 6 },
  delta: { id: 304, assessmentId: 104, totalCredits: 630000, totalDebits: 480000, monthsAnalysed: 3 },
  echo: { id: 305, assessmentId: 105, totalCredits: null, totalDebits: null, monthsAnalysed: null },
}

function items(assessmentId: number, startId: number, scores: [string, number][]): ScoreItem[] {
  return scores.map(([category, score], i) => ({ id: startId + i, assessmentId, category, score }))
}

const scoreItems: Record<Key, ScoreItem[]> = {
  acme: items(101, 401, [['Payment History', 68.5], ['Credit Utilisation', 55], ['Business Age', 72], ['Cash Flow', 61.5]]),
  bright: items(102, 405, [['Payment History', 32], ['Credit Utilisation', 28.5], ['Business Age', 45], ['Cash Flow', 22]]),
  cape: items(103, 409, [['Payment History', 88], ['Credit Utilisation', 79.5], ['Business Age', 91], ['Cash Flow', 82.5]]),
  delta: items(104, 413, [['Payment History', 61], ['Credit Utilisation', 58.5], ['Business Age', 65], ['Cash Flow', 55]]),
  echo: [],
}


function inputFor(key: Key): AttentionInput {
  return {
    assessment: assessments[key],
    creditReport: reports[key],
    bankStatement: statements[key],
    scoreItems: scoreItems[key],
  }
}

/** Acme's data with some parts overridden. */
function acmeWith(overrides: Partial<AttentionInput>): AttentionInput {
  return { ...inputFor('acme'), ...overrides }
}

function report(overrides: Partial<CreditReport>): CreditReport {
  return { id: 999, assessmentId: 101, score: 612, riskBand: 'Medium', isThinFile: false, ...overrides }
}

function statement(totalCredits: number | null, totalDebits: number | null, monthsAnalysed: number | null): BankStatement {
  return { id: 999, assessmentId: 101, totalCredits, totalDebits, monthsAnalysed }
}

function assessment(id: number, createdDate: string): Assessment {
  return { id, businessId: 1, createdDate, status: 'Complete' }
}

function closeTo(actual: number, expected: number, digits: number): void {
  assert.ok(Math.abs(actual - expected) < 10 ** -digits / 2, `expected ${actual} to be about ${expected}`)
}

function financialsFor(key: Key) {
  const result = monthlyFinancials(statements[key])
  assert.notEqual(result, null)
  if (result === null) throw new Error('unreachable')
  return result
}

describe('thresholds', () => {
  it('are the documented values', () => {
    assert.equal(NET_SHARE_THRESHOLD, 0.1)
    assert.equal(CATEGORY_THRESHOLD, 40)
  })
})

describe('latestAssessment', () => {
  it('returns null for an empty list', () => {
    assert.equal(latestAssessment([]), null)
  })

  it('picks the newest createdDate regardless of order or id', () => {
    const older = assessment(500, '2024-01-01')
    const newer = assessment(1, '2024-06-30')
    assert.equal(latestAssessment([older, newer])?.id, 1)
    assert.equal(latestAssessment([newer, older])?.id, 1)
  })

  it('picks the highest id on a createdDate tie', () => {
    const a = assessment(7, '2024-03-03')
    const b = assessment(9, '2024-03-03')
    const c = assessment(8, '2024-03-03')
    assert.equal(latestAssessment([a, b, c])?.id, 9)
    assert.equal(latestAssessment([b, c, a])?.id, 9)
  })

  it('returns the only assessment of a single-item list', () => {
    assert.equal(latestAssessment([assessments.acme])?.id, 101)
  })

  it('does not mutate its input', () => {
    const list = [assessment(1, '2024-01-01'), assessment(2, '2024-02-01')]
    latestAssessment(list)
    assert.deepEqual(list.map((a) => a.id), [1, 2])
  })
})

describe('monthlyFinancials', () => {
  it('computes monthly figures for Acme', () => {
    const f = financialsFor('acme')
    assert.equal(f.months, 3)
    closeTo(f.credits, 161666.67, 2)
    closeTo(f.debits, 104000, 2)
    closeTo(f.net, 57666.67, 2)
    assert.notEqual(f.netShareOfCredits, null)
    closeTo(f.netShareOfCredits ?? Number.NaN, 0.357, 3)
  })

  it('computes monthly figures for Bright as a fraction, not a percentage', () => {
    const f = financialsFor('bright')
    assert.equal(f.months, 3)
    closeTo(f.credits, 42666.67, 2)
    closeTo(f.debits, 39666.67, 2)
    closeTo(f.net, 3000, 2)
    closeTo(f.netShareOfCredits ?? Number.NaN, 0.0703, 4)
  })

  it("uses monthly credits for Cape's 6 months, not the 1 240 000 total", () => {
    const f = financialsFor('cape')
    assert.equal(f.months, 6)
    closeTo(f.credits, 206666.67, 2)
    assert.notEqual(Math.round(f.credits), 1240000)
    closeTo(f.debits, 130000, 2)
    closeTo(f.net, 76666.67, 2)
    closeTo(f.netShareOfCredits ?? Number.NaN, 0.371, 3)
  })

  it('computes monthly figures for Delta', () => {
    const f = financialsFor('delta')
    assert.equal(f.months, 3)
    closeTo(f.credits, 210000, 2)
    closeTo(f.debits, 160000, 2)
    closeTo(f.net, 50000, 2)
    closeTo(f.netShareOfCredits ?? Number.NaN, 0.238, 3)
  })

  it('returns null for Echo (all null), never zeros', () => {
    assert.equal(monthlyFinancials(statements.echo), null)
  })

  it('returns null when there is no statement', () => {
    assert.equal(monthlyFinancials(null), null)
  })

  it('returns null when only monthsAnalysed is null', () => {
    assert.equal(monthlyFinancials(statement(485000, 312000, null)), null)
  })

  it('returns null when only totalCredits is null', () => {
    assert.equal(monthlyFinancials(statement(null, 312000, 3)), null)
  })

  it('returns null when only totalDebits is null', () => {
    assert.equal(monthlyFinancials(statement(485000, null, 3)), null)
  })

  it('gives a null net share when monthly credits is 0', () => {
    const f = monthlyFinancials(statement(0, 30000, 3))
    assert.notEqual(f, null)
    assert.equal(f?.netShareOfCredits, null)
    assert.equal(f?.credits, 0)
    closeTo(f?.net ?? Number.NaN, -10000, 2)
  })

  it('gives a negative net and share when debits exceed credits', () => {
    const f = monthlyFinancials(statement(90000, 120000, 3))
    closeTo(f?.net ?? Number.NaN, -10000, 2)
    closeTo(f?.netShareOfCredits ?? Number.NaN, -0.3333, 4)
  })
})

describe('attentionReasons: seeded businesses', () => {
  it('gives Bright exactly four reasons, in order', () => {
    const reasons = attentionReasons(inputFor('bright'))
    assert.equal(reasons.length, 4)
    assert.deepEqual(reasons[0], { code: 'high-risk' })
    assert.deepEqual(reasons[1], { code: 'thin-file' })
    const net = reasons[2]
    assert.equal(net?.code, 'low-net-share')
    if (net?.code === 'low-net-share') {
      assert.notEqual(net.netShareOfCredits, null)
      closeTo(net.netShareOfCredits ?? Number.NaN, 0.0703, 4)
    }
    assert.deepEqual(reasons[3], {
      code: 'weak-categories',
      categories: [
        { category: 'Cash Flow', score: 22 },
        { category: 'Credit Utilisation', score: 28.5 },
        { category: 'Payment History', score: 32 },
      ],
    })
  })

  it('does not list Business Age (45) among the weak categories', () => {
    const weak = attentionReasons(inputFor('bright')).find((r) => r.code === 'weak-categories')
    assert.ok(weak && weak.code === 'weak-categories')
    if (weak && weak.code === 'weak-categories') {
      assert.equal(weak.categories.some((c) => c.category === 'Business Age'), false)
    }
  })

  it('gives Acme no reasons', () => {
    assert.deepEqual(attentionReasons(inputFor('acme')), [])
  })

  it('gives Cape no reasons (monthly figures, not totals)', () => {
    assert.deepEqual(attentionReasons(inputFor('cape')), [])
  })

  it('gives Delta no reasons', () => {
    assert.deepEqual(attentionReasons(inputFor('delta')), [])
  })

  it('gives Echo exactly one pending reason', () => {
    assert.deepEqual(attentionReasons(inputFor('echo')), [{ code: 'pending' }])
  })

  it('gives no reasons for the Medium band or for an old assessment', () => {
    const old = { ...assessments.acme, createdDate: '2001-01-01' }
    assert.deepEqual(attentionReasons(acmeWith({ assessment: old })), [])
  })
})

describe('attentionReasons: unrecognised and missing values', () => {
  it('gives no-assessment alone when everything is missing', () => {
    assert.deepEqual(
      attentionReasons({ assessment: null, creditReport: null, bankStatement: null, scoreItems: [] }),
      [{ code: 'no-assessment' }],
    )
  })

  it('flags an unknown risk band with its raw text, and nothing else', () => {
    const input = acmeWith({ creditReport: report({ riskBand: { unrecognised: 'Very High' } }) })
    assert.deepEqual(attentionReasons(input), [{ code: 'unrecognised-band', raw: 'Very High' }])
  })

  it("does not let one unknown row affect another row's reasons", () => {
    const odd = acmeWith({ creditReport: report({ riskBand: { unrecognised: 'Very High' } }) })
    assert.equal(attentionReasons(odd).length, 1)
    assert.deepEqual(attentionReasons(inputFor('acme')), [])
  })

  it('flags an unknown status with its raw text', () => {
    const input = acmeWith({
      assessment: { ...(assessments.acme), status: { unrecognised: 'Archived' } },
    })
    assert.deepEqual(attentionReasons(input), [{ code: 'unrecognised-status', raw: 'Archived' }])
  })

  it('does not flag a missing credit report, statement or score items', () => {
    const input = acmeWith({ creditReport: null, bankStatement: null, scoreItems: [] })
    assert.deepEqual(attentionReasons(input), [])
  })

  it('does not flag null band or null thin-file flag', () => {
    const input = acmeWith({ creditReport: report({ riskBand: null, isThinFile: null, score: null }) })
    assert.deepEqual(attentionReasons(input), [])
  })

  it('does not flag low net share when the statement has null fields', () => {
    const input = acmeWith({ bankStatement: statement(null, null, null) })
    assert.deepEqual(attentionReasons(input), [])
  })

  it('gives no weak-categories reason for empty scoreItems', () => {
    const reasons = attentionReasons({ ...inputFor('bright'), scoreItems: [] })
    assert.equal(reasons.some((r) => r.code === 'weak-categories'), false)
  })

  it('flags a high band even when the score looks good (band is never derived)', () => {
    const input = acmeWith({ creditReport: report({ riskBand: 'High', score: 900 }) })
    assert.deepEqual(attentionReasons(input), [{ code: 'high-risk' }])
  })

  it('flags a thin file on its own', () => {
    const input = acmeWith({ creditReport: report({ isThinFile: true }) })
    assert.deepEqual(attentionReasons(input), [{ code: 'thin-file' }])
  })
})

describe('attentionReasons: boundaries', () => {
  function withCategoryScore(score: number): AttentionInput {
    return acmeWith({ scoreItems: items(101, 600, [['Payment History', score], ['Cash Flow', 70]]) })
  }

  it('does not flag a category of exactly 40', () => {
    assert.deepEqual(attentionReasons(withCategoryScore(40)), [])
  })

  it('flags a category of 39.9', () => {
    assert.deepEqual(attentionReasons(withCategoryScore(39.9)), [
      { code: 'weak-categories', categories: [{ category: 'Payment History', score: 39.9 }] },
    ])
  })

  it('lists all weak categories lowest score first in one reason', () => {
    const input = acmeWith({
      scoreItems: items(101, 600, [['A', 30], ['B', 10], ['C', 90], ['D', 20]]),
    })
    assert.deepEqual(attentionReasons(input), [
      {
        code: 'weak-categories',
        categories: [
          { category: 'B', score: 10 },
          { category: 'D', score: 20 },
          { category: 'A', score: 30 },
        ],
      },
    ])
  })

  it('does not flag a net share of exactly 0.1', () => {
    // monthly credits 10 000, debits 9 000: net share 0.1
    const input = acmeWith({ bankStatement: statement(30000, 27000, 3) })
    assert.deepEqual(attentionReasons(input), [])
  })

  it('flags a net share just below 0.1', () => {
    const input = acmeWith({ bankStatement: statement(30000, 27300, 3) })
    const reasons = attentionReasons(input)
    assert.equal(reasons.length, 1)
    assert.equal(reasons[0]?.code, 'low-net-share')
  })

  it('flags a negative net', () => {
    const input = acmeWith({ bankStatement: statement(90000, 120000, 3) })
    const reasons = attentionReasons(input)
    assert.equal(reasons.length, 1)
    const r = reasons[0]
    assert.equal(r?.code, 'low-net-share')
    if (r?.code === 'low-net-share') closeTo(r.netShareOfCredits ?? Number.NaN, -0.3333, 4)
  })

  it('flags monthly credits of 0 with a null share', () => {
    const input = acmeWith({ bankStatement: statement(0, 0, 3) })
    assert.deepEqual(attentionReasons(input), [{ code: 'low-net-share', netShareOfCredits: null }])
  })

  it('keeps the reasons in the documented order when every rule fires', () => {
    const input: AttentionInput = {
      assessment: { ...(assessments.acme), status: 'Pending' },
      creditReport: report({ riskBand: 'High', isThinFile: true }),
      bankStatement: statement(0, 0, 3),
      scoreItems: items(101, 600, [['Cash Flow', 5]]),
    }
    assert.deepEqual(
      attentionReasons(input).map((r) => r.code),
      ['pending', 'high-risk', 'thin-file', 'low-net-share', 'weak-categories'],
    )
  })

  it('orders unrecognised status before unrecognised band', () => {
    const input: AttentionInput = {
      assessment: { ...(assessments.acme), status: { unrecognised: 'X' } },
      creditReport: report({ riskBand: { unrecognised: 'Y' } }),
      bankStatement: statements.acme ,
      scoreItems: [],
    }
    assert.deepEqual(attentionReasons(input), [
      { code: 'unrecognised-status', raw: 'X' },
      { code: 'unrecognised-band', raw: 'Y' },
    ])
  })
})
