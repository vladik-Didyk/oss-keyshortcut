import { useState, useMemo, useCallback, useDeferredValue } from 'react'
import { usePlatformData } from './usePlatformData'
import { buildSearchIndex, searchIndex } from '../utils/searchHelpers'

const NO_SECTIONS = []

/**
 * Search over the apps and shortcuts of one platform.
 *
 * The page has the list of apps (name, category, count). The shortcuts are
 * loaded when the visitor turns to the search: on focus, or with the first
 * letter. Until they are there, the search finds apps by name.
 *
 *   const { results, wake, ready } = usePlatformSearch('macos', apps, query)
 *   <input onFocus={wake} ... />
 */
export function usePlatformSearch(platformId, apps, query) {
  const [awake, setAwake] = useState(false)
  const wake = useCallback(() => setAwake(true), [])
  const wanted = awake || query.trim().length > 0
  const { apps: fullApps, error } = usePlatformData(wanted ? platformId : null)

  const names = useMemo(() => (apps || []).map((app) => ({ ...app, sections: NO_SECTIONS })), [apps])
  const loaded = fullApps?.length ? fullApps : null
  const index = useMemo(() => buildSearchIndex(loaded || names), [loaded, names])
  const deferredQuery = useDeferredValue(query)
  const results = useMemo(() => searchIndex(index, deferredQuery), [index, deferredQuery])

  return { results, wake, ready: Boolean(loaded), error }
}
