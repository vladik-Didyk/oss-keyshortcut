// Cloudflare Pages Function — returns the user's country code from CF headers.
// Used by CookieConsent to show the reject option, and to wait for Google's
// consent message, in the regions that message covers (EEA, UK, Switzerland).

const GDPR_COUNTRIES = new Set([
  // EU member states
  'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
  'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
  'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE',
  // EEA (non-EU)
  'IS', 'LI', 'NO',
  // UK (UK GDPR)
  'GB',
  // Switzerland (FADP). Google's certified consent message covers EEA + UK + CH,
  // so the cookie banner must treat CH the same way.
  'CH',
])

export function onRequestGet({ request }) {
  const country = request.cf?.country || ''
  const gdpr = GDPR_COUNTRIES.has(country)

  return new Response(JSON.stringify({ country, gdpr }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
    },
  })
}
