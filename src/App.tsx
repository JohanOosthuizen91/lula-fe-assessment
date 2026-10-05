import { forwardRef, useEffect, useRef } from 'react'
import { useBusinessRows } from './api/queries.ts'
import { useSelection } from './hooks/useSelection.ts'
import { sortForReview, summarise } from './lib/rows.ts'
import type { Selection } from './lib/selection.ts'
import { AssessmentDetail } from './components/AssessmentDetail.tsx'
import { BusinessList } from './components/BusinessList.tsx'
import { ErrorMessage } from './components/ErrorMessage.tsx'
import { ListSkeleton } from './components/Skeletons.tsx'
import { StaleNotice } from './components/StaleNotice.tsx'
import { SummaryStrip } from './components/SummaryStrip.tsx'

/**
 * From 1200px the detail sits beside the list; below that it stacks. This is the exact media query in
 * styles/app.css, and "stacked" is its opposite, so the two can never disagree (even at a zoomed 1199.5px).
 */
export const SIDE_BY_SIDE_QUERY = '(min-width: 1200px)'

/**
 * Moves focus to the stacked detail and scrolls its top into view. Focusing alone left the heading off screen,
 * depending on where the list was scrolled, so the scroll is explicit (smooth unless reduced motion is asked for).
 */
function revealDetail(panel: HTMLElement | null) {
  if (panel === null) return
  panel.focus({ preventScroll: true })
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  panel.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' })
}

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
      revealDetail(detailRef.current)
    } else {
      listRef.current?.querySelector<HTMLButtonElement>(`button[data-business-id="${request.businessId}"]`)?.focus()
    }
  }, [selection.kind, selectedId])

  function openBusiness(businessId: number) {
    // Side by side, the detail is already in view, so focus stays on the list.
    if (window.matchMedia(SIDE_BY_SIDE_QUERY).matches) {
      select(businessId)
      return
    }
    if (businessId === selectedId) {
      revealDetail(detailRef.current)
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
        {/* Loaded data stays on screen if a later refresh fails; the notice says so and how old it is. */}
        {rowsQuery.data === undefined ? (
          rowsQuery.isError ? (
            <ErrorMessage
              title="The businesses couldn’t be loaded."
              error={rowsQuery.error}
              onRetry={() => void rowsQuery.refetch()}
            />
          ) : (
            <ListSkeleton />
          )
        ) : (
          <>
            {rowsQuery.isError ? (
              <StaleNotice what="the list" loadedAt={rowsQuery.dataUpdatedAt} onRetry={() => void rowsQuery.refetch()} />
            ) : null}
            <SummaryStrip summary={summarise(rowsQuery.data)} />
            <div className={showPanel ? 'layout layout--with-panel' : 'layout'}>
              <section ref={listRef} className="panel list-panel" aria-label="Businesses">
                {showPanel ? null : <p className="list-prompt">Choose a business to see its full assessment.</p>}
                <BusinessList rows={sortForReview(rowsQuery.data)} selectedId={selectedId} onSelect={openBusiness} />
              </section>
              {showPanel ? (
                <SelectionPanel ref={detailRef} selection={selection} onClose={backToList} />
              ) : null}
            </div>
          </>
        )}
      </main>
    </>
  )
}

type SelectionPanelProps = { selection: Selection; onClose: () => void }

const SelectionPanel = forwardRef<HTMLElement, SelectionPanelProps>(function SelectionPanel({ selection, onClose }, ref) {
  return (
    <section ref={ref} tabIndex={-1} className="panel detail-panel" aria-label="Assessment">
      <button type="button" className="button button--quiet" onClick={onClose}>
        Back to list
      </button>
      {selection.kind === 'business' ? (
        <AssessmentDetail key={selection.id} businessId={selection.id} />
      ) : (
        <p className="detail-message">This link doesn’t point to a business.</p>
      )}
    </section>
  )
})
