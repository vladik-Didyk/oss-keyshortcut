import { describe, it, expect, beforeAll } from 'vitest'
import { execFileSync } from 'child_process'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { pageUrl } from '../utils/siteUrl'
import routerConfig from '../../react-router.config.ts'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..', '..')
const sitemapPath = join(ROOT, 'public/sitemap.xml')
const SUB_SITEMAPS = ['sitemap-pages.xml', 'sitemap-guides.xml', 'sitemap-compare.xml', 'sitemap-macos.xml', 'sitemap-windows.xml', 'sitemap-linux.xml']

function readLocs(name) {
  const xml = readFileSync(join(ROOT, 'public', name), 'utf-8')
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
}

describe('sitemap generation', () => {
  let indexXml

  beforeAll(() => {
    execFileSync('node', ['scripts/generate-sitemap.mjs'], { cwd: ROOT, timeout: 30000 })
    indexXml = readFileSync(sitemapPath, 'utf-8')
  })

  it('produces well-formed sitemap index XML', () => {
    expect(indexXml).toContain('<?xml version="1.0"')
    expect(indexXml).toContain('<sitemapindex')
    expect(indexXml).toContain('</sitemapindex>')
  })

  it('references expected sub-sitemaps', () => {
    for (const name of SUB_SITEMAPS) {
      expect(indexXml).toContain(`<loc>https://keyshortcut.com/${name}</loc>`)
    }
  })

  it('sub-sitemap files exist on disk', () => {
    for (const name of ['sitemap-pages.xml', 'sitemap-guides.xml', 'sitemap-compare.xml', 'sitemap-macos.xml']) {
      expect(existsSync(join(ROOT, 'public', name))).toBe(true)
    }
  })

  it('contains static pages in sitemap-pages.xml', () => {
    const xml = readFileSync(join(ROOT, 'public/sitemap-pages.xml'), 'utf-8')
    for (const path of ['/', '/mac-hud/', '/privacy']) {
      expect(xml).toContain(`<loc>https://keyshortcut.com${path}</loc>`)
    }
  })

  it('contains platform index and app pages in platform sub-sitemaps', () => {
    const macosXml = readFileSync(join(ROOT, 'public/sitemap-macos.xml'), 'utf-8')
    expect(macosXml).toContain('<loc>https://keyshortcut.com/macos/</loc>')
    // Spot-check well-known apps
    for (const slug of ['figma', 'chrome', 'slack']) {
      expect(macosXml).toContain(`<loc>https://keyshortcut.com/macos/${slug}/</loc>`)
    }
  })

  // Cloudflare Pages serves a pre-rendered page at the address with the slash
  // and redirects the other form (308). A sitemap must list what returns 200.
  it('lists every URL in the form that is served', () => {
    for (const name of SUB_SITEMAPS) {
      for (const loc of readLocs(name)) {
        if (loc === 'https://keyshortcut.com/privacy') continue // served from public/privacy.html
        expect(loc.endsWith('/'), `${name}: ${loc}`).toBe(true)
      }
    }
  })

  it('lists the pre-rendered routes, all of them and nothing else', async () => {
    const routes = await routerConfig.prerender()
    const locs = SUB_SITEMAPS.flatMap(readLocs)
    expect(new Set(locs).size).toBe(locs.length)
    expect([...locs].sort()).toEqual(routes.map(pageUrl).sort())
  })

  it('does not list the not-found page', () => {
    for (const loc of SUB_SITEMAPS.flatMap(readLocs)) {
      expect(loc).not.toMatch(/\/404/)
    }
  })

  it('all sub-sitemap URLs use https://keyshortcut.com domain', () => {
    const macosXml = readFileSync(join(ROOT, 'public/sitemap-macos.xml'), 'utf-8')
    const locs = [...macosXml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1])
    expect(locs.length).toBeGreaterThan(0)
    for (const loc of locs) {
      expect(loc).toMatch(/^https:\/\/keyshortcut\.com\//)
    }
  })

  it('priority values are valid (0.0–1.0) in sub-sitemaps', () => {
    const pagesXml = readFileSync(join(ROOT, 'public/sitemap-pages.xml'), 'utf-8')
    const priorities = [...pagesXml.matchAll(/<priority>([^<]+)<\/priority>/g)].map(m => parseFloat(m[1]))
    for (const p of priorities) {
      expect(p).toBeGreaterThanOrEqual(0)
      expect(p).toBeLessThanOrEqual(1)
    }
  })
})

