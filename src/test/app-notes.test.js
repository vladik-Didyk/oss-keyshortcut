import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { APP_NOTES, APP_NOTES_BY_PLATFORM, getAppNote } from '../data/appNotes'
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

// Every note in the file: the shared ones are checked on macOS, the others on their own platform.
const ALL_NOTES = [
  ...Object.entries(APP_NOTES).map(([slug, note]) => ({ slug, note, platform: 'macos', label: slug })),
  ...Object.entries(APP_NOTES_BY_PLATFORM).flatMap(([platform, notes]) =>
    Object.entries(notes).map(([slug, note]) => ({ slug, note, platform, label: `${platform}/${slug}` }))
  ),
]

// macOS Figma lists the three zoom commands twice, in View and in Zoom, with
// different keys. The note written before this rule shows the View ones.
const KNOWN_DOUBLE_ENTRIES = { figma: ['Zoom to Selection', 'Zoom to Fit', 'Zoom to 100%'] }

describe('app notes', () => {
  for (const { slug, note, platform, label } of ALL_NOTES) {
    const app = load(platform).find((a) => a.slug === slug)

    it(`${label}: exists on ${platform} and every {{action}} resolves there`, () => {
      expect(app, `no ${platform} app "${slug}"`).toBeTruthy()
      const texts = [note.overview, ...note.tips]
      const missing = texts.flatMap((t) => resolveNoteText(t, app).filter((s) => s.action && !s.shortcut).map((s) => s.action))
      expect(missing).toEqual([])
      expect(resolveEssentials(note.essentials, app)).toHaveLength(note.essentials.length)
      expect(noteFitsApp(note, app)).toBe(true)
      expect(fittingTips(note, app)).toHaveLength(note.tips.length)
      expect(getAppNote(slug, platform)).toBe(note)
    })

    it(`${label}: has an overview, 2-3 tips and 4-6 essentials`, () => {
      expect(note.overview.length).toBeGreaterThan(80)
      expect(note.tips.length).toBeGreaterThanOrEqual(2)
      expect(note.tips.length).toBeLessThanOrEqual(3)
      expect(note.essentials.length).toBeGreaterThanOrEqual(4)
      expect(note.essentials.length).toBeLessThanOrEqual(6)
    })

    it(`${label}: every section it names exists in the data and in its text`, () => {
      const text = [note.overview, ...note.tips].join(' ')
      for (const name of note.sections || []) {
        expect(app.sections.map((s) => s.name), `${label} names a section the data does not have`).toContain(name)
        expect(text, `${label} lists "${name}" but never mentions it`).toContain(name)
      }
    })

    // google-docs is on macOS only and typed one key before this rule existed.
    if (label !== 'google-docs') {
      it(`${label}: names actions instead of typing keys`, () => {
        const prose = [note.overview, ...note.tips].join(' ').replace(/\{\{[^}]+\}\}/g, '')
        expect(prose).not.toMatch(/[⌘⌥⌃⇧]|\b(Ctrl|Cmd|Alt)\s*\+/)
      })
    }

    // {{Action}} shows the first match. Two keys in one section are alternatives;
    // the same name in two sections can be two different commands ("Run" the
    // program, "Run" the tool window), and the note would show the wrong one.
    it(`${label}: an action it names is not a different command in another section`, () => {
      const named = [note.overview, ...note.tips].flatMap((t) => resolveNoteText(t, app).filter((s) => s.action).map((s) => s.action)).concat(note.essentials)
      const ambiguous = [...new Set(named)].filter((action) => {
        const hits = app.sections.flatMap((s) =>
          s.shortcuts.filter((sc) => sc.action.toLowerCase().trim() === action.toLowerCase().trim()).map((sc) => ({ section: s.name, keys: formatKeys(sc, platform) }))
        )
        return new Set(hits.map((h) => h.section)).size > 1 && new Set(hits.map((h) => h.keys)).size > 1
      })
      expect(ambiguous).toEqual(KNOWN_DOUBLE_ENTRIES[label] || [])
    })
  }

  // The complaint these notes answer was "the same text with the app name
  // swapped". So a sentence counts as repeated when two apps share it once the
  // app name and the {{actions}} are taken out.
  it('no sentence is a template shared by the notes of two different apps', () => {
    const seen = new Map()
    const repeated = []
    for (const { slug, note, platform } of ALL_NOTES) {
      const appName = load(platform).find((a) => a.slug === slug).displayName
      for (const sentence of [note.overview, ...note.tips].join(' ').split(/(?<=[.:])\s+/)) {
        const key = sentence.replaceAll(appName, 'APP').replace(/\{\{[^}]+\}\}/g, 'X').replace(/\s+/g, ' ').trim().toLowerCase()
        if (key.replace(/x|app|[^a-z]/g, '').length < 12) continue
        if (seen.has(key) && seen.get(key) !== slug) repeated.push(`${seen.get(key)} / ${slug}: ${key}`)
        else seen.set(key, slug)
      }
    }
    expect(repeated).toEqual([])
  })

  it('is not used on a page where it only half matches', () => {
    const winExcel = load('windows').find((a) => a.slug === 'excel')
    expect(noteFitsApp(APP_NOTES.excel, winExcel)).toBe(false)
  })

  it('a platform with its own note gets that note, the others get the shared one', () => {
    expect(getAppNote('excel', 'windows')).toBe(APP_NOTES_BY_PLATFORM.windows.excel)
    expect(getAppNote('excel', 'macos')).toBe(APP_NOTES.excel)
    expect(getAppNote('no-such-app', 'macos')).toBeUndefined()
  })

  it('is not used on a page that lacks a section it names', () => {
    const note = { ...APP_NOTES.excel, sections: ['No Such Section'] }
    expect(noteFitsApp(note, mac.find((a) => a.slug === 'excel'))).toBe(false)
  })
})

