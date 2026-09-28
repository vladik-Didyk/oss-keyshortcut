import { useSyncExternalStore } from 'react'
import { CONTENT } from '../data/content'
import {
  SPONSOR_OFFER,
  SPONSOR_EMAIL,
  isSitewideOpen,
  isAppPagePath,
  paymentUrl,
  bookingMailto,
} from '../data/sponsors'
import { siteMailto } from '../utils/siteMailto'
import { trackEvent } from '../lib/analytics'

const noSubscription = () => () => {}

/**
 * The page a visitor came from, read from ?page=. The page is pre-rendered
 * without a query string, so the server snapshot is empty and the value
 * appears after hydration.
 */
function useFromPage() {
  const search = useSyncExternalStore(
    noSubscription,
    () => window.location.search,
    () => '',
  )
  const value = new URLSearchParams(search).get('page')
  return isAppPagePath(value) ? value : null
}

/**
 * /sponsor: the offer, the terms and the booking buttons.
 *
 * `stats` comes from the route loader: { appPages, slotPages }.
 * `offer` and `sitewideOpen` default to the live config; tests pass their own.
 */
export default function SponsorPage({ stats, offer = SPONSOR_OFFER, sitewideOpen = isSitewideOpen() }) {
  const c = CONTENT.sponsorPage
  const fromPage = useFromPage()

  const hasIntroOffer = Boolean(offer.firstMonthCode)
  const cardPayment = Boolean(paymentUrl('sitewide', null, offer) || paymentUrl('page', null, offer))
  const steps = cardPayment
    ? c.steps.items({ email: SPONSOR_EMAIL, days: offer.goLiveBusinessDays })
    : c.steps.byEmail({ email: SPONSOR_EMAIL })

  return (
    <main className="pt-20 pb-16 px-5 md:px-6">
      <div className="mx-auto max-w-[680px]">
        <h1 className="text-3xl font-bold tracking-tight mb-3">{c.title}</h1>
        <p className="text-lg text-theme-muted leading-relaxed mb-8">{c.lead}</p>

        {fromPage && (
          <p className="rounded-2xl bg-theme-base-alt border border-theme-border px-5 py-4 text-[15px] text-theme-text mb-8">
            {c.fromPage(fromPage)}
          </p>
        )}

        <Section title={c.offer.title}>
          <BulletList items={c.offer.items(stats)} />
        </Section>

        <Section title={c.audience.title}>
          <BulletList items={c.audience.items()} />
          <p className="text-theme-muted leading-relaxed">
            {hasIntroOffer ? c.audience.unknownWithOffer : c.audience.unknown}
          </p>
        </Section>

        <Section title={c.price.title}>
          <div className="grid gap-4 md:grid-cols-2 mb-5">
            <PriceCard
              kind="sitewide"
              name={c.price.sitewide.name}
              detail={c.price.sitewide.detail(stats)}
              label={c.cta.sitewide(offer.sitewide.price)}
              offer={offer}
              open={sitewideOpen}
            />
            <PriceCard
              kind="page"
              name={c.price.page.name}
              detail={c.price.page.detail(stats)}
              label={fromPage ? c.cta.pageNamed(fromPage, offer.page.price) : c.cta.page(offer.page.price)}
              offer={offer}
              pagePath={fromPage}
              open
            />
          </div>
          <p className="text-theme-muted leading-relaxed mb-2">{c.price.terms}</p>
          {hasIntroOffer && (
            <p className="text-theme-muted leading-relaxed">{c.price.firstMonth(offer.firstMonthCode)}</p>
          )}
        </Section>

        <Section title={c.steps.title}>
          <ol className="list-decimal pl-5 text-theme-muted leading-relaxed space-y-2">
            {steps.map((step) => <li key={step}>{step}</li>)}
          </ol>
        </Section>

        <Section title={c.rules.title}>
          <BulletList items={c.rules.items} />
        </Section>

        <Section title={c.faq.title}>
          <dl>
            {c.faq.items({ ...stats, email: SPONSOR_EMAIL, days: offer.goLiveBusinessDays }).map(({ q, a }) => (
              <div key={q} className="mb-5">
                <dt className="text-[16px] font-semibold text-theme-text mb-1">{q}</dt>
                <dd className="text-theme-muted leading-relaxed m-0">{a}</dd>
              </div>
            ))}
          </dl>
        </Section>

        <p className="text-theme-muted leading-relaxed">
          <a
            href={siteMailto({ topic: 'Sponsor question', page: '/sponsor' })}
            onClick={() => trackEvent('sponsor_contact_clicked', { location: 'sponsor_page' })}
            className="text-accent underline underline-offset-2 hover:no-underline"
          >
            {c.contact(SPONSOR_EMAIL)}
          </a>
        </p>
      </div>
    </main>
  )
}

function Section({ title, children }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-semibold mb-3">{title}</h2>
      {children}
    </section>
  )
}

function BulletList({ items }) {
  return (
    <ul className="list-disc pl-5 text-theme-muted leading-relaxed space-y-2 mb-4">
      {items.map((item) => <li key={item}>{item}</li>)}
    </ul>
  )
}

function PriceCard({ kind, name, detail, label, offer, pagePath = null, open }) {
  const c = CONTENT.sponsorPage
  const price = offer[kind].price
  const cardUrl = paymentUrl(kind, pagePath, offer)
  const href = cardUrl || bookingMailto(kind, pagePath, offer)
  const newTab = cardUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <div className="rounded-2xl bg-theme-base-alt border border-theme-border p-6 flex flex-col">
      <h3 className="text-[17px] font-semibold text-theme-text mb-1">{name}</h3>
      <p className="mb-2">
        <span className="text-3xl font-bold text-theme-text">${price}</span>
        <span className="text-theme-muted"> {c.price.perMonth}</span>
      </p>
      <p className="text-[14px] text-theme-muted leading-relaxed mb-5">{detail}</p>

      {open ? (
        <>
          <a
            href={href}
            {...newTab}
            onClick={() => trackEvent('sponsor_book_clicked', { option: kind, method: cardUrl ? 'card' : 'email', page: pagePath || '' })}
            className="mt-auto inline-flex items-center justify-center text-center px-5 py-3 rounded-full text-[14px] font-medium no-underline hover:opacity-90 transition-opacity bg-theme-accent text-theme-accent-text"
          >
            {label}
          </a>
          {!cardUrl && (
            <p className="text-[12px] text-theme-muted leading-relaxed mt-3">{c.cta.byEmailNote}</p>
          )}
        </>
      ) : (
        <p className="mt-auto text-[14px] text-theme-text leading-relaxed">{c.price.taken}</p>
      )}
    </div>
  )
}
