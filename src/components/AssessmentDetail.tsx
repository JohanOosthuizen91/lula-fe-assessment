import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import type { Assessment, BankStatement, CreditReport, ScoreItem } from '../api/types.ts'
import { useBankStatement, useBusiness, useCreditReport, useCurrentAssessment, useScoreItems } from '../api/queries.ts'
import { ApiError } from '../api/client.ts'
import { CATEGORY_THRESHOLD, attentionReasons, monthlyFinancials } from '../lib/assessment.ts'
import { checkAttention, uncheckedText } from '../lib/attention.ts'
import type { AttentionCheck, SectionLoad, Unchecked } from '../lib/attention.ts'
import {
  formatCategoryScore,
  formatCreditScore,
  formatDate,
  formatMoney,
  formatMonthsAgo,
  formatPercent,
} from '../lib/format.ts'
import { reasonDetail, reasonKey } from '../lib/reasons.ts'
import { ErrorMessage } from './ErrorMessage.tsx'
import { RiskBandPill, StatusPill } from './Pills.tsx'
import { SectionSkeleton } from './Skeletons.tsx'
import { StaleNotice } from './StaleNotice.tsx'

const AWAITING = 'Awaiting assessment'

/** The full assessment for one business. Each section loads, and can fail, on its own. */
export function AssessmentDetail({ businessId }: { businessId: number }) {
  const businessQuery = useBusiness(businessId)
  const assessmentQuery = useCurrentAssessment(businessId)
  const assessmentId = assessmentQuery.data?.id ?? null
  const reportQuery = useCreditReport(assessmentId)
  const statementQuery = useBankStatement(assessmentId)
  const itemsQuery = useScoreItems(assessmentId)

  // Earlier data stays on screen if a refresh fails (with a notice); an error only replaces a section that never loaded.
  if (businessQuery.data === undefined && businessQuery.isError) {
    if (businessQuery.error instanceof ApiError && businessQuery.error.kind === 'not-found') {
      return <p className="detail-message">There’s no business with that id.</p>
    }
    return (
      <ErrorMessage
        title="This business couldn’t be loaded."
        error={businessQuery.error}
        onRetry={() => void businessQuery.refetch()}
      />
    )
  }
  if (businessQuery.data === undefined) return <SectionSkeleton label="Loading business…" lines={3} />

  const business = businessQuery.data
  return (
    <div className="detail">
      <DetailStaleNotice queries={[businessQuery, assessmentQuery, reportQuery, statementQuery, itemsQuery]} />
      <header className="detail-header">
        <h2>{business.name}</h2>
        <p className="detail-sub">
          {business.industry} · Registration {business.registrationNumber}
        </p>
        <AssessedLine query={assessmentQuery} />
      </header>

      {assessmentQuery.data === undefined ? (
        assessmentQuery.isError ? (
          <ErrorMessage
            title="The assessment couldn’t be loaded."
            error={assessmentQuery.error}
            onRetry={() => void assessmentQuery.refetch()}
          />
        ) : (
          <SectionSkeleton label="Loading assessment…" lines={4} />
        )
      ) : assessmentQuery.data === null ? (
        <AttentionBox check={{ kind: 'flagged', reasons: attentionReasons(NO_ASSESSMENT), unchecked: [] }} />
      ) : (
        <AssessmentSections
          assessment={assessmentQuery.data}
          reportQuery={reportQuery}
          statementQuery={statementQuery}
          itemsQuery={itemsQuery}
        />
      )}
    </div>
  )
}

/** One notice for the whole detail when refreshes fail but earlier data is still shown, dated by the oldest of it. */
function DetailStaleNotice({ queries }: { queries: UseQueryResult<unknown>[] }) {
  const stale = queries.filter((q) => q.isError && q.data !== undefined)
  if (stale.length === 0) return null
  const oldest = Math.min(...stale.map((q) => q.dataUpdatedAt))
  return (
    <StaleNotice
      what="this assessment"
      loadedAt={oldest}
      onRetry={() => {
        for (const q of stale) void q.refetch()
      }}
    />
  )
}

const NO_ASSESSMENT = { assessment: null, creditReport: null, bankStatement: null, scoreItems: [] }

