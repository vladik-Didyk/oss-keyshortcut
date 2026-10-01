/**
 * Email links of the site. A message written from the site is recognisable in
 * the inbox: its subject starts with MAIL_TAG, and its last line names the page
 * it was written from. In Gmail, the search subject:"[KeyShortcut]" finds them.
 *
 * public/privacy.html is a static file: its links carry the same tag, typed in.
 */
import { SUPPORT_EMAIL } from '../data/siteConfig'
import { pageUrl } from './siteUrl'

export const MAIL_TAG = '[KeyShortcut]'

/**
 * mailto: link to the site's address.
 *   topic  what the message is about ("App suggestion"); it follows the tag in the subject
 *   page   path of the page the link is on ("/about")
 *   body   text the visitor starts with; the line that names the page comes under it
 */
export function siteMailto({ topic, page, body = '' }) {
  const { subject, text } = parts({ topic, page, body })
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
}

/**
 * The same message as a Gmail compose window, for a visitor whose computer
 * has no mail app set up: a mailto: link then opens nothing, or a mail app
 * they never use. Same arguments as siteMailto().
 */
export function siteGmail({ topic, page, body = '' }) {
  const { subject, text } = parts({ topic, page, body })
  const params = new URLSearchParams({ view: 'cm', fs: '1', to: SUPPORT_EMAIL, su: subject, body: text })
  return `https://mail.google.com/mail/?${params}`
}

function parts({ topic, page, body }) {
  return { subject: `${MAIL_TAG} ${topic}`, text: `${body}\n\n--\nSent from ${pageUrl(page)}` }
}
