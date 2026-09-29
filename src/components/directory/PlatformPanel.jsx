import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { groupByCategories, getPopularApps } from '../../utils/platformHelpers'
import { categoryConfig } from '../../data/categoryConfig'
import { useInView } from '../../hooks/useInView'
import { CONTENT } from '../../data/content'
import { trackEvent } from '../../lib/analytics'
import AppCard from './AppCard'
import AdSlot from '../AdSlot'

/**
 * The directory of one platform on the home page: the category bar, the apps
 * with the most shortcuts, then every app by category.
 *
 * The page holds one panel per platform, all of them in the HTML as it is
 * served. CSS shows the one the visitor's platform asks for (data-panel, see
 * preferredPlatform.js). `active` is the same choice as React knows it, for the
 * parts that must exist once only: the ad slot.
 */
export default function PlatformPanel({ platform, apps, otherPlatformsMap = {}, active }) {
  const [activeCategory, setActiveCategory] = useState(null)
  const categoryOrder = useMemo(() => platform.categories || [], [platform])
  const chipsRef = useRef(null)

  // Edge fades on the category row: shown only on a side that has more chips.
  const [chipEdges, setChipEdges] = useState({ left: false, right: false })
  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const update = () => {
      const max = el.scrollWidth - el.clientWidth
      setChipEdges({ left: el.scrollLeft > 2, right: el.scrollLeft < max - 2 })
    }
    update()
    el.addEventListener('scroll', update, { passive: true })
    // The row's width changes with the viewport, when the web font loads, and
    // when the panel is shown.
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(update) : null
    ro?.observe(el)
    if (el.firstElementChild) ro?.observe(el.firstElementChild)
    return () => {
      el.removeEventListener('scroll', update)
      ro?.disconnect()
    }
  }, [categoryOrder])

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
  }, [categoryOrder])

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
  }, [])

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
    setActiveCategory(cat)
    if (cat) trackEvent('category_filtered', { category: cat, platform: platform.id })
  }, [chipsStuck, platform.id])

  const groups = useMemo(() => groupByCategories(apps, categoryOrder), [apps, categoryOrder])
  const shown = activeCategory ? groups.filter((g) => g.name === activeCategory) : groups
  const mostShortcuts = useMemo(() => getPopularApps(apps, 9), [apps])

  return (
    <div data-panel={platform.id}>
      {/* ─── Category Chips ─── */}
      <div ref={chipsSentinelRef} aria-hidden="true" />
      <div
        className={`sticky z-30 bg-theme-base px-5 md:px-6 mb-6 border-b transition-colors ${chipsStuck ? 'border-theme-border' : 'border-transparent'}`}
        style={{ top: 'calc(3rem + env(safe-area-inset-top))' }}
      >
        {/* Wider than the 1080px grid so all chips fit on one centred line on a 1280px screen */}
        <div className="mx-auto max-w-[1240px] relative">
          {/* w-max + mx-auto: centred when the chips fit, scrollable from the first chip when they don't */}
          <nav ref={chipsRef} className="chips-scroll overflow-x-auto select-none py-1" aria-label={CONTENT.home.categoryNavLabel(platform.displayName)}>
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

      <div className="mx-auto max-w-[1080px] px-5 md:px-6 pb-16 min-h-[420px]">
        {/* ─── Apps with the most shortcuts ─── */}
        {!activeCategory && mostShortcuts.length > 0 && (
          <section className="mb-8">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-theme-muted mb-4">{CONTENT.home.aboutSection.mostShortcutsTitle}</h2>
            <div className="grid grid-cols-3 md:grid-cols-4 gap-2 sm:gap-3 md:[&>*:nth-child(9)]:hidden">
              {mostShortcuts.map(app => (
                <AppCard key={app.slug} app={app} platform={platform.id} />
              ))}
            </div>
          </section>
        )}

        {shown.map((group, index) => (
          <React.Fragment key={group.name}>
            <CategorySection group={group} platform={platform.id} otherPlatformsMap={otherPlatformsMap} />
            {active && index === 2 && shown.length > 4 && (
              <AdSlot adSlot="home_mid" variant="in-article" />
            )}
          </React.Fragment>
        ))}

        {shown.length === 0 && (
          <p className="text-center py-20 text-theme-muted">{CONTENT.home.emptyCategory}</p>
        )}
      </div>
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
