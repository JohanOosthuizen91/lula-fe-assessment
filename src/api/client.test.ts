import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ApiError, listOf, parseAssessment, parseCreditReport } from './client.ts'

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
