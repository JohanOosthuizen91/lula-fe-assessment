import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ApiError, listOf, parseAssessment, parseBankStatement, parseBusiness, parseCreditReport, parseScoreItem } from '../api/client.ts'
import { buildBusinessRows, expectOne, sortForReview, summarise } from './rows.ts'
import type { Collections } from './rows.ts'

// The real mock data, parsed the same way the app parses the API.
const raw: unknown = JSON.parse(readFileSync(new URL('../../data.json', import.meta.url), 'utf8'))
const data = new Map<string, unknown>(Object.entries(typeof raw === 'object' && raw !== null ? raw : {}))
const collections: Collections = {
  businesses: listOf(parseBusiness, 'businesses')(data.get('businesses')),
  assessments: listOf(parseAssessment, 'assessments')(data.get('assessments')),
  creditReports: listOf(parseCreditReport, 'creditReports')(data.get('creditReports')),
  bankStatements: listOf(parseBankStatement, 'bankStatements')(data.get('bankStatements')),
  scoreItems: listOf(parseScoreItem, 'scoreItems')(data.get('scoreItems')),
}

function rowFor(rows: ReturnType<typeof buildBusinessRows>, name: string) {
  const row = rows.find((r) => r.business.name === name)
  if (row === undefined) throw new Error(`no row for ${name}`)
  return row
}

describe('buildBusinessRows with the real data', () => {
  const rows = buildBusinessRows(collections)

  it('gives one row per business', () => {
    assert.equal(rows.length, 5)
  })

  it('uses monthly figures: Cape Foods is R206 666,67 a month, not its 6-month total', () => {
    const cape = rowFor(rows, 'Cape Foods Distributors')
    assert.equal(cape.monthly?.months, 6)
    assert.equal(cape.monthly?.credits.toFixed(2), '206666.67')
  })

  it('flags Bright with four reasons and Echo as pending; the others are clear', () => {
    assert.deepEqual(
      rowFor(rows, 'Bright Construction').reasons.map((r) => r.code),
      ['high-risk', 'thin-file', 'low-net-share', 'weak-categories'],
    )
    assert.deepEqual(rowFor(rows, 'Echo Tech Solutions').reasons, [{ code: 'pending' }])
    for (const name of ['Acme Traders', 'Cape Foods Distributors', 'Delta Logistics']) {
      assert.deepEqual(rowFor(rows, name).reasons, [], name)
    }
  })

  it('keeps Echo’s missing figures as null, never 0', () => {
    const echo = rowFor(rows, 'Echo Tech Solutions')
    assert.equal(echo.monthly, null)
    assert.equal(echo.creditReport?.score, null)
    assert.deepEqual(echo.scoreItems, [])
  })
})

describe('buildBusinessRows edge cases', () => {
  it('flags a business with no assessment', () => {
    const rows = buildBusinessRows({ ...collections, assessments: collections.assessments.filter((a) => a.businessId !== 1) })
    const acme = rowFor(rows, 'Acme Traders')
    assert.equal(acme.assessment, null)
    assert.deepEqual(acme.reasons, [{ code: 'no-assessment' }])
  })

  it('uses only the current assessment’s records', () => {
    const newer = { id: 999, businessId: 1, createdDate: '2025-01-10', status: 'Pending' as const }
    const acme = rowFor(buildBusinessRows({ ...collections, assessments: [...collections.assessments, newer] }), 'Acme Traders')
    assert.equal(acme.assessment?.id, 999)
    assert.equal(acme.creditReport, null)
    assert.deepEqual(acme.scoreItems, [])
    assert.deepEqual(acme.reasons, [{ code: 'pending' }])
  })

  it('picks no credit report when two come back for one assessment, and says so', () => {
    const duplicate = { id: 299, assessmentId: 101, score: 700, riskBand: 'Low' as const, isThinFile: false }
    const rows = buildBusinessRows({ ...collections, creditReports: [...collections.creditReports, duplicate] })
    const acme = rowFor(rows, 'Acme Traders')
    assert.equal(acme.creditReport, null)
    assert.deepEqual(acme.reasons[0], { code: 'conflicting-records', records: 'credit reports', count: 2 })
    assert.deepEqual(rowFor(rows, 'Delta Logistics').reasons, [])
  })
})

describe('expectOne', () => {
  it('returns the record, or null when there is none', () => {
    assert.equal(expectOne([7], 'credit reports'), 7)
    assert.equal(expectOne([], 'bank statements'), null)
  })
  it('throws rather than picking one when there are several', () => {
    assert.throws(() => expectOne([1, 2], 'bank statements'), (e: unknown) => e instanceof ApiError && e.kind === 'bad-shape')
  })
})

describe('sortForReview and summarise with the real data', () => {
  const rows = buildBusinessRows(collections)

  it('puts businesses needing attention first, then sorts by name', () => {
    assert.deepEqual(
      sortForReview(rows).map((r) => r.business.name),
      ['Bright Construction', 'Echo Tech Solutions', 'Acme Traders', 'Cape Foods Distributors', 'Delta Logistics'],
    )
  })

  it('counts 5 businesses, 2 needing attention, 1 pending and 1 high risk', () => {
    assert.deepEqual(summarise(rows), { businesses: 5, needAttention: 2, pending: 1, highRisk: 1 })
  })
})
