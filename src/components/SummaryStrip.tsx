import type { Summary } from '../lib/rows.ts'

export function SummaryStrip({ summary }: { summary: Summary }) {
  const { businesses, needAttention, pending, highRisk } = summary
  return (
    <ul className="summary" aria-label="Summary">
      <li>
        <strong>{businesses}</strong> {businesses === 1 ? 'business' : 'businesses'}
      </li>
      <li className={needAttention > 0 ? 'summary-attention' : undefined}>
        <strong>{needAttention}</strong> {needAttention === 1 ? 'needs' : 'need'} attention
      </li>
      <li>
        <strong>{pending}</strong> pending
      </li>
      <li>
        <strong>{highRisk}</strong> high risk
      </li>
    </ul>
  )
}
