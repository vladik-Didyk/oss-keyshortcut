import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { meta } from '../routes/shortcut-page'
import { fitList, formatKeys, leadShortcuts } from '../utils/appCopy'
import { getAppNote } from '../data/appNotes'

// Title and description of an app page, as a search result shows them. Every
// value comes from the data of the page: the name, the count, real shortcuts.
const PLATFORMS = { macos: 'macOS', windows: 'Windows', linux: 'Linux' }
const appsOf = (id) => JSON.parse(readFileSync(join(process.cwd(), `public/data/platforms/${id}.json`), 'utf-8')).apps
const pages = Object.entries(PLATFORMS).flatMap(([platformId, platformName]) =>
  appsOf(platformId).map((app) => ({ platformId, platformName, app, note: getAppNote(app.slug, platformId) ?? null, path: `${platformId}/${app.slug}` }))
)
const tag = (tags, find) => tags.find(find)
const titleOf = (page) => tag(meta({ data: page }), (t) => 'title' in t).title
const descriptionOf = (page) => tag(meta({ data: page }), (t) => t.name === 'description').content
const leadOf = ({ app, platformId }) =>
  leadShortcuts(app, getAppNote(app.slug, platformId)).map((sc) => `${sc.action} ${formatKeys(sc, platformId)}`)

const isSystemPage = (page) => page.app.displayName === page.platformName
const bareTitle = (page) =>
  isSystemPage(page) ? `${page.platformName} Keyboard Shortcuts` : `${page.app.displayName} Keyboard Shortcuts for ${page.platformName}`

describe('title of an app page', () => {
  it('names the app, the platform and the number of shortcuts', () => {
    const figma = pages.find((p) => p.path === 'macos/figma')
    expect(titleOf(figma)).toBe(`Figma Keyboard Shortcuts for macOS — ${figma.app.shortcutCount} shortcuts`)
  })

  it('stays within 60 characters, or leaves the count out', () => {
    for (const page of pages) {
      const title = titleOf(page)
      const bare = bareTitle(page)
      if (title.length > 60) expect(title, page.path).toBe(bare)
      else expect(title.startsWith(bare), page.path).toBe(true)
    }
  })

  it('names the operating system once on its own page', () => {
    const system = pages.filter(isSystemPage)
    expect(system.map((p) => p.path).sort()).toEqual(['macos/macos', 'windows/windows'])
    for (const page of system) {
      expect(titleOf(page).match(new RegExp(page.platformName, 'g')), page.path).toHaveLength(1)
      expect(descriptionOf(page).startsWith(`${page.platformName} shortcuts: `), page.path).toBe(true)
    }
  })

  it('is the title of one page only', () => {
    const titles = pages.map(titleOf)
    expect(new Set(titles).size).toBe(titles.length)
  })

  it('states no year: the data has no date of its last check', () => {
    for (const page of pages) expect(titleOf(page), page.path).not.toMatch(/\b20\d\d\b/)
  })
})

describe('description of an app page', () => {
  it('is 155 characters at most', () => {
    for (const page of pages) expect(descriptionOf(page).length, `${page.path}: ${descriptionOf(page)}`).toBeLessThanOrEqual(155)
  })

  it('names the app, the platform and the count', () => {
    for (const page of pages) {
      const text = descriptionOf(page)
      expect(text, page.path).toContain(page.app.displayName)
      expect(text, page.path).toContain(page.platformName)
      expect(text, page.path).toContain(String(page.app.shortcutCount))
    }
  })

  it('names two to four shortcuts the page opens with, with the keys of that page', () => {
    let withShortcuts = 0
    for (const page of pages) {
      const lead = leadOf(page)
      const named = lead.filter((item) => descriptionOf(page).includes(item))
      if (!named.length) continue
      withShortcuts++
      expect(named.length, page.path).toBeGreaterThanOrEqual(2)
      expect(named.length, page.path).toBeLessThanOrEqual(4)
      expect(named, page.path).toEqual(lead.slice(0, named.length))
    }
    expect(withShortcuts).toBeGreaterThan(pages.length * 0.9)
  })

  it('is the description of one page only', () => {
    const texts = pages.map(descriptionOf)
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('the same text goes to og:description and twitter:description', () => {
    const tags = meta({ data: pages[0] })
    const text = descriptionOf(pages[0])
    expect(tag(tags, (t) => t.property === 'og:description').content).toBe(text)
    expect(tag(tags, (t) => t.name === 'twitter:description').content).toBe(text)
  })
})

describe('fitList', () => {
  it('takes as many items as fit, four at most', () => {
    expect(fitList('A: ', ['one', 'two', 'three', 'four', 'five'], '.', 100)).toBe('A: one, two, three, four.')
    expect(fitList('A: ', ['one', 'two', 'three'], '.', 13)).toBe('A: one, two.')
  })

  it('gives nothing when fewer than two fit', () => {
    expect(fitList('A: ', ['one', 'two'], '.', 8)).toBe('')
    expect(fitList('A: ', ['one'], '.', 100)).toBe('')
    expect(fitList('A: ', [], '.', 100)).toBe('')
  })
})
