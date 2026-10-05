import { forwardRef, useEffect, useRef } from 'react'
import { useBusinessRows } from './api/queries.ts'
import { useSelection } from './hooks/useSelection.ts'
import { sortForReview, summarise } from './lib/rows.ts'
import type { BusinessRow } from './lib/rows.ts'
import type { Selection } from './lib/selection.ts'
import { BusinessList } from './components/BusinessList.tsx'
import { ErrorMessage } from './components/ErrorMessage.tsx'
import { SummaryStrip } from './components/SummaryStrip.tsx'

/** Below 1200px the detail stacks under the list. Must match the media query in styles/app.css. */
export const STACKED_LAYOUT_QUERY = '(max-width: 1199px)'

type FocusRequest = { target: 'detail' } | { target: 'row'; businessId: number }

export function App() {
  const rowsQuery = useBusinessRows()
  const { selection, select } = useSelection()
  const selectedId = selection.kind === 'business' ? selection.id : null
  const showPanel = selection.kind !== 'none'

  const listRef = useRef<HTMLElement>(null)
  const detailRef = useRef<HTMLElement>(null)
  const focusRequest = useRef<FocusRequest | null>(null)

  // Focus moves only after the selection has rendered, so the element it moves to exists.
  useEffect(() => {
    const request = focusRequest.current
    if (request === null) return
    focusRequest.current = null
    if (request.target === 'detail') {
      detailRef.current?.focus()
    } else {
      listRef.current?.querySelector<HTMLButtonElement>(`button[data-business-id="${request.businessId}"]`)?.focus()
    }
  }, [selection.kind, selectedId])

  function openBusiness(businessId: number) {
    // Side by side, the detail is already in view, so focus stays on the list.
    if (!window.matchMedia(STACKED_LAYOUT_QUERY).matches) {
      select(businessId)
      return
    }
    if (businessId === selectedId) {
      detailRef.current?.focus()
      return
    }
    focusRequest.current = { target: 'detail' }
    select(businessId)
  }

  function backToList() {
    focusRequest.current = selectedId === null ? null : { target: 'row', businessId: selectedId }
    select(null)
  }

  return (
    <>
      <header className="topbar">
        <h1>Credit assessments</h1>
      </header>
      <main className="page">
        {rowsQuery.isPending ? (
          <p className="page-status" role="status">
            Loading businesses…
          </p>
        ) : rowsQuery.isError ? (
          <ErrorMessage
            title="The businesses couldn’t be loaded."
            error={rowsQuery.error}
            onRetry={() => void rowsQuery.refetch()}
          />
        ) : (
          <>
            <SummaryStrip summary={summarise(rowsQuery.data)} />
            <div className={showPanel ? 'layout layout--with-panel' : 'layout'}>
              <section ref={listRef} className="panel list-panel" aria-label="Businesses">
                {showPanel ? null : <p className="list-prompt">Choose a business to see its full assessment.</p>}
                <BusinessList rows={sortForReview(rowsQuery.data)} selectedId={selectedId} onSelect={openBusiness} />
              </section>
              {showPanel ? (
                <SelectionPanel ref={detailRef} selection={selection} rows={rowsQuery.data} onClose={backToList} />
              ) : null}
            </div>
          </>
        )}
      </main>
    </>
  )
}

type SelectionPanelProps = { selection: Selection; rows: readonly BusinessRow[]; onClose: () => void }

const SelectionPanel = forwardRef<HTMLElement, SelectionPanelProps>(function SelectionPanel({ selection, rows, onClose }, ref) {
  const row = selection.kind === 'business' ? rows.find((r) => r.business.id === selection.id) : undefined
  return (
    <section ref={ref} tabIndex={-1} className="panel detail-panel" aria-label="Assessment">
      <button type="button" className="button button--quiet" onClick={onClose}>
        Back to list
      </button>
      {selection.kind === 'invalid' ? (
        <p className="detail-message">This link doesn’t point to a business.</p>
      ) : row === undefined ? (
        <p className="detail-message">There’s no business with that id.</p>
      ) : (
        <header className="detail-header">
          <h2>{row.business.name}</h2>
          <p className="detail-sub">
            {row.business.industry} · Registration {row.business.registrationNumber}
          </p>
        </header>
      )}
    </section>
  )
})
