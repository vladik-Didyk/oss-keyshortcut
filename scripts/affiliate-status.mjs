#!/usr/bin/env node
// Lists the affiliate programs of the site: which have a link, which wait for
// an application, where to apply. Reads two data files; no network, no keys.
//
//   node scripts/affiliate-status.mjs          the list
//   node scripts/affiliate-status.mjs --open   only programs not applied to yet

import { AFFILIATES, PLATFORM_FALLBACK } from '../src/data/affiliates.js'
import { AFFILIATE_PROGRAMS, HARDWARE_PROGRAMS, NO_PROGRAM, CHECKED } from '../src/data/affiliatePrograms.js'

const onlyOpen = process.argv.includes('--open')
const live = (entry) => /^https:\/\//.test(entry.url)

const pages = new Map()
for (const [slug, entry] of Object.entries(AFFILIATES)) {
  if (!pages.has(entry.program)) pages.set(entry.program, [])
  pages.get(entry.program).push({ where: slug, live: live(entry) })
}
for (const [platform, entry] of Object.entries(PLATFORM_FALLBACK)) {
  if (!pages.has(entry.program)) pages.set(entry.program, [])
  pages.get(entry.program).push({ where: `every ${platform} page without a link of its own`, live: live(entry) })
}

const ORDER = { live: 0, applied: 1, open: 2 }
const programs = Object.entries(AFFILIATE_PROGRAMS)
  .filter(([, program]) => !onlyOpen || program.state === 'open')
  .sort(([, a], [, b]) => ORDER[a.state] - ORDER[b.state])

console.log(`Affiliate programs, as read on ${CHECKED}\n`)
for (const [name, program] of programs) {
  const where = pages.get(name) || []
  const linked = where.filter((p) => p.live).length
  console.log(`${program.state.toUpperCase().padEnd(8)} ${name}`)
  console.log(`         pages:  ${where.map((p) => p.where).join(', ')}${where.length ? ` (${linked} of ${where.length} with a link)` : ''}`)
  if (program.pays) console.log(`         pays:   ${program.pays}`)
  if (program.apply) console.log(`         apply:  ${program.apply}`)
  if (program.note) console.log(`         note:   ${program.note}`)
  console.log()
}

if (!onlyOpen) {
  console.log('For later, no place on the site yet:')
  for (const [name, program] of Object.entries(HARDWARE_PROGRAMS)) console.log(`  ${name}: ${program.apply}`)
  console.log('\nChecked, no program to join:')
  for (const [slug, reason] of Object.entries(NO_PROGRAM)) console.log(`  ${slug}: ${reason}`)
}

console.log('\nWhen a program approves you: paste its tracking link into `url` of the app in src/data/affiliates.js,')
console.log('set the state of the program to \'live\' in src/data/affiliatePrograms.js, run the tests, deploy.')
