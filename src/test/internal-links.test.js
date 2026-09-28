import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { GUIDES } from '../data/guides/index.js'
import { POPULAR_APPS } from '../data/popularApps.js'
import { CONTENT } from '../data/content'
import routerConfig from '../../react-router.config.ts'

// Links written by hand, checked against the pages the build pre-renders.
// A link to anything else is a 404.
let routes

beforeAll(async () => {
  routes = new Set(await routerConfig.prerender())
})

const readJSON = file =>
  JSON.parse(readFileSync(join(process.cwd(), 'public/data', file), 'utf-8'))

describe('guide related links', () => {
  // Every "Browse Shortcuts" link of every guide. A link is a path, optionally
  // followed by "#section" of the app page it points at.
  const links = GUIDES.flatMap(guide =>
    (guide.relatedApps || []).map(link => ({ guide: guide.slug, label: link.label, to: link.to }))
  )

  // Same rule ShortcutPage uses for the id of a section.
  const sectionId = name => name.toLowerCase().replace(/[^a-z0-9]+/g, '-')

  function readApp(path) {
    const [, platformId, slug] = path.split('/')
    return readJSON(`platforms/${platformId}.json`).apps.find(app => app.slug === slug)
  }

  it('has links to check', () => {
    expect(links.length).toBeGreaterThan(0)
    expect(routes.size).toBeGreaterThan(100)
  })

  it.each(links)('$guide: $label → $to is a pre-rendered page', ({ to }) => {
    const [path] = to.split('#')
    expect(routes.has(path), `${path} is not in the pre-render route list`).toBe(true)
  })

  it.each(links.filter(link => link.to.includes('#')))(
    '$guide: $label → $to names a section of that page',
    ({ to }) => {
      const [path, hash] = to.split('#')
      const sections = (readApp(path)?.sections || []).map(s => sectionId(s.name))
      expect(sections).toContain(hash)
    }
  )
})

describe('popular app suggestions (empty search)', () => {
  const platforms = readJSON('platforms.json')
  const links = platforms.flatMap(platform =>
    POPULAR_APPS.map(app => ({ name: app.name, to: `/${platform.id}/${app.slug}` }))
  )

  it.each(links)('$name → $to is a pre-rendered page', ({ to }) => {
    expect(routes.has(to), `${to} is not in the pre-render route list`).toBe(true)
  })
})

describe('guide related guides', () => {
  it('point at guides that exist', () => {
    const slugs = new Set(GUIDES.map((guide) => guide.slug))
    const broken = []
    for (const guide of GUIDES) {
      for (const slug of guide.relatedSlugs || []) if (!slugs.has(slug)) broken.push(`${guide.slug}: ${slug}`)
    }
    expect(broken).toEqual([])
  })
})

describe('navbar and footer links', () => {
  // "/mac-hud#faq" and "/macos/figma/" both name a pre-rendered page.
  const pageOf = (to) => {
    const path = to.split('#')[0].split('?')[0]
    return path.length > 1 ? path.replace(/\/$/, '') : path
  }

  it('point at pages that exist', () => {
    const { navbar, footer } = CONTENT.shared
    const links = [
      ...navbar.platformLinks, ...navbar.resourceLinks, ...navbar.secondaryLinks, navbar.homeLink,
      ...footer.columns.flatMap((column) => column.links),
      ...footer.popularApps, ...footer.resourcesStaticLinks,
    ]
    expect(links.length).toBeGreaterThan(20)
    const broken = links.filter((link) => !routes.has(pageOf(link.to))).map((link) => link.to)
    expect(broken).toEqual([])
  })
})
