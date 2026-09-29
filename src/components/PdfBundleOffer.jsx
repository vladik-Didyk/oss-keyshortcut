import { FileDown } from '../utils/icons'
import { CONTENT } from '../data/content'
import { getPdfBundle } from '../data/products'
import { trackEvent } from '../lib/analytics'

/**
 * The PDF bundle on /cheat-sheets: one card, one button that leads to the
 * seller. Renders nothing until PDF_BUNDLE has a link and a price.
 * `bundle` is for tests; the page uses the configured one.
 */
export default function PdfBundleOffer({ bundle, className = '' }) {
  const offer = getPdfBundle(bundle)
  if (!offer) return null
  const c = CONTENT.cheatSheetsPage.bundle

  return (
    <aside aria-label={c.label} className={`rounded-2xl border border-theme-border bg-theme-base-alt p-5 sm:p-6 ${className}`}>
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <FileDown size={28} className="text-theme-text shrink-0" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <h2 className="text-[17px] font-semibold tracking-tight text-theme-text m-0">{c.title}</h2>
          <p className="text-[14px] leading-relaxed text-theme-muted mt-1 mb-0">{c.text}</p>
        </div>
        <a
          href={offer.link}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent('pdf_bundle_clicked', { platform: offer.platform, price: offer.price })}
          className="inline-flex items-center justify-center min-h-[44px] px-5 rounded-full bg-theme-accent text-theme-accent-text text-[14px] font-medium no-underline whitespace-nowrap hover:opacity-90 transition-opacity shrink-0"
        >
          {c.button(offer.price)}
        </a>
      </div>
    </aside>
  )
}
