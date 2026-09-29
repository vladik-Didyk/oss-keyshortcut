import { Link } from 'react-router'
import { ArrowRight } from '../utils/icons'
import { CONTENT } from '../data/content'
import { HOUSE_CARD } from '../data/sponsors'
import { trackEvent } from '../lib/analytics'

/**
 * The site's own card for the Mac app, in the slot of a page that has no
 * sponsor. One link, labeled as the site's own, the same shape as a sponsor's
 * text card.
 */
export default function HouseCard({ appName, slug, className = '' }) {
  const c = CONTENT.shortcutPage.houseCard
  return (
    <aside className={`py-8 ${className}`} aria-label={c.label}>
      <p className="text-[11px] uppercase tracking-widest text-theme-muted mb-3 text-center">{c.label}</p>
      <Link
        to={HOUSE_CARD.to}
        onClick={() => trackEvent('mac_hud_promo_clicked', { location: 'shortcut_mid', app: slug })}
        className="group flex items-center gap-4 min-h-[44px] mx-auto max-w-[560px] rounded-2xl border border-theme-border bg-theme-base-alt px-4 py-3.5 sm:px-5 no-underline transition-colors hover:border-theme-border-hover"
      >
        <img src={HOUSE_CARD.icon} alt="" width={44} height={44} loading="lazy" className="w-11 h-11 shrink-0 rounded-[10px]" />
        <span className="flex-1 min-w-0">
          <span className="block text-[15px] font-semibold text-theme-text">{c.name}</span>
          <span className="block text-[13px] leading-snug text-theme-muted mt-0.5">{c.line(appName)}</span>
        </span>
        <span className="hidden sm:inline-flex items-center gap-1 shrink-0 text-[13px] font-medium text-theme-text">
          {c.cta}
          <ArrowRight size={14} aria-hidden="true" className="transition-transform group-hover:translate-x-0.5" />
        </span>
        <ArrowRight size={16} aria-hidden="true" className="sm:hidden shrink-0 text-theme-muted" />
      </Link>
    </aside>
  )
}
