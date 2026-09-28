// Voluntary support from visitors.
//
// SUPPORT_LINK: a Stripe Payment Link where the visitor chooses the amount
// ("Customers choose what to pay"), created by the site owner in the Stripe
// dashboard. Empty = nothing renders anywhere on the site.
export const SUPPORT_LINK = ''

/** The link, or null when it is unset or not https. */
export function getSupportLink(link = SUPPORT_LINK) {
  return typeof link === 'string' && link.startsWith('https://') ? link : null
}
