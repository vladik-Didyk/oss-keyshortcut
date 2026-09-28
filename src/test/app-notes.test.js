import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { APP_NOTES } from '../data/appNotes'
import { CONTENT } from '../data/content'
import {
  noteFitsApp,
  fittingTips,
  resolveNoteText,
  resolveEssentials,
  everydayShortcuts,
  largestSections,
  formatKeys,
} from '../utils/appCopy'

const load = (p) => JSON.parse(readFileSync(join(process.cwd(), `public/data/platforms/${p}.json`), 'utf-8')).apps
const mac = load('macos')

describe('app notes', () => {
  for (const [slug, note] of Object.entries(APP_NOTES)) {
    const app = mac.find((a) => a.slug === slug)

    it(`${slug}: exists on macOS and every {{action}} resolves there`, () => {
      expect(app, `no macOS app "${slug}"`).toBeTruthy()
      const texts = [note.overview, ...note.tips]
      const missing = texts.flatMap((t) => resolveNoteText(t, app).filter((s) => s.action && !s.shortcut).map((s) => s.action))
      expect(missing).toEqual([])
      expect(resolveEssentials(note.essentials, app)).toHaveLength(note.essentials.length)
      expect(noteFitsApp(note, app)).toBe(true)
      expect(fittingTips(note, app)).toHaveLength(note.tips.length)
    })

    it(`${slug}: has an overview, 3 tips and 4-6 essentials`, () => {
      expect(note.overview.length).toBeGreaterThan(80)
      expect(note.tips).toHaveLength(3)
      expect(note.essentials.length).toBeGreaterThanOrEqual(4)
      expect(note.essentials.length).toBeLessThanOrEqual(6)
    })
  }

  it('is not used on a page where it only half matches', () => {
    const winExcel = load('windows').find((a) => a.slug === 'excel')
    expect(noteFitsApp(APP_NOTES.excel, winExcel)).toBe(false)
  })
})

describe('app page copy from data', () => {
  const figma = mac.find((a) => a.slug === 'figma')

  it('formats keys per platform', () => {
    expect(formatKeys({ modifiers: ['⇧', '⌘'], key: 'P' }, 'macos')).toBe('⇧⌘P')
    expect(formatKeys({ modifiers: ['Ctrl', 'Shift'], key: 'P' }, 'windows')).toBe('Ctrl+Shift+P')
  })

  it('summarises the largest sections', () => {
    const largest = largestSections(figma)
    expect(largest).toHaveLength(3)
    expect(largest[0].count).toBeGreaterThanOrEqual(largest[1].count)
    expect(CONTENT.shortcutPage.sectionsSummary(largest)).toMatch(/^The largest are .+ \(\d+\), .+ \(\d+\), and .+ \(\d+\)\.$/)
  })

  it('finds everyday shortcuts on pages without a note', () => {
    const chromeWin = load('windows').find((a) => a.slug === 'chrome')
    const picks = everydayShortcuts(chromeWin)
    expect(picks.length).toBeGreaterThanOrEqual(3)
  })

  it('no app page FAQ or copy repeats the unsourced "8 working days" claim', () => {
    for (const p of ['macos', 'windows', 'linux']) {
      for (const app of load(p)) {
        const name = p === 'macos' ? 'macOS' : p[0].toUpperCase() + p.slice(1)
        const text = JSON.stringify(CONTENT.shortcutPage.faqItems(app, name)) + CONTENT.shortcutPage.intro(app.displayName, name, app.shortcutCount, app.sections.length)
        expect(text).not.toMatch(/working days/)
      }
    }
  })
})
