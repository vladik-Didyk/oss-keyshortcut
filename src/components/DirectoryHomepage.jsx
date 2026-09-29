import { useState, useMemo, useRef, useEffect, useLayoutEffect, useCallback } from 'react'
import { useLoaderData, useNavigate } from 'react-router'
import Link from './SiteLink'
import { Search, X, ArrowRight } from '../utils/icons'
import { usePlatformSearch } from '../hooks/usePlatformSearch'
import { parseKeyParts } from '../utils/platformHelpers'
import { preferredPlatform, rememberPlatform, platformScript, platformStyles } from '../utils/preferredPlatform'
import { flattenSearchResults } from '../utils/searchHelpers'
import PlatformPanel from './directory/PlatformPanel'
import SearchDropdown from './SearchDropdown'
import { CONTENT } from '../data/content'
import { APP_STORE_URL, APP_COUNT, SHORTCUT_COUNT } from '../data/siteConfig'
import { trackEvent } from '../lib/analytics'
import { POPULAR_APPS } from '../data/popularApps'
import { linkPath } from '../utils/siteUrl'

// In the browser the choice of platform must be known before the page is drawn
// again; on the server there is nothing to draw, and React warns about a layout
// effect there.
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect

const NO_PLATFORMS = []

/**
 * The home page: search, and the directory of each platform.
 *
 * It is served with the app list of every platform in it (directory), so a
 * crawler reads all of them and a visitor's own platform needs no request. A
 * script at the top of the page chooses the list to show before the first
 * paint; after hydration `selectedPlatform` holds the same choice.
 * The shortcuts themselves are not in the page. The search loads them when the
 * visitor turns to it.
 */
