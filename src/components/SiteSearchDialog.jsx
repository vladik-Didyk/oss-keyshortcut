import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router'
import { Search, X } from '../utils/icons'
import { usePlatformSearch } from '../hooks/usePlatformSearch'
import { preferredPlatform, rememberPlatform } from '../utils/preferredPlatform'
import { flattenSearchResults } from '../utils/searchHelpers'
import { linkPath } from '../utils/siteUrl'
import { trackEvent } from '../lib/analytics'
import { CONTENT } from '../data/content'
import SearchDropdown from './SearchDropdown'
import { PlatformGlyph } from './PlatformIcons'

const LIST_ID = 'site-search-listbox'

/**
 * The search field over the page, with its results. Loaded when the visitor
 * opens the search (see SiteSearch.jsx), and with it the search code: a page
 * that nobody searches from loads neither.
 *
 * It searches the apps and shortcuts of one platform: the one the visitor chose
 * last, else the one of their system.
 */
export default function SiteSearchDialog({ platforms, onClose }) {
  const c = CONTENT.shared.siteSearch
  const ids = useMemo(() => platforms.map((p) => p.id), [platforms])
  const [query, setQuery] = useState('')
  const [platform, setPlatform] = useState(() => preferredPlatform(ids, ids[0]))
  const [activeIndex, setActiveIndex] = useState(-1)
  const inputRef = useRef(null)
  const dialogRef = useRef(null)
  const navigate = useNavigate()

  const { results, ready, error, wake } = usePlatformSearch(platform, null, query)
  const flat = useMemo(() => flattenSearchResults(results, platform), [results, platform])

  // On opening: load the shortcuts, take the focus, hold the page behind still.
  useEffect(() => {
    wake()
    inputRef.current?.focus()
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [wake])

  const close = () => onClose({ focus: true })

  const choosePlatform = (id) => {
    setPlatform(id)
    rememberPlatform(id)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }

  const go = (href) => {
    trackEvent('site_search_performed', { query, platform, has_results: flat.length > 0 })
    navigate(linkPath(href))
    onClose({ focus: false })
  }

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      close()
      return
    }
    // The page behind is out of reach while the search is open: Tab stays inside.
    if (e.key === 'Tab') {
      const stops = [...dialogRef.current.querySelectorAll('input, button')]
      const first = stops[0]
      const last = stops[stops.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
      return
    }
    if (e.target !== inputRef.current || !query.trim() || flat.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flat.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i <= 0 ? flat.length - 1 : i - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go((flat[activeIndex] || flat[0]).href)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-theme-text/30 px-4 pt-[calc(env(safe-area-inset-top)+3.5rem)]"
      onMouseDown={(e) => { if (e.target === e.currentTarget) close() }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={c.title}
        onKeyDown={onKeyDown}
        className="relative mx-auto max-w-[640px] rounded-2xl bg-theme-base border border-theme-border shadow-lg p-3"
      >
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={query.trim().length > 0}
              aria-controls={LIST_ID}
              aria-autocomplete="list"
              aria-activedescendant={activeIndex >= 0 ? `${LIST_ID}-opt-${activeIndex}` : undefined}
              aria-label={c.field(platforms.find((p) => p.id === platform)?.label)}
              placeholder={CONTENT.home.searchPlaceholder}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setActiveIndex(-1) }}
              className="w-full h-12 pl-11 pr-3 rounded-xl bg-theme-surface outline-none text-[17px] text-theme-text caret-theme-accent focus-visible:ring-2 focus-visible:ring-theme-accent"
            />
          </div>
          <button
            type="button"
            onClick={close}
            aria-label={c.close}
            className="flex items-center justify-center w-[44px] h-[44px] shrink-0 rounded-lg bg-transparent text-theme-muted hover:text-theme-text hover:bg-theme-base-alt transition-colors cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div role="radiogroup" aria-label={CONTENT.home.platformLabel} className="mt-2 flex gap-1">
          {platforms.map((p) => {
            const chosen = p.id === platform
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={chosen}
                onClick={() => choosePlatform(p.id)}
                className={`inline-flex items-center gap-1.5 min-h-[44px] pointer-fine:min-h-8 px-3 rounded-full text-[13px] font-medium cursor-pointer border-none outline-none transition-colors focus-visible:ring-2 focus-visible:ring-theme-accent ${
                  chosen ? 'bg-theme-accent text-theme-accent-text' : 'bg-transparent text-theme-muted hover:text-theme-text hover:bg-theme-base-alt'
                }`}
              >
                <PlatformGlyph id={p.id} />
                {p.label}
              </button>
            )
          })}
        </div>

        {/* The list hangs under the dialog, as it does under the field of the home page. */}
        {query.trim() && (
          <SearchDropdown
            results={results}
            platform={platform}
            query={query}
            listId={LIST_ID}
            activeIndex={activeIndex}
            loading={!ready && !error}
            onClose={() => onClose({ focus: false })}
          />
        )}
      </div>
    </div>
  )
}
