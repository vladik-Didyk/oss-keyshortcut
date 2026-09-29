import { describe, it, expect } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { readFileSync } from 'fs'
import { join } from 'path'
import SponsorPage from '../components/SponsorPage'
import SupportLink from '../components/SupportLink'
import Footer from '../components/Footer'
import { CONTENT } from '../data/content'
import {
  SPONSORS,
  SPONSOR_OFFER,
  SPONSOR_AUDIENCE,
  SPONSOR_EMAIL,
  SPONSOR_PAGE_APPS,
  SPONSOR_MOCK,
  MIN_SECTIONS_FOR_SLOT,
  isSitewideOpen,
  isAppPagePath,
  sponsorPageLink,
  bookingReference,
  paymentUrl,
  bookingMailto,
} from '../data/sponsors'
import { SUPPORT_LINK, getSupportLink } from '../data/support'
import { countSponsorPages } from '../utils/sponsorStats'

const ROOT = process.cwd()
const read = (path) => readFileSync(join(ROOT, path), 'utf-8')
const readPlatform = (id) => JSON.parse(read(`public/data/platforms/${id}.json`))

const STATS = { appPages: 171, slotPages: 152 }
const WITH_LINKS = {
  sitewide: { price: 99, paymentLink: 'https://buy.stripe.com/test_sitewide' },
  page: { price: 29, paymentLink: 'https://buy.stripe.com/test_page' },
  firstMonthCode: 'FIRST50',
  goLiveBusinessDays: 2,
}
const NO_LINKS = {
  sitewide: { price: 99, paymentLink: '' },
  page: { price: 29, paymentLink: '' },
  firstMonthCode: '',
  goLiveBusinessDays: 2,
}

const renderPage = (props) =>
  render(
    <MemoryRouter>
      <SponsorPage stats={STATS} {...props} />
    </MemoryRouter>,
  )

describe('sponsor offer config', () => {
  it('has whole-dollar prices, the page cheaper than the site', () => {
    for (const kind of ['sitewide', 'page']) {
      expect(Number.isInteger(SPONSOR_OFFER[kind].price)).toBe(true)
      expect(SPONSOR_OFFER[kind].price).toBeGreaterThan(0)
    }
    expect(SPONSOR_OFFER.page.price).toBeLessThan(SPONSOR_OFFER.sitewide.price)
  })

  it('holds only empty or https payment links', () => {
    for (const kind of ['sitewide', 'page']) {
      expect(SPONSOR_OFFER[kind].paymentLink).toMatch(/^(https:\/\/\S+)?$/)
    }
  })

  it('holds a promotion code Stripe can accept, or none', () => {
    expect(SPONSOR_OFFER.firstMonthCode).toMatch(/^[A-Za-z0-9_-]{0,40}$/)
  })

  it('states the audience figure with its source and period', () => {
    expect(SPONSOR_AUDIENCE.monthlyVisitors).toBeTruthy()
    expect(SPONSOR_AUDIENCE.source).toBeTruthy()
    expect(SPONSOR_AUDIENCE.period).toMatch(/\b20\d\d\b/)
  })

  it('reports the sitewide slot as open only while it is empty', () => {
    expect(isSitewideOpen({ sitewide: null, byPath: {} })).toBe(true)
    expect(isSitewideOpen({ sitewide: { name: 'Acme', url: 'https://acme.test' }, byPath: {} })).toBe(false)
    expect(isSitewideOpen()).toBe(SPONSORS.sitewide === null)
  })
})

