// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import { SHORTCUT_NOTES } from '../data/shortcutNotes'
import { allShortcutPages, shortcutPagesOf, shortcutPageOf, relatedShortcuts, shortcutLinksOf, RELATED_COUNT } from '../utils/shortcutPages'
import { loader, meta } from '../routes/shortcut-detail'
import { formatKeys } from '../utils/appCopy'
import { pageUrl } from '../utils/siteUrl'
import routerConfig from '../../react-router.config.ts'

// Pages about one shortcut. A page exists only where a hand-written note
// exists, and everything else on it comes from the data of its platform.
const ROOT = process.cwd()
const PLATFORMS = { macos: 'macOS', windows: 'Windows', linux: 'Linux' }
const appsByPlatform = Object.fromEntries(
  Object.keys(PLATFORMS).map((id) => [id, JSON.parse(readFileSync(join(ROOT, `public/data/platforms/${id}.json`), 'utf-8')).apps])
)
const appOf = (platformId, slug) => appsByPlatform[platformId].find((app) => app.slug === slug)
const notes = Object.entries(SHORTCUT_NOTES).flatMap(([slug, list]) => list.map((note) => ({ slug, note })))
const pages = allShortcutPages(appsByPlatform)
const words = (text) => text.trim().split(/\s+/).length
const sentences = (text) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.toLowerCase().replace(/[^a-z ]/g, '').replace(/\s+/g, ' ').trim())
    .filter((s) => s.split(' ').length >= 4)
const dataOf = async (page) => loader({ params: { platformId: page.platformId, slug: page.slug, shortcutId: page.id } })
const tag = (tags, find) => tags.find(find)

describe('the notes', () => {
  it('there is a first batch of them', () => {
    expect(notes.length).toBeGreaterThanOrEqual(100)
  })

  it('every app of a note is an app of the site', () => {
    for (const slug of Object.keys(SHORTCUT_NOTES)) {
      expect(Object.keys(PLATFORMS).some((id) => appOf(id, slug)), slug).toBe(true)
    }
  })

  it('an id is small letters, digits and dashes, and one of its app', () => {
    for (const [slug, list] of Object.entries(SHORTCUT_NOTES)) {
      const ids = list.map((note) => note.id)
      expect(new Set(ids).size, slug).toBe(ids.length)
      for (const id of ids) expect(id, slug).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
    }
  })

  it('names the action as the data of each platform names it', () => {
    for (const { slug, note } of notes) {
      const platforms = Object.keys(note.names)
      expect(platforms.length, `${slug}/${note.id}`).toBeGreaterThan(0)
      for (const platformId of platforms) {
        expect(PLATFORMS[platformId], `${slug}/${note.id}: ${platformId}`).toBeDefined()
        const app = appOf(platformId, slug)
        expect(app, `${slug} is not on ${platformId}`).toBeDefined()
        expect(shortcutPageOf(platformId, app, note.id), `${platformId}/${slug}: no action "${note.names[platformId]}"`).not.toBeNull()
      }
    }
  })

  it('two notes of an app never name the same action', () => {
    for (const [slug, list] of Object.entries(SHORTCUT_NOTES)) {
      for (const platformId of Object.keys(PLATFORMS)) {
        const names = list.map((note) => note.names[platformId]).filter(Boolean).map((name) => name.toLowerCase())
        expect(new Set(names).size, `${platformId}/${slug}`).toBe(names.length)
      }
    }
  })

  it('has a short title, what the keys do, and 40 to 80 words on what happens', () => {
    for (const { slug, note } of notes) {
      const where = `${slug}/${note.id}`
      expect(note.title.length, where).toBeGreaterThan(2)
      expect(note.title.length, where).toBeLessThanOrEqual(28)
      expect(note.press, where).toMatch(/^[a-z]/)
      expect(note.press, where).not.toMatch(/[.!?]$/)
      expect(note.press.length, where).toBeLessThanOrEqual(110)
      expect(words(note.what), where).toBeGreaterThanOrEqual(40)
      expect(words(note.what), where).toBeLessThanOrEqual(80)
      expect(note.what, where).toMatch(/[.]$/)
      expect(note.written, where).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(note.written <= new Date().toISOString().slice(0, 10), where).toBe(true)
    }
  })

  it('types no key: the page prints the keys of its platform from the data', () => {
    // "Command Palette" is the name of a list in VS Code, not the Command key.
    const KEYS = /[⌘⌥⇧⌃⏎↩⌫⇥]|\b(Cmd|Command(?! Palette)|Ctrl|Control|Option|Alt|Shift|Win(dows)? key|Fn)\b|\bF\d{1,2}\b|\b[A-Za-z]\+[A-Za-z]/
    for (const { slug, note } of notes) {
      expect(`${note.press} ${note.what}`, `${slug}/${note.id}`).not.toMatch(KEYS)
    }
  })

  it('states no number, no version, no year, and does not praise', () => {
    for (const { slug, note } of notes) {
      const text = `${note.title} ${note.press} ${note.what}`
      expect(text, `${slug}/${note.id}`).not.toMatch(/\d/)
      expect(text, `${slug}/${note.id}`).not.toMatch(/\b(best|fastest|easiest|powerful|most popular|must-have|essential|game.changer|boost|supercharge)\b/i)
    }
  })

  it('no sentence is in two notes', () => {
    const seen = new Map()
    for (const { slug, note } of notes) {
      for (const sentence of sentences(note.what)) {
        expect(seen.get(sentence), `"${sentence}" in ${slug}/${note.id}`).toBeUndefined()
        seen.set(sentence, `${slug}/${note.id}`)
      }
    }
  })
})

