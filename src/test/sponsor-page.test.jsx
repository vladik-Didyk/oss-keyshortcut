import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
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

  it('prints the visitor figure together with its source and period', () => {
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    const line = screen.getByText(new RegExp(SPONSOR_AUDIENCE.monthlyVisitors.replace('+', '\\+')))
    expect(line).toHaveTextContent(SPONSOR_AUDIENCE.source)
    expect(line).toHaveTextContent(SPONSOR_AUDIENCE.period)
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
    expect(screen.getByText(/live within 2 business days/)).toBeInTheDocument()
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

  it('lists what is refused', () => {
    renderPage({ offer: NO_LINKS, sitewideOpen: true })
    const rules = screen.getByRole('heading', { name: CONTENT.sponsorPage.rules.title }).parentElement
    expect(within(rules).getByText(/gambling, crypto, adult content/)).toBeInTheDocument()
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