describe('app page paths', () => {
  it('accepts the shape of an app page', () => {
    for (const path of ['/macos/figma', '/windows/vscode', '/linux/sublime-text', '/macos/1password']) {
      expect(isAppPagePath(path)).toBe(true)
    }
  })

  it('rejects everything else', () => {
    for (const value of [
      null, undefined, '', 42, '/', '/macos', '/macos/', 'macos/figma', '//evil.test/x',
      '/macos/figma/extra', '/macos/figma?x=1', '/macos/Figma', '/macos/fig ma',
      'javascript:alert(1)', 'https://evil.test/a/b', '/macos/<script>', '/../etc',
    ]) {
      expect(isAppPagePath(value)).toBe(false)
    }
  })

  it('accepts every real app page on the site', () => {
    for (const platform of ['macos', 'windows', 'linux']) {
      for (const app of readPlatform(platform).apps) {
        expect(isAppPagePath(`/${platform}/${app.slug}`)).toBe(true)
      }
    }
  })

  it('links an app page to the offer, and drops a bad path', () => {
    expect(sponsorPageLink('/macos/figma')).toBe('/sponsor?page=%2Fmacos%2Ffigma')
    expect(sponsorPageLink('javascript:alert(1)')).toBe('/sponsor')
    expect(sponsorPageLink(undefined)).toBe('/sponsor')
  })
})

describe('booking', () => {
  it('builds a reference from letters, digits, dashes and underscores only', () => {
    expect(bookingReference('sitewide')).toBe('ks-sitewide')
    expect(bookingReference('page', '/macos/figma')).toBe('ks-page-macos-figma')
    expect(bookingReference('page', 'javascript:alert(1)')).toBe('ks-page')
    expect(bookingReference('page')).toBe('ks-page')
    for (const ref of [bookingReference('sitewide'), bookingReference('page', '/linux/sublime-text')]) {
      expect(ref).toMatch(/^[A-Za-z0-9_-]{1,200}$/)
    }
  })

  it('returns no payment URL when the link is empty or not https', () => {
    expect(paymentUrl('sitewide', null, NO_LINKS)).toBeNull()
    expect(paymentUrl('page', '/macos/figma', NO_LINKS)).toBeNull()
    const insecure = { ...NO_LINKS, sitewide: { price: 99, paymentLink: 'http://buy.stripe.com/x' } }
    expect(paymentUrl('sitewide', null, insecure)).toBeNull()
  })

  it('adds the reference and the promotion code to the payment URL', () => {
    const url = new URL(paymentUrl('page', '/macos/figma', WITH_LINKS))
    expect(url.origin + url.pathname).toBe('https://buy.stripe.com/test_page')
    expect(url.searchParams.get('client_reference_id')).toBe('ks-page-macos-figma')
    expect(url.searchParams.get('prefilled_promo_code')).toBe('FIRST50')
  })

  it('leaves the promotion code out when there is none', () => {
    const url = new URL(paymentUrl('sitewide', null, { ...WITH_LINKS, firstMonthCode: '' }))
    expect(url.searchParams.has('prefilled_promo_code')).toBe(false)
    expect(url.searchParams.get('client_reference_id')).toBe('ks-sitewide')
  })

  it('writes a booking email that names the option, the price and the page', () => {
    const href = bookingMailto('page', '/macos/figma', NO_LINKS)
    expect(href.startsWith(`mailto:${SPONSOR_EMAIL}?`)).toBe(true)
    const body = decodeURIComponent(href.split('body=')[1])
    expect(body).toContain('https://keyshortcut.com/macos/figma')
    expect(body).toContain('$29 a month')
    expect(decodeURIComponent(bookingMailto('sitewide', null, NO_LINKS))).toContain('$99 a month')
  })
})

describe('sponsor page counts', () => {
  it('counts app pages and the ones long enough for the slot', () => {
    const three = { sections: [{}, {}, {}] }
    const two = { sections: [{}, {}] }
    expect(countSponsorPages([[three, two], [three], [{}]])).toEqual({ appPages: 4, slotPages: 2 })
    expect(countSponsorPages([])).toEqual({ appPages: 0, slotPages: 0 })
  })

  it('matches the rule the app page uses to show the slot', () => {
    expect(read('src/components/ShortcutPage.jsx')).toContain('filteredSections.length >= MIN_SECTIONS_FOR_SLOT')
    expect(MIN_SECTIONS_FOR_SLOT).toBe(3)
  })

  it('finds slot pages in the real data, and never more than there are app pages', () => {
    const real = countSponsorPages(['macos', 'windows', 'linux'].map((p) => readPlatform(p).apps))
    expect(real.appPages).toBeGreaterThan(100)
    expect(real.slotPages).toBeGreaterThan(0)
    expect(real.slotPages).toBeLessThanOrEqual(real.appPages)
  })
})

