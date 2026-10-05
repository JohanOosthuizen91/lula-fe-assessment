import type { BusinessRow } from '../lib/rows.ts'
import { reasonKey } from '../lib/reasons.ts'
import { PLACEHOLDER, formatCreditScore, formatDate, formatMoney } from '../lib/format.ts'
import { ReasonChip, RiskBandPill, StatusPill } from './Pills.tsx'

type Props = {
  rows: readonly BusinessRow[]
  selectedId: number | null
  onSelect: (businessId: number) => void
}

export function BusinessList({ rows, selectedId, onSelect }: Props) {
  return (
    <table className="list-table">
      <caption className="visually-hidden">Businesses, those needing attention first</caption>
      <thead>
        <tr>
          <th scope="col">Business</th>
          <th scope="col">Status</th>
          <th scope="col" className="num">
            Credit score
          </th>
          <th scope="col" className="num">
            Monthly net
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <BusinessListRow
            key={row.business.id}
            row={row}
            selected={row.business.id === selectedId}
            onSelect={onSelect}
          />
        ))}
      </tbody>
    </table>
  )
}

function BusinessListRow({ row, selected, onSelect }: { row: BusinessRow; selected: boolean; onSelect: (id: number) => void }) {
  const { business, assessment, reasons } = row
  const needsAttention = reasons.length > 0
  const className = ['list-row', needsAttention ? 'list-row--attention' : '', selected ? 'list-row--selected' : '']
    .filter(Boolean)
    .join(' ')

  return (
    <tr className={className}>
      <th scope="row" className="list-business">
        <button
          type="button"
          className="list-name"
          data-business-id={business.id}
          aria-current={selected ? 'true' : undefined}
          onClick={() => onSelect(business.id)}
        >
          {business.name}
        </button>
        <span className="list-sub">{business.industry}</span>
        {needsAttention ? (
          <ul className="list-reasons" aria-label={`Needs attention: ${reasons.length} ${reasons.length === 1 ? 'reason' : 'reasons'}`}>
            {reasons.map((reason) => (
              <li key={reasonKey(reason)}>
                <ReasonChip reason={reason} />
              </li>
            ))}
          </ul>
        ) : null}
      </th>
      <td data-label="Status">
        <StatusPill status={assessment?.status ?? null} />
        {assessment !== null ? <span className="list-sub">{formatDate(assessment.createdDate)}</span> : null}
      </td>
      <td data-label="Credit score" className="num">
        <ScoreCell row={row} />
      </td>
      <td data-label="Monthly net" className="num">
        <NetCell row={row} />
      </td>
    </tr>
  )
}

function isPending(row: BusinessRow): boolean {
  return row.assessment?.status === 'Pending'
}

function ScoreCell({ row }: { row: BusinessRow }) {
  const score = row.creditReport?.score ?? null
  const band = row.creditReport?.riskBand ?? null
  if (score === null && band === null) {
    return <span className="list-missing">{isPending(row) ? 'Awaiting assessment' : PLACEHOLDER}</span>
  }
  return (
    <span className="list-score">
      <span className="figure">{formatCreditScore(score)}</span>
      {band !== null ? <RiskBandPill band={band} /> : null}
    </span>
  )
}

function NetCell({ row }: { row: BusinessRow }) {
  const { monthly } = row
  if (monthly === null) {
    return <span className="list-missing">{isPending(row) ? 'Awaiting assessment' : PLACEHOLDER}</span>
  }
  return (
    <>
      <span className="figure">{formatMoney(monthly.net)}</span>
      <span className="list-sub">
        average of {monthly.months} {monthly.months === 1 ? 'month' : 'months'}
      </span>
    </>
  )
}
