import { useState, useEffect, useRef } from 'react'
import MacAppStoreButton from './MacAppStoreButton'
import AppPanelMockup from './AppPanelMockup'
import { useInView } from '../hooks/useInView'
import { DEMO_APPS, buildDemoTimeline } from '../data/heroDemoData'
import { MAC_ROWS } from '../data/keyboardLayout'
import { CONTENT } from '../data/content'
import { APP_STORE_URL } from '../data/siteConfig'

// ─── Build timeline from demo data ───
const { frames: FRAMES, duration: LOOP_MS } = buildDemoTimeline(DEMO_APPS)

// ─── Sticky CTA ───
// Appears once the hero scrolls out of view: a bottom bar on mobile and a
// bottom-right card on desktop, holding the App Store badge + price microcopy.
// SSR-safe: all observer/scroll work lives inside an effect with a window guard.
function StickyCTA({ heroRef }) {
  const [visible, setVisible] = useState(false)
  const { hero } = CONTENT.productPage

  useEffect(() => {
    if (typeof window === 'undefined') return
    const heroEl = heroRef.current
    if (!heroEl) return

    // Preferred path: IntersectionObserver on the hero element.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        ([entry]) => setVisible(!entry.isIntersecting),
        { threshold: 0, rootMargin: '0px 0px -100% 0px' }
      )
      observer.observe(heroEl)
      return () => observer.disconnect()
    }

    // Fallback for environments without IntersectionObserver.
    const onScroll = () => {
      const rect = heroEl.getBoundingClientRect()
      setVisible(rect.bottom <= 0)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [heroRef])

  return (
    <div
      aria-hidden={!visible}
      className={`fixed inset-x-0 bottom-0 z-40 px-4 pb-4 sm:left-auto sm:right-4 sm:inset-x-auto sm:max-w-sm transition-all duration-300 ${
        visible
          ? 'opacity-100 translate-y-0 pointer-events-auto'
          : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-theme-border bg-theme-base-alt/95 backdrop-blur px-4 py-3 shadow-lg">
        <div className="min-w-0">
          <p className="text-sm font-semibold leading-tight truncate">
            {hero.headline} {hero.headlineAccent}
          </p>
          <p className="text-xs text-theme-muted leading-tight whitespace-pre-line">
            {hero.platformInfoMobile}
          </p>
        </div>
        <div className="shrink-0">
          <MacAppStoreButton
            eventName="sticky_cta_clicked"
            eventProps={{ location: 'sticky' }}
            className="[&_img]:h-[36px] sm:[&_img]:h-[40px]"
          />
        </div>
      </div>
    </div>
  )
}

// ─── Component ───
export default function Hero() {
  const [ref, isVisible] = useInView()
  const [activeKeys, setActiveKeys] = useState(new Set())
  const [appIndex, setAppIndex] = useState(0)
  const [highlightedMods, setHighlightedMods] = useState(new Set())
  const [highlightedShortcut, setHighlightedShortcut] = useState(null)
  const [panelTransitioning, setPanelTransitioning] = useState(false)
  const [action, setAction] = useState(null)
  const [animKey, setAnimKey] = useState(0)
  const prevRef = useRef({ action: null, appIndex: -1 })

  useEffect(() => {
    if (!isVisible) return
    // Respect reduced-motion: skip the decorative auto-playing keyboard animation.
    // Guarded for SSR — matchMedia only exists in the browser.
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return
    }
    const startTime = performance.now() + 1400
    let rafId
    let lastIdx = -1

    const tick = (now) => {
      const elapsed = now - startTime
      if (elapsed < 0) { rafId = requestAnimationFrame(tick); return }
      const loopTime = elapsed % LOOP_MS
      let idx = 0
      for (let i = FRAMES.length - 1; i >= 0; i--) {
        if (loopTime >= FRAMES[i].t) { idx = i; break }
      }
      if (idx !== lastIdx) {
        lastIdx = idx
        const frame = FRAMES[idx]
        setActiveKeys(frame.keys)
        setHighlightedMods(frame.highlightedModifiers)
        setHighlightedShortcut(frame.highlightedShortcut)

        // App switch
        if (frame.appIndex !== prevRef.current.appIndex) {
          setAppIndex(frame.appIndex)
          setPanelTransitioning(frame.transitioning)
          prevRef.current.appIndex = frame.appIndex
        } else {
          setPanelTransitioning(false)
        }

        // Action label
        const newAction = frame.highlightedShortcut?.action ?? null
        if (newAction !== prevRef.current.action) {
          setAction(newAction)
          if (newAction) setAnimKey(n => n + 1)
          prevRef.current.action = newAction
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    rafId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(rafId)
  }, [isVisible])

  const isActive = (key) => {
    // Only light left-side modifiers (skip cmd-r, opt-r, shift-r)
    if (key.mod) return !key.id.endsWith('-r') && activeKeys.has(key.mod)
    return activeKeys.has(key.id)
  }

  const currentApp = DEMO_APPS[appIndex]
  const { hero } = CONTENT.productPage

  return (
    <section
      id="hero"
      ref={ref}
      className={`pt-28 md:pt-36 lg:pt-16 pb-10 md:pb-16 lg:pb-8 px-5 md:px-6 fade-in-up ${isVisible ? 'visible' : ''}`}
    >
      {/* ═══════ LARGE SCREENS (lg+): two-column hero ═══════ */}
      <div className="hidden lg:block mx-auto max-w-[1100px]">
        {/* Row 1: headline left + panel right */}
        <div className="flex items-center gap-10">
          {/* Left — copy */}
          <div className="flex-1 min-w-0">
            <h1 className="text-[44px] xl:text-[52px] font-bold leading-[1.08] tracking-[-0.015em] mb-3">
              {hero.headline}{' '}
              <br />
              <span className="text-gradient">{hero.headlineAccent}</span>
            </h1>
            <p className="text-base text-theme-muted leading-relaxed max-w-md mb-5">
              {hero.subheadline}
            </p>

            <div className="flex flex-col items-start gap-2 mb-5">
              <MacAppStoreButton eventProps={{ location: 'hero_desktop' }} />
              {/* Price / platform microcopy — surfaces existing content.js field.
                  Guarded so it isn't orphaned when no store URL (button is null). */}
              {APP_STORE_URL && (
                <p className="text-[13px] text-theme-muted whitespace-pre-line leading-snug">
                  {hero.platformInfo}
                </p>
              )}
            </div>

            {/* Stat badges — horizontal, compact */}
            <div className="flex gap-3">
              {hero.stats.map(stat => (
                <div
                  key={stat.label}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-theme-base-alt border border-theme-border"
                >
                  <span className="text-lg font-bold text-accent leading-none">{stat.value}</span>
                  <span className="text-[11px] text-theme-muted leading-tight">{stat.label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — panel mockup */}
          <div className="shrink-0">
            <AppPanelMockup
              app={currentApp}
              highlightedModifiers={highlightedMods}
              highlightedShortcut={highlightedShortcut}
              transitioning={panelTransitioning}
            />
          </div>
        </div>

        {/* Row 2: action label + full-width keyboard */}
        <div className="mt-4">
          <div className="h-8 flex items-center justify-center mb-2">
            {action ? (
              <div
                key={animKey}
                className="text-center animate-[hero-pop_0.4s_cubic-bezier(0.34,1.56,0.64,1)]"
              >
                <span className="text-xl font-bold text-gradient">{action}</span>
              </div>
            ) : (
              <span className="text-xs text-theme-muted">
                {hero.keyboardHint}
              </span>
            )}
          </div>

          <div className="retro-window">
            <div className="retro-window-titlebar">
              <span className="retro-window-dot" />
              <span className="retro-window-dot" />
              <span className="retro-window-dot" />
            </div>
            <div className="p-3">
              {MAC_ROWS.map((row, ri) => (
                <div key={ri} className="flex gap-[3px] mb-[3px] last:mb-0">
                  {row.map((key) => {
                    const lit = isActive(key)
                    return (
                      <div
                        key={key.id}
                        className={`
                          ${ri === 0 ? 'h-5 text-[8px]' : 'h-8 text-[11px]'}
                          rounded-[4px] font-medium flex items-center justify-center
                          select-none keycap-interactive keycap-hero
                        `}
                        data-active={lit}
                        style={{ flex: key.w }}
                      >
                        {key.label}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════ MOBILE + TABLET (below lg): centered layout ═══════ */}
      <div className="lg:hidden mx-auto max-w-[980px] text-center">
        <h1 className="text-5xl md:text-7xl font-bold leading-[1.05] tracking-[-0.015em] mb-4">
          {hero.headline}{' '}
          <br className="hidden sm:block" />
          <span className="text-gradient">{hero.headlineAccent}</span>
        </h1>
        <p className="text-xl md:text-2xl text-theme-muted leading-relaxed max-w-2xl mx-auto mb-8">
          {hero.subheadlineMobile}
        </p>

        <div className="flex flex-col items-center gap-3 mb-10 md:mb-12">
          <MacAppStoreButton eventProps={{ location: 'hero_mobile' }} />
          {/* Price / platform microcopy — surfaces existing content.js field.
              Guarded so it isn't orphaned when no store URL (button is null). */}
          {APP_STORE_URL && (
            <p className="text-sm text-theme-muted">
              {hero.platformInfoMobile}
            </p>
          )}
        </div>

        <div className="flex justify-center gap-4 md:gap-6 flex-wrap">
          {hero.statsMobile.map(stat => (
            <div
              key={stat.label}
              className="flex flex-col items-center px-5 py-3 rounded-xl bg-theme-base-alt border border-theme-border min-w-[120px]"
            >
              <span className="text-2xl md:text-3xl font-bold text-accent leading-none">{stat.value}</span>
              <span className="text-xs text-theme-muted mt-1">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Mobile/tablet: static screenshot fallback ─── */}
      <div className="lg:hidden mt-12">
        <div className="relative mx-auto max-w-[520px]">
          <img
            src="/images/keyflow-black.webp"
            alt="KeyShortcut showing shortcuts — dark mode"
            width={1264}
            height={1708}
            loading="eager"
            fetchPriority="high"
            className="hero-app-screenshot hero-app-dark rounded-2xl screenshot-shadow"
          />
          <img
            src="/images/keyflow-white.webp"
            alt="KeyShortcut showing shortcuts — light mode"
            width={1264}
            height={1708}
            loading="eager"
            fetchPriority="high"
            className="hero-app-screenshot hero-app-light rounded-2xl screenshot-shadow"
          />
        </div>
        <p className="text-center text-sm text-theme-muted mt-5">
          {hero.mobileCta}
        </p>
      </div>

      {/* Persistent CTA — appears after the hero scrolls out of view.
          Only when there's a store URL (otherwise there's nothing to click). */}
      {APP_STORE_URL && <StickyCTA heroRef={ref} />}
    </section>
  )
}