function AssessedLine({ query }: { query: UseQueryResult<Assessment | null> }) {
  // Shown whenever there is data, including earlier data kept after a failed refresh.
  const assessment = query.data
  if (assessment === undefined) return null
  if (assessment === null) return <p className="detail-assessed">Not assessed yet</p>
  return (
    <p className="detail-assessed">
      {/* Pending hasn't been assessed yet, so its date is when it started; an unrecognised status gets the neutral "Created". */}
      <StatusPill status={assessment.status} /> {assessment.status === 'Complete' ? 'Assessed' : assessment.status === 'Pending' ? 'Started' : 'Created'}{' '}
      {formatDate(assessment.createdDate)} ·{' '}
      {formatMonthsAgo(assessment.createdDate)}
    </p>
  )
}

type SectionsProps = {
  assessment: Assessment
  reportQuery: UseQueryResult<CreditReport | null>
  statementQuery: UseQueryResult<BankStatement | null>
  itemsQuery: UseQueryResult<ScoreItem[]>
}

function AssessmentSections({ assessment, reportQuery, statementQuery, itemsQuery }: SectionsProps) {
  const pending = assessment.status === 'Pending'
  return (
    <>
      <AttentionBox
        check={checkAttention({
          assessment,
          creditReport: toLoad(reportQuery),
          bankStatement: toLoad(statementQuery),
          scoreItems: toLoad(itemsQuery),
        })}
      />
      <Section title="Credit score" query={reportQuery} what="credit report">
        {(report) => <ScoreSection report={report} pending={pending} />}
      </Section>
      <Section title="Monthly financials" query={statementQuery} what="bank statement">
        {(statement) => <FinancialsSection statement={statement} pending={pending} />}
      </Section>
      <Section title="Score by category" query={itemsQuery} what="category scores">
        {(items) => <CategoriesSection items={items} pending={pending} />}
      </Section>
    </>
  )
}

/** A titled section with its own loading and error state. */
function Section<T>({
  title,
  query,
  what,
  children,
}: {
  title: string
  query: UseQueryResult<T>
  what: string
  children: (data: T) => ReactNode
}) {
  return (
    <section className="detail-section" aria-label={title}>
      <h3>{title}</h3>
      {query.data !== undefined ? (
        children(query.data)
      ) : query.isError ? (
        <ErrorMessage title={`The ${what} couldn’t be loaded.`} error={query.error} onRetry={() => void query.refetch()} />
      ) : (
        <SectionSkeleton label={`Loading the ${what}…`} />
      )}
    </section>
  )
}

// Attention: an all-clear only when every section loaded (see src/lib/attention.ts).

/** A section that has data is checked, including earlier data kept after a failed refresh; one that never loaded is not. */
function toLoad<T>(query: UseQueryResult<T>): SectionLoad<T> {
  if (query.data !== undefined) return { status: 'loaded', data: query.data }
  return query.isError ? { status: 'failed' } : { status: 'loading' }
}

function AttentionBox({ check }: { check: AttentionCheck }) {
  switch (check.kind) {
    case 'checking':
      return (
        <div className="attention attention--checking" role="status">
          Checking the attention rules…
        </div>
      )
    case 'clear':
      return (
        <div className="attention attention--clear">
          <h3>No attention flags</h3>
          <p>Every rule was checked.</p>
        </div>
      )
    case 'not-fully-checked':
      return (
        <div className="attention attention--unchecked">
          <h3>Not fully checked</h3>
          <UncheckedList sections={check.unchecked} />
          <p>The data that did load raised no flags.</p>
        </div>
      )
    case 'flagged':
      return (
        <div className="attention attention--flagged">
          <h3>Needs attention</h3>
          <ul>
            {check.reasons.map((reason) => (
              <li key={reasonKey(reason)}>{reasonDetail(reason)}</li>
            ))}
          </ul>
          {check.unchecked.length > 0 ? <UncheckedList sections={check.unchecked} /> : null}
        </div>
      )
  }
}

function UncheckedList({ sections }: { sections: Unchecked[] }) {
  return (
    <ul className="attention-unchecked">
      {sections.map((item) => (
        <li key={item.section}>{uncheckedText(item)}</li>
      ))}
    </ul>
  )
}

