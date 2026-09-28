import React, { useState, useDeferredValue, useMemo, useRef, useEffect, useCallback } from 'react'
import { useLoaderData, useNavigate, Link } from 'react-router'
import { Search, X, ArrowRight } from '../utils/icons'
import { usePlatformData, prefetchPlatform } from '../hooks/usePlatformData'
import { groupByCategories, getPopularApps, parseKeyParts } from '../utils/platformHelpers'
import { detectPlatform } from '../utils/detectPlatform'
import { buildSearchIndex, searchIndex, parseAppQuery, flattenSearchResults } from '../utils/searchHelpers'
import AppCard from './directory/AppCard'
import SearchDropdown from './SearchDropdown'
import { categoryConfig } from '../data/categoryConfig'
import { useInView } from '../hooks/useInView'
import { CONTENT } from '../data/content'
import AdSlot from './AdSlot'
import { APP_STORE_URL, APP_COUNT, SHORTCUT_COUNT } from '../data/siteConfig'
import { trackEvent } from '../lib/analytics'

// Popular apps suggested in the empty-search state (mirrors SearchDropdown).
const POPULAR_SUGGESTIONS = [
  { slug: 'figma', name: 'Figma' },
  { slug: 'chrome', name: 'Chrome' },
  { slug: 'vs-code', name: 'VS Code' },
  { slug: 'slack', name: 'Slack' },
]

