// Grey placeholders while data loads. Screen readers hear one status message instead of the shapes.

const LIST_ROWS = ['row-a', 'row-b', 'row-c', 'row-d', 'row-e']

export function ListSkeleton() {
  return (
    <div className="skeleton-list" role="status">
      <span className="visually-hidden">Loading businesses…</span>
      <div className="skeleton-summary" aria-hidden="true">
        <span className="skeleton skeleton--short" />
        <span className="skeleton skeleton--short" />
        <span className="skeleton skeleton--short" />
      </div>
      <div className="panel skeleton-panel" aria-hidden="true">
        {LIST_ROWS.map((key) => (
          <div key={key} className="skeleton-row">
            <span className="skeleton skeleton--name" />
            <span className="skeleton skeleton--short" />
            <span className="skeleton skeleton--short" />
            <span className="skeleton skeleton--short" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SectionSkeleton({ label, lines = 2 }: { label: string; lines?: number }) {
  const keys = ['line-a', 'line-b', 'line-c', 'line-d'].slice(0, lines)
  return (
    <div className="skeleton-section" role="status">
      <span className="visually-hidden">{label}</span>
      {keys.map((key) => (
        <span key={key} className="skeleton" aria-hidden="true" />
      ))}
    </div>
  )
}
