import { ExternalLink } from '../utils/icons'
import { CONTENT } from '../data/content'
import { trackEvent } from '../lib/analytics'
import AppIcon from './directory/AppIcon'

const hostOf = (url) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

/**
 * Affiliate card, shaped like an App Store row: icon, name, one line, button.
 * The whole card is the link. The disclosure sits right under it (FTC: by the
 * link, not only in the footer or privacy page).
 * `affiliate` comes from getAffiliate() in src/data/affiliates.js; null renders nothing.
 * An app's own program shows the app's icon and name; a platform fallback
 * (Setapp) brings its own `name` and `icon`.
 */
export default function AffiliateLink({ affiliate, appSlug, appName, platform, className = '' }) {
  if (!affiliate) return null
  const t = CONTENT.shortcutPage.affiliate
  const isApp = affiliate.kind === 'app'
  const name = isApp ? appName || affiliate.name : affiliate.name
  const line = affiliate.tagline || hostOf(affiliate.url)

  return (
    <div className={className}>
      <a
        href={affiliate.url}
        target="_blank"
        rel="sponsored nofollow noopener"
        aria-label={line ? `${affiliate.label}: ${line}` : affiliate.label}
        onClick={() =>
          trackEvent('affiliate_clicked', {
            app: appSlug,
            platform,
            program: affiliate.program,
            kind: affiliate.kind,
            destination: affiliate.url,
          })
        }
        className="group flex items-center gap-3.5 rounded-2xl bg-theme-base-alt border border-theme-border px-4 py-3 no-underline text-theme-text hover:border-theme-muted transition-colors"
      >
        {isApp ? (
          name && <AppIcon slug={appSlug} displayName={name} size={44} className="w-11 h-11" />
        ) : (
          affiliate.icon && (
            <img src={affiliate.icon} alt="" aria-hidden="true" width={44} height={44} loading="lazy" decoding="async" className="w-11 h-11 shrink-0 rounded-[22%]" />
          )
        )}
        <span className="flex-1 min-w-0">
          {name && <span className="block text-[15px] font-semibold leading-tight">{name}</span>}
          {line && <span className="block mt-0.5 text-[13px] text-theme-muted leading-snug line-clamp-2">{line}</span>}
        </span>
        <span className="shrink-0 whitespace-nowrap inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-theme-accent text-theme-accent-text text-[13px] font-medium group-hover:opacity-90 transition-opacity">
          {affiliate.label}
          <ExternalLink size={13} aria-hidden="true" />
        </span>
      </a>
      <p className="mt-2 px-1 text-[12px] text-theme-muted leading-snug">
        {t.disclosure}{' '}
        <a href="/privacy#affiliate-links" className="underline underline-offset-2 hover:no-underline">
          {t.learnMore}
        </a>
      </p>
    </div>
  )
}
