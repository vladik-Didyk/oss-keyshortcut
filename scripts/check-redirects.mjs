#!/usr/bin/env node
/**
 * Checks the old addresses of the site (/shortcuts/..., /directory) on a server
 * that is running: each must answer with one 301 and end at a page that answers 200.
 *
 * The rules are in public/_redirects. src/test/legacy-redirects.test.js checks
 * the file against the data; this script checks what the server does with it.
 * It only reads: GET requests, no keys, nothing is written.
 *
 * Usage:
 *   node scripts/check-redirects.mjs                         # keyshortcut.com, the short list
 *   node scripts/check-redirects.mjs http://127.0.0.1:8862   # `wrangler pages dev build/client`
 *   node scripts/check-redirects.mjs --all                   # the old addresses of every page in public/data
 *   node scripts/check-redirects.mjs --wait=90               # after a deploy: ask again for up to 90 seconds
 *
 * Exit code: 1 when an address answers wrongly. 0 otherwise, also when the
 * server gave no clear answer (it refused the robot, or is down): that says
 * nothing about the rules and is printed as a warning.
 *
 * Used by .github/workflows/ci.yml after the deploy, and once a week by
 * .github/workflows/redirect-check.yml.
 */
import { readFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { SITE_ORIGIN } from '../src/utils/siteUrl.js'

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const TIMEOUT_MS = 20000
const PARALLEL = 6
const MAX_STEPS = 6
const RETRY_EVERY_MS = 10000

// No platform in an old address means macOS, as in src/routes/redirect-legacy.jsx.
const DEFAULT_PLATFORM = 'macos'

/**
 * Asked on every run: [old address, where it must go]. `null` = no redirect,
 * the 404 page. Each redirect was one 301 to a page that answers 200, measured
 * on keyshortcut.com on 2026-09-28.
 */
export const SHORT_LIST = [
  ['/shortcuts/figma', '/macos/figma/'],
  ['/shortcuts/figma/', '/macos/figma/'],
  ['/shortcuts/macos/figma', '/macos/figma/'],
  ['/shortcuts/macos/figma/', '/macos/figma/'],
  ['/shortcuts/windows/chrome', '/windows/chrome/'],
  ['/shortcuts/windows/chrome/', '/windows/chrome/'],
  ['/shortcuts/linux/vim', '/linux/vim/'],
  ['/shortcuts/linux/vim/', '/linux/vim/'],
  ['/shortcuts', '/macos/'],
  ['/shortcuts/', '/macos/'],
  ['/shortcuts/macos', '/macos/'],
  ['/shortcuts/macos/', '/macos/'],
  ['/shortcuts/windows', '/windows/'],
  ['/shortcuts/windows/', '/windows/'],
  ['/shortcuts/linux', '/linux/'],
  ['/shortcuts/linux/', '/linux/'],
  ['/directory', '/'],
  ['/directory/', '/'],
  ['/shortcuts/macos/figma/extra', null],
]

/** The old addresses of every page in public/data: [[from, to], ...], each with and without the closing slash. */
export function allAddresses(root = process.cwd()) {
  const dataDir = join(root, 'public/data')
  const readJSON = (file) => JSON.parse(readFileSync(join(dataDir, file), 'utf-8'))
  const platforms = readJSON('platforms.json').map((platform) => platform.id)
  const both = (from, to) => [[from, to], [`${from}/`, to]]

  const list = [...both('/directory', '/'), ...both('/shortcuts', `/${DEFAULT_PLATFORM}/`)]
  for (const id of platforms) {
    list.push(...both(`/shortcuts/${id}`, `/${id}/`))
    for (const { slug } of readJSON(`platforms/${id}.json`).apps) {
      list.push(...both(`/shortcuts/${id}/${slug}`, `/${id}/${slug}/`))
      // "/shortcuts/macos" is the macOS index, not the page of the app named macOS.
      if (id === DEFAULT_PLATFORM && !platforms.includes(slug)) {
        list.push(...both(`/shortcuts/${slug}`, `/${id}/${slug}/`))
      }
    }
  }
  return list
}

/** The rules of public/_redirects: [{ from, to, status }]. */
export function readRules(root = process.cwd()) {
  return readFileSync(join(root, 'public/_redirects'), 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status] = line.split(/\s+/)
      return { from, to, status: Number(status) }
    })
}

const hasPlaceholder = (rule) => /[:*]/.test(rule.from)

/**
 * Where the rules send a path, or null. Read the way Cloudflare Pages reads
 * the file: a rule without a placeholder or a splat matches the path exactly
 * and is tried first; the others follow in file order. ":name" is one path
 * segment, "*" is anything.
 */
export function followRule(rules, path) {
  const exact = rules.find((rule) => !hasPlaceholder(rule) && rule.from === path)
  if (exact) return exact.to

  for (const rule of rules.filter(hasPlaceholder)) {
    const pattern = rule.from
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '(?<splat>.*)')
      .replace(/:(\w+)/g, '(?<$1>[^/]+)')
    const match = path.match(new RegExp(`^${pattern}$`))
    if (match) return rule.to.replace(/:(\w+)/g, (_, name) => match.groups[name])
  }
  return null
}

