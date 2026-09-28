import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { GUIDES } from '../data/guides/index.js'
import { COMPARISONS } from '../data/comparisons.js'
import { CONTENT } from '../data/content'

// Unknown URLs now answer 404 instead of showing the home page, so a link to a
// page that does not exist is a broken link a visitor can see. These tests keep
// hand-written links pointing at real pages.

const ROOT = process.cwd()
const DATA = join(ROOT, 'public/data')
const readJSON = (path) => JSON.parse(readFileSync(join(DATA, path), 'utf-8'))

function knownPaths() {
  const paths = new Set(['/', '/mac-hud', '/privacy', '/about', '/sponsor', '/guides', '/cheat-sheets', '/compare'])
  for (const guide of GUIDES) paths.add(`/guides/${guide.slug}`)
  for (const c of COMPARISONS) paths.add(`/compare/${c.slugA}-vs-${c.slugB}`)
  for (const platform of readJSON('platforms.json')) {
    paths.add(`/${platform.id}`)
    for (const app of readJSON(`platforms/${platform.id}.json`).apps) paths.add(`/${platform.id}/${app.slug}`)
  }
  return paths
}

// "/macos/figma/", "/mac-hud#faq" and "/macos/figma" all name the page "/macos/figma".
const pageOf = (to) => {
  const path = to.split('#')[0].split('?')[0]
  return path.length > 1 ? path.replace(/\/$/, '') : path
}

describe('internal links', () => {
  const paths = knownPaths()

  it('guide related links point at pages that exist', () => {
    const broken = []
    for (const guide of GUIDES) {
      for (const link of guide.relatedApps || []) {
        if (link.to?.startsWith('/') && !paths.has(pageOf(link.to))) broken.push(`${guide.slug}: ${link.to}`)
      }
    }
    expect(broken).toEqual([])
  })

  it('guide related guides point at guides that exist', () => {
    const slugs = new Set(GUIDES.map((guide) => guide.slug))
    const broken = []
    for (const guide of GUIDES) {
      for (const slug of guide.relatedSlugs || []) if (!slugs.has(slug)) broken.push(`${guide.slug}: ${slug}`)
    }
    expect(broken).toEqual([])
  })

  it('finds the related links of the guides (the test reads the right field)', () => {
    const total = GUIDES.reduce((n, guide) => n + (guide.relatedApps || []).length, 0)
    expect(total).toBeGreaterThan(0)
  })

  it('navbar and footer links point at pages that exist', () => {
    const { navbar, footer } = CONTENT.shared
    const links = [
      ...navbar.platformLinks, ...navbar.resourceLinks, ...navbar.secondaryLinks, navbar.homeLink,
      ...footer.columns.flatMap((column) => column.links),
      ...footer.popularApps, ...footer.resourcesStaticLinks,
    ]
    const broken = links.filter((link) => !paths.has(pageOf(link.to))).map((link) => link.to)
    expect(broken).toEqual([])
  })
})
