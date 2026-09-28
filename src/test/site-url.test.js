import { describe, it, expect } from 'vitest'
import { execFileSync } from 'child_process'
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs'
import { join, extname } from 'path'
import { SITE_ORIGIN, pagePath, pageUrl } from '../utils/siteUrl'
import routerConfig from '../../react-router.config.ts'
import { COMPARISONS } from '../data/comparisons'
import { GUIDES } from '../data/guides'
import * as home from '../routes/home'
import * as platformIndex from '../routes/platform-index'
import * as shortcutPage from '../routes/shortcut-page'
import * as guidesIndex from '../routes/guides-index'
import * as guidePage from '../routes/guide-page'
import * as compareIndex from '../routes/compare-index'
import * as comparePage from '../routes/compare-page'
import * as cheatSheets from '../routes/cheat-sheets'
import * as about from '../routes/about'
import * as sponsor from '../routes/sponsor'
import * as productPage from '../routes/product-page'
import * as privacy from '../routes/privacy'

const ROOT = process.cwd()

describe('pagePath / pageUrl', () => {
  it('keeps the home page as "/"', () => {
    expect(pagePath('/')).toBe('/')
    expect(pagePath('')).toBe('/')
    expect(pageUrl('/')).toBe('https://keyshortcut.com/')
  })

  it('ends a pre-rendered page with a slash', () => {
    expect(pagePath('/macos')).toBe('/macos/')
    expect(pagePath('/macos/figma')).toBe('/macos/figma/')
    expect(pageUrl('/guides/keyboard-shortcut-tools')).toBe('https://keyshortcut.com/guides/keyboard-shortcut-tools/')
  })

  it('gives the same result with or without the slashes', () => {
    expect(pagePath('macos/figma')).toBe('/macos/figma/')
    expect(pagePath('/macos/figma/')).toBe('/macos/figma/')
    expect(pagePath('//macos//figma//')).toBe('/macos/figma/')
  })

  it('leaves /privacy without a slash: it is served from public/privacy.html', () => {
    expect(pagePath('/privacy')).toBe('/privacy')
    expect(pagePath('/privacy/')).toBe('/privacy')
    expect(pageUrl('/privacy')).toBe('https://keyshortcut.com/privacy')
  })

  it('uses the https origin without www', () => {
    expect(SITE_ORIGIN).toBe('https://keyshortcut.com')
  })
})

// The expected values are the addresses that returned 200 on the live site
// (curl, 2026-09-28); the other form of each one redirects with 308.
describe('canonical and og:url of each page type', () => {
  const macos = { platformId: 'macos', platformName: 'macOS' }
  const figma = { slug: 'figma', displayName: 'Figma', shortcutCount: 119 }
  const vscode = { slug: 'vscode', displayName: 'VS Code' }
  const cursor = { slug: 'cursor', displayName: 'Cursor' }

  const pages = [
    ['home', home.meta(), 'https://keyshortcut.com/'],
    ['platform index', platformIndex.meta({ data: { ...macos, apps: [figma] } }), 'https://keyshortcut.com/macos/'],
    ['app page', shortcutPage.meta({ data: { ...macos, app: figma } }), 'https://keyshortcut.com/macos/figma/'],
    ['guides index', guidesIndex.meta(), 'https://keyshortcut.com/guides/'],
    ['guide', guidePage.meta({ data: { guide: GUIDES[0] } }), `https://keyshortcut.com/guides/${GUIDES[0].slug}/`],
    ['compare index', compareIndex.meta(), 'https://keyshortcut.com/compare/'],
    ['compare page', comparePage.meta({ data: { appA: vscode, appB: cursor } }), 'https://keyshortcut.com/compare/vscode-vs-cursor/'],
    ['cheat sheets', cheatSheets.meta(), 'https://keyshortcut.com/cheat-sheets/'],
    ['about', about.meta(), 'https://keyshortcut.com/about/'],
    ['sponsor', sponsor.meta(), 'https://keyshortcut.com/sponsor/'],
    ['mac-hud', productPage.meta(), 'https://keyshortcut.com/mac-hud/'],
    ['privacy', privacy.meta(), 'https://keyshortcut.com/privacy'],
  ]

  it.each(pages)('%s', (_name, meta, expected) => {
    expect(meta).toContainEqual({ tagName: 'link', rel: 'canonical', href: expected })
    expect(meta).toContainEqual({ property: 'og:url', content: expected })
  })

  it.each(COMPARISONS)('compare page $slugA-vs-$slugB points at its own address', async ({ slugA, slugB }) => {
    const slug = `${slugA}-vs-${slugB}`
    const data = await comparePage.loader({ params: { slug } })
    expect(comparePage.meta({ data })).toContainEqual({
      tagName: 'link',
      rel: 'canonical',
      href: `https://keyshortcut.com/compare/${slug}/`,
    })
  })

  it('a page that was not found has no canonical', () => {
    for (const route of [platformIndex, shortcutPage, guidePage, comparePage]) {
      const meta = route.meta({ data: undefined })
      expect(meta.some((tag) => tag.rel === 'canonical' || tag.property === 'og:url')).toBe(false)
    }
  })
})

