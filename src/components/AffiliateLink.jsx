import { ExternalLink } from '../utils/icons'
import { CONTENT } from '../data/content'
import { trackEvent } from '../lib/analytics'

/**
 * "Get <App>" affiliate button with its disclosure next to it (FTC: the
 * disclosure must sit by the link, not only in the footer or privacy page).
 * `affiliate` comes from getAffiliate() in src/data/affiliates.js; null renders nothing.
 */
export default function AffiliateLink({ affiliate, appSlug, platform, className = '' }) {
  if (!affiliate) return null
  const t = CONTENT.shortcutPage.affiliate

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 ${className}`}>
      <a
        href={affiliate.url}
        target="_blank"
        rel="sponsored nofollow noopener"
        onClick={() =>
          trackEvent('affiliate_clicked', {
            app: appSlug,
            platform,
            program: affiliate.program,
            kind: affiliate.kind,
            destination: affiliate.url,
          })
        }
        className="self-start shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-theme-accent text-theme-accent-text text-[13px] font-medium no-underline hover:opacity-90 transition-opacity"
      >
        {affiliate.label}
        <ExternalLink size={13} aria-hidden="true" />
      </a>
      <p className="text-[12px] text-theme-muted leading-snug">
        {affiliate.tagline && <span className="text-theme-text">{affiliate.tagline}. </span>}
        {t.disclosure}{' '}
        <a href="/privacy#affiliate-links" className="underline underline-offset-2 hover:no-underline">
          {t.learnMore}
        </a>
      </p>
    </div>
  )
}
