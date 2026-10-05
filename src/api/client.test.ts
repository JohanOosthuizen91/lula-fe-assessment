import { afterEach, test } from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, getJson, listOf, parseAssessment, parseBankStatement, parseCreditReport } from './client.ts'

const realFetch = globalThis.fetch
afterEach(() => {
  globalThis.fetch = realFetch
})

function isApiError(kind: string) {
  return (error: unknown) => error instanceof ApiError && error.kind === kind
}

const parseCreditReports = listOf(parseCreditReport, 'creditReports')

test('an unknown risk band is kept as unrecognised and the other rows still parse unchanged', () => {
  const raw = [
    { id: 201, assessmentId: 101, score: 612, riskBand: 'Medium', isThinFile: false },
    { id: 202, assessmentId: 102, score: 384, riskBand: 'Very High', isThinFile: true },
    { id: 205, assessmentId: 105, score: null, riskBand: null, isThinFile: null },
  ]

  const reports = parseCreditReports(raw)

  assert.equal(reports.length, 3)
  assert.deepEqual(reports[0], raw[0])
  assert.deepEqual(reports[1]?.riskBand, { unrecognised: 'Very High' })
  assert.equal(reports[1]?.score, 384)
  assert.deepEqual(reports[2], raw[2])
})

test('an unknown status is kept as unrecognised', () => {
  const assessment = parseAssessment({ id: 106, businessId: 6, createdDate: '2024-11-25', status: 'Declined' })
  assert.deepEqual(assessment.status, { unrecognised: 'Declined' })
})

test('structural errors still throw: a band that is not text, or a missing id', () => {
  assert.throws(
    () => parseCreditReports([{ id: 201, assessmentId: 101, score: 612, riskBand: 3, isThinFile: false }]),
    (error: unknown) => error instanceof ApiError && error.kind === 'bad-shape',
  )
  assert.throws(
    () => parseCreditReports([{ assessmentId: 101, score: 612, riskBand: 'Low', isThinFile: false }]),
    (error: unknown) => error instanceof ApiError && error.kind === 'bad-shape',
  )
})

test('an impossible date is rejected rather than rolled forward to another day', () => {
  for (const createdDate of ['2024-02-30', '2023-02-29', '2024-04-31', '2024-13-01']) {
    assert.throws(
      () => parseAssessment({ id: 101, businessId: 1, createdDate, status: 'Complete' }),
      isApiError('bad-shape'),
      createdDate,
    )
  }
  assert.equal(parseAssessment({ id: 101, businessId: 1, createdDate: '2024-02-29', status: 'Complete' }).createdDate, '2024-02-29')
})

test('the dev proxy’s empty 500 (API down) is reported as unreachable', async () => {
  globalThis.fetch = async () => new Response('', { status: 500 })
  await assert.rejects(getJson('/businesses', (raw) => raw), (error: unknown) => {
    assert.ok(error instanceof ApiError)
    assert.equal(error.kind, 'unreachable')
    return true
  })
})

test('a connection that drops while the body is read is reported as unreachable, not a raw TypeError', async () => {
  const failingBody = new ReadableStream({
    start(controller) {
      controller.error(new TypeError('terminated'))
    },
  })
  globalThis.fetch = async () => new Response(failingBody, { status: 200 })
  await assert.rejects(getJson('/businesses', (raw) => raw), isApiError('unreachable'))
})

test('a negative period total is rejected, but more money out than in (a negative net) is valid', () => {
  assert.throws(
    () => parseBankStatement({ id: 1, assessmentId: 1, totalCredits: -300, totalDebits: 150, monthsAnalysed: 3 }),
    isApiError('bad-shape'),
  )
  assert.throws(
    () => parseBankStatement({ id: 1, assessmentId: 1, totalCredits: 300, totalDebits: -150, monthsAnalysed: 3 }),
    isApiError('bad-shape'),
  )
  const outweighs = parseBankStatement({ id: 1, assessmentId: 1, totalCredits: 300, totalDebits: 450, monthsAnalysed: 3 })
  assert.equal(outweighs.totalDebits, 450)
})
