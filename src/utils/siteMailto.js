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
  const subject = `${MAIL_TAG} ${topic}`
  const text = `${body}\n\n--\nSent from ${pageUrl(page)}`
  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`
}
