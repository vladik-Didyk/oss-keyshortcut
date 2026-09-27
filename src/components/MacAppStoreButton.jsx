import { APP_STORE_URL } from '../data/siteConfig'
import { CONTENT } from '../data/content'
import { trackEvent } from '../lib/analytics'

/**
 * Mac App Store download button.
 *
 * Project invariant (CLAUDE.md): when `APP_STORE_URL` is null (VITE_APP_STORE_ID
 * unset) all download buttons are hidden — this returns null. Callers that pair
 * a CTA headline/microcopy with this button must guard their own wrapper on
 * `APP_STORE_URL` so they never render an orphaned heading.
 *
 * `eventName` / `eventProps` let callers attribute the click to a specific CTA.
 */
export default function MacAppStoreButton({
  href = APP_STORE_URL,
  className = '',
  eventName = 'app_store_clicked',
  eventProps = {},
}) {
  if (!href) return null

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={CONTENT.shared.macAppStoreButton.ariaLabel}
      className={`inline-flex items-center justify-center transition-opacity hover:opacity-80 ${className}`}
      onClick={() => trackEvent(eventName, { destination: href, ...eventProps })}
    >
      <img
        src="/images/app-store-badge.png"
        alt="Download on the App Store"
        width={195}
        height={65}
        className="h-[44px] w-auto sm:h-[52px] pointer-events-none"
      />
    </a>
  )
}
