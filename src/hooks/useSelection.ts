import { useCallback, useSyncExternalStore } from 'react'
import { parseSelection, searchFor } from '../lib/selection.ts'
import type { Selection } from '../lib/selection.ts'

// pushState doesn't fire popstate, so selections made in the app announce themselves with this event.
const NAVIGATE_EVENT = 'app:navigate'

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange)
  window.addEventListener(NAVIGATE_EVENT, onChange)
  return () => {
    window.removeEventListener('popstate', onChange)
    window.removeEventListener(NAVIGATE_EVENT, onChange)
  }
}

function currentSearch(): string {
  return window.location.search
}

/** The selected business, kept in ?business= so links can be shared and the back button works. */
export function useSelection(): { selection: Selection; select: (businessId: number | null) => void } {
  const search = useSyncExternalStore(subscribe, currentSearch)
  const select = useCallback((businessId: number | null) => {
    const next = searchFor(window.location.search, businessId)
    if (next === window.location.search) return
    window.history.pushState(null, '', `${window.location.pathname}${next}${window.location.hash}`)
    window.dispatchEvent(new Event(NAVIGATE_EVENT))
  }, [])
  return { selection: parseSelection(search), select }
}
