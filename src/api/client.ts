import type {
  Assessment,
  AssessmentStatus,
  BankStatement,
  Business,
  CreditReport,
  RiskBand,
  ScoreItem,
  Unrecognised,
} from './types.ts'

const API_BASE = '/api'

export type ApiErrorKind = 'unreachable' | 'not-found' | 'http' | 'bad-shape'

export class ApiError extends Error {
  readonly kind: ApiErrorKind
  /** HTTP status, or null when there was no usable response. */
  readonly status: number | null
  /** Plain-text next step for the analyst, if there is one. */
  readonly hint: string | null

  constructor(kind: ApiErrorKind, message: string, status: number | null = null, hint: string | null = null) {
    super(message)
    this.name = 'ApiError'
    this.kind = kind
    this.status = status
    this.hint = hint
  }
}

export const API_START_COMMAND = 'npm run api'

function unreachable(status: number | null): ApiError {
  return new ApiError(
    'unreachable',
    'Can’t reach the assessments API.',
    status,
    `Is the API running? Start it with ${API_START_COMMAND}`,
  )
}

export async function getJson<T>(path: string, parse: (raw: unknown) => T, signal?: AbortSignal): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE}${path}`, { signal })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw unreachable(null)
  }

  const body = await response.text()

  // When json-server is down, the Vite dev proxy answers 500 with an empty body.
  if (response.status === 500 && body === '') throw unreachable(500)
  if (response.status === 404) throw new ApiError('not-found', 'Not found.', 404)
  if (!response.ok) {
    throw new ApiError('http', `The API answered with status ${response.status}.`, response.status)
  }

  let raw: unknown
  try {
    raw = JSON.parse(body)
  } catch {
    throw new ApiError('bad-shape', 'The API sent a response that isn’t JSON.', response.status)
  }
  return parse(raw)
}

// Shape checks: every field is checked, and anything unexpected throws rather than being guessed at.

type Fields = Record<string, unknown>

function badShape(where: string, expected: string): ApiError {
  return new ApiError('bad-shape', `Unexpected data from the API: ${where} should be ${expected}.`)
}

function asRecord(raw: unknown, where: string): Fields {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw badShape(where, 'an object')
  // Safe after the check above; this is the API boundary.
  return raw as Fields
}

function id(fields: Fields, key: string, where: string): number {
  const value = fields[key]
  if (typeof value !== 'number' || !Number.isInteger(value)) throw badShape(`${where}.${key}`, 'an integer id')
  return value
}

function text(fields: Fields, key: string, where: string): string {
  const value = fields[key]
  if (typeof value !== 'string') throw badShape(`${where}.${key}`, 'text')
  return value
}

function finite(fields: Fields, key: string, where: string): number {
  const value = fields[key]
  if (typeof value !== 'number' || !Number.isFinite(value)) throw badShape(`${where}.${key}`, 'a number')
  return value
}

function finiteOrNull(fields: Fields, key: string, where: string): number | null {
  return fields[key] === null ? null : finite(fields, key, where)
}

// A known label, or the raw text marked as unrecognised. Only a non-text value is a structural error.
function label<T extends string>(fields: Fields, key: string, where: string, known: readonly T[]): T | Unrecognised {
  const value = text(fields, key, where)
  return known.find((option) => option === value) ?? { unrecognised: value }
}

// A calendar date with no time, e.g. 2024-11-15.
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function isoDate(fields: Fields, key: string, where: string): string {
  const value = text(fields, key, where)
  if (!ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) throw badShape(`${where}.${key}`, 'a YYYY-MM-DD date')
  return value
}

const STATUSES: readonly AssessmentStatus[] = ['Complete', 'Pending']
const RISK_BANDS: readonly RiskBand[] = ['Low', 'Medium', 'High']

export function parseBusiness(raw: unknown, where = 'business'): Business {
  const f = asRecord(raw, where)
  return {
    id: id(f, 'id', where),
    name: text(f, 'name', where),
    registrationNumber: text(f, 'registrationNumber', where),
    industry: text(f, 'industry', where),
  }
}

export function parseAssessment(raw: unknown, where = 'assessment'): Assessment {
  const f = asRecord(raw, where)
  return {
    id: id(f, 'id', where),
    businessId: id(f, 'businessId', where),
    createdDate: isoDate(f, 'createdDate', where),
    status: label(f, 'status', where, STATUSES),
  }
}

export function parseCreditReport(raw: unknown, where = 'creditReport'): CreditReport {
  const f = asRecord(raw, where)
  const isThinFile = f.isThinFile
  if (isThinFile !== null && typeof isThinFile !== 'boolean') {
    throw badShape(`${where}.isThinFile`, 'true, false or null')
  }
  return {
    id: id(f, 'id', where),
    assessmentId: id(f, 'assessmentId', where),
    score: finiteOrNull(f, 'score', where),
    riskBand: f.riskBand === null ? null : label(f, 'riskBand', where, RISK_BANDS),
    isThinFile,
  }
}

export function parseBankStatement(raw: unknown, where = 'bankStatement'): BankStatement {
  const f = asRecord(raw, where)
  const months = f.monthsAnalysed
  // A zero or fractional period would make every monthly figure meaningless, so reject it.
  if (months !== null && (typeof months !== 'number' || !Number.isInteger(months) || months < 1)) {
    throw badShape(`${where}.monthsAnalysed`, 'a whole number of months (at least 1) or null')
  }
  return {
    id: id(f, 'id', where),
    assessmentId: id(f, 'assessmentId', where),
    totalCredits: finiteOrNull(f, 'totalCredits', where),
    totalDebits: finiteOrNull(f, 'totalDebits', where),
    monthsAnalysed: months,
  }
}

export function parseScoreItem(raw: unknown, where = 'scoreItem'): ScoreItem {
  const f = asRecord(raw, where)
  return {
    id: id(f, 'id', where),
    assessmentId: id(f, 'assessmentId', where),
    category: text(f, 'category', where),
    score: finite(f, 'score', where),
  }
}

export function listOf<T>(parseItem: (raw: unknown, where: string) => T, name: string): (raw: unknown) => T[] {
  return (raw) => {
    if (!Array.isArray(raw)) throw badShape(name, 'a list')
    return raw.map((item, index) => parseItem(item, `${name}[${index}]`))
  }
}
