import { useState, useEffect, useRef } from 'react'
import { X } from '../utils/icons'
import { initAnalytics, trackPageView, trackEvent, optOut } from '../lib/analytics'
import { CONSENT_KEY, OPEN_SETTINGS_EVENT, setNonPersonalizedAds, visitorRegion, whenGoogleConsentSettled } from '../lib/consent'
import { CONTENT } from '../data/content'

// "One. Two." -> ["One.", "Two."]. A period inside a bracket does not end one.
const sentences = (text) => text.split(/(?<=[.!?])\s+(?=[A-Z])/)

function storeDecline() {
  localStorage.setItem(CONSENT_KEY, 'declined')
  setNonPersonalizedAds(true)
  optOut()
}

/**
 * Our cookie banner. It decides analytics (GA4, Clarity, PostHog) everywhere,
 * and personalised vs non-personalised ads outside the EEA/UK/CH. Inside those
 * regions, ad consent belongs to Google's certified consent message, so the
 * banner shows only after that message is settled, and only asks about analytics.
 */
export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [gdpr, setGdpr] = useState(false)
  const [reopened, setReopened] = useState(false)
  const acceptRef = useRef(null)
  const cc = CONTENT.shared.cookieConsent

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored) return // already accepted or declined

    // Region decides whether a Decline button is required and whether Google's
    // consent message goes first. The page asked for it while it loaded.
    let gone = false
    visitorRegion().then(data => {
      if (gone) return
      const isGdpr = Boolean(data?.gdpr)
      setGdpr(isGdpr)
      if (isGdpr) whenGoogleConsentSettled(() => setVisible(true))
      else setVisible(true)
    })
    return () => { gone = true }
  }, [])

  // Footer "Cookie settings" reopens the banner, always with a Decline button.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const open = () => {
      setReopened(true)
      setVisible(true)
    }
    window.addEventListener(OPEN_SETTINGS_EVENT, open)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open)
  }, [])

  // When the banner appears, move focus to the primary action and allow Escape to
  // dismiss it (declines, the privacy-safe default — no analytics loaded).
  useEffect(() => {
    if (typeof window === 'undefined' || !visible) return
    acceptRef.current?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        storeDecline()
        setVisible(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible])

  async function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
    setNonPersonalizedAds(false)
    await initAnalytics()
    trackPageView(window.location.pathname)
    trackEvent('cookie_consent_accepted')
  }

  function decline() {
    storeDecline()
    setVisible(false)
  }

  if (!visible) return null

  const showDecline = gdpr || reopened

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div
        role="dialog"
        aria-label={cc.ariaLabel}
        aria-describedby="cookie-consent-desc"
        className="mx-auto max-w-[680px] bg-theme-accent text-theme-accent-text rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-lg relative"
      >
        {/* One block per sentence. The banner arrives after the page, and a
            browser measures "largest contentful paint" by the largest block of
            text: as one paragraph the banner was that block on a phone, so the
            page counted as slow by the time the banner showed (6 s measured,
            with the content there at 1.5 s). The words are unchanged. */}
        <div id="cookie-consent-desc" className="text-[14px] leading-relaxed flex-1">
          {sentences(gdpr ? cc.textGdpr : cc.text).map((sentence) => (
            <p key={sentence} className="m-0">{sentence}</p>
          ))}
          <p className="m-0">
            <a href="/privacy#cookies" className="underline hover:opacity-80">{cc.learnMore}</a>.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
          {showDecline && (
            <button
              onClick={decline}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-full text-[14px] font-medium cursor-pointer border-[1.5px] border-theme-accent-text bg-transparent text-theme-accent-text hover:opacity-80 transition-opacity"
            >
              {cc.decline}
            </button>
          )}
          <button
            ref={acceptRef}
            onClick={accept}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-full text-[14px] font-medium cursor-pointer border-[1.5px] border-theme-accent-text bg-theme-accent-text text-theme-accent hover:opacity-90 transition-opacity"
          >
            {cc.accept}
          </button>
        </div>
        {showDecline && (
          <button
            onClick={decline}
            className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-transparent border-none cursor-pointer text-theme-accent-text hover:opacity-70 transition-opacity"
            aria-label={cc.dismissAria}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
