import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react'
import { Search } from '../utils/icons'
import { trackEvent } from '../lib/analytics'
import { CONTENT } from '../data/content'

// The field, the results and the search code load when the search is opened.
const SiteSearchDialog = lazy(() => import('./SiteSearchDialog'))

/**
 * Search from any page: a button in the navigation bar that opens a search
 * field over the page. Command + K or Control + K opens it too.
 *
 * Pages with a search field of their own (home, the platform pages) do not
 * show it: `hidden` comes from the navigation bar.
 */
export default function SiteSearch({ platforms, hidden = false }) {
  const c = CONTENT.shared.siteSearch
  const [open, setOpen] = useState(false)
  const buttonRef = useRef(null)

  const show = useCallback((source) => {
    setOpen(true)
    trackEvent('site_search_opened', { source })
  }, [])

  // `focus`: back to the button, unless the visitor left for another page.
  const close = useCallback(({ focus }) => {
    setOpen(false)
    if (focus) buttonRef.current?.focus()
  }, [])

  // Command + K / Control + K, from anywhere on the page.
  useEffect(() => {
    if (hidden) return
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        if (!open) show('keyboard')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [hidden, open, show])

  if (hidden) return null

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => show('navbar')}
        aria-label={c.open}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex items-center justify-center gap-2 min-w-[44px] h-[44px] md:h-8 md:px-3 rounded-lg md:rounded-full md:bg-theme-surface text-theme-text md:text-theme-muted hover:bg-theme-base-alt md:hover:text-theme-text transition-colors cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
      >
        <Search size={18} className="md:w-[14px] md:h-[14px]" aria-hidden="true" />
        <span className="hidden md:inline text-[13px]">{c.button}</span>
      </button>

      {open && (
        <Suspense fallback={null}>
          <SiteSearchDialog platforms={platforms} onClose={close} />
        </Suspense>
      )}
    </>
  )
}
