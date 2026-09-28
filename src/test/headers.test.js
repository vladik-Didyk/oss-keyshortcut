import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync, existsSync } from 'fs'
import { join } from 'path'
import routerConfig from '../../react-router.config.ts'
import { pagePath } from '../utils/siteUrl'

const ROOT = process.cwd()
const ONE_DAY = 86400

// The way Cloudflare Pages reads the file: a line that starts at the margin is
// a path, the indented lines under it are its headers, "#" starts a comment.
function readRules() {
  const rules = []
  for (const line of readFileSync(join(ROOT, 'public/_headers'), 'utf-8').split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue
    if (/^\s/.test(line)) {
      const [, name, value] = line.trim().match(/^([^:\s]+):\s*(.*)$/)
      rules.at(-1).headers[name] = value
    } else {
      rules.push({ path: line.trim(), headers: {} })
    }
  }
  return rules
}

// Every rule that matches a path applies. "*" is anything, ":name" is one path
// segment. A header set by two rules is sent with both values, comma-separated.
function headersFor(rules, path) {
  const headers = {}
  for (const rule of rules) {
    const pattern = rule.path
      .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/:(\w+)/g, '[^/]+')
    if (!new RegExp(`^${pattern}$`).test(path)) continue
    for (const [name, value] of Object.entries(rule.headers)) {
      headers[name] = name in headers ? `${headers[name]}, ${value}` : value
    }
  }
  return headers
}

const maxAge = (cacheControl) => Number(cacheControl.match(/max-age=(\d+)/)?.[1] ?? 0)

describe('public/_headers', () => {
  const rules = readRules()
  const rule = (path) => rules.filter((r) => r.path === path)

  it('keeps the security headers on every response', () => {
    expect(rule('/*')).toHaveLength(1)
    expect(rule('/*')[0].headers).toEqual({
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'camera=(), microphone=(), geolocation=(), payment=()',
    })
  })

  it('lets a browser keep a hashed asset for a year', () => {
    expect(rule('/assets/*')).toHaveLength(1)
    expect(rule('/assets/*')[0].headers).toEqual({
      'Cache-Control': 'public, max-age=31536000, immutable',
    })
  })

  it('sends a hashed asset the cache rule and the security headers', () => {
    const headers = headersFor(rules, '/assets/root-Ogupc5Q_.js')
    expect(headers['Cache-Control']).toBe('public, max-age=31536000, immutable')
    expect(headers['X-Frame-Options']).toBe('DENY')
    expect(headers['Strict-Transport-Security']).toBe('max-age=31536000; includeSubDomains; preload')
  })

  it('has one block per path and no header outside a block', () => {
    const paths = rules.map((r) => r.path)
    expect(new Set(paths).size).toBe(paths.length)
    for (const r of rules) {
      expect(r.path.startsWith('/'), `"${r.path}" is not a path`).toBe(true)
      expect(Object.keys(r.headers).length, `${r.path} has no headers`).toBeGreaterThan(0)
    }
  })

  // A file that keeps its name when its content changes would be stuck in
  // browsers for as long as the rule says.
  it('gives no long or immutable cache to a page or to a file without a hash', async () => {
    const pages = (await routerConfig.prerender()).flatMap((route) => [
      route,
      pagePath(route),
      `${pagePath(route)}index.html`,
      route === '/' ? '/_root.data' : `${route}.data`,
    ])
    const dataFiles = readdirSync(join(ROOT, 'public/data'), { recursive: true })
      .filter((name) => name.endsWith('.json'))
      .map((name) => `/data/${name}`)
    const files = [
      '/404.html',
      '/privacy.html',
      '/llms.txt',
      '/robots.txt',
      '/ads.txt',
      '/rss.xml',
      '/sitemap.xml',
      '/sitemap-macos.xml',
      '/manifest.json',
      '/favicon.ico',
      '/images/og-image.png',
      '/images/og/macos-figma.png',
      '/images/app-icons/figma.webp',
      '/images/avatar.webp',
    ]

    expect(dataFiles).toContain('/data/platforms/macos.json')
    for (const path of [...pages, ...dataFiles, ...files]) {
      const cacheControl = headersFor(rules, path)['Cache-Control'] ?? ''
      expect(cacheControl, `${path} is immutable`).not.toContain('immutable')
      expect(maxAge(cacheControl), `${path} is cached for ${maxAge(cacheControl)} s`).toBeLessThanOrEqual(ONE_DAY)
    }
  })

  // Everything in public/ is copied to the build as it is, without a hash.
  it('public/ has no assets folder of its own', () => {
    expect(existsSync(join(ROOT, 'public/assets'))).toBe(false)
  })

  const assetsDir = join(ROOT, 'build/client/assets')
  it.skipIf(!existsSync(assetsDir))('every file the build puts in /assets/ has a hash in its name', () => {
    const files = readdirSync(assetsDir, { recursive: true, withFileTypes: true }).filter((entry) => entry.isFile())
    expect(files.length).toBeGreaterThan(10)
    const unhashed = files.map((entry) => entry.name).filter((name) => !/-[A-Za-z0-9_-]{8}\.[a-z0-9]+$/.test(name))
    expect(unhashed).toEqual([])
  })
})
