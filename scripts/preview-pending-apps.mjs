#!/usr/bin/env node
/**
 * Shows what the site's data would be with the files of content/pending-apps/
 * in it, without touching the database.
 *
 *   node scripts/preview-pending-apps.mjs                  # counts, per app
 *   node scripts/preview-pending-apps.mjs --out=<folder>   # also writes the merged platform files there
 *
 * It merges as `pnpm add-app` and `pnpm export` would: a new shortcut goes to
 * the end of its section, a new section to the end of its app, a new app to the
 * end of its platform. public/data is not written: it is an export, and the
 * next export would undo it.
 */
import { readFileSync, readdirSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { MODIFIER_SYMBOLS } from './shortcut-sync/pipeline/modifier-map.mjs'
import { inputFaults, PLATFORM_IDS } from './lib/app-input.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const json = (path) => JSON.parse(readFileSync(path, 'utf-8'))

export function pendingFiles(root = ROOT) {
  return PLATFORM_IDS.flatMap((platform) => {
    const dir = join(root, 'content/pending-apps', platform)
    if (!existsSync(dir)) return []
    return readdirSync(dir).filter((name) => name.endsWith('.json')).sort().map((name) => json(join(dir, name)))
  })
}

/** { macos: <platform file>, ... } with the pending files merged in. Input is not changed. */
export function mergePending(root = ROOT, inputs = pendingFiles(root)) {
  const categories = Object.fromEntries(json(join(root, 'public/data/categories.json')).map((c) => [c.id, c.display_name]))
  const platformNames = Object.fromEntries(json(join(root, 'public/data/platforms.json')).map((p) => [p.id, p.display_name]))
  const data = Object.fromEntries(PLATFORM_IDS.map((id) => [id, json(join(root, `public/data/platforms/${id}.json`))]))
  const report = []

  for (const input of inputs) {
    const faults = inputFaults(input)
    if (faults.length) throw new Error(`${input.platform}/${input.slug}: ${faults[0]}`)
    const platform = data[input.platform]
    let app = platform.apps.find((a) => a.slug === input.slug)
    const before = app?.shortcutCount ?? 0
    if (!app) {
      const known = PLATFORM_IDS.flatMap((id) => data[id].apps).find((a) => a.slug === input.slug)
      app = {
        slug: input.slug,
        displayName: input.displayName,
        category: known?.category || categories[input.category],
        shortcutCount: 0,
        iconUrl: known?.iconUrl || null,
        docsUrl: known?.docsUrl || input.docsUrl,
        sections: [],
      }
      platform.apps.push(app)
    }
    const symbols = MODIFIER_SYMBOLS[input.platform]
    for (const section of input.sections) {
      let target = app.sections.find((s) => s.name === section.name)
      if (!target) app.sections.push((target = { name: section.name, shortcuts: [] }))
      for (const { modifiers, key, action } of section.shortcuts) {
        target.shortcuts.push({ modifiers: modifiers.map((m) => symbols[m]), key, action })
      }
    }
    app.shortcutCount = app.sections.reduce((n, s) => n + s.shortcuts.length, 0)
    report.push({ platform: input.platform, slug: input.slug, before, after: app.shortcutCount, sections: app.sections.length })
  }

  // Which other platforms an app is on, for every platform.
  for (const id of PLATFORM_IDS) {
    data[id].otherPlatforms = Object.fromEntries(
      data[id].apps
        .map((app) => [
          app.slug,
          PLATFORM_IDS.filter((other) => other !== id && data[other].apps.some((a) => a.slug === app.slug)).map((other) => ({ id: other, name: platformNames[other] })),
        ])
        .filter(([, others]) => others.length),
    )
  }
  return { data, report }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = process.argv.find((a) => a.startsWith('--out='))?.split('=')[1]
  const { data, report } = mergePending()
  for (const row of report) {
    console.log(`${row.platform.padEnd(8)} ${row.slug.padEnd(18)} ${String(row.before).padStart(4)} -> ${String(row.after).padStart(4)} shortcuts, ${row.sections} sections${row.before ? '' : '   (new page)'}`)
  }
  const added = report.reduce((n, row) => n + row.after - row.before, 0)
  console.log(`\n${report.length} files, ${added} new shortcuts, ${report.filter((r) => !r.before).length} new pages`)
  if (out) {
    mkdirSync(join(out, 'platforms'), { recursive: true })
    for (const id of PLATFORM_IDS) writeFileSync(join(out, 'platforms', `${id}.json`), JSON.stringify(data[id], null, 2))
    console.log(`merged platform files written to ${out}/platforms`)
  }
}
