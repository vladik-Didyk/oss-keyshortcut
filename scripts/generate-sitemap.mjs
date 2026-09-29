#!/usr/bin/env node
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { SITE_ORIGIN, pageUrl } from '../src/utils/siteUrl.js'
import { latest, pageDate } from './lib/page-dates.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DATA_DIR = join(ROOT, 'public/data')

const today = new Date().toISOString().split('T')[0]

// <lastmod> is stated only where the day of the last change is known: for an
// app page from the record of its shortcut list (scripts/page-dates.mjs), for a
// guide from its own date, for a page made of others from the latest of them.
// A page without a known day has no <lastmod>. The day of the build is not a
// day of change: a date that is wrong teaches a crawler to ignore all of them.
const recordPath = join(ROOT, 'src/data/pageDates.json')
const record = existsSync(recordPath) ? JSON.parse(readFileSync(recordPath, 'utf-8')) : null

function readJSON(relativePath) {
  return JSON.parse(readFileSync(join(DATA_DIR, relativePath), 'utf-8'))
}

function buildUrlset(pages) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages.map(p => `  <url>
    <loc>${pageUrl(p.loc)}</loc>${p.lastmod ? `
    <lastmod>${p.lastmod}</lastmod>` : ''}
    <changefreq>${p.changefreq}</changefreq>
    <priority>${p.priority}</priority>
  </url>`).join('\n')}
</urlset>
`
}

// ─── Static pages ───────────────────────────────────────────────────
// `loc` is the route path; pageUrl() turns it into the address that answers 200.

const staticPages = [
  { loc: '/', priority: '1.0', changefreq: 'weekly' },
  { loc: '/mac-hud', priority: '0.8', changefreq: 'weekly' },
  { loc: '/guides', priority: '0.7', changefreq: 'weekly' },
  { loc: '/cheat-sheets', priority: '0.7', changefreq: 'weekly' },
  { loc: '/about', priority: '0.5', changefreq: 'monthly' },
  { loc: '/sponsor', priority: '0.4', changefreq: 'monthly' },
  { loc: '/privacy', priority: '0.3', changefreq: 'yearly' },
]

// ─── Guide pages ────────────────────────────────────────────────────

const { GUIDES } = await import('../src/data/guides/index.js')
const guidePages = GUIDES.map(g => ({
  loc: `/guides/${g.slug}`,
  lastmod: g.lastUpdated,
  priority: '0.6',
  changefreq: 'monthly',
}))

// ─── Platform + app pages ───────────────────────────────────────────

const platforms = readJSON('platforms.json')
const platformSitemaps = []
const appDates = {}

for (const platform of platforms) {
  const { apps } = readJSON(`platforms/${platform.id}.json`)
  const appPages = apps.map((app) => {
    const path = `${platform.id}/${app.slug}`
    appDates[path] = pageDate(record, path, app, today)
    return { loc: `/${path}`, lastmod: appDates[path], priority: '0.6', changefreq: 'monthly' }
  })
  const platformPages = [
    { loc: `/${platform.id}`, lastmod: latest(appPages.map((p) => p.lastmod)), priority: '0.8', changefreq: 'weekly' },
    ...appPages,
  ]

  const filename = `sitemap-${platform.id}.xml`
  writeFileSync(join(ROOT, 'public', filename), buildUrlset(platformPages))
  platformSitemaps.push({ filename, count: platformPages.length, lastmod: latest(platformPages.map((p) => p.lastmod)) })
}

// ─── Comparison pages ───────────────────────────────────────────────
// A comparison is made of two shortcut lists: it changed when one of them did.

const { COMPARISONS } = await import('../src/data/comparisons.js')
const comparisons = COMPARISONS.map(c => ({
  loc: `/compare/${c.slugA}-vs-${c.slugB}`,
  lastmod: latest([appDates[`${c.platform}/${c.slugA}`], appDates[`${c.platform}/${c.slugB}`]]),
  priority: '0.6',
  changefreq: 'monthly',
}))
const comparePages = [
  { loc: '/compare', lastmod: latest(comparisons.map((p) => p.lastmod)), priority: '0.6', changefreq: 'monthly' },
  ...comparisons,
]

// The pages that list the others.
const listing = { '/': latest(Object.values(appDates)), '/cheat-sheets': latest(Object.values(appDates)), '/guides': latest(guidePages.map((p) => p.lastmod)) }
for (const page of staticPages) page.lastmod = listing[page.loc]

// ─── Write sub-sitemaps ─────────────────────────────────────────────

writeFileSync(join(ROOT, 'public', 'sitemap-pages.xml'), buildUrlset(staticPages))
writeFileSync(join(ROOT, 'public', 'sitemap-guides.xml'), buildUrlset(guidePages))
writeFileSync(join(ROOT, 'public', 'sitemap-compare.xml'), buildUrlset(comparePages))

// ─── Write sitemap index ────────────────────────────────────────────

const lastmodOf = (pages) => latest(pages.map((p) => p.lastmod))
const subSitemaps = [
  { filename: 'sitemap-pages.xml', lastmod: lastmodOf(staticPages) },
  { filename: 'sitemap-guides.xml', lastmod: lastmodOf(guidePages) },
  { filename: 'sitemap-compare.xml', lastmod: lastmodOf(comparePages) },
  ...platformSitemaps,
]

const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${subSitemaps.map(f => `  <sitemap>
    <loc>${SITE_ORIGIN}/${f.filename}</loc>${f.lastmod ? `
    <lastmod>${f.lastmod}</lastmod>` : ''}
  </sitemap>`).join('\n')}
</sitemapindex>
`

writeFileSync(join(ROOT, 'public/sitemap.xml'), sitemapIndex)

const totalUrls = staticPages.length + guidePages.length + comparePages.length +
  platformSitemaps.reduce((sum, s) => sum + s.count, 0)

console.log(`Sitemap index generated: ${subSitemaps.length} sub-sitemaps, ${totalUrls} total URLs`)