function ScoreSection({ report, pending }: { report: CreditReport | null; pending: boolean }) {
  if (report === null) return <p className="detail-missing">{pending ? AWAITING : 'No credit report was returned.'}</p>
  if (report.score === null && report.riskBand === null) {
    return <p className="detail-missing">{pending ? AWAITING : 'The credit report has no score.'}</p>
  }
  return (
    <>
      <p className="score">
        <span className="score-value figure">{formatCreditScore(report.score)}</span>
        {report.riskBand !== null ? <RiskBandPill band={report.riskBand} /> : null}
      </p>
      <p className="detail-caption">No fixed scale. The band is set by Lula, not worked out from the score.</p>
      {report.isThinFile === true ? (
        <p className="warning">
          <strong>Thin file.</strong> There’s little credit history behind this score, so treat it with caution.
        </p>
      ) : null}
    </>
  )
}

function FinancialsSection({ statement, pending }: { statement: BankStatement | null; pending: boolean }) {
  const monthly = monthlyFinancials(statement)
  if (monthly === null) {
    const message = pending ? AWAITING : statement !== null ? 'The bank statement has no figures.' : 'No bank statement was returned.'
    return <p className="detail-missing">{message}</p>
  }
  const { credits, debits, net, months, netShareOfCredits } = monthly
  // Both bars share one axis: the larger of the two fills the track.
  const axis = Math.max(credits, debits)
  const width = (value: number) => (axis > 0 ? `${(Math.max(value, 0) / axis) * 100}%` : '0%')
  const outShare = netShareOfCredits === null ? null : 1 - netShareOfCredits

  return (
    <>
      <dl className="money">
        <div className="money-row">
          <dt>Money in</dt>
          <dd>
            <span className="figure">{formatMoney(credits)}</span>
            <span className="bar-track" aria-hidden="true">
              <span className="bar bar--in" style={{ width: width(credits) }} />
            </span>
          </dd>
        </div>
        <div className="money-row">
          <dt>Money out</dt>
          <dd>
            <span className="figure">{formatMoney(debits)}</span>
            <span className="bar-track" aria-hidden="true">
              <span className="bar bar--out" style={{ width: width(debits) }} />
            </span>
          </dd>
        </div>
        <div className="money-row money-row--net">
          <dt>Net movement</dt>
          <dd>
            <span className="figure">{formatMoney(net)}</span>
          </dd>
        </div>
      </dl>
      {outShare !== null ? <p>Money out is {formatPercent(outShare)} of money in.</p> : <p>No money came in.</p>}
      <p className="detail-caption">
        Monthly average · {months} {months === 1 ? 'month' : 'months'} of statements · net movement is money in less money
        out, not profit
      </p>
      {/* The source totals, for reference; comparisons between businesses use the monthly averages above. */}
      <p className="detail-caption">
        Statement totals over {months} {months === 1 ? 'month' : 'months'}: {formatMoney(statement?.totalCredits ?? null)} in ·{' '}
        {formatMoney(statement?.totalDebits ?? null)} out
      </p>
    </>
  )
}

function CategoriesSection({ items, pending }: { items: ScoreItem[]; pending: boolean }) {
  if (items.length === 0) {
    return <p className="detail-missing">{pending ? AWAITING : 'No category scores were returned.'}</p>
  }
  const lowestFirst = [...items].sort((a, b) => a.score - b.score)
  const clamp = (score: number) => `${Math.min(Math.max(score, 0), 100)}%`
  return (
    <>
      <ul className="categories">
        {lowestFirst.map((item) => {
          const weak = item.score < CATEGORY_THRESHOLD
          return (
            <li key={item.id} className={weak ? 'category category--weak' : 'category'}>
              <span className="category-name">{item.category}</span>
              <span className="category-value figure">
                {formatCategoryScore(item.score)}
                {weak ? <span className="category-flag"> below {CATEGORY_THRESHOLD}</span> : null}
              </span>
              <div className="bar-track" aria-hidden="true">
                <div className="bar" style={{ width: clamp(item.score) }} />
                <div className="bar-marker" style={{ left: `${CATEGORY_THRESHOLD}%` }}>
                  <span>{CATEGORY_THRESHOLD}</span>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="detail-caption">Out of 100 · not weighted · the overall score is separate</p>
    </>
  )
}