export default function DirectoryHomepage() {
  const loaderData = useLoaderData()
  const platforms = loaderData?.manifest?.platforms ?? NO_PLATFORMS
  const directory = loaderData?.directory
  const defaultPlatformId = loaderData?.defaultPlatformId || 'macos'
  const platformIds = useMemo(() => platforms.map((p) => p.id), [platforms])

  const [search, setSearch] = useState('')
  // The server's choice first, so that hydration finds the page it expects.
  const [selectedPlatform, setSelectedPlatform] = useState(defaultPlatformId)
  useBrowserLayoutEffect(() => {
    setSelectedPlatform(preferredPlatform(platformIds, defaultPlatformId))
  }, [platformIds, defaultPlatformId])

  const searchRef = useRef(null)
  const searchContainerRef = useRef(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listId = 'directory-search-listbox'

  const apps = directory?.[selectedPlatform]?.apps
  const { results: smartResults, wake: wakeSearch, ready: searchReady, error } = usePlatformSearch(selectedPlatform, apps, search)

  const navigate = useNavigate()
  const hasSmartResults = smartResults.appMatches.length > 0 || smartResults.shortcutMatches.length > 0

  // Flat, ordered list of selectable result rows for keyboard navigation —
  // ordering matches SearchDropdown's render order.
  const flatResults = useMemo(
    () => flattenSearchResults(smartResults, selectedPlatform),
    [smartResults, selectedPlatform]
  )
  const totalResultCount = flatResults.length
  const showDropdown = dropdownOpen && search.trim().length > 0

  // Typing resets the highlighted option, opens the dropdown, and clears category.
  const onSearchChange = useCallback((value) => {
    setSearch(value)
    setActiveIndex(-1)
    setDropdownOpen(value.trim().length > 0)
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setSearch('')
        setDropdownOpen(false)
        searchRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Click / focus outside the search container dismisses the dropdown.
  useEffect(() => {
    if (!showDropdown) return
    const onPointerDown = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showDropdown])


  const setPlatform = useCallback((id) => {
    setSelectedPlatform(id)
    rememberPlatform(id)
    setSearch('')
    setDropdownOpen(false)
    trackEvent('platform_switched', { platform: id })
  }, [])

  // Combobox keyboard navigation: Up/Down move the highlighted option,
  // Enter selects it (or the top match), Escape closes the dropdown.
  const onSearchKeyDown = useCallback((e) => {
    if (!search.trim()) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (flatResults.length === 0) return
      setDropdownOpen(true)
      setActiveIndex(prev => (prev + 1) % flatResults.length)
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (flatResults.length === 0) return
      setDropdownOpen(true)
      setActiveIndex(prev => (prev <= 0 ? flatResults.length - 1 : prev - 1))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      trackEvent('directory_search_performed', { query: search, platform: selectedPlatform, has_results: hasSmartResults })
      // Highlighted option wins; otherwise fall back to the top match.
      const chosen =
        activeIndex >= 0 && flatResults[activeIndex]
          ? flatResults[activeIndex].href
          : smartResults.appMatches[0]
            ? `/${selectedPlatform}/${smartResults.appMatches[0].slug}`
            : smartResults.shortcutMatches[0]
              ? `/${selectedPlatform}/${smartResults.shortcutMatches[0].appSlug}`
              : null
      if (chosen) {
        navigate(linkPath(chosen))
        setSearch('')
        setDropdownOpen(false)
        searchRef.current?.blur()
      }
    }
  }, [search, flatResults, activeIndex, smartResults, selectedPlatform, hasSmartResults, navigate])

  return (
    <div className="min-h-screen bg-theme-base" data-home="" data-platform={selectedPlatform} suppressHydrationWarning>
      {/* Chooses the platform before the first paint. Must stay the first child. */}
      <script dangerouslySetInnerHTML={{ __html: platformScript(platformIds, defaultPlatformId) }} />
      <style dangerouslySetInnerHTML={{ __html: platformStyles(platformIds) }} />

      {/* ─── Hero ─── */}
      {/* Reduced top padding (was pt-24 md:pt-32) so the app grid sits higher / above the fold. */}
      <section className="pt-20 md:pt-24 pb-8 px-5 md:px-6">
        <div className="mx-auto max-w-[780px] text-center">
          <h1 className="text-[2rem] sm:text-[3.25rem] md:text-[4rem] font-bold tracking-tight leading-[1.08] mb-3">
            <span className="text-theme-text">{CONTENT.home.title}</span>
            <br />
            <span className="text-accent">{CONTENT.home.titleAccent}</span>
          </h1>

          {/* Counts come from the data at build time (siteConfig). */}
          <p className="text-theme-muted text-[1.0625rem] md:text-[1.125rem] mb-6 tabular-nums">
            {CONTENT.home.stats(SHORTCUT_COUNT.toLocaleString('en-US'), APP_COUNT)}
          </p>

          {/* Platform switch: iOS-style segmented control (track + raised selected segment).
              Inline rather than directory/PlatformToggle.jsx, which nothing imports. */}
          {!search && platforms.length > 0 && (
            <div className="flex justify-center mb-4">
              <div
                role="radiogroup"
                aria-label={CONTENT.home.platformLabel}
                className="grid w-full max-w-[380px] p-0.5 rounded-xl bg-theme-surface"
                style={{ gridTemplateColumns: `repeat(${platforms.length}, minmax(0, 1fr))` }}
              >
                {platforms.map((p) => {
                  const isActive = p.id === selectedPlatform
                  return (
                    <button
                      key={p.id}
                      role="radio"
                      aria-checked={isActive}
                      data-tab={p.id}
                      onClick={() => setPlatform(p.id)}
                      className="flex items-center justify-center gap-2 min-h-[44px] pointer-fine:min-h-[40px] px-2 rounded-[10px] text-[15px] font-medium transition-all cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-accent bg-transparent text-theme-muted hover:text-theme-text"
                    >
                      {p.icon && (
                        <img
                          decoding="async"
                          src={`/images/platform-icons/${p.icon.replace('.png', '.webp')}`}
                          alt=""
                          width={15}
                          height={15}
                          className="shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span>{p.displayName}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Search */}
          <div ref={searchContainerRef} className="relative max-w-[600px] mx-auto">
            <div
              className={`relative rounded-xl bg-theme-surface border border-transparent hover:border-theme-border transition-all duration-300 ${
                searchFocused ? 'directory-search-focused' : ''
              }`}
            >
              <Search
                size={18}
                className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-theme-muted"
                aria-hidden="true"
              />
              <input
                ref={searchRef}
                type="text"
                placeholder={CONTENT.home.searchPlaceholder}
                value={search}
                role="combobox"
                aria-expanded={showDropdown}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                  showDropdown && activeIndex >= 0 ? `${listId}-opt-${activeIndex}` : undefined
                }
                onChange={e => onSearchChange(e.target.value)}
                onKeyDown={onSearchKeyDown}
                onFocus={() => { setSearchFocused(true); wakeSearch(); if (search.trim()) setDropdownOpen(true) }}
                onBlur={() => setSearchFocused(false)}
                aria-label={CONTENT.home.searchAriaLabel}
                className={`directory-search w-full h-12 pl-11 bg-transparent outline-none text-[17px] text-theme-text caret-theme-accent ${
                  search ? 'pr-28' : 'pr-4 sm:pr-20'
                }`}
              />
              {/* Live result count next to the input */}
              {search && (
                <span
                  className="absolute right-14 top-1/2 -translate-y-1/2 text-[13px] font-medium text-theme-muted pointer-events-none select-none tabular-nums"
                  role="status"
                  aria-live="polite"
                >
                  {totalResultCount === 1 ? '1 result' : `${totalResultCount} results`}
                </span>
              )}
              {!search && (
                <span className="absolute right-4 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-1 pointer-events-none select-none">
                  <kbd className="px-1.5 py-0.5 rounded bg-theme-base text-[11px] font-medium text-theme-muted">{selectedPlatform === 'macos' ? '⌘' : 'Ctrl'}</kbd>
                  <kbd className="px-1.5 py-0.5 rounded bg-theme-base text-[11px] font-medium text-theme-muted">K</kbd>
                </span>
              )}
              {search && (
                <button
                  onClick={() => { setSearch(''); setDropdownOpen(false); searchRef.current?.focus() }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-transparent border-none cursor-pointer p-1.5 rounded-full transition-colors hover:bg-theme-base-alt text-theme-muted"
                  aria-label="Clear search"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Anchored results dropdown — appears directly under the input */}
            {showDropdown && (
              <SearchDropdown
                results={smartResults}
                platform={selectedPlatform}
                query={search}
                listId={listId}
                activeIndex={activeIndex}
                loading={!searchReady && !error}
                onClose={() => { setSearch(''); setDropdownOpen(false); searchRef.current?.blur() }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Directory: one panel per platform, all in the page as it is served.
          CSS shows the one of the chosen platform. */}
      {!search && directory && platforms.map((p) => (
        <PlatformPanel
          key={p.id}
          platform={p}
          apps={directory[p.id]?.apps}
          otherPlatformsMap={directory[p.id]?.otherPlatformsMap}
          active={p.id === selectedPlatform}
        />
      ))}

      {search && (
        <div className="mx-auto max-w-[1080px] px-5 md:px-6 pb-16 min-h-[420px]">
          {/* ─── Search Results (inline, same as dropdown) ─── */}
          {hasSmartResults && (
            <SearchResultsInline results={smartResults} platform={selectedPlatform} />
          )}

          {/* The shortcuts are on their way: say so instead of "no results". */}
          {!hasSmartResults && !searchReady && !error && (
            <p className="py-16 text-center text-theme-muted" role="status" aria-live="polite">{CONTENT.home.loadingShortcuts}</p>
          )}

          {!hasSmartResults && error && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-theme-muted mb-4">{CONTENT.home.error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 min-h-[44px] rounded-full font-medium cursor-pointer border-none transition-opacity hover:opacity-90 bg-theme-accent text-theme-accent-text"
              >
                {CONTENT.home.refreshButton}
              </button>
            </div>
          )}

          {/* ─── No-results empty state — suggest popular apps as chips ─── */}
          {!hasSmartResults && searchReady && (
            <div className="py-16 text-center" role="status" aria-live="polite">
              <p className="text-theme-text text-[17px] font-medium mb-1">
                No results for &ldquo;{search}&rdquo;
              </p>
              <p className="text-theme-muted text-sm mb-6">
                Try one of these popular apps instead.
              </p>
              <div className="flex flex-wrap justify-center gap-2.5">
                {POPULAR_APPS.map(app => (
                  <button
                    key={app.slug}
                    onClick={() => { setSearch(''); setDropdownOpen(false); navigate(linkPath(`/${selectedPlatform}/${app.slug}`)) }}
                    className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full border border-theme-border bg-theme-base-alt hover:border-theme-border-hover transition-colors cursor-pointer text-[14px] text-theme-text outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
                  >
                    <img
                      decoding="async"
                      src={`/images/app-icons/${app.slug}.webp`}
                      alt=""
                      width={18}
                      height={18}
                      className="rounded shrink-0"
                      onError={e => { e.target.style.display = 'none' }}
                    />
                    {app.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ─── About Section ─── */}
      {!search && (
        <>
          <section className="border-t border-theme-border px-5 md:px-6 py-14">
            <div className="mx-auto max-w-[680px]">
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                {CONTENT.home.aboutSection.title}
              </h2>
              {CONTENT.home.aboutSection.paragraphs.map((p, i) => (
                <p key={i} className="text-theme-muted text-[15px] leading-relaxed mb-4">{p}</p>
              ))}
            </div>
          </section>

          {/* ─── Why Shortcuts Matter ─── */}
          <section className="border-t border-theme-border px-5 md:px-6 py-14 bg-theme-base-alt">
            <div className="mx-auto max-w-[680px]">
              <h2 className="text-2xl font-bold tracking-tight mb-4">
                {CONTENT.home.aboutSection.whyTitle}
              </h2>
              {CONTENT.home.aboutSection.whyParagraphs.map((p, i) => (
                <p key={i} className="text-theme-muted text-[15px] leading-relaxed mb-4">{p}</p>
              ))}
            </div>
          </section>

          {/* ─── Popular Universal Shortcuts ─── */}
          <section className="border-t border-theme-border px-5 md:px-6 py-14">
            <div className="mx-auto max-w-[680px]">
              <h2 className="text-xl font-bold tracking-tight mb-2">
                {CONTENT.home.aboutSection.popularTitle}
              </h2>
              <p className="text-theme-muted text-[15px] mb-6">
                {CONTENT.home.aboutSection.popularSubtitle}
              </p>
              <table className="shortcut-table w-full">
                <thead>
                  <tr className="text-left text-xs text-theme-muted uppercase tracking-wider">
                    <th className="pb-3 font-medium">Action</th>
                    <th className="pb-3 font-medium text-right">macOS</th>
                    <th className="pb-3 font-medium text-right">Windows / Linux</th>
                  </tr>
                </thead>
                <tbody>
                  {CONTENT.home.aboutSection.popularShortcuts.map((s, i) => (
                    <tr key={i} className={i % 2 === 1 ? 'shortcut-row-alt' : ''}>
                      <td className="py-2.5 text-theme-text text-[15px]">{s.action}</td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center gap-1">
                          {s.mac.split(' ').map((k, j) => (
                            <kbd key={j} className="keycap-mini">{k}</kbd>
                          ))}
                        </span>
                      </td>
                      <td className="py-2.5 text-right">
                        <span className="inline-flex items-center gap-1">
                          {s.win.split(' ').map((k, j) => (
                            <kbd key={j} className="keycap-mini">{k}</kbd>
                          ))}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* ─── Mac HUD App Promo ─── */}
      {APP_STORE_URL && (
        <section className="mt-14">
          <div className="rounded-2xl bg-theme-accent text-theme-accent-text p-8 md:p-10 text-center">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2">
              {CONTENT.home.promo.title}
            </h2>
            <p className="text-theme-accent-text/80 text-[15px] leading-relaxed mb-5 max-w-md mx-auto">
              {CONTENT.home.promo.subtitle}
            </p>
            <Link
              to="/mac-hud"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-theme-base text-theme-accent font-semibold text-[15px] no-underline hover:opacity-90 transition-opacity"
              onClick={() => trackEvent('mac_hud_promo_clicked', { source: 'directory_homepage' })}
            >
              {CONTENT.home.promo.button}
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}

    </div>
  )
}

/* ─── Inline search results — mirrors SearchDropdown content ─── */
function SearchResultsInline({ results, platform }) {
  const { appMatches = [], shortcutMatches = [], otherApps = [] } = results || {}

  return (
    <div className="space-y-6">
      {/* App matches */}
      {appMatches.length > 0 && (
        <div>
          <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider mb-2">Apps</p>
          <div className="space-y-1">
            {appMatches.map(app => (
              <Link
                key={app.slug}
                to={`/${platform}/${app.slug}`}
                className="flex items-center gap-3 px-4 py-3 rounded-xl no-underline hover:bg-theme-base-alt transition-colors"
              >
                <img
                  decoding="async"
                  src={`/images/app-icons/${app.slug}.webp`}
                  alt=""
                  width={36}
                  height={36}
                  className="rounded-xl shrink-0"
                  onError={e => { e.target.style.display = 'none' }}
                />
                <div className="flex-1 min-w-0">
                  <span className="text-[16px] font-medium text-theme-text">{app.name}</span>
                  <span className="text-[14px] text-theme-muted ml-2">{app.shortcutCount} shortcuts</span>
                </div>
                <ArrowRight size={16} className="text-theme-muted shrink-0" />
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Shortcut matches grouped by app */}
      {shortcutMatches.length > 0 && (
        <div>
          {appMatches.length > 0 && (
            <p className="text-[11px] font-semibold text-theme-muted uppercase tracking-wider mb-2">Shortcuts</p>
          )}
          <div className="space-y-6">
            {shortcutMatches.map(group => (
              <div key={group.appSlug}>
                <Link
                  to={`/${platform}/${group.appSlug}`}
                  className="flex items-center gap-2.5 mb-2 no-underline hover:opacity-80 transition-opacity"
                >
                  <img
                    decoding="async"
                    src={`/images/app-icons/${group.appSlug}.webp`}
                    alt=""
                    width={24}
                    height={24}
                    className="rounded-lg shrink-0"
                    onError={e => { e.target.style.display = 'none' }}
                  />
                  <span className="text-[15px] font-semibold text-theme-text">{group.appName}</span>
                  <span className="text-[12px] text-theme-muted">› {group.category}</span>
                </Link>
                <div className="ml-9 space-y-0.5">
                  {group.shortcuts.map((sc, i) => (
                    <Link
                      key={`${sc.action}-${i}`}
                      to={`/${platform}/${group.appSlug}`}
                      className="flex items-center justify-between px-3 py-2.5 min-h-[44px] rounded-lg no-underline hover:bg-theme-base-alt transition-colors"
                    >
                      <span className="text-[15px] text-theme-text truncate">{sc.action}</span>
                      <span className="flex items-center gap-0.5 shrink-0 ml-4">
                        {parseKeyParts(sc.modifiers, sc.key).map((part, j) => (
                          <kbd key={j} className="inline-flex items-center justify-center min-w-[24px] h-[24px] px-1.5 rounded text-[12px] font-medium text-theme-muted bg-theme-base-alt border border-theme-border">
                            {part}
                          </kbd>
                        ))}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* "Also in" footer */}
      {otherApps.length > 0 && (
        <p className="text-[13px] text-theme-muted px-1">
          Also in: {otherApps.join(', ')}
        </p>
      )}
    </div>
  )
}