describe('the pages', () => {
  it('exist only where the platform has the action', () => {
    expect(pages.length).toBeGreaterThanOrEqual(notes.length)
    for (const page of pages) {
      const found = shortcutPageOf(page.platformId, appOf(page.platformId, page.slug), page.id)
      expect(found.shortcut.action.toLowerCase(), page.path).toBe(found.note.names[page.platformId].toLowerCase())
    }
    const vscode = appOf('macos', 'vscode')
    expect(shortcutPageOf('macos', vscode, 'find-in-files')).toBeNull()
    expect(shortcutPageOf('macos', vscode, 'no-such-shortcut')).toBeNull()
    expect(shortcutPagesOf('macos', appOf('macos', '1password'))).toEqual([])
  })

  it('an address that has no page is not found', async () => {
    for (const params of [
      { platformId: 'macos', slug: 'vscode', shortcutId: 'no-such-shortcut' },
      { platformId: 'macos', slug: 'no-such-app', shortcutId: 'toggle-comment' },
      { platformId: 'amiga', slug: 'vscode', shortcutId: 'toggle-comment' },
      { platformId: 'macos', slug: 'vscode', shortcutId: 'find-in-files' },
    ]) {
      await expect(loader({ params })).rejects.toMatchObject({ status: 404 })
    }
  })

  it('an old address with three parts is still redirected', async () => {
    const response = await loader({ params: { platformId: 'shortcuts', slug: 'macos', shortcutId: 'figma' } })
    expect(response.status).toBe(301)
    expect(response.headers.get('Location')).toBe('/macos/figma')
  })

  it('show the keys of the data, and the same action on the other platforms', async () => {
    const data = await dataOf({ platformId: 'macos', slug: 'vscode', id: 'toggle-comment' })
    expect(data.shortcut.keys).toBe('⌘/')
    expect(data.shortcut.words).toBe('Command + Slash')
    expect(data.others.map((o) => [o.platformName, o.keys, o.to])).toEqual([
      ['Windows', 'Ctrl+/', '/windows/vscode/toggle-comment'],
      ['Linux', 'Ctrl+/', '/linux/vscode/toggle-comment'],
    ])
    for (const page of pages) {
      const found = shortcutPageOf(page.platformId, appOf(page.platformId, page.slug), page.id)
      expect((await dataOf(page)).shortcut.keys, page.path).toBe(formatKeys(found.shortcut, page.platformId))
    }
  })

  it('a platform that lists the app without this action links to the app page there', async () => {
    const data = await dataOf({ platformId: 'macos', slug: 'vscode', id: 'go-to-definition' })
    expect(data.others).toEqual([
      { platformId: 'windows', platformName: 'Windows', to: '/windows/vscode', parts: null, keys: null, words: null },
      { platformId: 'linux', platformName: 'Linux', to: '/linux/vscode', parts: null, keys: null, words: null },
    ])
  })

  it('an app that is on one platform has no other platform on its pages', async () => {
    expect((await dataOf({ platformId: 'macos', slug: 'safari', id: 'new-tab' })).others).toEqual([])
  })

  it('show up to five other shortcuts of the same section, never the shortcut itself', async () => {
    const lists = new Map()
    for (const page of pages) {
      const found = shortcutPageOf(page.platformId, appOf(page.platformId, page.slug), page.id)
      const related = relatedShortcuts(found)
      expect(related.length, page.path).toBe(Math.min(RELATED_COUNT, found.section.shortcuts.length - 1))
      expect(related, page.path).not.toContain(found.shortcut)
      for (const sc of related) expect(found.section.shortcuts, page.path).toContain(sc)
      lists.set(page.path, related.map((sc) => sc.action).join('|'))
    }
    // Two pages of one app and platform never show the same list.
    const byApp = new Map()
    for (const page of pages) {
      const key = `${page.platformId}/${page.slug}`
      const list = lists.get(page.path)
      if (!list) continue
      expect(byApp.get(`${key}:${list}`), page.path).toBeUndefined()
      byApp.set(`${key}:${list}`, page.path)
    }
  })

  it('a related shortcut that has a page of its own links to it', async () => {
    const data = await dataOf({ platformId: 'macos', slug: 'vscode', id: 'command-palette' })
    const links = shortcutLinksOf('macos', appOf('macos', 'vscode'))
    expect(links['Toggle Comment']).toBe('toggle-comment')
    for (const related of data.related) {
      expect(related.to, related.action).toBe(links[related.action] ? `/macos/vscode/${links[related.action]}` : null)
    }
  })
})

