#!/usr/bin/env node
/**
 * Set or remove the "official docs" link of an app in Supabase (apps.docs_url).
 * The link is per app, so it changes on every platform page of that app.
 * Afterwards run `pnpm export` (or edit public/data to match) and deploy.
 *
 * Usage:
 *   node scripts/set-docs-url.mjs <slug> <https-url>            # set
 *   node scripts/set-docs-url.mjs <slug> none                   # remove
 *   node scripts/set-docs-url.mjs <slug> <https-url> --dry-run  # show, write nothing
 *
 * Needs VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (.env, or the environment).
 * A new link must answer 200 to this script, or the write is refused.
 */
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
try { process.loadEnvFile(join(ROOT, '.env')) } catch { /* env vars from the environment */ }

const [slug, target, ...flags] = process.argv.slice(2)
const dryRun = flags.includes('--dry-run')

if (!slug || !target || !/^[a-z0-9-]+$/.test(slug)) {
  console.error('Usage: node scripts/set-docs-url.mjs <slug> <https-url | none> [--dry-run]')
  process.exit(1)
}

const docsUrl = target === 'none' ? null : target
if (docsUrl && !docsUrl.startsWith('https://')) {
  console.error(`Not an https address: ${docsUrl}`)
  process.exit(1)
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error('Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const REST = `${SUPABASE_URL}/rest/v1/apps?slug=eq.${slug}`
const HEADERS = { apikey: SERVICE_KEY, Authorization: `Bearer ${SERVICE_KEY}`, 'Content-Type': 'application/json' }

async function readRow() {
  const res = await fetch(`${REST}&select=slug,display_name,docs_url`, { headers: HEADERS })
  if (!res.ok) throw new Error(`Supabase read failed: ${res.status}`)
  const rows = await res.json()
  if (rows.length !== 1) throw new Error(`Expected one app with slug "${slug}", found ${rows.length}`)
  return rows[0]
}

if (docsUrl) {
  const page = await fetch(docsUrl, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0 (KeyShortcut link check)' } })
  if (page.status !== 200) {
    console.error(`The new link answers ${page.status}, not 200: ${docsUrl}`)
    process.exit(1)
  }
}

const before = await readRow()
console.log(`${before.display_name} (${slug})`)
console.log(`  was: ${before.docs_url ?? '(no link)'}`)
console.log(`  new: ${docsUrl ?? '(no link)'}`)

if (before.docs_url === docsUrl) {
  console.log('  Nothing to change.')
} else if (dryRun) {
  console.log('  (Dry run: nothing written)')
} else {
  const res = await fetch(REST, {
    method: 'PATCH',
    headers: { ...HEADERS, Prefer: 'return=minimal' },
    body: JSON.stringify({ docs_url: docsUrl }),
  })
  if (!res.ok) throw new Error(`Supabase write failed: ${res.status}`)
  const after = await readRow()
  if (after.docs_url !== docsUrl) throw new Error(`Written, but the row reads back as ${after.docs_url}`)
  console.log('  Written and read back.')
}
