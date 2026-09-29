import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import AdSlot from '../components/AdSlot'
import AffiliateLink from '../components/AffiliateLink'
import { AD_UNITS, resolveAdUnit } from '../data/ads'
import { AFFILIATES, PLATFORM_FALLBACK, getAffiliate } from '../data/affiliates'
import { AFFILIATE_PROGRAMS, HARDWARE_PROGRAMS, NO_PROGRAM, CHECKED } from '../data/affiliatePrograms'
import { getSponsor, sponsorMailto } from '../data/sponsors'
import { APP_COUNT, SHORTCUT_COUNT, MAC_APP_COUNT, MAC_SHORTCUT_COUNT, formatShortcutCount } from '../data/siteConfig'

const DATA = join(process.cwd(), 'public/data')
const readPlatform = (id) => JSON.parse(readFileSync(join(DATA, `platforms/${id}.json`), 'utf-8'))

describe('ad units', () => {
  it('maps every placement used by the pages', () => {
    for (const name of ['shortcut_mid', 'platform_mid', 'home_mid', 'guide_inline', 'guides_mid', 'compare_mid', 'cheatsheets_mid']) {
      expect(name in AD_UNITS).toBe(true)
    }
  })

  it('only holds numeric unit IDs or empty strings', () => {
    for (const id of Object.values(AD_UNITS)) expect(id).toMatch(/^(\d+)?$/)
  })

  it('resolves placement names and passes raw numeric IDs through', () => {
    expect(resolveAdUnit('shortcut_mid')).toBe(AD_UNITS.shortcut_mid)
    expect(resolveAdUnit('1234567890')).toBe('1234567890')
    expect(resolveAdUnit('not_a_placement')).toBe('')
  })
})

describe('AdSlot', () => {
  it('renders a text-only sponsor card with sponsored rel and label', () => {
    render(<AdSlot adSlot="shortcut_mid" sponsor={{ name: 'Acme', url: 'https://acme.test/?ref=keyshortcut', tagline: 'Tools' }} />)
    const link = screen.getByRole('link', { name: /acme/i })
    expect(link).toHaveAttribute('rel', expect.stringContaining('sponsored'))
    expect(screen.getByText('Sponsored')).toBeInTheDocument()
  })
})

describe('affiliates', () => {
  it('uses https tracking links only', () => {
    for (const entry of [...Object.values(AFFILIATES), ...Object.values(PLATFORM_FALLBACK)]) {
      expect(entry.url === '' || entry.url.startsWith('https://')).toBe(true)
      expect(entry.label).toBeTruthy()
      expect(entry.program).toBeTruthy()
    }
  })

  it('is keyed by slugs that exist in the directory', () => {
    const slugs = new Set(['macos', 'windows', 'linux'].flatMap((p) => readPlatform(p).apps.map((a) => a.slug)))
    for (const slug of Object.keys(AFFILIATES)) expect(slugs.has(slug)).toBe(true)
  })

  it('returns null for entries without a URL', () => {
    const empty = Object.keys(AFFILIATES).find((s) => !AFFILIATES[s].url)
    if (empty && !PLATFORM_FALLBACK.windows?.url) expect(getAffiliate(empty, 'windows')).toBeNull()
  })

  it('renders the button with sponsored rel and a disclosure next to it', () => {
    const affiliate = { program: 'Test', label: 'Get Figma', url: 'https://example.test/figma', kind: 'app' }
    render(<AffiliateLink affiliate={affiliate} appSlug="figma" platform="macos" />)
    const link = screen.getByRole('link', { name: /get figma/i })
    expect(link).toHaveAttribute('rel', 'sponsored nofollow noopener')
    expect(link).toHaveAttribute('target', '_blank')
    expect(screen.getByText(/we may earn a commission/i)).toBeInTheDocument()
  })

  it('renders nothing without an affiliate', () => {
    const { container } = render(<AffiliateLink affiliate={null} appSlug="figma" platform="macos" />)
    expect(container.innerHTML).toBe('')
  })
})

