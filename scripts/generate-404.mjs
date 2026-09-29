#!/usr/bin/env node
/**
 * Save the site's not-found page as build/client/404.html. Last step of `pnpm build`.
 *
 * Why: a Cloudflare Pages site without a 404.html is treated as a single-page
 * app. Every unknown URL is answered with index.html and status 200. With the
 * file, an unknown URL gets this page and status 404.
 *
 * The pre-renderer can't write it (it refuses any response that isn't 200), so
 * this asks the server build that `react-router build` leaves in build/server.
 * The page is the root route's ErrorBoundary; see the note there (src/root.jsx).
 *
 * Usage: node scripts/generate-404.mjs [buildDir]   buildDir defaults to build
 */
import { existsSync, writeFileSync } from 'fs'
import { join, resolve } from 'path'
import { pathToFileURL } from 'url'
import { createRequestHandler } from 'react-router'

const buildDir = resolve(process.argv[2] || 'build')
const serverBuild = join(buildDir, 'server/index.js')
const outFile = join(buildDir, 'client/404.html')

// Four segments: no route but the catch-all ("*") matches it. The longest
// route of the site has three (/macos/vscode/toggle-comment).
const UNKNOWN_PATH = '/404/not/found/here'

function fail(message) {
  console.error(`generate-404: ${message}`)
  process.exit(1)
}

if (!existsSync(serverBuild)) fail(`${serverBuild} not found. Run react-router build first.`)

const build = await import(pathToFileURL(serverBuild).href)
const handler = createRequestHandler(build, 'production')
const response = await handler(new Request(`http://localhost${UNKNOWN_PATH}`))
const html = await response.text()

if (response.status !== 404) fail(`expected status 404 for ${UNKNOWN_PATH}, got ${response.status}`)

const checks = [
  ['<meta name="robots" content="noindex"/>', true, 'the noindex tag is missing (is the 404 still handled by the root route?)'],
  ['<nav', true, 'the navbar is missing'],
  ['<footer', true, 'the footer is missing'],
  ['rel="canonical"', false, 'a not-found page must not have a canonical link'],
  [UNKNOWN_PATH, false, `the placeholder path ${UNKNOWN_PATH} is in the page`],
]
for (const [needle, expected, message] of checks) {
  if (html.includes(needle) !== expected) fail(message)
}

writeFileSync(outFile, html)
console.log(`404 page generated: ${outFile}`)
