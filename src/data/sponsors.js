// Direct sponsors: slots sold by you, not by Google. On an app page, a sponsor
// takes the place of the mid-page AdSense unit (AdSlot's sponsor mode).
//
// Sponsor shape: { name, url, tagline?, image?, alt? }
// - url: the sponsor's link; add ?ref=keyshortcut so they can see the clicks.
// - image: optional banner (max 96px tall). Put the file in
//   public/images/sponsors/ — the site's CSP blocks images from other domains.
//   Without an image, the name and tagline render as a text card.
//
// Example: sitewide: { name: 'Acme', url: 'https://acme.com/?ref=keyshortcut', tagline: 'Short line' }

import { SUPPORT_EMAIL } from './siteConfig'
import { pageUrl } from '../utils/siteUrl'
import { siteMailto } from '../utils/siteMailto'

export const SPONSORS = {
  // One sponsor on every app page. null = none.
  sitewide: null,
  // Page-specific sponsors, keyed by path: '/macos/figma': { ... }. Wins over sitewide.
  byPath: {},
}

// The public offer on /sponsor. Prices are in USD per month.
//
// paymentLink: a Stripe Payment Link (a monthly subscription) that the site
//   owner creates in the Stripe dashboard. Empty = /sponsor offers "book by
//   email" for that option, so the page can ship before the links exist.
// firstMonthCode: a Stripe promotion code for 50% off the first month. The
//   Payment Link must have "Allow promotion codes" switched on. Empty = the
//   half-price line is not shown.
// goLiveBusinessDays: the promise on the page. Keep it one you can meet.
export const SPONSOR_OFFER = {
  sitewide: { price: 99, paymentLink: 'https://buy.stripe.com/5kQ8wQ3IfaQA01EbX4abK02' },
  // This link asks the buyer which app page, in a field of its own.
  page: { price: 29, paymentLink: 'https://buy.stripe.com/cNiaEY0w32k4bKm6CKabK03' },
  firstMonthCode: '',
  goLiveBusinessDays: 2,
}

// The one audience figure the page may state. It must be a measured number with
// its source and period; the page prints all three together. Update all three
// at once, or not at all.
export const SPONSOR_AUDIENCE = {
  monthlyVisitors: '9,000+',
  source: 'Cloudflare',
  period: 'August 2026',
}

// A sponsor card sits after the second section, so a page needs three or more.
// ShortcutPage.jsx applies the same rule when it renders the slot.
export const MIN_SECTIONS_FOR_SLOT = 3

export const SPONSOR_EMAIL = SUPPORT_EMAIL

/** Sponsor for a page path, or null. */
export function getSponsor(pathname) {
  return SPONSORS.byPath[pathname] || SPONSORS.sitewide || null
}

/** True while nobody holds the sitewide slot. */
export function isSitewideOpen(sponsors = SPONSORS) {
  return sponsors.sitewide === null
}

/** mailto: link for the "Sponsor this page" call to action. */
export function sponsorMailto(pathname, appName) {
  return siteMailto({
    topic: `Sponsor: ${pathname}`,
    page: pathname,
    body: `Hi, I'd like to sponsor the ${appName} shortcuts page (${pageUrl(pathname)}).`,
  })
}

/**
 * True for a path shaped like an app page: "/macos/figma".
 * /sponsor reads ?page= from the URL, so anything else is ignored.
 */
export function isAppPagePath(value) {
  return typeof value === 'string' && /^\/[a-z0-9-]{1,40}\/[a-z0-9-]{1,80}$/.test(value)
}

/** Link from an app page to the offer, carrying the page it came from. */
export function sponsorPageLink(pathname) {
  return isAppPagePath(pathname) ? `/sponsor?page=${encodeURIComponent(pathname)}` : '/sponsor'
}

/**
 * Reference sent to Stripe with a booking, so a payment can be matched to the
 * slot. Stripe accepts letters, digits, dashes and underscores.
 * "ks-sitewide", or "ks-page-macos-figma".
 */
export function bookingReference(kind, pathname) {
  if (kind === 'page' && isAppPagePath(pathname)) {
    return `ks-page-${pathname.slice(1).replace('/', '-')}`
  }
  return kind === 'page' ? 'ks-page' : 'ks-sitewide'
}

/** Stripe payment URL for an option, or null when no link is set. */
export function paymentUrl(kind, pathname, offer = SPONSOR_OFFER) {
  const link = offer[kind]?.paymentLink
  if (!link || !link.startsWith('https://')) return null
  const url = new URL(link)
  url.searchParams.set('client_reference_id', bookingReference(kind, pathname))
  if (offer.firstMonthCode) url.searchParams.set('prefilled_promo_code', offer.firstMonthCode)
  return url.toString()
}

/** mailto: link used when an option has no payment link yet. */
export function bookingMailto(kind, pathname, offer = SPONSOR_OFFER) {
  const price = offer[kind]?.price
  const what = kind === 'page'
    ? (isAppPagePath(pathname) ? `the page ${pageUrl(pathname)}` : 'one app page')
    : 'the sitewide slot'
  return siteMailto({
    topic: `Sponsor: ${kind === 'page' ? 'one page' : 'whole site'}`,
    page: '/sponsor',
    body: `Hi, I'd like to book ${what} at $${price} a month.\n\nName on the card:\nOne line of text:\nLink:\n`,
  })
}
