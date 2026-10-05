// Server data for the screens. Every fetch goes through these hooks; components never fetch directly.

import { QueryClient, skipToken, useQuery } from '@tanstack/react-query'
import { ApiError, getJson, listOf, parseAssessment, parseBankStatement, parseBusiness, parseCreditReport, parseScoreItem } from './client.ts'
import { latestAssessment } from '../lib/assessment.ts'
import { buildBusinessRows, expectOne } from '../lib/rows.ts'

const parseBusinesses = listOf(parseBusiness, 'businesses')
const parseAssessments = listOf(parseAssessment, 'assessments')
const parseCreditReports = listOf(parseCreditReport, 'creditReports')
const parseBankStatements = listOf(parseBankStatement, 'bankStatements')
const parseScoreItems = listOf(parseScoreItem, 'scoreItems')

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Retrying can't fix a missing record or bad data, so show those at once. Anything else gets one retry.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && (error.kind === 'not-found' || error.kind === 'bad-shape')) && failureCount < 1,
      },
    },
  })
}

function byAssessment(assessmentId: number): string {
  return new URLSearchParams({ assessmentId: String(assessmentId) }).toString()
}

/**
 * The list: all five collections in parallel, joined into one row per business. Fine for a handful of businesses;
 * in production this would be a summary endpoint.
 */
export function useBusinessRows() {
  return useQuery({
    queryKey: ['business-rows'],
    queryFn: async ({ signal }) => {
      const [businesses, assessments, creditReports, bankStatements, scoreItems] = await Promise.all([
        getJson('/businesses', parseBusinesses, signal),
        getJson('/assessments', parseAssessments, signal),
        getJson('/creditReports', parseCreditReports, signal),
        getJson('/bankStatements', parseBankStatements, signal),
        getJson('/scoreItems', parseScoreItems, signal),
      ])
      return buildBusinessRows({ businesses, assessments, creditReports, bankStatements, scoreItems })
    },
  })
}

// The detail: the documented filtered endpoints, one query per section, so each section can fail on its own.

export function useBusiness(businessId: number) {
  return useQuery({
    queryKey: ['business', businessId],
    queryFn: ({ signal }) => getJson(`/businesses/${businessId}`, parseBusiness, signal),
  })
}

export function useCurrentAssessment(businessId: number) {
  return useQuery({
    queryKey: ['assessments', businessId],
    queryFn: async ({ signal }) => {
      const query = new URLSearchParams({ businessId: String(businessId) }).toString()
      return latestAssessment(await getJson(`/assessments?${query}`, parseAssessments, signal))
    },
  })
}

export function useCreditReport(assessmentId: number | null) {
  return useQuery({
    queryKey: ['creditReport', assessmentId],
    queryFn:
      assessmentId === null
        ? skipToken
        : async ({ signal }) =>
            expectOne(await getJson(`/creditReports?${byAssessment(assessmentId)}`, parseCreditReports, signal), 'credit reports'),
  })
}

export function useBankStatement(assessmentId: number | null) {
  return useQuery({
    queryKey: ['bankStatement', assessmentId],
    queryFn:
      assessmentId === null
        ? skipToken
        : async ({ signal }) =>
            expectOne(await getJson(`/bankStatements?${byAssessment(assessmentId)}`, parseBankStatements, signal), 'bank statements'),
  })
}

export function useScoreItems(assessmentId: number | null) {
  return useQuery({
    queryKey: ['scoreItems', assessmentId],
    queryFn:
      assessmentId === null
        ? skipToken
        : ({ signal }) => getJson(`/scoreItems?${byAssessment(assessmentId)}`, parseScoreItems, signal),
  })
}
