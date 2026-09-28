import { Link, useLoaderData } from 'react-router'
import React, { useState, useCallback, useDeferredValue, useEffect, useMemo, useRef } from 'react'
import { Search, X, Download, ExternalLink, Lightbulb, ChevronDown, ChevronLeft, ChevronRight, Clipboard, CircleCheck } from '../utils/icons'
import LastCheckedBadge from './LastCheckedBadge'
import MacAppStoreButton from './MacAppStoreButton'
import AppIcon from './directory/AppIcon'
import AppCard from './directory/AppCard'
import { useScrollspy } from '../hooks/useScrollspy'
import { CONTENT } from '../data/content'
import { APP_STORE_URL } from '../data/siteConfig'
import AdSlot from './AdSlot'
import AffiliateLink from './AffiliateLink'
import { getAffiliate } from '../data/affiliates'
import { getSponsor, sponsorPageLink, MIN_SECTIONS_FOR_SLOT } from '../data/sponsors'
import { APP_NOTES } from '../data/appNotes'
import { noteFitsApp, fittingTips, resolveNoteText, resolveEssentials, everydayShortcuts, largestSections } from '../utils/appCopy'
import { tokenize } from '../utils/searchHelpers'
import { parseKeyParts } from '../utils/platformHelpers'
import { COMPARISONS } from '../data/comparisons'
import { trackEvent } from '../lib/analytics'

function Keycap({ children }) {
  return <kbd className="keycap">{children}</kbd>
}

/**
 * A shortcut's keycaps, clickable to copy the human-readable combo to the
 * clipboard. Shows a transient "Copied" state for ~1.2s.
 */
function CopyableShortcut({ parts, action, appSlug, platform }) {
  const [copied, setCopied] = useState(false)
  const timerRef = useRef(null)

  useEffect(() => () => clearTimeout(timerRef.current), [])

  const combo = parts.join(' + ')

  const onCopy = useCallback(() => {
    if (!navigator.clipboard?.writeText) return
    navigator.clipboard
      .writeText(combo)
      .then(() => {
        setCopied(true)
        clearTimeout(timerRef.current)
        timerRef.current = setTimeout(() => setCopied(false), 1200)
        trackEvent('shortcut_copied', { app: appSlug, platform, action, combo })
      })
      .catch(() => {})
  }, [combo, action, appSlug, platform])

  return (
    <button
      type="button"
      onClick={onCopy}
      title={copied ? 'Copied' : `Copy shortcut: ${combo}`}
      aria-label={copied ? `Copied ${combo}` : `Copy shortcut ${combo} for ${action}`}
      className="group/copy inline-flex items-center gap-1.5 flex-wrap justify-end bg-transparent border-none p-0 m-0 cursor-pointer align-middle"
    >
      {parts.map((part, k) => (
        <Keycap key={k}>{part}</Keycap>
      ))}
      <span
        className={`inline-flex items-center transition-opacity ${
          copied ? 'opacity-100 text-green-600' : 'opacity-0 group-hover/copy:opacity-70 text-theme-muted'
        }`}
        aria-hidden="true"
      >
        {copied ? <CircleCheck size={13} /> : <Clipboard size={13} />}
      </span>
    </button>
  )
}

/** Note text with {{Action}} placeholders rendered as the page's own keys. */
function NoteText({ segments }) {
  return segments.map((seg, i) =>
    seg.text !== undefined ? (
      <React.Fragment key={i}>{seg.text}</React.Fragment>
    ) : (
      <span key={i} className="whitespace-nowrap">
        {seg.action}
        {seg.shortcut && (
          <>
            {' '}
            {parseKeyParts(seg.shortcut.modifiers, seg.shortcut.key).map((k, j) => (
              <kbd key={j} className="keycap-mini ml-0.5">{k}</kbd>
            ))}
          </>
        )}
      </span>
    )
  )
}

/** A short list of shortcuts: action on the left, copyable keycaps on the right. */
function ShortcutList({ shortcuts, appSlug, platform }) {
  return (
    <ul className="divide-y divide-theme-border">
      {shortcuts.map((sc, i) => (
        <li key={i} className="flex items-center justify-between gap-3 py-2">
          <span className="text-[14px] text-theme-text">{sc.action}</span>
          <CopyableShortcut parts={parseKeyParts(sc.modifiers, sc.key)} action={sc.action} appSlug={appSlug} platform={platform} />
        </li>
      ))}
    </ul>
  )
}

