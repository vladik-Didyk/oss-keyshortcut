import { useRef, useState, useSyncExternalStore } from 'react'
import Link from './SiteLink'
import { CONTENT } from '../data/content'
import { APP_COUNT, formatShortcutCount } from '../data/siteConfig'
import {
  SPONSOR_OFFER,
  SPONSORS,
  SPONSOR_AUDIENCE,
  SPONSOR_EMAIL,
  SPONSOR_PAGE_APPS,
  SPONSOR_MOCK,
  isSitewideOpen,
  isAppPagePath,
  paymentUrl,
  bookingMailto,
} from '../data/sponsors'
import { siteMailto } from '../utils/siteMailto'
import { trackEvent } from '../lib/analytics'
import AppIcon from './directory/AppIcon'
import {
  AppWindow,
  BadgeCheck,
  ChevronDown,
  CircleCheck,
  CreditCard,
  Keyboard,
  LayoutList,
  MousePointerClick,
  PenLine,
  Send,
  Users,
} from '../utils/icons'

const noSubscription = () => () => {}

const WIDTH = 'mx-auto max-w-[980px] px-5 md:px-6'
const CARD = 'rounded-2xl bg-theme-base-alt border border-theme-border'
const BUTTON = 'inline-flex items-center justify-center min-h-[44px] px-5 rounded-full text-[14px] font-medium no-underline transition-opacity hover:opacity-90'

