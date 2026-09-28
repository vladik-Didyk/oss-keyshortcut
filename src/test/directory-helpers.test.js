import { describe, it, expect } from 'vitest'
import {
  getIconData,
} from '../utils/directoryHelpers'
import { readFileSync } from 'fs'
import { join } from 'path'
import {
  buildPlatformLookups,
  getPopularApps,
  groupByCategories,
  pickMoreApps,
} from '../utils/platformHelpers'

// Minimal mock apps for testing helper functions (no file dependency)
const mockApps = [
  { slug: 'safari', displayName: 'Safari', category: 'Browsers', shortcutCount: 33, sections: [] },
  { slug: 'chrome', displayName: 'Chrome', category: 'Browsers', shortcutCount: 61, sections: [] },
  { slug: 'vscode', displayName: 'VS Code', category: 'Development', shortcutCount: 63, sections: [] },
  { slug: 'figma', displayName: 'Figma', category: 'Design', shortcutCount: 119, sections: [] },
  { slug: 'slack', displayName: 'Slack', category: 'Communication', shortcutCount: 82, sections: [] },
  { slug: 'notion', displayName: 'Notion', category: 'Productivity', shortcutCount: 28, sections: [] },
]

describe('platformHelpers', () => {
  it('buildPlatformLookups creates appMap for every slug', () => {
    const { appMap, appCount, totalShortcuts } = buildPlatformLookups(mockApps)
    expect(appCount).toBe(mockApps.length)
    expect(totalShortcuts).toBeGreaterThan(0)
    for (const app of mockApps) {
      expect(appMap[app.slug]).toBeDefined()
      expect(appMap[app.slug].displayName).toBe(app.displayName)
    }
  })

  it('getPopularApps(n) returns n apps sorted by shortcutCount descending', () => {
    const popular = getPopularApps(mockApps, 3)
    expect(popular).toHaveLength(3)
    for (let i = 1; i < popular.length; i++) {
      expect(popular[i - 1].shortcutCount).toBeGreaterThanOrEqual(popular[i].shortcutCount)
    }
  })

  it('groupByCategories groups apps by category in order', () => {
    const order = ['Browsers', 'Development']
    const groups = groupByCategories(mockApps, order)
    expect(groups.length).toBeLessThanOrEqual(order.length)
    for (const g of groups) {
      expect(order).toContain(g.name)
      expect(g.apps.length).toBeGreaterThan(0)
    }
  })
})

describe('directoryHelpers', () => {
  it('getIconData returns valid icon data for known apps', () => {
    const finderIcon = getIconData('Finder')
    expect(finderIcon.type).toBe('image')
    expect(finderIcon.src).toContain('finder.webp')

    // Fallback for unknown app
    const unknownIcon = getIconData('SomeUnknownApp')
    expect(unknownIcon.type).toBe('fallback')
    expect(unknownIcon.label).toBe('S')
  })
})

describe('pickMoreApps', () => {
  const macApps = JSON.parse(readFileSync(join(process.cwd(), 'public/data/platforms/macos.json'), 'utf-8')).apps

  it('is deterministic and skips the current app and excluded apps', () => {
    const exclude = ['figma', 'sketch']
    const a = pickMoreApps(macApps, 'photoshop', 8, exclude).map((x) => x.slug)
    const b = pickMoreApps(macApps, 'photoshop', 8, exclude).map((x) => x.slug)
    expect(a).toEqual(b)
    expect(a).toHaveLength(8)
    expect(a).not.toContain('photoshop')
    for (const slug of exclude) expect(a).not.toContain(slug)
    expect(new Set(a).size).toBe(8)
  })

  it('shows a different set on different pages', () => {
    const sets = new Set(macApps.map((app) => pickMoreApps(macApps, app.slug, 8).map((x) => x.slug).join(',')))
    expect(sets.size).toBe(macApps.length)
  })

  it('links every app from other pages, evenly', () => {
    const inbound = Object.fromEntries(macApps.map((a) => [a.slug, 0]))
    for (const app of macApps) {
      for (const picked of pickMoreApps(macApps, app.slug, 8)) inbound[picked.slug]++
    }
    const counts = Object.values(inbound)
    expect(Math.min(...counts)).toBe(8)
    expect(Math.max(...counts)).toBe(8)
  })

  it('handles small lists and unknown slugs', () => {
    const small = macApps.slice(0, 3)
    expect(pickMoreApps(small, small[0].slug, 8)).toHaveLength(2)
    expect(pickMoreApps(small, 'not-an-app', 2)).toHaveLength(2)
    expect(pickMoreApps([], 'x', 8)).toEqual([])
  })
})

