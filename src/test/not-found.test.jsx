import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createRoutesStub, UNSAFE_ErrorResponseImpl as ErrorResponse } from 'react-router'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import * as root from '../root'
import * as catchAll from '../routes/catch-all'
import { CONTENT } from '../data/content'

const ROOT = process.cwd()
const notFound = new ErrorResponse(404, 'Not Found', 'Not Found')

describe('not-found page', () => {
  it('the catch-all route answers 404', () => {
    let thrown
    try {
      catchAll.loader()
    } catch (response) {
      thrown = response
    }
    expect(thrown).toBeInstanceOf(Response)
    expect(thrown.status).toBe(404)
  })

  // 404.html is one file, hydrated at whatever address was asked for. An error
  // held by the catch-all route crashes hydration at an address that matches
  // another route ("/macos/typo" matches the app page route). The root matches all.
  it('the catch-all route leaves the error to the root route', () => {
    expect(catchAll.ErrorBoundary).toBeUndefined()
    expect(root.ErrorBoundary).toBeTypeOf('function')
  })

  it('renders the navbar, the 404 message and the footer', async () => {
    const Stub = createRoutesStub([
      {
        path: '/',
        ErrorBoundary: root.ErrorBoundary,
        children: [{ path: '*', loader: catchAll.loader, Component: catchAll.default }],
      },
    ])
    render(<Stub initialEntries={['/no/such/page']} />)

    expect(await screen.findByText(CONTENT.shared.notFound.title)).toBeInTheDocument()
    expect(screen.getByText(CONTENT.shared.notFound.subtitle)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: CONTENT.shared.notFound.button })).toHaveAttribute('href', '/')
    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('has the catch-all title, noindex and no canonical', () => {
    const meta = root.meta({ error: notFound })
    expect(meta).toContainEqual({ title: CONTENT.meta.catchAll.title })
    expect(meta).toContainEqual({ name: 'robots', content: 'noindex' })
    expect(meta.some((tag) => tag.rel === 'canonical' || tag.property === 'og:url')).toBe(false)
  })

  it('the root route adds no meta to any other page', () => {
    expect(root.meta({})).toEqual([])
    expect(root.meta({ error: new Error('boom') })).toEqual([])
    expect(root.meta({ error: new ErrorResponse(500, 'Server Error', '') })).toEqual([])
  })
})

describe('404.html in the build', () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8'))
  const buildDir = join(ROOT, 'build/client')
  const built = existsSync(join(buildDir, '404.html'))

  it('`pnpm build` writes it after the React Router build', () => {
    expect(pkg.scripts.build).toMatch(/react-router build && node scripts\/generate-404\.mjs$/)
  })

  it('no redirect rule sends unknown URLs to a page with status 200', () => {
    const rules = readFileSync(join(ROOT, 'public/_redirects'), 'utf-8')
      .split('\n')
      .filter((line) => line.trim() && !line.startsWith('#'))
    for (const rule of rules) {
      expect(rule).not.toMatch(/^\/\*\s/)
    }
  })

  it.skipIf(!built)('is the not-found page', () => {
    const html = readFileSync(join(buildDir, '404.html'), 'utf-8')
    expect(html).toContain(`<title>${CONTENT.meta.catchAll.title}</title>`)
    expect(html).toContain('<meta name="robots" content="noindex"/>')
    expect(html).not.toContain('rel="canonical"')
    expect(html).toContain(CONTENT.shared.notFound.subtitle)
    expect(html).toContain('<nav')
    expect(html).toContain('<footer')
  })

  it.skipIf(!built)('is not also published as a page at /404/', () => {
    expect(existsSync(join(buildDir, '404/index.html'))).toBe(false)
    expect(existsSync(join(buildDir, '404.data'))).toBe(false)
  })

  it.skipIf(!built)('no other page of the build is noindex', () => {
    for (const page of ['index.html', 'macos/index.html', 'macos/figma/index.html', 'about/index.html']) {
      expect(readFileSync(join(buildDir, page), 'utf-8')).not.toContain('noindex')
    }
  })
})
