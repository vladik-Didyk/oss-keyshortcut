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

export const SPONSORS = {
  // One sponsor on every app page. null = none.
  sitewide: null,
  // Page-specific sponsors, keyed by path: '/macos/figma': { ... }. Wins over sitewide.
  byPath: {},
}

export const SPONSOR_EMAIL = SUPPORT_EMAIL

/** Sponsor for a page path, or null. */
export function getSponsor(pathname) {
  return SPONSORS.byPath[pathname] || SPONSORS.sitewide || null
}

/** mailto: link for the "Sponsor this page" call to action. */
export function sponsorMailto(pathname, appName) {
  const subject = `Sponsor keyshortcut.com${pathname}`
  const body = `Hi, I'd like to sponsor the ${appName} shortcuts page (https://keyshortcut.com${pathname}).`
  return `mailto:${SPONSOR_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
}