/**
 * What the server answers, step by step: [{ status, location? }, ...].
 * Each redirect is followed by hand, so every step is seen. `location` is a
 * path on the same site, or a full address on another. Status 0 = no answer.
 */
export async function followChain(base, from, fetchFn = fetch) {
  const chain = []
  let url = new URL(base.replace(/\/$/, '') + from)

  for (let step = 0; step < MAX_STEPS; step++) {
    let response
    try {
      response = await fetchFn(url, {
        redirect: 'manual',
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      chain.push({ status: 0 })
      break
    }
    response.body?.cancel().catch(() => {})

    const location = response.headers.get('location')
    if (response.status < 300 || response.status >= 400 || !location) {
      chain.push({ status: response.status })
      break
    }
    const next = new URL(location, url)
    chain.push({
      status: response.status,
      location: next.origin === url.origin ? next.pathname + next.search : next.href,
    })
    url = next
  }
  return chain
}

// The server refused the robot, or is down. It says nothing about the rules.
const isUnclear = (status) => status === 0 || [401, 403, 429].includes(status) || status >= 500

/**
 * Is this what the old address must answer? `to` is the page it must go to,
 * or null when it must get the 404 page.
 * { kind: 'ok' } | { kind: 'wrong', problem } | { kind: 'unclear', problem }
 */
export function judge(chain, to) {
  const wrong = (problem) => ({ kind: 'wrong', problem })
  const unclear = chain.find((step) => isUnclear(step.status))
  if (unclear) {
    return { kind: 'unclear', problem: unclear.status ? `the server answered ${unclear.status}` : 'no answer' }
  }

  const redirects = chain.filter((step) => step.location)
  const last = chain.at(-1)

  if (to === null) {
    if (redirects.length) return wrong(`redirects to ${redirects[0].location}, expected the 404 page`)
    if (last.status !== 404) return wrong(`answers ${last.status}, expected 404`)
    return { kind: 'ok' }
  }

  if (!redirects.length) return wrong(`no redirect, answers ${last.status}`)
  if (redirects[0].location !== to) return wrong(`goes to ${redirects[0].location}, expected ${to}`)
  if (redirects[0].status !== 301) return wrong(`redirects with ${redirects[0].status}, expected 301`)
  if (redirects.length > 1) return wrong(`${redirects.length} redirects, expected one`)
  if (last.status !== 200) return wrong(`${to} answers ${last.status}, expected 200`)
  return { kind: 'ok' }
}

/** "/shortcuts/figma  ->  301 /macos/figma/  ->  200" */
export function describeChain(from, chain) {
  const steps = chain.map((step) => (step.location ? `${step.status} ${step.location}` : step.status || 'no answer'))
  return [from, ...steps].join('  ->  ')
}

async function checkList(base, list) {
  const results = []
  for (let i = 0; i < list.length; i += PARALLEL) {
    const batch = list.slice(i, i + PARALLEL)
    const chains = await Promise.all(batch.map(([from]) => followChain(base, from)))
    batch.forEach(([from, to], k) => results.push({ from, to, chain: chains[k], ...judge(chains[k], to) }))
  }
  return results
}

async function main() {
  const args = process.argv.slice(2)
  const base = args.find((arg) => /^https?:\/\//.test(arg)) || SITE_ORIGIN
  const wait = Number(args.find((arg) => arg.startsWith('--wait='))?.slice('--wait='.length) || 0)
  const list = args.includes('--all')
    ? [...allAddresses(), ...SHORT_LIST.filter(([, to]) => to === null)]
    : SHORT_LIST

  let results = await checkList(base, list)

  // After a deploy the new rules take a moment to answer everywhere.
  const deadline = Date.now() + wait * 1000
  while (results.some((result) => result.kind !== 'ok') && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, RETRY_EVERY_MS))
    const again = await checkList(base, results.filter((r) => r.kind !== 'ok').map((r) => [r.from, r.to]))
    results = results.map((result) => again.find((r) => r.from === result.from) || result)
  }

  const of = (kind) => results.filter((result) => result.kind === kind)
  const wrong = of('wrong')
  const unclear = of('unclear')
  console.log(`Checked ${results.length} old addresses on ${base}: ${of('ok').length} fine, ${wrong.length} wrong, ${unclear.length} without a clear answer.\n`)

  const label = { ok: 'ok     ', wrong: 'WRONG  ', unclear: 'unclear' }
  const shown = results.length > 50 ? results.filter((result) => result.kind !== 'ok') : results
  for (const { from, chain, kind, problem } of shown) {
    console.log(`${label[kind]}  ${describeChain(from, chain)}${problem ? `      ${problem}` : ''}`)
  }

  // GitHub shows these lines on the summary page of the run.
  if (process.env.GITHUB_ACTIONS) {
    for (const { from, problem } of wrong) console.log(`::error title=Old address answers wrongly::${from}: ${problem}`)
    if (unclear.length) {
      console.log(`::warning title=Old addresses not checked::${unclear.length} of ${results.length} got no clear answer from ${base} (${unclear[0].problem}). The rules were not judged.`)
    }
  }

  if (wrong.length) process.exit(1)
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