// A shared note is written on macOS and shown on every platform the app is on.
// So the checks below run on every page, not on the note's main platform only.
const PAGES = ['macos', 'windows', 'linux'].flatMap((platform) =>
  load(platform)
    .map((app) => ({ platform, app, path: `${platform}/${app.slug}`, note: getAppNote(app.slug, platform) }))
    .filter((page) => page.note)
)

/** Every action a note names on a page: in its overview, its tips and its essentials. */
const namedActions = (note, app) => [
  ...new Set([note.overview, ...note.tips].flatMap((t) => resolveNoteText(t, app).filter((s) => s.action).map((s) => s.action)).concat(note.essentials)),
]

// The same key under two spellings is one key: "Esc" and "Escape", "↑" and "Up".
const KEY_SPELLINGS = { '↑': 'Up', '↓': 'Down', '←': 'Left', '→': 'Right', '↩': 'Enter', '⏎': 'Enter', Return: 'Enter', Escape: 'Esc', '⎋': 'Esc', '⌫': 'Delete' }
const keysOf = (sc) => `${[...sc.modifiers].sort().join('+')}|${(KEY_SPELLINGS[sc.key] ?? sc.key).toUpperCase()}`
const sameAction = (a, b) => a.toLowerCase().trim() === b.toLowerCase().trim()

/** Why a row should not be named in a note. Empty when the row is fine. */
function rowFaults(app, platform, action) {
  const rows = app.sections.flatMap((s) => s.shortcuts)
  const mine = rows.filter((sc) => sameAction(sc.action, action))
  if (mine.length === 0) return []
  const faults = []
  if (mine.length > 1) faults.push('listed more than once')
  if (rows.some((sc) => !sameAction(sc.action, action) && keysOf(sc) === keysOf(mine[0]))) faults.push('another action has the same keys')
  const printed = [...mine[0].modifiers, mine[0].key].join(' ')
  if (platform !== 'macos' && /[⌘⌥⌃⇧↩⌫⎋]/.test(printed)) faults.push('Mac key symbol on a page for another platform')
  if (mine[0].key.includes('\\\\')) faults.push('key prints a doubled backslash')
  return faults
}

// Notes written before the rule below name rows of this kind. The pages are
// listed so that the rule holds for every other note and for every new one.
const PAGES_WITH_KNOWN_ROW_FAULTS = [
  'macos/calendar', 'macos/clickup', 'macos/figma', 'macos/github', 'macos/google-docs', 'macos/mail', 'macos/music',
  'macos/notes', 'macos/photos', 'macos/photoshop', 'macos/safari', 'macos/slack', 'macos/sublime-text', 'windows/tortoisegit',
]

describe('app notes on every page they show on', () => {
  it('a page whose app has a note shows it, with every tip and every essential', () => {
    const partly = PAGES.filter(({ app, note }) =>
      !noteFitsApp(note, app) || fittingTips(note, app).length !== note.tips.length || resolveEssentials(note.essentials, app).length !== note.essentials.length
    ).map((page) => page.path)
    expect(partly, 'the note names an action or a section this page does not have: give the platform its own note in APP_NOTES_BY_PLATFORM').toEqual([])
  })

  // A row that is listed twice, or whose keys also belong to another action on
  // the page, may be a fault in the data. A note would put it at the top of the page.
  it('names no action whose row looks wrong on the page', () => {
    const found = PAGES.filter(({ path }) => !PAGES_WITH_KNOWN_ROW_FAULTS.includes(path)).flatMap(({ platform, app, note, path }) =>
      namedActions(note, app).flatMap((action) => rowFaults(app, platform, action).map((fault) => `${path}: ${action}: ${fault}`))
    )
    expect(found).toEqual([])
  })

  it('lists as known only pages that still have such a row', () => {
    const clean = PAGES_WITH_KNOWN_ROW_FAULTS.filter((path) => {
      const page = PAGES.find((p) => p.path === path)
      return !page || namedActions(page.note, page.app).every((action) => rowFaults(page.app, page.platform, action).length === 0)
    })
    expect(clean, 'remove these pages from PAGES_WITH_KNOWN_ROW_FAULTS').toEqual([])
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
