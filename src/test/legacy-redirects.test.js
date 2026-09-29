import { describe, it, expect, beforeAll } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import routerConfig from '../../react-router.config.ts'
import { pagePath, pageUrl, SITE_ORIGIN } from '../utils/siteUrl'
import { loader as legacyRoute } from '../routes/redirect-legacy'
import { INDEXNOW_KEY } from '../../scripts/lib/indexnow.mjs'
import {
  SHORT_LIST,
  allAddresses,
  readRules,
  followRule,
  followChain,
  judge,
} from '../../scripts/check-redirects.mjs'

const ROOT = process.cwd()
const read = (path) => readFileSync(join(ROOT, path), 'utf-8')

// The old addresses of the site: /shortcuts/... and /directory.
// This file checks the rules (public/_redirects) against the data, without a
// network. scripts/check-redirects.mjs asks a server that is running.

describe('legacy redirects: the rules', () => {
  const rules = readRules(ROOT)
  const redirected = SHORT_LIST.filter(([, to]) => to !== null)
  const leftAlone = SHORT_LIST.filter(([, to]) => to === null).map(([from]) => from)

  it.each(redirected)('%s goes to %s', (from, to) => {
    expect(followRule(rules, from)).toBe(to)
  })

  // The route is what `pnpm dev` and `pnpm preview` answer with. It leaves the
  // closing slash out; the page must be the same.
  it.each(redirected.filter(([from]) => from.startsWith('/shortcuts')))(
    '%s: the same page as src/routes/redirect-legacy.jsx',
    (from, to) => {
      const rest = from.replace(/^\/shortcuts\/?/, '')
      const response = legacyRoute({ params: { '*': rest } })
      expect(response.status).toBe(301)
      expect(pagePath(response.headers.get('Location'))).toBe(to)
    }
  )

  it('every rule is a 301 to the address that is served, so no second redirect follows', () => {
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.status).toBe(301)
      expect(rule.to).toBe(pagePath(rule.to))
    }
  })

  // "/macos/:splat/" answers "/shortcuts/figma/" with "/macos/figma//".
  it('no rule puts a slash after a splat', () => {
    for (const rule of rules) {
      expect(rule.to).not.toContain(':splat/')
    }
  })

  it.each([...leftAlone, '/shortcutsfoo', '/directory/foo', '/macos/figma/', '/'])(
    '%s is left alone',
    (path) => {
      expect(followRule(rules, path)).toBeNull()
    }
  )
})

describe('legacy redirects: every page in the data', () => {
  const rules = readRules(ROOT)
  const addresses = allAddresses(ROOT)
  const targets = [...new Set(addresses.map(([, to]) => to))]
  let routes

  beforeAll(async () => {
    routes = new Set(await routerConfig.prerender())
  })

  // "/macos/figma/" is the pre-rendered route "/macos/figma".
  const routeOf = (to) => (to === '/' ? to : to.replace(/\/$/, ''))

  it('has the old addresses of every platform and every app page', () => {
    const platforms = JSON.parse(read('public/data/platforms.json'))
    expect(platforms.length).toBeGreaterThan(0)
    for (const { id } of platforms) {
      const { apps } = JSON.parse(read(`public/data/platforms/${id}.json`))
      expect(apps.length).toBeGreaterThan(0)
      expect(targets).toContain(`/${id}/`)
      for (const { slug } of apps) expect(targets).toContain(`/${id}/${slug}/`)
    }
  })

  it('lists every address with and without the closing slash', () => {
    const listed = new Set(addresses.map(([from]) => from))
    const alone = [...listed].filter((from) => !listed.has(from.endsWith('/') ? from.slice(0, -1) : `${from}/`))
    expect(alone).toEqual([])
  })

  it('the rules send each old address to its page', () => {
    const wrong = addresses
      .map(([from, to]) => ({ from, to, got: followRule(rules, from) }))
      .filter(({ to, got }) => got !== to)
      .map(({ from, to, got }) => `${from}: goes to ${got}, expected ${to}`)
    expect(wrong).toEqual([])
  })

  it('each page an old address leads to exists: the build pre-renders it', () => {
    expect(routes.size).toBeGreaterThan(100)
    const missing = targets.filter((to) => !routes.has(routeOf(to)))
    expect(missing).toEqual([])
  })

  const buildDir = join(ROOT, 'build/client')
  it.skipIf(!existsSync(join(buildDir, 'index.html')))('each of those pages is a file in the build', () => {
    const missing = targets.filter((to) => !existsSync(join(buildDir, to, 'index.html')))
    expect(missing).toEqual([])
  })

  it('the short list names pages that are in the data', () => {
    const all = new Set(addresses.map(([from, to]) => `${from} ${to}`))
    const unknown = SHORT_LIST.filter(([from, to]) => to !== null && !all.has(`${from} ${to}`))
    expect(unknown).toEqual([])
  })
})

