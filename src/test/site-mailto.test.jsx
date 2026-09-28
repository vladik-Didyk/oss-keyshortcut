import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'
import { MAIL_TAG, siteMailto } from '../utils/siteMailto'
import { SUPPORT_EMAIL } from '../data/siteConfig'
import { bookingMailto, sponsorMailto } from '../data/sponsors'
import { CONTENT } from '../data/content'
import { pageUrl } from '../utils/siteUrl'

// A message written from the site shows where it comes from: the tag opens
// its subject, and the last line names the page.
const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')
const parts = (href) => {
  const url = new URL(href)
  return { to: url.pathname, subject: url.searchParams.get('subject'), body: url.searchParams.get('body') }
}

const filesUnder = (dir) =>
  readdirSync(join(process.cwd(), dir)).flatMap((name) => {
    const path = join(dir, name)
    return statSync(join(process.cwd(), path)).isDirectory() ? filesUnder(path) : [path]
  })

describe('email links of the site', () => {
  it('open the subject with the tag and close the body with the page', () => {
    const { to, subject, body } = parts(siteMailto({ topic: 'App suggestion', page: '/about', body: 'App:' }))
    expect(to).toBe(SUPPORT_EMAIL)
    expect(subject).toBe(`${MAIL_TAG} App suggestion`)
    expect(body.startsWith('App:')).toBe(true)
    expect(body.endsWith('Sent from https://keyshortcut.com/about/')).toBe(true)
  })

  it('leave room to write above the page line when there is no text', () => {
    expect(parts(siteMailto({ topic: 'Sponsor question', page: '/sponsor' })).body).toBe('\n\n--\nSent from https://keyshortcut.com/sponsor/')
  })

  it('every link built in the code carries the tag', () => {
    const links = [
      bookingMailto('page', '/macos/figma', { page: { price: 29 }, sitewide: { price: 99 } }),
      bookingMailto('sitewide', null, { page: { price: 29 }, sitewide: { price: 99 } }),
      sponsorMailto('/macos/figma', 'Figma'),
      CONTENT.about.cards.missing.buttonHref,
    ]
    for (const href of links) expect(parts(href).subject.startsWith(`${MAIL_TAG} `), href).toBe(true)
  })

  it('every contact block of the privacy page names its topic', () => {
    const blocks = JSON.stringify(CONTENT.privacy).match(/"type":"contact"[^}]*/g) || []
    expect(blocks.length).toBeGreaterThanOrEqual(4)
    for (const block of blocks) expect(block).toMatch(/"topic":"[A-Z]/)
  })

  it('no file writes a mailto: link by hand', () => {
    const byHand = [...filesUnder('src/components'), ...filesUnder('src/routes'), ...filesUnder('src/data'), ...filesUnder('src/layouts')]
      .filter((file) => /\.(js|jsx|ts)$/.test(file))
      // A link in code starts a string; a comment that names mailto: does not.
      .filter((file) => /[`'"]mailto:/.test(read(file)))
    expect(byHand, 'use siteMailto() from src/utils/siteMailto.js').toEqual([])
  })

  it('the static privacy page carries the tag too', () => {
    const links = read('public/privacy.html').match(/href="mailto:[^"]*"/g) || []
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      const { to, subject, body } = parts(link.slice(6, -1).replace(/&amp;/g, '&'))
      expect(to).toBe(SUPPORT_EMAIL)
      expect(subject.startsWith(`${MAIL_TAG} `), link).toBe(true)
      expect(body.endsWith(`Sent from ${pageUrl('/privacy')}`)).toBe(true)
    }
  })
})