describe('title and description of a page', () => {
  it('the title names the action, the app and the keys in 60 characters', async () => {
    const titles = []
    for (const page of pages) {
      const data = await dataOf(page)
      const { title } = tag(meta({ data }), (t) => 'title' in t)
      expect(title.length, `${page.path}: ${title}`).toBeLessThanOrEqual(60)
      expect(title, page.path).toContain(data.shortcut.title)
      expect(title, page.path).toContain(data.app.displayName)
      expect(title.endsWith(`: ${data.shortcut.keys}`), `${page.path}: ${title}`).toBe(true)
      titles.push(title)
    }
    expect(new Set(titles).size).toBe(titles.length)
    const figma = await dataOf({ platformId: 'macos', slug: 'figma', id: 'duplicate' })
    expect(tag(meta({ data: figma }), (t) => 'title' in t).title).toBe('Duplicate Shortcut in Figma on macOS: ⌘D')
  })

  it('the description states the keys, in 155 characters, and no two are the same', async () => {
    const texts = []
    for (const page of pages) {
      const data = await dataOf(page)
      const text = tag(meta({ data }), (t) => t.name === 'description').content
      expect(text.length, `${page.path}: ${text}`).toBeLessThanOrEqual(155)
      expect(text, page.path).toContain(` is ${data.shortcut.keys}.`)
      const known = data.others.filter((o) => o.keys)
      if (known.length && text.includes(' On ')) expect(text, page.path).toContain(`On ${known[0].platformName} it is ${known[0].keys}.`)
      texts.push(text)
    }
    expect(new Set(texts).size).toBe(texts.length)
  })

  it('the page of the operating system names it once', async () => {
    const data = await dataOf({ platformId: 'macos', slug: 'macos', id: 'spotlight' })
    const tags = meta({ data })
    expect(tag(tags, (t) => 'title' in t).title).toBe('Spotlight Shortcut in macOS: ⌘Space')
    expect(tag(tags, (t) => t.name === 'description').content.startsWith('Spotlight in macOS is ⌘Space.')).toBe(true)
  })

  it('canonical and og:url end with the slash', async () => {
    const tags = meta({ data: await dataOf({ platformId: 'windows', slug: 'excel', id: 'autosum' }) })
    const url = 'https://keyshortcut.com/windows/excel/autosum/'
    expect(tag(tags, (t) => t.rel === 'canonical').href).toBe(url)
    expect(tag(tags, (t) => t.property === 'og:url').content).toBe(url)
  })

  it('a page that was not found has no title of a shortcut', () => {
    expect(meta({ data: undefined })).toEqual([])
  })
})

describe('the pages in the build and the sitemap', () => {
  it('are pre-rendered, all of them', async () => {
    const paths = await routerConfig.prerender()
    for (const page of pages) expect(paths, page.path).toContain(page.path)
    expect(paths.filter((path) => path.split('/').length === 4 && !path.startsWith('/guides') && !path.startsWith('/compare'))).toHaveLength(pages.length)
  })

  it('are in the sitemap of their platform, with the day the note was written', () => {
    for (const platformId of Object.keys(PLATFORMS)) {
      const xml = readFileSync(join(ROOT, `public/sitemap-${platformId}.xml`), 'utf-8')
      for (const page of pages.filter((p) => p.platformId === platformId)) {
        const entry = xml.match(new RegExp(`<loc>${pageUrl(page.path).replace(/[.]/g, '\\.')}</loc>\\s*<lastmod>([^<]+)</lastmod>`))
        expect(entry, page.path).not.toBeNull()
        expect(entry[1] >= page.written, page.path).toBe(true)
      }
    }
  })

  // The notes are for the server: the loader hands the page the one it shows.
  it('the notes do not reach the browser', () => {
    const imports = /from ['"][^'"]*(shortcutNotes|shortcutPages)(\.js)?['"]/
    for (const file of ['src/components/ShortcutPage.jsx', 'src/components/ShortcutDetailPage.jsx', 'src/components/ShortcutKeys.jsx', 'src/utils/shortcutDetail.js', 'src/utils/structuredData.js', 'src/data/content.js']) {
      expect(readFileSync(join(ROOT, file), 'utf-8'), file).not.toMatch(imports)
    }
    const assets = join(ROOT, 'build/client/assets')
    if (!existsSync(assets)) return
    const needle = SHORTCUT_NOTES.vscode[0].what.slice(0, 60)
    for (const file of readdirSync(assets).filter((name) => name.endsWith('.js'))) {
      expect(readFileSync(join(assets, file), 'utf-8').includes(needle), file).toBe(false)
    }
  })
})