// Where to apply and what a program pays is kept for the owner, not for the
// pages: src/data/affiliatePrograms.js, printed by `pnpm affiliates`.
describe('affiliate programs', () => {
  const entries = [...Object.values(AFFILIATES), ...Object.values(PLATFORM_FALLBACK)]
  const isLive = (entry) => /^https:\/\//.test(entry.url)

  it('every program of a link is described, and every described program has a link entry', () => {
    const used = [...new Set(entries.map((entry) => entry.program))].sort()
    expect(Object.keys(AFFILIATE_PROGRAMS).sort()).toEqual(used)
  })

  it('a program is "live" exactly when one of its links is set', () => {
    for (const [name, program] of Object.entries(AFFILIATE_PROGRAMS)) {
      expect(['live', 'applied', 'open']).toContain(program.state)
      const linked = entries.some((entry) => entry.program === name && isLive(entry))
      expect(program.state === 'live', name).toBe(linked)
    }
  })

  it('an address to apply at is https, and a program not yet applied to says where or why not', () => {
    for (const [name, program] of Object.entries({ ...AFFILIATE_PROGRAMS, ...HARDWARE_PROGRAMS })) {
      expect(program.apply === '' || program.apply.startsWith('https://'), name).toBe(true)
      if (program.state === 'open') expect(program.apply || program.note, name).toBeTruthy()
    }
  })

  it('an app that was checked and has no program has no link entry', () => {
    const jetbrains = ['intellij', 'pycharm', 'webstorm', 'phpstorm', 'goland', 'clion', 'rider', 'rubymine', 'datagrip', 'dataspell']
    for (const slug of [...Object.keys(NO_PROGRAM), ...jetbrains]) expect(AFFILIATES[slug], slug).toBeUndefined()
  })

  it('the date of the check is a date', () => {
    expect(CHECKED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('no page carries the list: only the script and the tests read it', () => {
    const files = (dir) =>
      readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]
      )
    const importers = files('src')
      .filter((file) => /\.(js|jsx|ts)$/.test(file) && !file.startsWith('src/test/'))
      .filter((file) => /from\s+['"][^'"]*affiliatePrograms/.test(readFileSync(join(process.cwd(), file), 'utf-8')))
    expect(importers).toEqual([])
    expect(readFileSync(join(process.cwd(), 'scripts/affiliate-status.mjs'), 'utf-8')).toContain("from '../src/data/affiliatePrograms.js'")
    expect(JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf-8')).scripts.affiliates).toBe('node scripts/affiliate-status.mjs')
  })

  it('every button says what it leads to', () => {
    for (const [slug, entry] of Object.entries(AFFILIATES)) {
      expect(entry.label, slug).toMatch(/^(Get|Try) \S/)
    }
  })
})

describe('sponsors', () => {
  it('builds a mailto link with the page in the subject', () => {
    const href = sponsorMailto('/macos/figma', 'Figma')
    expect(href).toMatch(/^mailto:/)
    expect(decodeURIComponent(href)).toContain('subject=[KeyShortcut] Sponsor: /macos/figma')
  })

  it('returns a sponsor object or null', () => {
    const s = getSponsor('/macos/figma')
    expect(s === null || typeof s.url === 'string').toBe(true)
  })
})

describe('site counts', () => {
  it('match the committed data, not hardcoded numbers', () => {
    const platforms = ['macos', 'windows', 'linux'].map(readPlatform)
    const slugs = new Set(platforms.flatMap((p) => p.apps.map((a) => a.slug)))
    const shortcuts = platforms.flatMap((p) => p.apps).reduce((sum, a) => sum + a.shortcutCount, 0)
    const mac = readPlatform('macos').apps

    expect(APP_COUNT).toBe(slugs.size)
    expect(SHORTCUT_COUNT).toBe(shortcuts)
    expect(MAC_APP_COUNT).toBe(mac.length)
    expect(MAC_SHORTCUT_COUNT).toBe(mac.reduce((sum, a) => sum + a.shortcutCount, 0))
  })

  it('formats with a thousands separator and a plus', () => {
    expect(formatShortcutCount(7454)).toBe('7,454+')
  })
})
