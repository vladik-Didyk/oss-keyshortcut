#!/usr/bin/env node
import { writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { GUIDES } from '../src/data/guides/index.js'
import { SITE_ORIGIN, pageUrl } from '../src/utils/siteUrl.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

const sorted = [...GUIDES].sort((a, b) => b.published.localeCompare(a.published))
const lastBuildDate = new Date().toUTCString()

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>KeyShortcut Guides</title>
    <link>${pageUrl('/guides')}</link>
    <description>Practical guides on keyboard shortcuts, productivity workflows, and shortcut management for macOS, Windows, and Linux.</description>
    <language>en</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
    <atom:link href="${SITE_ORIGIN}/rss.xml" rel="self" type="application/rss+xml"/>
${sorted.map(g => `    <item>
      <title>${escapeXml(g.title)}</title>
      <link>${pageUrl(`/guides/${g.slug}`)}</link>
      <guid isPermaLink="true">${pageUrl(`/guides/${g.slug}`)}</guid>
      <description>${escapeXml(g.description)}</description>
      <pubDate>${new Date(g.published + 'T00:00:00Z').toUTCString()}</pubDate>
      <category>${escapeXml(g.category)}</category>
    </item>`).join('\n')}
  </channel>
</rss>
`

writeFileSync(join(ROOT, 'public/rss.xml'), xml)
console.log(`RSS feed generated: ${sorted.length} guides`)

function escapeXml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
