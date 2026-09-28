#!/usr/bin/env node
/**
 * Checks the "official docs" link of every app page: does the address still answer?
 * Reads the links from public/data/ (what the site shows). No database, no AI,
 * no keys, and it writes nothing but its report.
 *
 * Usage:
 *   node scripts/check-docs-links.mjs                   # print the report
 *   node scripts/check-docs-links.mjs --report=out.md   # also write it to a file
 *
 * Exit code: 0 when the check ran, also when it found dead links (the report
 * and the workflow's issue carry them). 1 only when the check itself broke.
 *
 * Used by .github/workflows/docs-link-check.yml, once a week.
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { fileURLToPath } from 'url'

const USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'
const TIMEOUT_MS = 20000
const PARALLEL = 6

/**
 * What an answer means for a visitor who clicks the link.
 *   ok       the page opens
 *   dead     the page is gone: the link has to be replaced
 *   blocked  the site refuses robots; the page usually opens for a person
 *   unknown  no answer or a server error: may be down for the moment
 */
export function classify(status) {
  if (status >= 200 && status < 300) return 'ok'
  if (status === 404 || status === 410) return 'dead'
  if ([401, 403, 405, 418, 429].includes(status)) return 'blocked'
  return 'unknown'
}

/** [{ url, pages: ['macos/figma', ...] }] for every docs link the site shows. */
export function collectLinks(root = process.cwd()) {
  const dataDir = join(root, 'public/data')
  const platforms = JSON.parse(readFileSync(join(dataDir, 'platforms.json'), 'utf-8'))
  const byUrl = new Map()
  for (const { id } of platforms) {
    const { apps } = JSON.parse(readFileSync(join(dataDir, `platforms/${id}.json`), 'utf-8'))
    for (const app of apps) {
      if (!app.docsUrl) continue
      if (!byUrl.has(app.docsUrl)) byUrl.set(app.docsUrl, [])
      byUrl.get(app.docsUrl).push(`${id}/${app.slug}`)
    }
  }
  return [...byUrl].map(([url, pages]) => ({ url, pages }))
}

/** The HTTP status the address answers with, asked the way a browser asks. 0 = no answer. */
export async function statusOf(url) {
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: 'follow',
        headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,*/*' },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
      // A dead answer is asked for twice: some sites answer 404 to a first, cold request.
      if (classify(res.status) === 'ok' || attempt === 2) return res.status
    } catch {
      if (attempt === 2) return 0
    }
  }
  return 0
}

/** The report as Markdown. `results`: [{ url, pages, status, kind }]. */
export function buildReport(results, date) {
  const of = (kind) => results.filter((r) => r.kind === kind)
  const rows = (list) => list.map((r) => `| ${r.pages.join(', ')} | ${r.status || 'no answer'} | ${r.url} |`).join('\n')
  const table = (list) => `| Pages | Answer | Link |\n|---|---|---|\n${rows(list)}`
  const dead = of('dead')
  const unknown = of('unknown')
  const blocked = of('blocked')

  return [
    `Checked ${results.length} links on ${date}: ${of('ok').length} open, ${dead.length} dead, ${blocked.length} refuse robots, ${unknown.length} gave no clear answer.`,
    dead.length ? `\n### Dead: replace these\n\n${table(dead)}\n\nReplace one with \`node scripts/set-docs-url.mjs <slug> <new address>\`, then export and deploy.` : '\nNo dead links.',
    unknown.length ? `\n### No clear answer: look again next week\n\n${table(unknown)}` : '',
    blocked.length ? `\n### Refuse robots\n\nThese sites answer a robot with an error. The page usually opens for a person.\n\n${table(blocked)}` : '',
  ].filter(Boolean).join('\n')
}

async function main() {
  const links = collectLinks()
  const results = []
  for (let i = 0; i < links.length; i += PARALLEL) {
    const batch = links.slice(i, i + PARALLEL)
    const statuses = await Promise.all(batch.map((link) => statusOf(link.url)))
    batch.forEach((link, k) => results.push({ ...link, status: statuses[k], kind: classify(statuses[k]) }))
  }

  const report = buildReport(results, new Date().toISOString().slice(0, 10))
  console.log(report)

  const reportArg = process.argv.find((arg) => arg.startsWith('--report='))
  if (reportArg) writeFileSync(reportArg.slice('--report='.length), report + '\n')

  // For the workflow: how many dead links, as a step output.
  if (process.env.GITHUB_OUTPUT) {
    writeFileSync(process.env.GITHUB_OUTPUT, `dead=${results.filter((r) => r.kind === 'dead').length}\n`, { flag: 'a' })
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error)
    process.exit(1)
  })
}
