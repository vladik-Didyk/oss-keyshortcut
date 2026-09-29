import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { SITE_VERIFICATION, siteVerificationMeta } from '../data/siteConfig'
import * as home from '../routes/home'
import * as about from '../routes/about'
import * as sponsor from '../routes/sponsor'

// The search consoles read the proof of ownership from the home page. Without
// it Google ends the verification, and the search data stops.
describe('proof of ownership for the search consoles', () => {
  const tags = (meta) => meta.filter((tag) => tag.name in SITE_VERIFICATION)

  it('is on the home page', () => {
    const google = tags(home.meta()).find((tag) => tag.name === 'google-site-verification')
    expect(google.content).toBe(SITE_VERIFICATION['google-site-verification'])
    expect(google.content).toMatch(/^[A-Za-z0-9_-]{20,}$/)
  })

  it('is on no other page', () => {
    expect(tags(about.meta())).toEqual([])
    expect(tags(sponsor.meta())).toEqual([])
  })

  it('prints no tag for a console that has no value', () => {
    expect(siteVerificationMeta({ 'google-site-verification': '', 'msvalidate.01': '' })).toEqual([])
    expect(siteVerificationMeta({ 'msvalidate.01': 'A1B2C3D4E5F6A7B8C9D0' })).toEqual([
      { name: 'msvalidate.01', content: 'A1B2C3D4E5F6A7B8C9D0' },
    ])
  })

  it('prints no tag for a value that is not a token', () => {
    expect(siteVerificationMeta({ 'google-site-verification': '"><script>' })).toEqual([])
  })

  const built = join(process.cwd(), 'build/client/index.html')
  it.skipIf(!existsSync(built))('is in the home page as it is built', () => {
    const html = readFileSync(built, 'utf-8')
    expect(html).toContain(`<meta name="google-site-verification" content="${SITE_VERIFICATION['google-site-verification']}"/>`)
  })
})
