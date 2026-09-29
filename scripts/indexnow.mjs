#!/usr/bin/env node
/**
 * Reports new and changed pages to the search engines that read IndexNow.
 *
 *   node scripts/indexnow.mjs                 # pages changed in the last 2 days
 *   node scripts/indexnow.mjs --since=7       # ... in the last 7 days
 *   node scripts/indexnow.mjs --all           # every page of the sitemap (once, the first time)
 *   node scripts/indexnow.mjs --dry-run       # print the list, send nothing
 *   node scripts/indexnow.mjs --dir=build/client
 *
 * It reads the sitemap files of a build, so it reports what that build holds.
 * The days of change are real (see "Sitemap dates" in CLAUDE.md), which is what
 * makes "changed in the last 2 days" mean something.
 *
 * Exit code 0 also when the service refuses or is down: a deploy must not fail
 * because a search engine did not answer.
 */
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { INDEXNOW_ENDPOINT, INDEXNOW_KEY, readSitemap, changedSince, daysAgo, indexNowBody } from './lib/indexnow.mjs'
import { SITE_ORIGIN } from '../src/utils/siteUrl.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const ORIGIN = SITE_ORIGIN
const args = process.argv.slice(2)
const option = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split('=')[1]
const dir = join(ROOT, option('dir') || 'build/client')
const dryRun = args.includes('--dry-run')
const since = args.includes('--all') ? null : daysAgo(Number(option('since') || 2))

if (!existsSync(join(dir, `${INDEXNOW_KEY}.txt`))) {
  console.error(`indexnow: ${dir} has no key file. Build first (pnpm build).`)
  process.exit(dryRun ? 0 : 1)
}

const files = readdirSync(dir).filter((name) => /^sitemap-.*\.xml$/.test(name))
const entries = files.flatMap((name) => readSitemap(readFileSync(join(dir, name), 'utf-8')))
const urls = [...new Set(changedSince(entries, since))]

console.log(`indexnow: ${entries.length} pages in ${files.length} sitemap files, ${urls.length} ${since ? `changed since ${since}` : 'in all'}`)
if (urls.length === 0) process.exit(0)
if (dryRun) {
  for (const url of urls) console.log(`  ${url}`)
  process.exit(0)
}

try {
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(indexNowBody(ORIGIN, urls)),
  })
  // 200: taken. 202: taken, the key is still being checked.
  const taken = response.status === 200 || response.status === 202
  console.log(`indexnow: ${taken ? 'reported' : 'NOT reported'}, the service answered ${response.status}`)
} catch (error) {
  console.log(`indexnow: NOT reported, ${error.message}`)
}