describe('SponsorPage', () => {
  it('shows the title, both prices and the page counts', () => {
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    expect(screen.getByRole('heading', { level: 1, name: CONTENT.sponsorPage.title })).toBeInTheDocument()
    expect(screen.getByText('$99')).toBeInTheDocument()
    expect(screen.getByText('$29')).toBeInTheDocument()
    expect(screen.getByText(/on 152 of the 171 app pages/)).toBeInTheDocument()
  })

  it('says that a one-page booking is for a page that holds the slot', () => {
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    expect(screen.getByText(CONTENT.sponsorPage.price.page.detail(STATS))).toHaveTextContent('from the 152 that hold the slot')
    expect(screen.getByText(CONTENT.sponsorPage.price.sitewide.detail(STATS))).toHaveTextContent('Today that is all 152.')
  })

  it('promises the whole site only the pages without a sponsor of their own', () => {
    const { detail } = CONTENT.sponsorPage.price.sitewide
    expect(detail(STATS)).toContain('has no sponsor of its own')
    expect(detail({ ...STATS, ownPages: 2 })).toContain('Today that is 150 of 152.')
    expect(detail(STATS)).not.toMatch(/on all \d+ app pages/)
  })

  it('prints the visitor figure together with its source and period', () => {
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    // Wherever the figure appears, its source and period appear with it.
    const lines = screen.getAllByText(new RegExp(SPONSOR_AUDIENCE.monthlyVisitors.replace('+', '\\+')))
    expect(lines.length).toBeGreaterThanOrEqual(1)
    for (const line of lines) {
      expect(line).toHaveTextContent(SPONSOR_AUDIENCE.source)
      expect(line).toHaveTextContent(SPONSOR_AUDIENCE.period)
    }
  })

  it('says that click numbers are not known yet', () => {
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    expect(screen.getByText(CONTENT.sponsorPage.audience.unknown)).toBeInTheDocument()
  })

  it('states no pageview, click-rate or income figure', () => {
    const { container } = renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    expect(container.textContent).not.toMatch(/pageviews?|impressions|click-through|CTR|\bROI\b/i)
  })

  it('books by email while there are no payment links', () => {
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    const sitewide = screen.getByRole('link', { name: CONTENT.sponsorPage.cta.sitewide(99) })
    const page = screen.getByRole('link', { name: CONTENT.sponsorPage.cta.page(29) })
    expect(sitewide.getAttribute('href')).toMatch(/^mailto:/)
    expect(page.getAttribute('href')).toMatch(/^mailto:/)
    expect(screen.getAllByText(CONTENT.sponsorPage.cta.byEmailNote)).toHaveLength(2)
    expect(screen.getByText(CONTENT.sponsorPage.steps.byEmail({ email: SPONSOR_EMAIL })[1])).toBeInTheDocument()
  })

  it('books by card once the payment links are set', () => {
    renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    const sitewide = screen.getByRole('link', { name: CONTENT.sponsorPage.cta.sitewide(99) })
    expect(sitewide.getAttribute('href')).toContain('https://buy.stripe.com/test_sitewide')
    expect(sitewide.getAttribute('href')).toContain('client_reference_id=ks-sitewide')
    expect(sitewide).toHaveAttribute('target', '_blank')
    expect(sitewide.getAttribute('rel')).toContain('noopener')
    expect(screen.queryByText(CONTENT.sponsorPage.cta.byEmailNote)).not.toBeInTheDocument()
    expect(screen.getByText(CONTENT.sponsorPage.steps.items({ email: SPONSOR_EMAIL, days: 2 })[2])).toBeInTheDocument()
  })

  it('shows the half-price line only when a promotion code is set', () => {
    const { unmount } = renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    expect(screen.getByText(CONTENT.sponsorPage.price.firstMonth('FIRST50'))).toBeInTheDocument()
    expect(screen.getByText(CONTENT.sponsorPage.audience.unknownWithOffer)).toBeInTheDocument()
    unmount()
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    expect(screen.queryByText(/half price/)).not.toBeInTheDocument()
  })

  it('offers no sitewide button while the slot is taken', () => {
    renderPage({ offer: WITH_LINKS, sitewideOpen: false })
    expect(screen.queryByRole('link', { name: CONTENT.sponsorPage.cta.sitewide(99) })).not.toBeInTheDocument()
    expect(screen.getByText(CONTENT.sponsorPage.price.taken)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: CONTENT.sponsorPage.cta.page(29) })).toBeInTheDocument()
  })

  it('answers the questions a sponsor asks, in plain words', () => {
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    const items = CONTENT.sponsorPage.faq.items({ ...STATS, email: SPONSOR_EMAIL, days: 2 })
    expect(items.length).toBeGreaterThanOrEqual(6)
    for (const { q, a } of items) {
      expect(q.endsWith('?')).toBe(true)
      expect(screen.getByText(q)).toBeInTheDocument()
      expect(screen.getByText(a)).toBeInTheDocument()
      expect(a.length).toBeLessThan(420)
    }
  })

  it('admits that the click rate is not known', () => {
    const clicks = CONTENT.sponsorPage.faq
      .items({ ...STATS, email: SPONSOR_EMAIL, days: 2 })
      .find((item) => item.q.includes('click'))
    expect(clicks.a.startsWith('I don\u2019t know yet.')).toBe(true)
    expect(clicks.a).toContain(SPONSOR_AUDIENCE.source)
    expect(clicks.a).toContain(SPONSOR_AUDIENCE.period)
  })

  it('lists what is refused', () => {
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    const rules = screen.getByRole('heading', { name: CONTENT.sponsorPage.rules.title }).parentElement
    expect(within(rules).getByText(/gambling, crypto, adult content/)).toBeInTheDocument()
  })
})

