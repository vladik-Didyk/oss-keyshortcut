import { useState, useEffect, useRef } from 'react'
import { X } from '../utils/icons'
import { initAnalytics, trackPageView } from '../lib/analytics'

const CONSENT_KEY = 'cookie-consent'

export default function CookieConsent() {
  const [visible, setVisible] = useState(false)
  const [gdpr, setGdpr] = useState(false)
  const acceptRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const stored = localStorage.getItem(CONSENT_KEY)
    if (stored) return // already accepted or declined

    // Fetch region to determine if reject button is needed
    fetch('/api/geo')
      .then(r => r.ok ? r.json() : { gdpr: false })
      .then(data => setGdpr(data.gdpr))
      .catch(() => {})
      .finally(() => {
        // Show banner after a short delay regardless of geo result
        setTimeout(() => setVisible(true), 800)
      })
  }, [])

  // When the banner appears, move focus to the primary action and allow Escape to
  // dismiss it (declines, the privacy-safe default — no analytics loaded).
  useEffect(() => {
    if (typeof window === 'undefined' || !visible) return
    acceptRef.current?.focus()

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        localStorage.setItem(CONSENT_KEY, 'declined')
        setVisible(false)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [visible])

  async function accept() {
    localStorage.setItem(CONSENT_KEY, 'accepted')
    setVisible(false)
    await initAnalytics()
    trackPageView(window.location.pathname)
    // trackEvent is safe here: analytics just initialized above
    const { trackEvent } = await import('../lib/analytics')
    trackEvent('cookie_consent_accepted')
  }

  function decline() {
    localStorage.setItem(CONSENT_KEY, 'declined')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[9999] p-4 md:p-6"
      style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
    >
      <div
        role="dialog"
        aria-label="Cookie consent"
        aria-describedby="cookie-consent-desc"
        className="mx-auto max-w-[680px] bg-theme-accent text-theme-accent-text rounded-2xl px-6 py-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-lg relative"
      >
        <p id="cookie-consent-desc" className="text-[14px] leading-relaxed flex-1">
          This website uses cookies for advertising (Google AdSense) and analytics
          (Google Analytics, Microsoft Clarity, PostHog). By accepting, you consent
          to our use of cookies.{' '}
          <a href="/privacy" className="underline hover:opacity-80">Learn more</a>.
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0 w-full sm:w-auto">
          {gdpr && (
            <button
              onClick={decline}
              className="w-full sm:w-auto min-h-[44px] px-4 py-2.5 rounded-full text-[14px] font-medium cursor-pointer border-[1.5px] border-theme-accent-text bg-transparent text-theme-accent-text hover:opacity-80 transition-opacity"
            >
              Decline
            </button>
          )}
          <button
            ref={acceptRef}
            onClick={accept}
            className="w-full sm:w-auto min-h-[44px] px-5 py-2.5 rounded-full text-[14px] font-medium cursor-pointer border-[1.5px] border-theme-accent-text bg-theme-accent-text text-theme-accent hover:opacity-90 transition-opacity"
          >
            Accept
          </button>
        </div>
        {gdpr && (
          <button
            onClick={decline}
            className="absolute top-2 right-2 inline-flex items-center justify-center w-7 h-7 rounded-full bg-transparent border-none cursor-pointer text-theme-accent-text hover:opacity-70 transition-opacity"
            aria-label="Dismiss cookie banner"
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}
