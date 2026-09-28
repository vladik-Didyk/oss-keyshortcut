import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { join } from 'path'
import { classify, collectLinks, buildReport } from '../../scripts/check-docs-links.mjs'
import { computeSiteStats } from '../../scripts/site-stats.mjs'

const read = (path) => readFileSync(join(process.cwd(), path), 'utf-8')

describe('docs link check', () => {
  it('tells a dead link from a site that refuses robots', () => {
    expect(classify(200)).toBe('ok')
    expect(classify(404)).toBe('dead')
    expect(classify(410)).toBe('dead')
    expect(classify(403)).toBe('blocked')
    expect(classify(418)).toBe('blocked')
    expect(classify(503)).toBe('unknown')
    expect(classify(0)).toBe('unknown')
  })

  it('checks every docs link the site shows, each address once', () => {
    const links = collectLinks(process.cwd())
    const pages = links.flatMap((link) => link.pages)
    expect(pages).toHaveLength(computeSiteStats(process.cwd()).pagesWithDocs)
    expect(new Set(links.map((link) => link.url)).size).toBe(links.length)
    for (const { url } of links) expect(url).toMatch(/^https:\/\//)
  })

  it('reports dead links first, with the pages that carry them', () => {
    const report = buildReport([
      { url: 'https://a.test/ok', pages: ['macos/a'], status: 200, kind: 'ok' },
      { url: 'https://b.test/gone', pages: ['macos/b', 'windows/b'], status: 404, kind: 'dead' },
      { url: 'https://c.test/robots', pages: ['macos/c'], status: 403, kind: 'blocked' },
    ], '2026-09-28')
    expect(report).toContain('Checked 3 links on 2026-09-28: 1 open, 1 dead, 1 refuse robots, 0 gave no clear answer.')
    expect(report).toContain('| macos/b, windows/b | 404 | https://b.test/gone |')
    expect(report.indexOf('### Dead')).toBeLessThan(report.indexOf('### Refuse robots'))
    expect(buildReport([{ url: 'https://a.test/ok', pages: ['macos/a'], status: 200, kind: 'ok' }], '2026-09-28')).toContain('No dead links.')
  })
})

describe('the workflows', () => {
  it('the link check needs no secret of the site and writes nothing to it', () => {
    const workflow = read('.github/workflows/docs-link-check.yml')
    expect(workflow).toContain('contents: read')
    expect(workflow.match(/secrets\.[A-Z_]+/g)).toEqual(['secrets.GITHUB_TOKEN'])
    expect(workflow).not.toMatch(/SUPABASE|GEMINI|wrangler|git push/)
  })

  it('the shortcut sync does not start by itself, and is a dry run unless told otherwise', () => {
    const workflow = read('.github/workflows/shortcut-sync.yml')
    expect(workflow).not.toMatch(/^\s*schedule:/m)
    expect(workflow).not.toContain('cron:')
    expect(workflow).toMatch(/dry_run:[\s\S]*?default: true/)
  })
})