export default function DirectoryHomepage() {
  const loaderData = useLoaderData()
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(null)
  const [selectedPlatform, setSelectedPlatform] = useState(
    () => (typeof navigator !== 'undefined' ? detectPlatform() : loaderData?.defaultPlatformId || 'macos')
  )
  const searchRef = useRef(null)
  const searchContainerRef = useRef(null)
  const chipsRef = useRef(null)
  const [searchFocused, setSearchFocused] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const listId = 'directory-search-listbox'

  const platforms = loaderData?.manifest?.platforms ?? null
  const isInitialPlatform = selectedPlatform === (loaderData?.defaultPlatformId || 'macos')
  const { apps: switchedApps, otherPlatformsMap: switchedOPMap, loading: switchedLoading, error } = usePlatformData(
    isInitialPlatform ? null : selectedPlatform
  )
  const apps = isInitialPlatform ? loaderData?.platformData?.apps : switchedApps
  const otherPlatformsMap = isInitialPlatform ? (loaderData?.platformData?.otherPlatformsMap || {}) : switchedOPMap
  const loading = isInitialPlatform ? false : switchedLoading

  // Eagerly prefetch other platforms in the background when browser is idle
  // so switching is instant without bloating the server-rendered HTML
  useEffect(() => {
    if (!platforms) return
    const defaultId = loaderData?.defaultPlatformId || 'macos'
    const others = platforms.filter(p => p.id !== defaultId)
    if (others.length === 0) return

    const schedule = typeof requestIdleCallback === 'function'
      ? (cb) => { const id = requestIdleCallback(cb); return () => cancelIdleCallback(id) }
      : (cb) => { const id = setTimeout(cb, 2000); return () => clearTimeout(id) }

    const cancel = schedule(() => others.forEach(p => prefetchPlatform(p.id)))
    return cancel
  }, [platforms, loaderData?.defaultPlatformId])
  const currentPlatform = platforms?.find(p => p.id === selectedPlatform)
  const categoryOrder = useMemo(() => currentPlatform?.categories || [], [currentPlatform])

  // Edge fades on the category row: shown only on a side that has more chips.
  const [chipEdges, setChipEdges] = useState({ left: false, right: false })
  const chipsVisible = !search
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setChipEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    // The row's width changes with the viewport and when the web font loads.
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    ro?.observe(el)
    if (el.firstElementChild) ro?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [categoryOrder, chipsVisible])

  // Horizontal scroll: mouse drag + wheel
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    let isDown = false, startX = 0, scrollLeft = 0

    const onMouseDown = (e) => {
      isDown = true
      el.style.cursor = 'grabbing'
      startX = e.pageX - el.offsetLeft
      scrollLeft = el.scrollLeft
    }
    const onMouseUp = () => { isDown = false; el.style.cursor = 'grab' }
    const onMouseLeave = () => { isDown = false; el.style.cursor = 'grab' }
    const onMouseMove = (e) => {
      if (!isDown) return
      e.preventDefault()
      el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX)
    }
    const onWheel = (e) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return // native horizontal scroll
      if (el.scrollWidth <= el.clientWidth) return // nothing to scroll
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }

    el.style.cursor = 'grab'
    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mouseup', onMouseUp)
    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('mousemove', onMouseMove)
    el.addEventListener('wheel', onWheel, { passive: false })

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('mousemove', onMouseMove)
      el.removeEventListener('wheel', onWheel)
    }
  }, [categoryOrder, chipsVisible])

  // Smart search index — built once per platform data change
  const deferredSearch = useDeferredValue(search)
  const searchIdx = useMemo(() => buildSearchIndex(apps), [apps])
  const smartResults = useMemo(() => searchIndex(searchIdx, deferredSearch), [searchIdx, deferredSearch])

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
    setActiveCategory(null)
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


  const setCategory = useCallback((cat) => {
    setActiveCategory(cat)
    if (cat) trackEvent('category_filtered', { category: cat, platform: selectedPlatform })
  }, [selectedPlatform])

  // Sticky category bar: `chipsStuck` adds its bottom hairline once it pins under the navbar.
  const chipsSentinelRef = useRef(null)
  const [chipsStuck, setChipsStuck] = useState(false)
  useEffect(() => {
    const el = chipsSentinelRef.current
    if (!el || typeof IntersectionObserver !== 'function') return
    const io = new IntersectionObserver(
      ([entry]) => setChipsStuck(!entry.isIntersecting && entry.boundingClientRect.top < 60),
      { rootMargin: '-49px 0px 0px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [chipsVisible])

  // Picking a category: centre the chip in the row and, if the list was scrolled
  // past, jump back to its top so the filtered apps are in view.
  const pickCategory = useCallback((cat, chip) => {
    const behavior = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    const nav = chipsRef.current
    if (nav && chip && nav.scrollWidth > nav.clientWidth) {
      const n = nav.getBoundingClientRect()
      const c = chip.getBoundingClientRect()
      nav.scrollTo({ left: nav.scrollLeft + c.left - n.left - (n.width - c.width) / 2, behavior })
    }
    const sentinel = chipsSentinelRef.current
    if (chipsStuck && sentinel) {
      const navbarBottom = document.querySelector('nav.fixed')?.getBoundingClientRect().bottom ?? 48
      window.scrollTo({ top: sentinel.getBoundingClientRect().top + window.scrollY - navbarBottom, behavior })
    }
    setCategory(cat)
  }, [chipsStuck, setCategory])

  const setPlatform = useCallback((id) => {
    setSelectedPlatform(id)
    setActiveCategory(null)
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
        navigate(chosen)
        setSearch('')
        setDropdownOpen(false)
        searchRef.current?.blur()
      }
    }
  }, [search, flatResults, activeIndex, smartResults, selectedPlatform, hasSmartResults, navigate])

  // Platform is detected at initialization via useState initializer above

  const grouped = useMemo(() => {
    if (!apps) return []
    let filtered = apps
    if (search) {
      const appNames = apps.map(a => ({ name: a.displayName, slug: a.slug }))
      const parsed = parseAppQuery(search, appNames)
      if (parsed.app) {
        filtered = apps.filter(a => a.slug === parsed.app.slug)
      } else {
        filtered = apps.filter(a => {
          const lower = a.displayName.toLowerCase()
          return parsed.allTokens.some(t => lower.includes(t))
        })
      }
    }
    const groups = groupByCategories(filtered, categoryOrder)
    if (activeCategory && !search) {
      return groups.filter(g => g.name === activeCategory)
    }
    return groups
  }, [apps, search, activeCategory, categoryOrder])

  const popularApps = useMemo(() => getPopularApps(apps, 9), [apps])

  return (
    <div className="min-h-screen bg-theme-base">

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
          {!search && platforms && (
            <div className="flex justify-center mb-4">
              <div
                role="radiogroup"
                aria-label="Choose platform"
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
                      onClick={() => setPlatform(p.id)}
                      onMouseEnter={() => prefetchPlatform(p.id)}
                      className={`flex items-center justify-center gap-2 min-h-[40px] px-2 rounded-[10px] text-[15px] font-medium transition-all cursor-pointer border-none outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-theme-accent ${
                        isActive
                          ? 'bg-theme-base text-theme-text shadow-[0_1px_3px_rgba(26,26,26,0.14),0_0_0_0.5px_rgba(26,26,26,0.1)]'
                          : 'bg-transparent text-theme-muted hover:text-theme-text'
                      }`}
                    >
                      {p.icon && (
                        <img
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
                onFocus={() => { setSearchFocused(true); if (search.trim()) setDropdownOpen(true) }}
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
                  <kbd className="px-1.5 py-0.5 rounded bg-theme-base text-[11px] font-medium text-theme-muted">⌘</kbd>
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
                onClose={() => { setSearch(''); setDropdownOpen(false); searchRef.current?.blur() }}
              />
            )}
          </div>
        </div>
      </section>

      {/* Directory: category bar + app list. The bar sticks under the navbar only
          while the list is on screen (the wrapper bounds the sticky element). */}
      <div>
      {/* ─── Category Chips ─── */}
      {!search && (
        <>
        <div ref={chipsSentinelRef} aria-hidden="true" />
        <div
          className={`sticky z-30 bg-theme-base px-5 md:px-6 mb-6 border-b transition-colors ${chipsStuck ? 'border-theme-border' : 'border-transparent'}`}
          style={{ top: 'calc(3rem + env(safe-area-inset-top))' }}
        >
          {/* Wider than the 1080px grid so all chips fit on one centred line on a 1280px screen */}
          <div className="mx-auto max-w-[1240px] relative">
            {/* w-max + mx-auto: centred when the chips fit, scrollable from the first chip when they don't */}
            <nav ref={chipsRef} className="chips-scroll overflow-x-auto select-none py-1" aria-label="Filter by category">
              <div className="flex flex-nowrap gap-1 w-max mx-auto">
                <ChipButton active={!activeCategory} onClick={(e) => pickCategory(null, e.currentTarget)}>
                  {CONTENT.home.allCategory}
                </ChipButton>
                {categoryOrder.map(cat => {
                  const config = categoryConfig[cat]
                  return (
                    <ChipButton
                      key={cat}
                      active={activeCategory === cat}
                      onClick={(e) => pickCategory(activeCategory === cat ? null : cat, e.currentTarget)}
                      icon={config?.icon}
                      color={config?.color}
                    >
                      {config?.short || cat}
                    </ChipButton>
                  )
                })}
              </div>
            </nav>
            {/* Edge fades: the scroll hint, on any screen size, only where more chips are hidden */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute left-0 top-0 bottom-0 w-12 transition-opacity ${chipEdges.left ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(to left, transparent, var(--color-theme-base))' }}
            />
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute right-0 top-0 bottom-0 w-12 transition-opacity ${chipEdges.right ? 'opacity-100' : 'opacity-0'}`}
              style={{ background: 'linear-gradient(to right, transparent, var(--color-theme-base))' }}
            />
          </div>
        </div>
        </>
      )}

      {/* min-height reserves space so the platform-switch loading skeleton swap
          doesn't reflow / cause CLS at the point of focus (the app grid). */}
      <div className="mx-auto max-w-[1080px] px-5 md:px-6 pb-16 min-h-[420px]">

        {/* ─── Error state ─── */}
        {error && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-theme-muted mb-4">{CONTENT.home.error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-full font-medium cursor-pointer border-none transition-opacity hover:opacity-90 bg-theme-accent text-theme-accent-text"
            >
              {CONTENT.home.refreshButton}
            </button>
          </div>
        )}

        {/* ─── Loading skeleton ─── */}
        {!error && loading && (
          <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="flex flex-col items-center py-6 sm:py-10 px-2 sm:px-4 rounded-2xl animate-pulse border border-theme-border">
                <div className="w-16 h-16 rounded-2xl mb-4 bg-black/6" />
                <div className="w-20 h-3 rounded bg-black/6" />
                <div className="w-12 h-2.5 rounded mt-2 bg-black/4" />
              </div>
            ))}
          </div>
        )}

        {/* ─── Search Results (inline, same as dropdown) ─── */}
        {!error && !loading && search && hasSmartResults && (
          <SearchResultsInline results={smartResults} platform={selectedPlatform} />
        )}

        {/* ─── No-results empty state — suggest popular apps as chips ─── */}
        {!error && !loading && search && !hasSmartResults && (
          <div className="py-16 text-center" role="status" aria-live="polite">
            <p className="text-theme-text text-[17px] font-medium mb-1">
              No results for &ldquo;{search}&rdquo;
            </p>
            <p className="text-theme-muted text-sm mb-6">
              Try one of these popular apps instead.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5">
              {POPULAR_SUGGESTIONS.map(app => (
                <button
                  key={app.slug}
                  onClick={() => { setSearch(''); setDropdownOpen(false); navigate(`/${selectedPlatform}/${app.slug}`) }}
                  className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] rounded-full border border-theme-border bg-theme-base-alt hover:border-theme-border-hover transition-colors cursor-pointer text-[14px] text-theme-text outline-none focus-visible:ring-2 focus-visible:ring-theme-accent"
                >
                  <img
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

        {/* ─── Category Sections (when not searching) ─── */}
        {/* ─── Apps with the most shortcuts ─── */}
        {!error && !loading && !search && !activeCategory && popularApps.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-theme-muted mb-4">{CONTENT.home.aboutSection.mostShortcutsTitle}</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:[&>*:nth-child(9)]:hidden">
              {popularApps.map(app => (
                <AppCard key={app.slug} app={app} platform={selectedPlatform} />
              ))}
            </div>
          </section>
        )}

        {!error && !loading && !search && grouped.map((group, index) => (
          <React.Fragment key={group.name}>
            <CategorySection group={group} platform={selectedPlatform} otherPlatformsMap={otherPlatformsMap} />
            {index === 2 && grouped.length > 4 && (
              <AdSlot adSlot="home_mid" variant="in-article" />
            )}
          </React.Fragment>
        ))}

        {!error && !loading && grouped.length === 0 && !search && (
          <p className="text-center py-20 text-theme-muted">{CONTENT.home.emptyCategory}</p>
        )}
      </div>
      </div>

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

/* ─── Chip button with optional icon ─── */
// 44px tap height on touch screens, a slimmer 36px pill with a mouse.
function ChipButton({ active, onClick, children, icon: Icon, color }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-3 min-h-[44px] pointer-fine:min-h-9 rounded-full text-[14px] font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 border-none outline-none focus-visible:ring-2 focus-visible:ring-theme-accent ${
        active
          ? 'bg-theme-accent text-theme-base'
          : 'bg-transparent text-theme-muted hover:text-theme-text hover:bg-theme-base-alt'
      }`}
    >
      {Icon && <Icon size={15} aria-hidden="true" style={!active && color ? { color } : undefined} />}
      {children}
    </button>
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

/* ─── Category section — matches ShortcutsIndex layout ─── */
function CategorySection({ group, platform, otherPlatformsMap = {} }) {
  const [ref, visible] = useInView({ threshold: 0.05 })
  const config = categoryConfig[group.name]
  const CatIcon = config?.icon

  return (
    <section ref={ref} className={`mb-12 md:mb-20 fade-in-up ${visible ? 'visible' : ''}`}>
      <div className="flex flex-col md:flex-row gap-4 md:gap-10">
        {/* Left: Category label */}
        <div className="md:w-44 shrink-0 flex flex-row md:flex-col items-center md:items-start gap-4 md:gap-0 md:pt-4">
          <div
            className="w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center md:mb-4"
            style={{ backgroundColor: config?.color || 'var(--theme-accent)' }}
          >
            {CatIcon && <CatIcon size={24} className="text-white" />}
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-semibold text-theme-text leading-tight">
              {group.name}
            </h2>
            <p className="text-theme-muted text-sm mt-0.5">{CONTENT.home.categoryCount(group.apps.length)}</p>
          </div>
        </div>

        {/* Right: App grid */}
        <div className="flex-1 grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
          {group.apps.map(app => (
            <AppCard key={app.slug} app={app} platform={platform} otherPlatforms={otherPlatformsMap[app.slug]} />
          ))}
        </div>
      </div>
    </section>
  )
}