describe('RSS feed', () => {
  it('links to guides at their canonical address', () => {
    const rssPath = join(ROOT, 'public/rss.xml')
    const committed = readFileSync(rssPath, 'utf-8')
    execFileSync('node', ['scripts/generate-rss.mjs'], { cwd: ROOT, timeout: 30000 })
    const xml = readFileSync(rssPath, 'utf-8')
    // lastBuildDate changes on every run; leave the file as it was.
    writeFileSync(rssPath, committed)

    const links = [...xml.matchAll(/<(?:link|guid)[^>]*>([^<]+)<\/(?:link|guid)>/g)].map((m) => m[1])
    expect(links).toHaveLength(1 + GUIDES.length * 2)
    expect(links).toContain('https://keyshortcut.com/guides/')
    for (const guide of GUIDES) {
      expect(links.filter((l) => l === `https://keyshortcut.com/guides/${guide.slug}/`)).toHaveLength(2)
    }
  })
})

describe('pre-rendered pages (if built)', () => {
  const buildDir = join(ROOT, 'build/client')
  const built = existsSync(join(buildDir, 'index.html'))

  /** Every string in a JSON-LD block that is an address on this site. */
  function siteUrlsIn(value) {
    if (typeof value === 'string') return value.startsWith(SITE_ORIGIN) ? [value] : []
    if (value && typeof value === 'object') return Object.values(value).flatMap(siteUrlsIn)
    return []
  }

  it.skipIf(!built)('canonical, og:url and JSON-LD name addresses that are served', async () => {
    const routes = await routerConfig.prerender()
    const served = new Set(routes.map(pageUrl))
    const problems = []

    for (const route of routes) {
      const html = readFileSync(join(buildDir, route, 'index.html'), 'utf-8')
      const expected = pageUrl(route)

      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
      const ogUrl = html.match(/<meta property="og:url" content="([^"]+)"/)?.[1]
      if (canonical !== expected) problems.push(`${route}: canonical is ${canonical}`)
      if (ogUrl !== expected) problems.push(`${route}: og:url is ${ogUrl}`)

      const blocks = [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)]
      for (const url of blocks.flatMap((m) => siteUrlsIn(JSON.parse(m[1])))) {
        if (url.startsWith(`${SITE_ORIGIN}/images/`)) continue
        const page = url.split('?')[0]
        if (!served.has(page)) problems.push(`${route}: JSON-LD names ${url}`)
      }
    }

    expect(problems).toEqual([])
  })
})

// The rule lives in src/utils/siteUrl.js. A page address written out anywhere
// else skips it, and sooner or later names a URL that redirects.
describe('page addresses are built by pageUrl()', () => {
  const SKIP_DIRS = new Set(['test', 'shortcut-sync', 'node_modules'])
  const ALLOWED = [
    join('src', 'utils', 'siteUrl.js'),
  ]

  function sourceFiles(dir) {
    return readdirSync(join(ROOT, dir)).flatMap((name) => {
      const rel = join(dir, name)
      if (statSync(join(ROOT, rel)).isDirectory()) return SKIP_DIRS.has(name) ? [] : sourceFiles(rel)
      return ['.js', '.jsx', '.mjs', '.ts'].includes(extname(name)) ? [rel] : []
    })
  }

  it('no source file spells out a page URL of the site', () => {
    // Files under /images/ are not pages and have one form only.
    const literal = /https:\/\/keyshortcut\.com(?!\/images\/)/
    const offenders = [...sourceFiles('src'), ...sourceFiles('scripts')]
      .filter((file) => !ALLOWED.includes(file))
      .filter((file) => literal.test(readFileSync(join(ROOT, file), 'utf-8')))
    expect(offenders).toEqual([])
  })
})
