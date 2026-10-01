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
 * Affiliate card, shaped like a native ad: a panel in the brand's colour with
 * its icon, then the name, an "Ad" label, a title and one line.
 * The title is the link and covers the whole card; the "Ad" label is a link of
 * its own, above it, to how the site makes money (FTC: the disclosure sits on
 * the link, not only in the footer or privacy page).
 * `affiliate` comes from getAffiliate() in src/data/affiliates.js; null renders nothing.
 * An app's own program shows the app's icon and name; a platform fallback
 * (Setapp) brings its own `name` and `icon`.
 */
export default function AffiliateLink({ affiliate, appSlug, appName, platform, className = '' }) {
  if (!affiliate) return null
  const t = CONTENT.shortcutPage.affiliate
  const isApp = affiliate.kind === 'app'
  const name = isApp ? appName || affiliate.name : affiliate.name
  const title = affiliate.title || affiliate.label
  const text = affiliate.text || hostOf(affiliate.url)

  const icon = (size, cls) =>
    isApp
      ? name && <AppIcon slug={appSlug} displayName={name} size={size} className={cls} />
      : affiliate.icon && (
          <img src={affiliate.icon} alt="" aria-hidden="true" width={size} height={size} loading="lazy" decoding="async" className={`shrink-0 rounded-[22%] ${cls}`} />
        )

  return (
    <div className={`relative flex overflow-hidden rounded-2xl border border-theme-border bg-theme-base-alt hover:border-theme-muted transition-colors ${className}`}>
      <div
        aria-hidden="true"
        className="flex shrink-0 items-center justify-center w-[88px] sm:w-[128px] bg-theme-surface"
        style={affiliate.panel ? { backgroundColor: affiliate.panel } : undefined}
      >
        {icon(56, 'w-12 h-12 sm:w-14 sm:h-14')}
      </div>

      <div className="flex-1 min-w-0 py-3 pl-4 pr-3 sm:py-4 sm:pl-5 sm:pr-4">
        <div className="flex items-center gap-2">
          {icon(18, 'w-[18px] h-[18px]')}
          {name && <span className="truncate text-[13px] text-theme-muted">{name}</span>}
          <a
            href="/privacy#affiliate-links"
            aria-label={`${t.ad}. ${t.disclosure} ${t.learnMore}`}
            title={t.disclosure}
            className="relative z-10 ml-auto -my-3 inline-flex items-center min-h-[44px] sm:min-h-[32px] no-underline"
          >
            <span className="rounded-full bg-theme-surface px-2.5 py-0.5 text-[12px] font-medium text-theme-muted">{t.ad}</span>
          </a>
        </div>
        <a
          href={affiliate.url}
          target="_blank"
          rel="sponsored nofollow noopener"
          aria-label={`${affiliate.label}: ${title}`}
          onClick={() =>
            trackEvent('affiliate_clicked', {
              app: appSlug,
              platform,
              program: affiliate.program,
              kind: affiliate.kind,
              destination: affiliate.url,
            })
          }
          className="mt-1 block text-[16px] sm:text-[17px] font-semibold leading-snug text-theme-text no-underline after:absolute after:inset-0 after:content-['']"
        >
          {title}
        </a>
        {text && <p className="mt-0.5 text-[14px] leading-snug text-theme-muted line-clamp-2">{text}</p>}
      </div>
    </div>
  )
}