// <lastmod> is the day a page last changed, where that day is known. The day
// of the build is not one: a wrong date teaches a crawler to ignore them all.
describe('dates in the sitemap', async () => {
  const { pageDate, pageHash, latest } = await import('../../scripts/lib/page-dates.mjs')
  const record = JSON.parse(readFileSync(join(ROOT, 'src/data/pageDates.json'), 'utf-8'))
  const today = new Date().toISOString().slice(0, 10)
  const appsOf = (id) => JSON.parse(readFileSync(join(ROOT, `public/data/platforms/${id}.json`), 'utf-8')).apps
  const entries = (name) => {
    const xml = readFileSync(join(ROOT, 'public', name), 'utf-8')
    return [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>(?:\s*<lastmod>([^<]+)<\/lastmod>)?/g)].map((m) => ({ loc: m[1], lastmod: m[2] }))
  }

  beforeAll(() => {
    execFileSync('node', ['scripts/generate-sitemap.mjs'], { cwd: ROOT, timeout: 30000 })
  })

  it('the record knows every app page, with a day that has been', () => {
    for (const platform of ['macos', 'windows', 'linux']) {
      for (const app of appsOf(platform)) {
        const entry = record.pages[`${platform}/${app.slug}`]
        expect(entry, `${platform}/${app.slug}`).toBeDefined()
        expect(entry.changed).toMatch(/^\d{4}-\d{2}-\d{2}$/)
        expect(entry.changed <= today).toBe(true)
        expect(entry.hash).toMatch(/^[0-9a-f]{16}$/)
      }
    }
  })

  it('an app page states the day its shortcut list last changed', () => {
    for (const platform of ['macos', 'windows', 'linux']) {
      const stated = Object.fromEntries(entries(`sitemap-${platform}.xml`).map((e) => [e.loc, e.lastmod]))
      for (const app of appsOf(platform)) {
        const path = `${platform}/${app.slug}`
        expect(stated[pageUrl(`/${path}`)], path).toBe(pageDate(record, path, app, today))
      }
    }
  })

  it('not every page claims the same day', () => {
    const days = new Set(['macos', 'windows', 'linux'].flatMap((p) => entries(`sitemap-${p}.xml`).map((e) => e.lastmod)))
    expect(days.size).toBeGreaterThan(1)
  })

  it('a list that changed after the record was written gets the day of the build', () => {
    const [app] = appsOf('macos')
    const path = `macos/${app.slug}`
    expect(pageDate(record, path, app, today)).toBe(record.pages[path].changed)
    const edited = { ...app, sections: [{ name: 'New', shortcuts: [{ action: 'New action', modifiers: [], key: 'N' }] }, ...app.sections] }
    expect(pageHash(edited)).not.toBe(pageHash(app))
    expect(pageDate(record, path, edited, today)).toBe(today)
  })

  it('a page nothing is known about states no day', () => {
    expect(pageDate(record, 'macos/no-such-app', appsOf('macos')[0], today)).toBeUndefined()
    expect(pageDate(null, 'macos/figma', appsOf('macos')[0], today)).toBeUndefined()
    const stated = Object.fromEntries(entries('sitemap-pages.xml').map((e) => [e.loc, e.lastmod]))
    for (const path of ['/mac-hud', '/about', '/sponsor', '/privacy']) expect(stated[pageUrl(path)], path).toBeUndefined()
  })

  it('a page made of others states the latest of their days', () => {
    expect(latest(['2026-03-31', undefined, '2026-09-28', '2026-04-09'])).toBe('2026-09-28')
    expect(latest([undefined])).toBeUndefined()
    const macos = entries('sitemap-macos.xml')
    expect(macos[0].loc).toBe(pageUrl('/macos'))
    expect(macos[0].lastmod).toBe(latest(macos.slice(1).map((e) => e.lastmod)))
  })

  it('no day is later than today', () => {
    for (const name of SUB_SITEMAPS) {
      for (const { loc, lastmod } of entries(name)) if (lastmod) expect(lastmod <= today, loc).toBe(true)
    }
    for (const [, day] of readFileSync(sitemapPath, 'utf-8').matchAll(/<lastmod>([^<]+)<\/lastmod>/g)) expect(day <= today).toBe(true)
  })
})
