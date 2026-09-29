#!/usr/bin/env node
// Builds the PDF bundle: every cheat sheet of a platform in one file.
//
//   node scripts/build-pdf-bundle.mjs            macOS → dist/products/
//   node scripts/build-pdf-bundle.mjs windows    another platform
//   node scripts/build-pdf-bundle.mjs --out dir  another folder
//
// The file is the product that is sold (src/data/products.js). It is written
// under dist/, which git ignores and the site does not serve: upload it to
// the seller by hand. Reads public/data only: no network, no keys.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildBundle } from '../src/utils/generateShortcutPDF.js'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const outAt = args.indexOf('--out')
const outDir = outAt >= 0 ? resolve(args[outAt + 1]) : join(root, 'dist', 'products')
const platform = args.find((arg, i) => !arg.startsWith('--') && i !== outAt + 1) || 'macos'

const platforms = JSON.parse(readFileSync(join(root, 'public/data/platforms.json'), 'utf8'))
const found = platforms.find((p) => p.id === platform)
if (!found) {
  console.error(`No platform "${platform}". Known: ${platforms.map((p) => p.id).join(', ')}`)
  process.exit(1)
}

const { apps } = JSON.parse(readFileSync(join(root, `public/data/platforms/${platform}.json`), 'utf8'))
const date = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const bundle = buildBundle({ apps, platformName: found.display_name, date })

mkdirSync(outDir, { recursive: true })
const file = join(outDir, `keyshortcut-${platform}-cheat-sheets.pdf`)
const bytes = Buffer.from(bundle.doc.output('arraybuffer'))
writeFileSync(file, bytes)

console.log(`${file}`)
console.log(`${bundle.apps} apps, ${bundle.shortcuts} shortcuts, ${bundle.pages} pages, ${(bytes.length / 1024 / 1024).toFixed(1)} MB`)
