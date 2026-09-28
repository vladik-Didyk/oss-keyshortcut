import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { CONTENT } from '../data/content'
import { MIN_SECTIONS_FOR_SLOT } from '../data/sponsors'
import { measureAllPages, introText, countWords, EVERYDAY_INTRO, MIN_SECTIONS_FOR_PROSE } from '../../scripts/lib/page-prose.mjs'

// Same logic as `node scripts/measure-page-prose.mjs`.
const rows = measureAllPages(process.cwd())
const platforms = JSON.parse(readFileSync(join(process.cwd(), 'public/data/platforms.json'), 'utf-8'))

describe('app pages have prose', () => {
  it('measures every app page', () => {
    expect(rows.length).toBeGreaterThan(100)
    expect(new Set(rows.map((r) => r.path)).size).toBe(rows.length)
  })

  // A page with fewer sections is exempt: it carries no ad or sponsor slot
  // (MIN_SECTIONS_FOR_SLOT), and with one or two sections there is little
  // organisation for a note to describe, so a note there can be padding.
  it(`a page with ${MIN_SECTIONS_FOR_PROSE} or more sections shows a note or the everyday block`, () => {
    const thin = rows.filter((r) => r.sections >= MIN_SECTIONS_FOR_PROSE && r.block === 'none').map((r) => r.path)
    expect(thin, 'add a note in src/data/appNotes.js; list the pages with `node scripts/measure-page-prose.mjs --thin`').toEqual([])
  })

  it('covers every page that carries the ad or sponsor slot', () => {
    expect(MIN_SECTIONS_FOR_PROSE).toBeLessThanOrEqual(MIN_SECTIONS_FOR_SLOT)
  })

  it('a page with a note has more prose than the intro alone', () => {
    for (const r of rows.filter((x) => x.block === 'note')) {
      expect(r.blockWords, r.path).toBeGreaterThanOrEqual(40)
    }
  })
})

describe('page-prose.mjs mirrors the page copy', () => {
  const sp = CONTENT.shortcutPage

  it('builds the same intro as the page', () => {
    for (const { id, display_name: platformName } of platforms) {
      const { apps } = JSON.parse(readFileSync(join(process.cwd(), `public/data/platforms/${id}.json`), 'utf-8'))
      for (const app of apps) {
        const largest = [...app.sections].map((s) => ({ name: s.name, count: s.shortcuts.length })).sort((a, b) => b.count - a.count).slice(0, 3)
        const onPage = `${sp.intro(app.displayName, platformName, app.shortcutCount, app.sections.length)} ${sp.sectionsSummary(largest)}`.trim()
        expect(introText(app, platformName)).toBe(onPage)
      }
    }
  })

  it('uses the same everyday intro line as the page', () => {
    expect(EVERYDAY_INTRO).toBe(sp.everydayIntro)
    expect(countWords(EVERYDAY_INTRO)).toBeGreaterThan(0)
  })
})
