import { describe, it, expect } from 'vitest'
import { readFileSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

import { pagePath } from '../utils/siteUrl'
import { loader as legacyRoute } from '../routes/redirect-legacy'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '../..')

function readRedirects() {
  return readFileSync(join(ROOT, 'public/_redirects'), 'utf-8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))
    .map((line) => {
      const [from, to, status] = line.split(/\s+/)
      return { from, to, status: Number(status) }
    })
}

const hasPlaceholder = (rule) => /[:*]/.test(rule.from)

// The way Cloudflare Pages reads the file: a rule without a placeholder or a
// splat matches the path exactly and is tried first; the others follow in file
// order. ":name" is one path segment, "*" is anything.
function followRedirect(rules, path) {
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

describe('deployment config', () => {
  describe('react-router.config.ts', () => {
    const configPath = join(ROOT, 'react-router.config.ts')
    const configContent = readFileSync(configPath, 'utf-8')

    it('disables lazy route discovery for static hosting', () => {
      // React Router v7 defaults to lazy route discovery which fetches /__manifest
      // on client-side navigation. This endpoint doesn't exist on static hosts
      // (Cloudflare Pages, Netlify, etc.) causing JSON parse errors.
      // mode: "initial" includes all routes upfront — required for static hosting.
      expect(configContent).toContain('routeDiscovery')
      expect(configContent).toMatch(/mode:\s*["']initial["']/)
    })

    it('enables SSR for pre-rendering', () => {
      expect(configContent).toMatch(/ssr:\s*true/)
    })

    it('has a prerender function', () => {
      expect(configContent).toContain('prerender')
    })
  })

  describe('Cloudflare Pages config', () => {
    it('has _headers file with security headers', () => {
      const headersPath = join(ROOT, 'public/_headers')
      expect(existsSync(headersPath)).toBe(true)
      const content = readFileSync(headersPath, 'utf-8')
      expect(content).toContain('X-Frame-Options')
      expect(content).toContain('Strict-Transport-Security')
    })
  })

  describe('legacy redirects (public/_redirects)', () => {
    const rules = readRedirects()

    // Each was one 301 to a page that answers 200, measured with
    // `wrangler pages dev` on 2026-09-28.
    const LEGACY = [
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
    ]

    it.each(LEGACY)('%s goes to %s', (from, to) => {
      expect(followRedirect(rules, from)).toBe(to)
    })

    // The route is what `pnpm dev` and `pnpm preview` answer with. It leaves the
    // closing slash out; the page must be the same.
    it.each(LEGACY.filter(([from]) => from.startsWith('/shortcuts')))(
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

    it.each(['/shortcuts/macos/figma/extra', '/shortcutsfoo', '/directory/foo', '/macos/figma/', '/'])(
      '%s is left alone',
      (path) => {
        expect(followRedirect(rules, path)).toBeNull()
      }
    )
  })

  describe('build output (if built)', () => {
    const buildDir = join(ROOT, 'build/client')

    // Only run if build exists — these validate after `pnpm build`
    const buildExists = existsSync(buildDir)

    it.skipIf(!buildExists)('pre-renders .data files alongside HTML', () => {
      // React Router generates .data files for client-side navigation.
      // If these are missing, clicking links on the site will fail.
      const dataFile = join(buildDir, 'macos/asana.data')
      const htmlFile = join(buildDir, 'macos/asana/index.html')
      expect(existsSync(dataFile)).toBe(true)
      expect(existsSync(htmlFile)).toBe(true)
    })

    it.skipIf(!buildExists)('.data files contain valid JSON-like data', () => {
      const dataFile = join(buildDir, 'macos/asana.data')
      const content = readFileSync(dataFile, 'utf-8')
      // React Router .data files start with a JSON array
      expect(content.startsWith('[')).toBe(true)
      // Must NOT be HTML (the bug we fixed)
      expect(content).not.toContain('<!DOCTYPE')
    })

    it.skipIf(!buildExists)('generates root data file', () => {
      expect(existsSync(join(buildDir, '_root.data'))).toBe(true)
    })
  })
})