describe('SponsorPage: what it shows', () => {
  const c = CONTENT.sponsorPage
  const macApps = readPlatform('macos').apps

  it('the buttons at the top lead down to the prices and to the preview', () => {
    const { container } = renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    for (const [label, target] of [[c.heroCta.prices, 'price'], [c.heroCta.preview, 'preview']]) {
      expect(screen.getByRole('link', { name: label })).toHaveAttribute('href', `#${target}`)
      expect(container.querySelector(`#${target}`)).not.toBeNull()
    }
  })

  it('has each booking button once: in its price card', () => {
    renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    expect(screen.getAllByRole('link', { name: /^Book / })).toHaveLength(2)
  })

  it('draws the card in a list of real shortcuts of a real page', () => {
    const app = macApps.find((a) => a.slug === SPONSOR_MOCK.slug)
    expect(app.displayName).toBe(SPONSOR_MOCK.name)
    const section = app.sections.find((s) => s.name === SPONSOR_MOCK.section)
    const inData = section.shortcuts.map((sc) => `${sc.action}: ${[...(sc.modifiers || []), sc.key].join(' ')}`)
    for (const { action, keys } of [...SPONSOR_MOCK.before, ...SPONSOR_MOCK.after]) {
      expect(inData).toContain(`${action}: ${keys.join(' ')}`)
    }
  })

  it('shows apps that are on the site, each a link to its page', () => {
    renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    expect(SPONSOR_PAGE_APPS.length).toBeGreaterThanOrEqual(8)
    for (const { slug, name } of SPONSOR_PAGE_APPS) {
      expect(macApps.find((a) => a.slug === slug)?.displayName, slug).toBe(name)
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', `/macos/${slug}`)
    }
  })

  it('the card in the preview carries what the visitor types, and the default when the field is empty', () => {
    renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    const preview = screen.getByRole('heading', { name: c.preview.title }).closest('section')
    const name = within(preview).getByLabelText(c.preview.nameLabel)
    const line = within(preview).getByLabelText(c.preview.lineLabel)

    expect(within(preview).getByText(c.preview.nameDefault)).toBeInTheDocument()
    fireEvent.change(name, { target: { value: 'Acme Fonts' } })
    fireEvent.change(line, { target: { value: 'Typefaces for interface design.' } })
    expect(within(preview).getByText('Acme Fonts')).toBeInTheDocument()
    expect(within(preview).getByText('Typefaces for interface design.')).toBeInTheDocument()
    expect(within(preview).queryByText(c.preview.nameDefault)).not.toBeInTheDocument()

    fireEvent.change(name, { target: { value: '   ' } })
    expect(within(preview).getByText(c.preview.nameDefault)).toBeInTheDocument()
  })

  it('keeps what is typed short, and says that it goes nowhere', () => {
    renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    expect(screen.getByLabelText(c.preview.nameLabel)).toHaveAttribute('maxlength', '40')
    expect(screen.getByLabelText(c.preview.lineLabel)).toHaveAttribute('maxlength', '80')
    expect(screen.getByText(c.preview.note)).toBeInTheDocument()
    expect(read('src/components/SponsorPage.jsx')).not.toMatch(/fetch\(|localStorage|sessionStorage/)
  })

  it('says the whole site costs less than four pages only while that is true', () => {
    renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    expect(screen.getByText(c.price.compare)).toBeInTheDocument()
    const dear = { ...WITH_LINKS, sitewide: { ...WITH_LINKS.sitewide, price: 200 } }
    renderPage({ offer: dear, sitewideOpen: true })
    expect(screen.getAllByText(c.price.compare)).toHaveLength(1)
  })

  it('every answer is in the page before any click', () => {
    const { container } = renderPage({ offer: WITH_LINKS, sitewideOpen: true })
    const items = c.faq.items({ ...STATS, email: SPONSOR_EMAIL, days: 2 })
    expect(container.querySelectorAll('details')).toHaveLength(items.length)
    for (const details of container.querySelectorAll('details')) expect(details.open).toBe(false)
  })
})

describe('sponsor page in search results', () => {
  const { title, description } = CONTENT.meta.sponsor

  it('has a title and a description that fit', () => {
    expect(title.length).toBeLessThanOrEqual(60)
    expect(description.length).toBeGreaterThanOrEqual(110)
    expect(description.length).toBeLessThanOrEqual(160)
    expect(title).toMatch(/Sponsor/)
    expect(description).toContain(`$${SPONSOR_OFFER.page.price}`)
  })

  it('leaves the visitor figure out: there is no room for its source and period', () => {
    const figure = SPONSOR_AUDIENCE.monthlyVisitors
    expect(title).not.toContain(figure)
    expect(description).not.toContain(figure)
  })
})

describe('SupportLink', () => {
  it('renders nothing without a link', () => {
    const { container } = render(<SupportLink location="test" link="">Support</SupportLink>)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing for a link that is not https', () => {
    const { container } = render(<SupportLink location="test" link="javascript:alert(1)">Support</SupportLink>)
    expect(container).toBeEmptyDOMElement()
    expect(getSupportLink('http://donate.test')).toBeNull()
  })

  it('opens the payment page in a new tab when set', () => {
    render(<SupportLink location="test" link="https://buy.stripe.com/test_support">Support this site</SupportLink>)
    const link = screen.getByRole('link', { name: 'Support this site' })
    expect(link).toHaveAttribute('href', 'https://buy.stripe.com/test_support')
    expect(link.getAttribute('rel')).toContain('noopener')
  })

  it('ships with an empty or https link', () => {
    expect(SUPPORT_LINK).toMatch(/^(https:\/\/\S+)?$/)
  })
})

describe('site wiring', () => {
  it('registers the /sponsor route, pre-renders it and lists it in the sitemap', () => {
    expect(read('src/routes.ts')).toContain('route("sponsor", "./routes/sponsor.jsx")')
    expect(read('react-router.config.ts')).toContain('"/sponsor"')
    expect(read('scripts/generate-sitemap.mjs')).toContain("loc: '/sponsor'")
  })

  it('links to /sponsor from the footer', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    )
    expect(screen.getByRole('link', { name: 'Sponsor' })).toHaveAttribute('href', '/sponsor')
  })

  it('names Stripe in both copies of the privacy policy', () => {
    const inContent = CONTENT.privacy.policy.sections.some((s) =>
      (s.content || []).some((block) => typeof block.text === 'string' && block.text.includes('handled by Stripe')),
    )
    expect(inContent).toBe(true)
    expect(read('public/privacy.html')).toContain('handled by Stripe')
  })
})
