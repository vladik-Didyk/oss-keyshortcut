import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import { INDEXNOW_KEY, INDEXNOW_LIMIT, readSitemap, changedSince, daysAgo, indexNowBody } from '../../scripts/lib/indexnow.mjs'

const ROOT = process.cwd()
const SITEMAP = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://keyshortcut.com/macos/vscode/</loc><lastmod>2026-09-28</lastmod></url>
  <url><loc>https://keyshortcut.com/macos/figma/</loc><lastmod>2026-03-31</lastmod></url>
  <url>
    <loc>https://keyshortcut.com/about/</loc>
  </url>
</urlset>`

describe('IndexNow', () => {
  it('has a key of the form the service asks for, served as a file of the same name', () => {
    expect(INDEXNOW_KEY).toMatch(/^[a-f0-9]{32}$/)
    expect(readFileSync(join(ROOT, 'public', `${INDEXNOW_KEY}.txt`), 'utf-8')).toBe(INDEXNOW_KEY)
  })

  it('reads the addresses of a sitemap with their day of change', () => {
    expect(readSitemap(SITEMAP)).toEqual([
      { loc: 'https://keyshortcut.com/macos/vscode/', lastmod: '2026-09-28' },
      { loc: 'https://keyshortcut.com/macos/figma/', lastmod: '2026-03-31' },
      { loc: 'https://keyshortcut.com/about/', lastmod: null },
    ])
  })

  // Reporting a page that did not change, deploy after deploy, is what the
  // service asks senders not to do.
  it('reports only pages that changed since the given day', () => {
    const entries = readSitemap(SITEMAP)
    expect(changedSince(entries, '2026-09-27')).toEqual(['https://keyshortcut.com/macos/vscode/'])
    expect(changedSince(entries, '2026-09-29')).toEqual([])
    expect(changedSince(entries, null)).toHaveLength(3)
  })

  it('does not report a page whose day of change is not known', () => {
    expect(changedSince(readSitemap(SITEMAP), '2000-01-01')).not.toContain('https://keyshortcut.com/about/')
  })

  it('counts days back from today', () => {
    expect(daysAgo(2, new Date('2026-09-29T12:00:00Z'))).toBe('2026-09-27')
    expect(daysAgo(0, new Date('2026-09-29T23:59:00Z'))).toBe('2026-09-29')
  })

  it('sends the host, the key, where the key is served, and only addresses of that host', () => {
    const body = indexNowBody('https://keyshortcut.com', ['https://keyshortcut.com/macos/vscode/', 'https://example.com/'])
    expect(body).toEqual({
      host: 'keyshortcut.com',
      key: INDEXNOW_KEY,
      keyLocation: `https://keyshortcut.com/${INDEXNOW_KEY}.txt`,
      urlList: ['https://keyshortcut.com/macos/vscode/'],
    })
    const many = Array.from({ length: INDEXNOW_LIMIT + 5 }, (_, i) => `https://keyshortcut.com/p${i}/`)
    expect(indexNowBody('https://keyshortcut.com', many).urlList).toHaveLength(INDEXNOW_LIMIT)
  })

  const built = join(ROOT, 'build/client')
  it.skipIf(!existsSync(join(built, 'sitemap-macos.xml')))('reads the sitemap of a build', () => {
    const entries = readSitemap(readFileSync(join(built, 'sitemap-macos.xml'), 'utf-8'))
    expect(entries.length).toBeGreaterThan(100)
    for (const entry of entries) expect(entry.loc.startsWith('https://keyshortcut.com/macos/')).toBe(true)
  })
})