export default function ShortcutPage() {
  const {
    platformId: platform,
    platformName,
    app,
    otherPlatforms,
    relatedApps = [],
    moreApps = [],
    otherPlatformsMap = {},
  } = useLoaderData()
  const slug = app.slug

  // Cross-content link targets that actually exist for this app.
  const comparisonLinks = useMemo(
    () =>
      COMPARISONS.filter(
        (c) => c.platform === platform && (c.slugA === slug || c.slugB === slug)
      ).map((c) => {
        const otherSlug = c.slugA === slug ? c.slugB : c.slugA
        const otherName = otherSlug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ')
        return { pairSlug: `${c.slugA}-vs-${c.slugB}`, otherName }
      }),
    [platform, slug]
  )
  const [search, setSearch] = useState('')
  const searchInputRef = useRef(null)
  const headerRef = useRef(null)
  const [stickyTop, setStickyTop] = useState(48)
  const sp = CONTENT.shortcutPage
  const pagePath = `/${platform}/${slug}`
  const affiliate = getAffiliate(slug, platform)
  const sponsor = getSponsor(pagePath)
  const note = APP_NOTES[slug]
  const noteFits = useMemo(() => noteFitsApp(note, app), [note, app])
  const noteTips = useMemo(() => (noteFits ? fittingTips(note, app) : []), [noteFits, note, app])
  const everyday = useMemo(() => (noteFits ? [] : everydayShortcuts(app)), [noteFits, app])

  const sectionIds = useMemo(() => {
    const counts = {}
    return app.sections.map(s => {
      const base = s.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')
      counts[base] = (counts[base] || 0) + 1
      return counts[base] > 1 ? `${base}-${counts[base]}` : base
    })
  }, [app])

  const activeId = useScrollspy(sectionIds)

  // Sticky section titles sit under the navbar (48px), plus the header when the
  // header is itself sticky (lg and up). On phones the header scrolls away, so
  // adding its height left the titles pinned mid-screen.
  useEffect(() => {
    const el = headerRef.current
    if (!el) return
    const update = () => {
      const headerPinned = getComputedStyle(el).position === 'sticky'
      setStickyTop(48 + (headerPinned ? el.offsetHeight : 0))
    }
    update()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    ro?.observe(el)
    window.addEventListener('resize', update)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [])

  // Track shortcut page view (top of conversion funnel)
  useEffect(() => {
    trackEvent('shortcut_page_viewed', { app: slug, platform, app_name: app.displayName })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, platform])

  // "/" keyboard shortcut to focus in-app search
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && !e.metaKey && !e.ctrlKey && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
      if (e.key === 'Escape') {
        setSearch('')
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Compute action tokens (stripping app name tokens from the query)
  const deferredSearch = useDeferredValue(search)
  const actionTokens = useMemo(() => {
    if (!deferredSearch) return null
    const allTokens = tokenize(deferredSearch)
    if (allTokens.length === 0) return null
    const appNameLower = app.displayName.toLowerCase()
    const appSlugLower = app.slug.toLowerCase()
    const filtered = allTokens.filter(t => !appNameLower.includes(t) && !appSlugLower.includes(t))
    return filtered.length === 0 ? null : filtered
  }, [deferredSearch, app])

  // Filter shortcuts by search — strips tokens matching the current app name
  const filteredSections = useMemo(() => {
    if (!actionTokens) return app.sections.map((s, i) => ({ ...s, id: sectionIds[i] }))

    return app.sections
      .map((s, i) => ({
        ...s,
        id: sectionIds[i],
        shortcuts: s.shortcuts.filter(sc => {
          const actionLower = sc.action.toLowerCase()
          return actionTokens.every(t => actionLower.includes(t))
        }),
      }))
      .filter(s => s.shortcuts.length > 0)
  }, [app, actionTokens, sectionIds])

  const totalVisible = filteredSections.reduce((sum, s) => sum + s.shortcuts.length, 0)


  return (
    <div className="min-h-screen bg-theme-base">

      {/* Navbar clearance */}
      <div className="h-12" />

      {/* ─── Back link (breadcrumb JSON-LD stays in <BreadcrumbSchema>) ─── */}
      <nav aria-label="Breadcrumb" className="mx-auto max-w-[980px] px-5 md:px-6 pt-4">
        <Link
          to={`/${platform}`}
          className="inline-flex items-center gap-1 min-h-[32px] text-[13px] text-theme-muted hover:text-theme-text no-underline transition-colors"
        >
          <ChevronLeft size={15} aria-hidden="true" />
          {sp.backLabel(platformName)}
        </Link>
      </nav>

      {/* ─── Header: title + facts on the left, search + actions on the right (stacked on mobile) ─── */}
      <header ref={headerRef} className="pt-1 pb-4 lg:py-4 px-5 md:px-6 border-b border-theme-border static lg:sticky lg:top-12 z-20 bg-theme-base">
        <div className="mx-auto max-w-[980px] flex flex-col lg:flex-row lg:flex-wrap lg:items-center gap-4 lg:gap-x-6 lg:gap-y-2">
          <div className="flex items-center gap-3 min-w-0 lg:flex-1">
            <div className="shrink-0">
              <AppIcon slug={slug} displayName={app.displayName} size={36} />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-bold tracking-tight leading-tight">
                {app.displayName} <span className="font-normal text-theme-muted">{sp.titleSuffix}</span>
              </h1>
              <p className="text-[13px] text-theme-muted mt-0.5">
                {app.shortcutCount} shortcuts · {app.sections.length} {app.sections.length === 1 ? 'section' : 'sections'}
                {app.category && (
                  <>
                    {' · '}
                    <Link
                      to={`/?category=${app.category}${platform !== 'macos' ? `&platform=${platform}` : ''}`}
                      className="text-theme-muted hover:text-theme-text no-underline hover:underline underline-offset-2"
                    >
                      {app.category}
                    </Link>
                  </>
                )}
                {otherPlatforms.length > 0 && (
                  <span className="hidden sm:inline">
                    {' · '}{sp.alsoOnLabel}{' '}
                    {otherPlatforms.map((p, i) => (
                      <span key={p.id}>
                        {i > 0 && ', '}
                        <Link to={`/${p.id}/${slug}`} className="text-theme-muted hover:text-theme-text underline underline-offset-2">
                          {p.name}
                        </Link>
                      </span>
                    ))}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 lg:shrink-0">
            <div className="relative w-full sm:flex-1 lg:w-64 lg:flex-none">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-theme-muted pointer-events-none"
                aria-hidden="true"
              />
              <input
                ref={searchInputRef}
                type="search"
                placeholder={sp.searchPlaceholder(app.shortcutCount)}
                value={search}
                onChange={e => setSearch(e.target.value)}
                aria-label={sp.filterAriaLabel}
                className="appearance-none w-full h-10 pl-9 pr-10 rounded-xl bg-theme-surface border border-transparent text-theme-text placeholder:text-theme-muted outline-none focus:border-theme-border-hover transition-colors text-base sm:text-sm [&::-webkit-search-cancel-button]:hidden"
              />
              {!search && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center text-theme-muted pointer-events-none select-none">
                  <kbd className="px-1.5 py-0.5 rounded bg-theme-base text-[10px] font-medium">/</kbd>
                </span>
              )}
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center min-w-[32px] min-h-[32px] text-theme-muted hover:text-theme-text bg-transparent border-none cursor-pointer rounded-full transition-colors"
                  aria-label={sp.clearAriaLabel}
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <div className="flex items-center gap-5 -ml-1 sm:ml-0">
              <button
                onClick={async () => {
                  const { generateShortcutPDF } = await import('../utils/generateShortcutPDF')
                  generateShortcutPDF(app)
                  trackEvent('shortcut_pdf_downloaded', { app: slug, platform, app_name: app.displayName })
                }}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-1 bg-transparent border-none text-[13px] text-theme-text hover:opacity-70 transition-opacity cursor-pointer shrink-0"
                title={sp.downloadTitle}
              >
                <Download size={15} aria-hidden="true" />
                {sp.pdfLabel}
              </button>
              {app.docsUrl && (
                <a
                  href={app.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-1 text-[13px] text-theme-text hover:opacity-70 transition-opacity no-underline shrink-0"
                  onClick={() => trackEvent('docs_link_clicked', { app: slug, platform, app_name: app.displayName, docs_url: app.docsUrl })}
                >
                  <ExternalLink size={15} aria-hidden="true" />
                  {sp.docsLabel}
                </a>
              )}
            </div>
          </div>

          {/* Search feedback */}
          {search && (
            <p className="w-full text-xs text-theme-muted -mt-2 lg:mt-0 lg:basis-full" role="status" aria-live="polite">
              {totalVisible} of {app.shortcutCount} shortcuts
            </p>
          )}
        </div>
      </header>

      {/* ─── Intro text ─── */}
      <div className="mx-auto max-w-[980px] px-5 md:px-6 pt-8 pb-2">
        <p className="text-theme-muted text-[15px] leading-relaxed max-w-[720px]">
          {sp.intro(app.displayName, platformName, app.shortcutCount, app.sections.length)}{' '}
          {sp.sectionsSummary(largestSections(app))}
        </p>
        <LastCheckedBadge date={app.lastVerified} updatedDate={app.lastUpdated} docsUrl={app.docsUrl} variant="block" />
        <AffiliateLink affiliate={affiliate} appSlug={slug} platform={platform} className="mt-4 max-w-[720px]" />

        {/* ─── App note (hand-written, src/data/appNotes.js) or everyday shortcuts from the data ─── */}
        {noteFits ? (
          <>
            <p className="text-theme-text text-[15px] leading-relaxed max-w-[720px] mt-4">
              <NoteText segments={resolveNoteText(note.overview, app)} />
            </p>
            <div className="mt-8 max-w-[720px] rounded-2xl bg-theme-base-alt border border-theme-border p-6">
              <h2 className="text-base font-semibold tracking-tight mb-4">{sp.startWithTitle}</h2>
              <ShortcutList shortcuts={resolveEssentials(note.essentials, app)} appSlug={slug} platform={platform} />
              {noteTips.length > 0 && (
                <>
                  <h3 className="text-base font-semibold tracking-tight flex items-center gap-2 mt-6 mb-3">
                    <Lightbulb size={16} className="text-theme-muted" />
                    {sp.appTipsTitle(app.displayName)}
                  </h3>
                  <ul className="space-y-3">
                    {noteTips.map((tip, i) => (
                      <li key={i} className="text-theme-muted text-[14px] leading-relaxed pl-4 border-l-2 border-theme-border">
                        <NoteText segments={resolveNoteText(tip, app)} />
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>
          </>
        ) : everyday.length >= 3 ? (
          <div className="mt-8 max-w-[720px] rounded-2xl bg-theme-base-alt border border-theme-border p-6">
            <h2 className="text-base font-semibold tracking-tight mb-1">{sp.everydayTitle(app.displayName)}</h2>
            <p className="text-[13px] text-theme-muted mb-4">{sp.everydayIntro}</p>
            <ShortcutList shortcuts={everyday} appSlug={slug} platform={platform} />
          </div>
        ) : null}

      </div>

      {/* ─── Sidebar + Main ─── */}
      <div className="mx-auto max-w-[980px] px-5 md:px-6 py-10 md:py-14">
        <div className="flex gap-12">

          {/* Sidebar TOC — desktop only */}
          <nav className="hidden lg:block w-48 shrink-0">
            <div className="sticky" style={{ top: stickyTop + 16 }}>
              <p className="text-xs font-semibold uppercase tracking-wider text-theme-muted mb-4">
                {sp.sidebarTitle}
              </p>
              <ul className="flex flex-col gap-0.5">
                {app.sections.map((section, i) => {
                  const id = sectionIds[i]
                  const matchCount = actionTokens
                    ? section.shortcuts.filter(sc => {
                        const al = sc.action.toLowerCase()
                        return actionTokens.every(t => al.includes(t))
                      }).length
                    : section.shortcuts.length
                  const isActive = activeId === id
                  const isDimmed = search && matchCount === 0

                  return (
                    <li key={i}>
                      <a
                        href={`#${id}`}
                        className={`text-sm block py-1.5 pl-3 border-l-2 transition-colors ${
                          isActive
                            ? 'toc-link-active'
                            : isDimmed
                              ? 'text-theme-muted line-through border-transparent'
                              : 'text-theme-muted hover:text-theme-text border-transparent hover:border-theme-border-hover'
                        }`}
                      >
                        <span className="truncate">{section.name}</span>
                        <span className={`ml-1.5 text-[11px] ${isActive ? 'opacity-80' : 'opacity-40'}`}>
                          {matchCount}
                        </span>
                      </a>
                    </li>
                  )
                })}
              </ul>
            </div>
          </nav>

          {/* Main content */}
          <div className="flex-1 min-w-0">

            {/* Mobile jump-to-section — desktop uses the sidebar TOC */}
            {app.sections.length > 1 && (
              <details className="lg:hidden mb-8 rounded-xl border border-theme-border bg-theme-base-alt">
                <summary className="flex items-center justify-between gap-2 px-4 py-3 cursor-pointer select-none text-sm font-medium text-theme-text [&::-webkit-details-marker]:hidden">
                  Jump to section
                  <ChevronDown size={16} className="text-theme-muted shrink-0" />
                </summary>
                <ul className="px-2 pb-2 flex flex-wrap gap-1.5">
                  {app.sections.map((section, i) => (
                    <li key={i}>
                      <a
                        href={`#${sectionIds[i]}`}
                        className="inline-block px-3 py-1.5 rounded-full bg-theme-base border border-theme-border text-theme-text text-[13px] no-underline hover:border-theme-border-hover transition-colors"
                      >
                        {section.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {filteredSections.map((section, idx) => (
              <React.Fragment key={section.id}>
                <div id={section.id} className="mb-14">
                  <h2 className="text-lg font-semibold tracking-tight pt-3 pb-3 flex items-center gap-2 sticky z-10 bg-theme-base border-b border-theme-border" style={{ top: stickyTop }}>
                    {section.name}
                    <span className="text-xs font-normal text-theme-muted px-1.5 py-0.5 rounded-full bg-theme-base-alt">
                      {section.shortcuts.length}
                    </span>
                  </h2>
                  <table className="shortcut-table">
                    <colgroup>
                      <col className="w-[55%]" />
                      <col className="w-[45%]" />
                    </colgroup>
                    <thead className="sr-only">
                      <tr><th>Action</th><th>Shortcut</th></tr>
                    </thead>
                    <tbody>
                      {section.shortcuts.map((s, j) => (
                        <tr key={j} className={j % 2 === 1 ? 'shortcut-row-alt' : ''}>
                          <td className="py-3 pr-3 text-theme-text text-[15px] break-words">
                            {s.action}
                          </td>
                          <td className="py-3 pl-3 text-right align-middle">
                            <CopyableShortcut
                              parts={parseKeyParts(s.modifiers, s.key)}
                              action={s.action}
                              appSlug={slug}
                              platform={platform}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {idx === 1 && filteredSections.length >= MIN_SECTIONS_FOR_SLOT && !search && (
                  <>
                    <AdSlot adSlot="shortcut_mid" variant="in-article" sponsor={sponsor} />
                    {!sponsor && (
                      <p className="text-center text-[12px] text-theme-muted -mt-2 mb-6">
                        <Link
                          to={sponsorPageLink(pagePath)}
                          onClick={() => trackEvent('sponsor_cta_clicked', { app: slug, platform })}
                          className="underline underline-offset-2 hover:text-theme-text"
                        >
                          {sp.sponsorCta(app.displayName)}
                        </Link>
                      </p>
                    )}
                  </>
                )}
              </React.Fragment>
            ))}

            {search && filteredSections.length === 0 && (
              <p className="text-center text-theme-muted py-20">
                No shortcuts match "{search}"
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-[980px] px-5 md:px-6 pb-14">
        {/* ─── Related resources (cross-content links), after the list ─── */}
        <div className="max-w-[720px] rounded-2xl border border-theme-border bg-theme-base p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-theme-muted mb-3">
            Related resources
          </p>
          <ul className="flex flex-col gap-2 text-[14px]">
            {comparisonLinks.map((c) => (
              <li key={c.pairSlug} className="flex items-center gap-1.5">
                <ChevronRight size={14} className="text-theme-muted shrink-0" />
                <Link
                  to={`/compare/${c.pairSlug}`}
                  onClick={() => trackEvent('related_resource_clicked', { type: 'compare', app: slug, target: c.pairSlug })}
                  className="text-accent underline underline-offset-2 hover:no-underline"
                >
                  Compare {app.displayName} vs {c.otherName}
                </Link>
              </li>
            ))}
            <li className="flex items-center gap-1.5">
              <ChevronRight size={14} className="text-theme-muted shrink-0" />
              <Link
                to="/cheat-sheets"
                onClick={() => trackEvent('related_resource_clicked', { type: 'cheat_sheet', app: slug })}
                className="text-accent underline underline-offset-2 hover:no-underline"
              >
                Download printable cheat sheet
              </Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronRight size={14} className="text-theme-muted shrink-0" />
              <Link
                to="/guides"
                onClick={() => trackEvent('related_resource_clicked', { type: 'guides', app: slug })}
                className="text-accent underline underline-offset-2 hover:no-underline"
              >
                Browse guides
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/* ─── Onward journeys: related + more apps (a different set on every page) ─── */}
      {(relatedApps.length > 0 || moreApps.length > 0) && (
        <div className="border-t border-theme-border">
          <div className="mx-auto max-w-[980px] px-5 md:px-6 py-14 space-y-12">
            {relatedApps.length > 0 && app.category && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight mb-6">
                  More {app.category} shortcuts
                </h2>
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                  {relatedApps.map((a) => (
                    <div
                      key={a.slug}
                      onClick={() => trackEvent('related_app_clicked', { from: slug, to: a.slug, platform, group: 'related' })}
                    >
                      <AppCard app={a} platform={platform} otherPlatforms={otherPlatformsMap[a.slug]} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {moreApps.length > 0 && (
              <section>
                <h2 className="text-xl font-semibold tracking-tight mb-6">
                  {sp.moreAppsTitle(platformName)}
                </h2>
                <div className="grid grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                  {moreApps.map((a) => (
                    <div
                      key={a.slug}
                      onClick={() => trackEvent('related_app_clicked', { from: slug, to: a.slug, platform, group: 'more' })}
                    >
                      <AppCard app={a} platform={platform} otherPlatforms={otherPlatformsMap[a.slug]} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      )}

      {/* ─── FAQ Section ─── */}
      <div className="border-t border-theme-border">
        <div className="mx-auto max-w-[980px] px-5 md:px-6 py-14">
          <h2 className="text-xl font-semibold tracking-tight mb-6">{sp.faqTitle}</h2>
          <div className="space-y-2 max-w-[720px]">
            {sp.faqItems(app, platformName).map((item, i) => (
              <FaqAccordion key={i} question={item.question} answer={item.answer} />
            ))}
          </div>
        </div>
      </div>

      {/* ─── CTA Card: the Mac app, so macOS pages only ─── */}
      {platform === 'macos' && (
        <div className="border-t border-theme-border">
          <div className="mx-auto max-w-[980px] px-5 md:px-6 py-14">
            <div className="rounded-2xl bg-theme-accent text-theme-accent-text p-8 md:p-10 text-center">
              <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-3">
                {sp.ctaTitle(app.displayName)}
              </h2>
              <p className="text-theme-accent-text/80 text-[15px] leading-relaxed mb-6 max-w-md mx-auto">
                {sp.ctaSubtitle}
              </p>
              <div className="flex flex-col items-center gap-3">
                <MacAppStoreButton />
                {/* Always-present nudge — survives even when the App Store badge is gated off */}
                <Link
                  to="/mac-hud"
                  onClick={() => trackEvent('mac_hud_promo_clicked', { location: 'shortcut_page', app: slug })}
                  className={`text-[14px] font-medium no-underline hover:underline ${APP_STORE_URL ? 'text-theme-accent-text/80' : 'inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-theme-base text-theme-text'}`}
                >
                  {APP_STORE_URL ? `Learn how KeyShortcut works with ${app.displayName} →` : `Learn how KeyShortcut works with ${app.displayName}`}
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <FaqSchema app={app} platformName={platformName} />
      <BreadcrumbSchema appName={app.displayName} platformName={platformName} platformId={platform} slug={slug} />
    </div>
  )
}

/**
 * FAQ structured data for Google rich results.
 * All values come from our own static content data (CONTENT.shortcutPage.faqItems),
 * not from user input, so the serialized JSON is safe to embed directly.
 */
function FaqSchema({ app, platformName }) {
  const sp = CONTENT.shortcutPage
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: sp.faqItems(app, platformName).map(item => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  })
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
  )
}

/**
 * BreadcrumbList structured data for shortcut pages (Home > Platform > App).
 * Safe: all values come from our own static route/app data, not user input.
 */
function BreadcrumbSchema({ appName, platformName, platformId, slug }) {
  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://keyshortcut.com/' },
      { '@type': 'ListItem', position: 2, name: `${platformName} Shortcuts`, item: `https://keyshortcut.com/${platformId}` },
      { '@type': 'ListItem', position: 3, name: `${appName} Shortcuts`, item: `https://keyshortcut.com/${platformId}/${slug}` },
    ],
  })
  // Safe: jsonLd is built from our own static app/platform data (not user input)
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
}

/* ─── FAQ Accordion ─── */
function FaqAccordion({ question, answer }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border border-theme-border overflow-hidden">
      <button
        onClick={() => {
          const next = !open
          setOpen(next)
          if (next) trackEvent('faq_item_expanded', { question })
        }}
        className="w-full flex items-center justify-between px-5 py-4 text-left bg-transparent border-none cursor-pointer text-theme-text hover:bg-theme-base-alt transition-colors"
      >
        <span className="text-[15px] font-medium pr-4">{question}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-theme-muted transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4">
          <p className="text-theme-muted text-[14px] leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  )
}