// keysticker.app was a copy of this site and now only redirects to it
// (deploy/keysticker-app, a Cloudflare Pages project of its own).
describe('keysticker.app: one redirect to the address that is served', () => {
  const rules = readRules(ROOT, 'deploy/keysticker-app/_redirects')
  const bothForms = (path) => (path === '/' ? [path] : [path, `${path}/`])
  let routes

  beforeAll(async () => {
    routes = await routerConfig.prerender()
  })

  const wrongAmong = (cases) =>
    cases
      .map(([from, to]) => ({ from, to, got: followRule(rules, from) }))
      .filter(({ to, got }) => got !== to)
      .map(({ from, to, got }) => `${from}: goes to ${got}, expected ${to}`)

  it('the homepage goes to the Mac app page', () => {
    expect(followRule(rules, '/')).toBe(pageUrl('/mac-hud'))
  })

  it('every page of the site, with and without the closing slash', () => {
    expect(routes.length).toBeGreaterThan(100)
    const cases = routes
      .filter((route) => route !== '/')
      .flatMap((route) => bothForms(route).map((from) => [from, pageUrl(route)]))
    expect(wrongAmong(cases)).toEqual([])
  })

  it('every old address goes straight to its page, not to the old address on the site', () => {
    const cases = allAddresses(ROOT).map(([from, to]) => [from, `${SITE_ORIGIN}${to}`])
    expect(wrongAmong(cases)).toEqual([])
  })

  it('a file keeps its name', () => {
    // Every file at the top level of public/, and llms.txt, which the build writes there.
    const topLevel = readdirSync(join(ROOT, 'public'), { withFileTypes: true })
      .filter((entry) => entry.isFile() && !entry.name.startsWith('_') && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
      .filter((name) => !name.endsWith('.html'))
      // The IndexNow key proves who owns keyshortcut.com. Nobody asks the old domain for it.
      .filter((name) => name !== `${INDEXNOW_KEY}.txt`)
    expect(topLevel.length).toBeGreaterThan(5)

    const inFolders = ['/images/og-image.png', '/images/app-icons/figma.webp', '/data/platforms.json', '/data/platforms/macos.json', '/assets/entry.client-abc123.js']
    const cases = [...new Set([...topLevel, 'llms.txt'])].map((name) => `/${name}`).concat(inFolders)
    expect(wrongAmong(cases.map((path) => [path, `${SITE_ORIGIN}${path}`]))).toEqual([])
  })

  it('/privacy.html goes to the address the privacy page is served at', () => {
    expect(followRule(rules, '/privacy.html')).toBe(pageUrl('/privacy'))
  })

  it('every rule is a 301 to keyshortcut.com, and none puts a slash after a splat', () => {
    expect(rules.length).toBeGreaterThan(0)
    for (const rule of rules) {
      expect(rule.status).toBe(301)
      expect(rule.to.startsWith(`${SITE_ORIGIN}/`)).toBe(true)
      expect(rule.to).not.toContain(':splat/')
    }
  })

  // Cloudflare Pages: 2,000 rules without a placeholder, 100 with one.
  it('stays inside the limits of Cloudflare Pages', () => {
    const dynamic = rules.filter((rule) => /[:*]/.test(rule.from))
    expect(dynamic.length).toBeLessThanOrEqual(100)
    expect(rules.length - dynamic.length).toBeLessThanOrEqual(2000)
  })

  it('the fallback page names the same address as the rule for the homepage', () => {
    const html = read('deploy/keysticker-app/index.html')
    expect(html).toContain(`<link rel="canonical" href="${pageUrl('/mac-hud')}" />`)
    expect(html).toContain(`url=${pageUrl('/mac-hud')}"`)
  })
})

describe('legacy redirects: reading what a server answers', () => {
  const to = '/macos/figma/'

  it('one 301 to the page, which answers 200, is fine', () => {
    expect(judge([{ status: 301, location: to }, { status: 200 }], to)).toEqual({ kind: 'ok' })
  })

  it('names what is wrong', () => {
    const problem = (chain, target = to) => {
      const verdict = judge(chain, target)
      expect(verdict.kind).toBe('wrong')
      return verdict.problem
    }
    expect(problem([{ status: 404 }])).toBe('no redirect, answers 404')
    expect(problem([{ status: 200 }])).toBe('no redirect, answers 200')
    expect(problem([{ status: 301, location: '/figma' }, { status: 404 }])).toBe('goes to /figma, expected /macos/figma/')
    expect(problem([{ status: 301, location: '/macos/figma' }, { status: 308, location: to }, { status: 200 }]))
      .toBe('goes to /macos/figma, expected /macos/figma/')
    expect(problem([{ status: 301, location: to }, { status: 308, location: '/macos/figma//' }, { status: 200 }]))
      .toBe('2 redirects, expected one')
    expect(problem([{ status: 302, location: to }, { status: 200 }])).toBe('redirects with 302, expected 301')
    expect(problem([{ status: 301, location: to }, { status: 404 }])).toBe('/macos/figma/ answers 404, expected 200')
  })

  it('an address with no page answers 404, without a redirect', () => {
    expect(judge([{ status: 404 }], null)).toEqual({ kind: 'ok' })
    expect(judge([{ status: 200 }], null)).toEqual({ kind: 'wrong', problem: 'answers 200, expected 404' })
    expect(judge([{ status: 301, location: '/macos/x/' }, { status: 404 }], null))
      .toEqual({ kind: 'wrong', problem: 'redirects to /macos/x/, expected the 404 page' })
  })

  // A server that refuses the robot, or is down, says nothing about the rules.
  it.each([0, 401, 403, 429, 500, 503])('status %i is no clear answer, not a wrong redirect', (status) => {
    expect(judge([{ status }], to).kind).toBe('unclear')
    expect(judge([{ status: 301, location: to }, { status }], to).kind).toBe('unclear')
    expect(judge([{ status }], null).kind).toBe('unclear')
  })

  // A server made of a table: address -> [status, Location].
  const server = (table) => async (url) => {
    const { pathname, search } = new URL(url)
    const [status, location] = table[pathname + search] || [404]
    return new Response(null, { status, headers: location ? { Location: location } : {} })
  }

  it('follows each redirect by hand and keeps every step', async () => {
    const fetchFn = server({
      '/shortcuts/figma': [301, '/macos/figma'],
      '/macos/figma': [308, 'https://site.test/macos/figma/'],
      '/macos/figma/': [200],
    })
    expect(await followChain('https://site.test', '/shortcuts/figma', fetchFn)).toEqual([
      { status: 301, location: '/macos/figma' },
      { status: 308, location: '/macos/figma/' },
      { status: 200 },
    ])
  })

  it('keeps the query string and a redirect to another site', async () => {
    const fetchFn = server({
      '/shortcuts/figma?ref=x': [301, '/macos/figma/?ref=x'],
      '/macos/figma/?ref=x': [200],
      '/out': [301, 'https://other.test/page'],
    })
    expect(await followChain('https://site.test', '/shortcuts/figma?ref=x', fetchFn)).toEqual([
      { status: 301, location: '/macos/figma/?ref=x' },
      { status: 200 },
    ])
    const out = await followChain('https://site.test', '/out', async (url) =>
      String(url).startsWith('https://other.test') ? new Response(null, { status: 200 }) : fetchFn(url))
    expect(out).toEqual([{ status: 301, location: 'https://other.test/page' }, { status: 200 }])
  })

  it('stops at a loop, and reports no answer as status 0', async () => {
    const loop = await followChain('https://site.test', '/a', server({ '/a': [301, '/b'], '/b': [301, '/a'] }))
    expect(loop.length).toBeLessThanOrEqual(6)
    expect(loop.at(-1).location).toBeDefined()
    expect(judge(loop, '/b').kind).toBe('wrong')

    const down = await followChain('https://site.test', '/a', async () => { throw new Error('no network') })
    expect(down).toEqual([{ status: 0 }])
  })
})

describe('legacy redirects: where the live check runs', () => {
  it('after the deploy, in the CI/CD workflow', () => {
    const ci = read('.github/workflows/ci.yml')
    const deploy = ci.indexOf('wrangler pages deploy')
    const check = ci.indexOf('node scripts/check-redirects.mjs')
    expect(deploy).toBeGreaterThan(-1)
    expect(check).toBeGreaterThan(deploy)
  })

  it('once a week, and by hand', () => {
    const weekly = read('.github/workflows/redirect-check.yml')
    expect(weekly).toContain('schedule:')
    expect(weekly).toContain('workflow_dispatch:')
    expect(weekly).toContain('node scripts/check-redirects.mjs')
  })

  it('as `pnpm check:redirects`', () => {
    const pkg = JSON.parse(read('package.json'))
    expect(pkg.scripts['check:redirects']).toBe('node scripts/check-redirects.mjs')
  })
})
