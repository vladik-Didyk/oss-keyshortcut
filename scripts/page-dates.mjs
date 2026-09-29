#!/usr/bin/env node
/**
 * Writes src/data/pageDates.json: for every app page, the day its shortcut
 * list last changed, read from the history of public/data/platforms/*.json.
 *
 * Usage: node scripts/page-dates.mjs [--check]
 *   --check  writes nothing; exits 1 when the record does not match the data
 *
 * Run it after `pnpm export`, before the commit. It needs the full history of
 * the repository (a shallow clone knows one commit). A list that differs from
 * the last commit gets today's date.
 */
import { execFileSync } from 'child_process'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { appsOf, pageHash } from './lib/page-dates.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const RECORD = join(ROOT, 'src/data/pageDates.json')
const check = process.argv.includes('--check')
const today = new Date().toISOString().slice(0, 10)

const git = (...args) => execFileSync('git', args, { cwd: ROOT, encoding: 'utf-8', maxBuffer: 64 * 1024 * 1024 })

if (git('rev-parse', '--is-shallow-repository').trim() === 'true') {
  console.error('page-dates: this is a shallow clone, the history is not here. Nothing written.')
  process.exit(1)
}

const platforms = JSON.parse(readFileSync(join(ROOT, 'public/data/platforms.json'), 'utf-8')).map((p) => p.id)
const pages = {}

for (const platform of platforms) {
  const file = `public/data/platforms/${platform}.json`
  // Oldest first: a later change of a page replaces its date.
  const commits = git('log', '--reverse', '--format=%H %cs', '--', file).trim().split('\n').filter(Boolean)
  const states = commits.map((line) => {
    const [hash, day] = line.split(' ')
    return { day, apps: appsOf(JSON.parse(git('show', `${hash}:${file}`))) }
  })
  states.push({ day: today, apps: appsOf(JSON.parse(readFileSync(join(ROOT, file), 'utf-8'))) })

  for (const { day, apps } of states) {
    for (const app of apps) {
      const path = `${platform}/${app.slug}`
      const hash = pageHash(app)
      if (pages[path]?.hash !== hash) pages[path] = { changed: day, hash }
    }
  }
  // Pages the data no longer has.
  const now = new Set(states.at(-1).apps.map((app) => `${platform}/${app.slug}`))
  for (const path of Object.keys(pages)) {
    if (path.startsWith(`${platform}/`) && !now.has(path)) delete pages[path]
  }
}

const sorted = Object.fromEntries(Object.keys(pages).sort().map((path) => [path, pages[path]]))
const before = existsSync(RECORD) ? JSON.parse(readFileSync(RECORD, 'utf-8')).pages : {}
const changed = Object.keys(sorted).filter((path) => before[path]?.hash !== sorted[path].hash || before[path]?.changed !== sorted[path].changed)

if (check) {
  if (changed.length) {
    console.error(`page-dates: the record is behind the data for ${changed.length} page(s): ${changed.slice(0, 8).join(', ')}`)
    console.error('Run: node scripts/page-dates.mjs')
    process.exit(1)
  }
  console.log(`page-dates: OK, ${Object.keys(sorted).length} pages`)
} else {
  writeFileSync(RECORD, `${JSON.stringify({ pages: sorted }, null, 2)}\n`)
  console.log(`page-dates: ${Object.keys(sorted).length} pages written, ${changed.length} changed`)
}
