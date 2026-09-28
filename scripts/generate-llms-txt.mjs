#!/usr/bin/env node
/**
 * Generates public/llms.txt: a short plain-text description of the site for AI
 * assistants and their crawlers (https://llmstxt.org).
 *
 * Every number is computed from public/data/ on each build, and every link is
 * built from the same data as the pre-rendered routes, so neither goes stale.
 * Facts only: what the site is, who runs it, where the shortcuts come from,
 * where things are. No claims about traffic.
 * src/test/llms-txt.test.js fails on a link that is not a page or a file of the site.
 */
import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { computeSiteStats } from './site-stats.mjs'
import { SITE_ORIGIN, pageUrl } from '../src/utils/siteUrl.js'
import { GUIDES } from '../src/data/guides/index.js'
import { COMPARISONS } from '../src/data/comparisons.js'

const __filename = fileURLToPath(import.meta.url)
const ROOT = join(dirname(__filename), '..')

// Named on the About page (CONTENT.about.cards.creator in src/data/content.js).
const MAINTAINER = 'Vladik Didyk'

// App pages shown as examples. One that is not in the data is left out.
const EXAMPLE_PAGES = [
  ['macos', 'figma'],
  ['macos', 'vscode'],
  ['windows', 'chrome'],
  ['windows', 'excel'],
  ['linux', 'blender'],
]

const count = (n) => n.toLocaleString('en-US')

export function buildLlmsTxt(root = ROOT) {
  const readJSON = (path) => JSON.parse(readFileSync(join(root, 'public/data', path), 'utf-8'))

  const stats = computeSiteStats(root)
  const platforms = readJSON('platforms.json').map((p) => ({
    id: p.id,
    name: p.display_name,
    apps: readJSON(`platforms/${p.id}.json`).apps,
  }))
  const appPages = platforms.flatMap((p) => p.apps)
  const withDocs = appPages.filter((a) => a.docsUrl).length
  const platformNames = new Intl.ListFormat('en', { type: 'conjunction' }).format(platforms.map((p) => p.name))

  const examples = EXAMPLE_PAGES.flatMap(([platformId, slug]) => {
    const platform = platforms.find((p) => p.id === platformId)
    const app = platform?.apps.find((a) => a.slug === slug)
    return app
      ? [`- [${app.displayName} on ${platform.name}](${pageUrl(`/${platformId}/${slug}`)}): ${count(app.shortcutCount)} shortcuts`]
      : []
  })

  return `# KeyShortcut

> KeyShortcut is a free directory of keyboard shortcuts for apps on ${platformNames}. It has ${count(appPages.length)} app pages covering ${count(stats.appCount)} apps and ${count(stats.shortcutCount)} shortcuts.

KeyShortcut is built and maintained by ${MAINTAINER}. Shortcuts are taken from each app's official documentation: ${count(withDocs)} of the ${count(appPages.length)} app pages link to the documentation page they were taken from. The numbers in this file are computed from the site's data on every build.

## Platforms

${platforms.map((p) => `- [${p.name} shortcuts](${pageUrl(`/${p.id}`)}): ${count(p.apps.length)} apps, ${count(stats.byPlatform[p.id].shortcutCount)} shortcuts`).join('\n')}

## App pages

One page per app and platform, at /{platform}/{app}/. Each lists the app's shortcuts by section. Examples:

${examples.join('\n')}

## Other sections

- [Guides](${pageUrl('/guides')}): ${count(GUIDES.length)} articles about learning and using keyboard shortcuts
- [Comparisons](${pageUrl('/compare')}): ${count(COMPARISONS.length)} side-by-side comparisons of the shortcuts of two apps
- [Cheat sheets](${pageUrl('/cheat-sheets')}): the shortcuts of any app as a printable PDF
- [KeyShortcut for Mac](${pageUrl('/mac-hud')}): the Mac app, a floating panel with the shortcuts of the active app
- [About](${pageUrl('/about')}): who built the site, how shortcuts are checked, how the site is funded
- [Privacy policy](${pageUrl('/privacy')})
- [Sitemap](${SITE_ORIGIN}/sitemap.xml)

## Data

The shortcuts of every app page, as JSON:

${platforms.map((p) => `- [${p.name}](${SITE_ORIGIN}/data/platforms/${p.id}.json)`).join('\n')}
- [Platforms and categories](${SITE_ORIGIN}/data/manifest.json)
`
}

if (process.argv[1] === __filename) {
  writeFileSync(join(ROOT, 'public/llms.txt'), buildLlmsTxt())
  console.log('llms.txt generated')
}