const OFFER_ICONS = { list: LayoutList, badge: BadgeCheck, pen: PenLine, click: MousePointerClick }
const STEP_ICONS = [CreditCard, Send, CircleCheck]

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
 *
 * The two booking buttons are in the price cards and nowhere else: the buttons
 * at the top of the page lead down to them.
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
    <main className="pt-20 pb-20">
      {/* ─── Top: what it is, and where the card sits ─── */}
      <section className={`${WIDTH} grid gap-10 lg:grid-cols-[1fr_minmax(0,420px)] lg:items-center pt-4 lg:pt-10`}>
        <div>
          <p className="text-[12px] uppercase tracking-widest text-theme-muted mb-3">{c.eyebrow}</p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight leading-[1.08] mb-5">{c.title}</h1>
          <p className="text-lg text-theme-muted leading-relaxed max-w-[520px] mb-7">{c.lead(offer.page.price)}</p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#price"
              onClick={() => trackEvent('sponsor_cta_clicked', { location: 'top', target: 'price' })}
              className={`${BUTTON} bg-theme-accent text-theme-accent-text`}
            >
              {c.heroCta.prices}
            </a>
            <a
              href="#preview"
              onClick={() => trackEvent('sponsor_cta_clicked', { location: 'top', target: 'preview' })}
              className={`${BUTTON} border-[1.5px] border-theme-accent text-theme-accent`}
            >
              {c.heroCta.preview}
            </a>
          </div>
        </div>

        <figure className="m-0" aria-hidden="true">
          <SlotMock name={c.preview.nameDefault} line={c.preview.lineDefault} />
          <figcaption className="mt-4 text-center text-[13px] text-theme-muted">{c.mockCaption}</figcaption>
        </figure>
      </section>

      {fromPage && (
        <div className={`${WIDTH} mt-10`}>
          <p className={`${CARD} px-5 py-4 text-[15px] text-theme-text`}>{c.fromPage(fromPage)}</p>
        </div>
      )}

      {/* ─── Figures: each one measured or counted from the data ─── */}
      <section className={`${WIDTH} mt-12`} aria-label={c.audience.title}>
        <ul className="grid grid-cols-2 lg:grid-cols-4 gap-3 list-none p-0 m-0">
          <Stat icon={Users} value={SPONSOR_AUDIENCE.monthlyVisitors} label={c.stats.visitors} source={`${SPONSOR_AUDIENCE.source}, ${SPONSOR_AUDIENCE.period}`} />
          <Stat icon={AppWindow} value={APP_COUNT} label={c.stats.apps} />
          <Stat icon={Keyboard} value={formatShortcutCount()} label={c.stats.shortcuts} />
          <Stat icon={LayoutList} value={stats.slotPages} label={c.stats.slot} />
        </ul>
      </section>

      <Section id="offer" title={c.offer.title}>
        <ul className="grid gap-3 sm:grid-cols-2 list-none p-0 m-0">
          {c.offer.items(stats).map(({ icon, title, text }) => {
            const Icon = OFFER_ICONS[icon]
            return (
              <li key={title} className={`${CARD} p-6`}>
                <Icon size={20} className="text-theme-text mb-4" aria-hidden="true" />
                <h3 className="text-[17px] font-semibold text-theme-text mb-1.5">{title}</h3>
                <p className="text-[15px] text-theme-muted leading-relaxed m-0">{text}</p>
              </li>
            )
          })}
        </ul>
      </Section>

      <CardPreview />

      <Section id="audience" title={c.audience.title}>
        <p className="text-[17px] text-theme-muted leading-relaxed max-w-[640px] mb-6">{c.audience.lead}</p>
        <ul className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-12 gap-2 list-none p-0 mb-3">
          {SPONSOR_PAGE_APPS.map((app) => (
            <li key={app.slug}>
              <Link
                to={`/${SPONSOR_MOCK.platform}/${app.slug}`}
                className="group flex flex-col items-center gap-1.5 rounded-xl p-2 min-h-[44px] no-underline hover:bg-theme-base-alt transition-colors"
              >
                <AppIcon slug={app.slug} displayName={app.name} size={40} className="w-10 h-10" />
                <span className="text-[11px] text-theme-muted group-hover:text-theme-text text-center leading-tight">{app.name}</span>
              </Link>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-theme-muted mb-6">{c.audience.moreApps(APP_COUNT - SPONSOR_PAGE_APPS.length)}</p>
        <p className="text-theme-muted leading-relaxed max-w-[640px] m-0">
          {hasIntroOffer ? c.audience.unknownWithOffer : c.audience.unknown}
        </p>
      </Section>

      <Section id="price" title={c.price.title}>
        <div className="grid gap-4 md:grid-cols-2 mb-5">
          <PriceCard
            kind="sitewide"
            name={c.price.sitewide.name}
            detail={c.price.sitewide.detail({ ...stats, ownPages: Object.keys(SPONSORS.byPath).length })}
            label={c.cta.sitewide(offer.sitewide.price)}
            offer={offer}
            open={sitewideOpen}
            strong
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
        {offer.page.price * 4 > offer.sitewide.price && (
          <p className="text-theme-text leading-relaxed mb-2">{c.price.compare}</p>
        )}
        <p className="text-theme-muted leading-relaxed mb-2">{c.price.terms}</p>
        {hasIntroOffer && (
          <p className="text-theme-muted leading-relaxed">{c.price.firstMonth(offer.firstMonthCode)}</p>
        )}
      </Section>

      <Section id="steps" title={c.steps.title}>
        <ol className="grid gap-3 md:grid-cols-3 list-none p-0 m-0">
          {steps.map((step, i) => {
            const Icon = STEP_ICONS[i] || CircleCheck
            return (
              <li key={step} className={`${CARD} p-6`}>
                <span className="flex items-center justify-between mb-4" aria-hidden="true">
                  <span className="keycap">{i + 1}</span>
                  <Icon size={20} className="text-theme-muted" />
                </span>
                <p className="text-[15px] text-theme-text leading-relaxed m-0">{step}</p>
              </li>
            )
          })}
        </ol>
      </Section>

      <Section id="rules" title={c.rules.title}>
        <ul className="grid gap-x-8 gap-y-3 md:grid-cols-2 list-none p-0 m-0">
          {c.rules.items.map((item) => (
            <li key={item} className="flex gap-3 text-[15px] text-theme-muted leading-relaxed">
              <CircleCheck size={18} className="text-theme-text shrink-0 mt-[3px]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="questions" title={c.faq.title}>
        <div className="space-y-2 max-w-[720px]">
          {c.faq.items({ ...stats, email: SPONSOR_EMAIL, days: offer.goLiveBusinessDays }).map(({ q, a }) => (
            <details
              key={q}
              className="group rounded-xl border border-theme-border overflow-hidden"
              onToggle={(e) => {
                if (e.currentTarget.open) trackEvent('faq_item_expanded', { question: q, location: 'sponsor_page' })
              }}
            >
              <summary className="focus-ring-inset flex items-center justify-between gap-4 px-5 min-h-[52px] py-3 cursor-pointer hover:bg-theme-base-alt transition-colors list-none [&::-webkit-details-marker]:hidden">
                <span className="text-[15px] font-medium text-theme-text">{q}</span>
                <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-theme-muted transition-transform group-open:rotate-180" />
              </summary>
              <p className="px-5 pb-4 m-0 text-[14px] text-theme-muted leading-relaxed">{a}</p>
            </details>
          ))}
        </div>
      </Section>

      {/* ─── Last word: a person to write to ─── */}
      <section className={`${WIDTH} mt-16`}>
        <div className="rounded-2xl bg-theme-accent text-theme-accent-text p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight mb-1">{c.closing.title}</h2>
            <p className="text-theme-accent-text/80 text-[15px] m-0">{c.closing.text}</p>
          </div>
          <a
            href={siteMailto({ topic: 'Sponsor question', page: '/sponsor' })}
            onClick={() => trackEvent('sponsor_contact_clicked', { location: 'sponsor_page' })}
            className={`${BUTTON} bg-theme-base text-theme-accent shrink-0`}
          >
            {c.contact(SPONSOR_EMAIL)}
          </a>
        </div>
      </section>
    </main>
  )
}

function Section({ id, title, children }) {
  return (
    <section id={id} className={`${WIDTH} mt-16 scroll-mt-20`}>
      <h2 className="text-2xl md:text-[28px] font-bold tracking-tight mb-6">{title}</h2>
      {children}
    </section>
  )
}

/**
 * One figure. The value, its label and its source are one paragraph: wherever
 * the visitor figure is read, its source and period are read with it.
 */
function Stat({ icon, value, label, source }) {
  const Icon = icon
  return (
    <li className={`${CARD} p-5`}>
      <Icon size={18} className="text-theme-muted mb-4" aria-hidden="true" />
      <p className="text-[28px] font-bold tracking-tight leading-none text-theme-text m-0">
        {value}
        <span className="block mt-2 text-[13px] font-normal tracking-normal leading-snug text-theme-muted">{label}</span>
        {source && (
          <span className="block text-[12px] font-normal tracking-normal leading-snug text-theme-muted">{source}</span>
        )}
      </p>
    </li>
  )
}

/**
 * A small app page with the card in its place: after the second group of
 * shortcuts. The shortcuts are real ones of that page (SPONSOR_MOCK).
 */
function SlotMock({ name, line }) {
  const sponsored = CONTENT.shared.adSlot.sponsoredLabel
  const row = ({ action, keys }) => (
    <li key={action} className="flex items-center justify-between gap-3 py-2 border-b border-theme-border">
      <span className="text-[13px] text-theme-text">{action}</span>
      <span className="flex gap-1">
        {keys.map((key, i) => <kbd key={i} className="keycap-mini">{key}</kbd>)}
      </span>
    </li>
  )

  return (
    <div className="isolate">
      <div className="screenshot-shadow rounded-[10px]">
        <div className="retro-window">
          <div className="retro-window-titlebar">
            <span className="retro-window-dot" />
            <span className="retro-window-dot" />
            <span className="retro-window-dot" />
            <span className="ml-2 font-mono text-[11px] text-theme-muted truncate">
              keyshortcut.com/{SPONSOR_MOCK.platform}/{SPONSOR_MOCK.slug}
            </span>
          </div>

          <div className="px-5 pt-4 pb-5">
            <div className="flex items-center gap-2.5 mb-3">
              <AppIcon slug={SPONSOR_MOCK.slug} displayName={SPONSOR_MOCK.name} size={28} className="w-7 h-7" loading="eager" />
              <span className="text-[15px] font-bold text-theme-text">
                {SPONSOR_MOCK.name} <span className="font-normal text-theme-muted">{CONTENT.shortcutPage.titleSuffix}</span>
              </span>
            </div>

            <p className="text-[12px] font-semibold text-theme-text pb-1.5 border-b border-theme-border m-0">{SPONSOR_MOCK.section}</p>
            <ul className="list-none p-0 m-0">{SPONSOR_MOCK.before.map(row)}</ul>

            <div className="py-4 text-center">
              <p className="text-[10px] uppercase tracking-widest text-theme-muted mb-2">{sponsored}</p>
              <div className="inline-block max-w-full rounded-2xl border-[1.5px] border-theme-accent bg-theme-base px-5 py-3 text-left shadow-[3px_3px_0_var(--theme-accent)]">
                <span className="block text-[14px] font-semibold text-theme-text break-words">{name}</span>
                <span className="block text-[12px] text-theme-muted mt-0.5 break-words">{line}</span>
              </div>
            </div>

            <ul className="list-none p-0 m-0 opacity-50">{SPONSOR_MOCK.after.map(row)}</ul>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * "Try your card": the visitor types a name and a line and sees the card in a
 * list. Nothing is sent or kept; the text lives in this component only.
 */
function CardPreview() {
  const c = CONTENT.sponsorPage.preview
  const [name, setName] = useState('')
  const [line, setLine] = useState('')
  const counted = useRef(false)

  const typed = (set) => (event) => {
    set(event.target.value)
    if (!counted.current) {
      counted.current = true
      trackEvent('sponsor_preview_used', { location: 'sponsor_page' })
    }
  }

  const FIELD = 'w-full h-11 px-3.5 rounded-xl bg-theme-surface border text-base sm:text-[15px] text-theme-text outline-none focus-visible:ring-2 focus-visible:ring-theme-border-hover/30'

  return (
    <section id="preview" className={`${WIDTH} mt-16 scroll-mt-20`}>
      <div className={`${CARD} p-6 md:p-10 grid gap-8 lg:grid-cols-[1fr_minmax(0,400px)] lg:items-center`}>
        <div>
          <h2 className="text-2xl md:text-[28px] font-bold tracking-tight mb-2">{c.title}</h2>
          <p className="text-theme-muted leading-relaxed mb-6">{c.lead}</p>

          <label className="block mb-4">
            <span className="block text-[13px] font-medium text-theme-text mb-1.5">{c.nameLabel}</span>
            <input
              type="text"
              name="sponsor-name"
              autoComplete="off"
              maxLength={40}
              value={name}
              onChange={typed(setName)}
              placeholder={c.nameDefault}
              className={FIELD}
            />
          </label>
          <label className="block mb-4">
            <span className="block text-[13px] font-medium text-theme-text mb-1.5">{c.lineLabel}</span>
            <input
              type="text"
              name="sponsor-line"
              autoComplete="off"
              maxLength={80}
              value={line}
              onChange={typed(setLine)}
              placeholder={c.lineDefault}
              className={FIELD}
            />
          </label>
          <p className="text-[12px] text-theme-muted m-0">{c.note}</p>
        </div>

        <div aria-live="polite">
          <SlotMock name={name.trim() || c.nameDefault} line={line.trim() || c.lineDefault} />
        </div>
      </div>
    </section>
  )
}

function PriceCard({ kind, name, detail, label, offer, pagePath = null, open, strong = false }) {
  const c = CONTENT.sponsorPage
  const price = offer[kind].price
  const cardUrl = paymentUrl(kind, pagePath, offer)
  const href = cardUrl || bookingMailto(kind, pagePath, offer)
  const newTab = cardUrl ? { target: '_blank', rel: 'noopener noreferrer' } : {}

  return (
    <div className={`rounded-2xl bg-theme-base-alt p-6 md:p-8 flex flex-col ${strong ? 'border-[1.5px] border-theme-accent shadow-[4px_4px_0_var(--theme-accent)]' : 'border border-theme-border'}`}>
      <h3 className="text-[17px] font-semibold text-theme-text mb-2">{name}</h3>
      <p className="mb-3">
        <span className="text-4xl font-bold tracking-tight text-theme-text">${price}</span>
        <span className="text-theme-muted"> {c.price.perMonth}</span>
      </p>
      <p className="text-[14px] text-theme-muted leading-relaxed mb-6">{detail}</p>

      {open ? (
        <>
          <a
            href={href}
            {...newTab}
            onClick={() => trackEvent('sponsor_book_clicked', { option: kind, method: cardUrl ? 'card' : 'email', page: pagePath || '' })}
            className={`mt-auto ${BUTTON} py-3 text-center bg-theme-accent text-theme-accent-text`}
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
