import { useEffect, useRef, useSyncExternalStore } from 'react'
import { CONTENT } from '../data/content'
import { ADSENSE_CLIENT, resolveAdUnit } from '../data/ads'
import { trackEvent } from '../lib/analytics'

const IS_PROD = import.meta.env.PROD

/**
 * One ad placement: a direct sponsor when `sponsor` is given, otherwise a
 * Google AdSense unit. `adSlot` is a placement name from src/data/ads.js (or a
 * raw numeric unit ID). Renders nothing when there is no sponsor and no unit ID.
 *
 * Ad consent is not decided here. In the EEA/UK/Switzerland, Google's certified
 * consent message (AdSense → Privacy & messaging) gates ad requests. A visitor
 * who declined our cookie banner gets non-personalised ads (flag set in root.jsx).
 */
export default function AdSlot({ adSlot, variant = 'banner', format = 'auto', sponsor, className = '' }) {
  if (sponsor) return <SponsorBanner sponsor={sponsor} className={className} />

  const unitId = resolveAdUnit(adSlot)
  if (!IS_PROD || !ADSENSE_CLIENT || !unitId) return null

  if (variant === 'in-article') {
    return (
      <AdWrapper className={className} filledClassName="py-8" baseClassName="px-5 md:px-6">
        {(filled) => (
          <div className="mx-auto max-w-[980px]">
            {/* Border is always 1px (transparent until filled) so the width AdSense measured never changes. */}
            <div className={`rounded-2xl border px-5 text-center ${filled ? 'bg-theme-base-alt border-theme-border py-5' : 'border-transparent'}`}>
              <AdSenseUnit unitId={unitId} format="fluid" layout="in-article" />
            </div>
          </div>
        )}
      </AdWrapper>
    )
  }

  if (variant === 'in-feed') {
    return (
      <AdWrapper
        className={`flex flex-col items-center rounded-2xl border ${className}`}
        filledClassName="py-6 bg-theme-base-alt border-theme-border"
        baseClassName="px-4 border-transparent"
      >
        {() => <AdSenseUnit unitId={unitId} format="fluid" layoutKey="-fb+5w+4e-db+86" />}
      </AdWrapper>
    )
  }

  // Default: banner
  return (
    <AdWrapper className={className} filledClassName="py-8" baseClassName="px-5 md:px-6">
      {() => (
        <div className="mx-auto max-w-[980px] text-center">
          <AdSenseUnit unitId={unitId} format={format} />
        </div>
      )}
    </AdWrapper>
  )
}

function SponsorBanner({ sponsor, className }) {
  const onClick = () => trackEvent('sponsor_clicked', { sponsor: sponsor.name || sponsor.url, url: sponsor.url })
  return (
    <div className={`py-8 px-5 md:px-6 ${className}`}>
      <div className="mx-auto max-w-[980px] text-center">
        <p className="text-[11px] uppercase tracking-widest text-theme-muted mb-3">{CONTENT.shared.adSlot.sponsoredLabel}</p>
        <a
          href={sponsor.url}
          target="_blank"
          rel="sponsored nofollow noopener noreferrer"
          onClick={onClick}
          className="inline-block rounded-2xl border border-theme-border hover:border-theme-border-hover transition-colors overflow-hidden no-underline"
        >
          {sponsor.image ? (
            <img decoding="async" src={sponsor.image} alt={sponsor.alt || sponsor.name || 'Sponsor'} className="max-w-full h-auto max-h-24" />
          ) : (
            <span className="block px-6 py-4 text-left">
              <span className="block text-[15px] font-semibold text-theme-text">{sponsor.name}</span>
              {sponsor.tagline && <span className="block text-[13px] text-theme-muted mt-0.5">{sponsor.tagline}</span>}
            </span>
          )}
        </a>
      </div>
    </div>
  )
}

/**
 * Keeps an ad placement visually empty until AdSense fills it, then adds the
 * spacing, card styling and the "Advertisements" label.
 *
 * The wrapper is never display:none. AdSense sizes a responsive unit from its
 * container's width, and a hidden container reports 0 ("No slot size for
 * availableWidth=0"), so the unit never fills. An unfilled <ins> is 0px tall,
 * and index.css hides one AdSense marks data-ad-status="unfilled".
 *
 * Uses useSyncExternalStore to subscribe to the fill status without calling
 * setState inside an effect.
 */
function AdWrapper({ children, className = '', baseClassName = '', filledClassName = '' }) {
  const ref = useRef(null)
  const filledRef = useRef(false)
  const listenersRef = useRef(new Set())

  const subscribe = (callback) => {
    listenersRef.current.add(callback)
    return () => listenersRef.current.delete(callback)
  }

  const getSnapshot = () => filledRef.current

  const filled = useSyncExternalStore(subscribe, getSnapshot, () => false)

  useEffect(() => {
    const container = ref.current
    if (!container) return

    const ins = container.querySelector('ins.adsbygoogle')
    if (!ins) return

    const check = () => {
      if (ins.getAttribute('data-ad-status') === 'filled' && !filledRef.current) {
        filledRef.current = true
        listenersRef.current.forEach(cb => cb())
      }
    }

    // Check immediately in case already filled
    check()

    const observer = new MutationObserver(check)
    observer.observe(ins, { attributes: true, attributeFilter: ['data-ad-status'] })
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={ref} className={`${baseClassName} ${filled ? filledClassName : ''} ${className}`}>
      {filled && (
        <p className="text-[10px] uppercase tracking-widest text-theme-muted mb-3 text-center">
          {CONTENT.shared.adSlot.adLabel}
        </p>
      )}
      {children(filled)}
    </div>
  )
}

function AdSenseUnit({ unitId, format, layout, layoutKey }) {
  const pushed = useRef(false)

  useEffect(() => {
    if (pushed.current) return
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
      pushed.current = true
    } catch {
      // AdSense not loaded or blocked
    }
  }, [])

  const attrs = {
    className: 'adsbygoogle block',
    'data-ad-client': ADSENSE_CLIENT,
    'data-ad-slot': unitId,
    'data-ad-format': format,
  }

  if (layout) attrs['data-ad-layout'] = layout
  if (layoutKey) attrs['data-ad-layout-key'] = layoutKey
  if (format === 'auto') attrs['data-full-width-responsive'] = 'true'

  return <ins {...attrs} />
}
