import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest'
import { render, screen, within, fireEvent } from '@testing-library/react'
import { renderToString } from 'react-dom/server'
import { createRoutesStub } from 'react-router'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'
import ShortcutPage from '../components/ShortcutPage'
import CreatorBanner from '../components/CreatorBanner'
import { CONTENT } from '../data/content'
import { REPO_URL, SUPPORT_EMAIL } from '../data/siteConfig'
import { MAIL_TAG } from '../utils/siteMailto'
import { pageUrl } from '../utils/siteUrl'
import { REPORT_KINDS, reportEmail, reportGmail, reportIssue } from '../utils/reportLinks'
import { trackEvent } from '../lib/analytics'

vi.mock('../lib/analytics', async (importOriginal) => ({
  ...(await importOriginal()),
  trackEvent: vi.fn(),
}))

beforeAll(() => {
  // jsdom has no IntersectionObserver (useScrollspy).
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const ROOT = process.cwd()
const read = (path) => readFileSync(join(ROOT, path), 'utf-8')
const TEMPLATES = '.github/ISSUE_TEMPLATE'

// A visitor tells the developer what to fix, add or remove: by email, or as an
// issue in the public repository. Both arrive filled in.

const figma = { page: '/macos/figma', app: 'Figma', platform: 'macOS' }
const duplicate = { action: 'Duplicate', keys: '⌘ + D' }

const mailOf = (href) => {
  const [address, query] = href.replace('mailto:', '').split('?')
  const params = new URLSearchParams(query)
  return { address, subject: params.get('subject'), body: params.get('body') }
}

describe('report by email', () => {
  it('goes to the address of the site, tagged, and names the page it was written from', () => {
    const mail = mailOf(reportEmail({ kind: 'wrong', ...figma }))
    expect(mail.address).toBe(SUPPORT_EMAIL)
    expect(mail.subject).toBe(`${MAIL_TAG} Wrong shortcut`)
    expect(mail.body).toContain('App: Figma (macOS)')
    expect(mail.body).toContain(`Sent from ${pageUrl('/macos/figma')}`)
  })

  it('names the shortcut when the visitor chose one', () => {
    expect(mailOf(reportEmail({ kind: 'wrong', ...figma, shortcut: duplicate })).body).toContain('Shortcut: Duplicate (⌘ + D)')
    expect(mailOf(reportEmail({ kind: 'wrong', ...figma })).body).toContain('Shortcut:\n')
  })

  it.each(Object.keys(REPORT_KINDS))('%s: asks for what the developer needs to act', (kind) => {
    const { body } = mailOf(reportEmail({ kind, ...figma }))
    for (const line of REPORT_KINDS[kind].ask) expect(body).toContain(line)
  })
})

describe('report on GitHub', () => {
  const fieldsOf = (template) => [...read(`${TEMPLATES}/${template}`).matchAll(/^\s+id: ([a-z_]+)$/gm)].map((m) => m[1])

  it('opens a new issue in the repository of the site', () => {
    const url = new URL(reportIssue({ kind: 'wrong', ...figma, shortcut: duplicate }))
    expect(`${url.origin}${url.pathname}`).toBe(`${REPO_URL}/issues/new`)
    expect(url.searchParams.get('title')).toBe('Wrong shortcut: Figma (macOS), Duplicate')
    expect(url.searchParams.get('app')).toBe('Figma')
    expect(url.searchParams.get('platform')).toBe('macOS')
    expect(url.searchParams.get('shortcut')).toBe('Duplicate (⌘ + D)')
    expect(url.searchParams.get('page')).toBe(pageUrl('/macos/figma'))
  })

  it.each(Object.entries(REPORT_KINDS))('%s: the form exists, and every value the link carries has a field in it', (kind, { template }) => {
    const fields = fieldsOf(template)
    const url = new URL(reportIssue({ kind, ...figma, shortcut: duplicate }))
    expect(url.searchParams.get('template')).toBe(template)
    for (const name of url.searchParams.keys()) {
      if (name === 'template' || name === 'title') continue
      expect(fields, `${template} has no field "${name}"`).toContain(name)
    }
  })

  it('every form has a name, a description, and a label that exists in the repository', () => {
    // The labels GitHub gives every repository. A form with another label loses it silently.
    const labels = ['bug', 'documentation', 'duplicate', 'enhancement', 'good first issue', 'help wanted', 'invalid', 'question', 'wontfix']
    const forms = readdirSync(join(ROOT, TEMPLATES)).filter((file) => file !== 'config.yml')
    expect(forms.sort()).toEqual(Object.values(REPORT_KINDS).map((k) => k.template).sort())
    for (const form of forms) {
      const text = read(`${TEMPLATES}/${form}`)
      expect(text).toMatch(/^name: .+$/m)
      expect(text).toMatch(/^description: .+$/m)
      const used = text.match(/^labels: \[(.*)\]$/m)[1].split(',').map((l) => l.trim().replace(/"/g, ''))
      for (const label of used) expect(labels).toContain(label)
    }
  })

  it('no form asks for an email address: an issue is public', () => {
    for (const { template } of Object.values(REPORT_KINDS)) {
      expect(read(`${TEMPLATES}/${template}`)).not.toMatch(/e-?mail/i)
    }
  })

  it('the address of the repository is written once', () => {
    expect(read('src/data/content.js')).not.toMatch(/github\.com\/vladik-Didyk\/[A-Za-z]/)
    expect(read('src/utils/reportLinks.js')).not.toContain('github.com')
  })
})

const APP = {
  slug: 'test-app',
  displayName: 'Test App',
  category: 'Design',
  shortcutCount: 3,
  docsUrl: 'https://example.com/shortcuts',
  sections: [
    {
      name: 'General',
      shortcuts: [
        { action: 'Command Palette', modifiers: ['⌘', '⇧'], key: 'P' },
        { action: 'Delete Line', modifiers: ['⌘'], key: '⌫' },
        { action: 'Settings', modifiers: ['⌘'], key: ',' },
      ],
    },
  ],
}

function page() {
  const data = { platformId: 'macos', platformName: 'macOS', app: APP, otherPlatforms: [], relatedApps: [], moreApps: [], otherPlatformsMap: {} }
  const Stub = createRoutesStub([{ id: 'app', path: '/:platformId/:slug', Component: ShortcutPage }])
  return <Stub initialEntries={['/macos/test-app']} hydrationData={{ loaderData: { app: data } }} />
}

describe('report by Gmail, for a visitor without a mail app', () => {
  it('is the same message as the email, in a Gmail compose window', () => {
    const mail = mailOf(reportEmail({ kind: 'wrong', ...figma, shortcut: duplicate }))
    const url = new URL(reportGmail({ kind: 'wrong', ...figma, shortcut: duplicate }))
    expect(url.origin + url.pathname).toBe('https://mail.google.com/mail/')
    expect(url.searchParams.get('view')).toBe('cm')
    expect(url.searchParams.get('to')).toBe(SUPPORT_EMAIL)
    expect(url.searchParams.get('su')).toBe(mail.subject)
    expect(url.searchParams.get('body')).toBe(mail.body)
  })
})

describe('report panel on an app page', () => {
  const copy = CONTENT.shortcutPage.report
  const panel = () => screen.getByText(copy.title).closest('details')

  beforeEach(() => vi.mocked(trackEvent).mockClear())

  it('is in the page as it is served, closed, and opens without JavaScript', () => {
    const html = renderToString(page())
    expect(html).toContain(copy.title)
    expect(html).toContain(`${REPO_URL}/issues/new`)
    expect(html).toContain(`mailto:${SUPPORT_EMAIL}`)
    render(page())
    expect(panel()).not.toHaveAttribute('open')
  })

  it('offers to fix, to add and to remove, each by email and on GitHub', () => {
    render(page())
    const rows = within(panel()).getAllByRole('listitem')
    expect(rows.map((row) => row.firstChild.textContent)).toEqual([copy.kinds.wrong, copy.kinds.missing, copy.kinds.remove])
    for (const row of rows) {
      const [email, github] = within(row).getAllByRole('link')
      expect(email).toHaveAttribute('href', expect.stringMatching(/^mailto:/))
      expect(github).toHaveAttribute('href', expect.stringContaining('/issues/new?'))
      expect(github).toHaveAttribute('target', '_blank')
      expect(github).toHaveAttribute('rel', expect.stringContaining('noopener'))
    }
  })

  it('names the app and the platform in every link', () => {
    render(page())
    for (const link of within(panel()).getAllByRole('link')) {
      expect(decodeURIComponent(link.getAttribute('href').replace(/\+/g, ' '))).toContain('Test App')
    }
  })

  it('says which of the two is public', () => {
    render(page())
    expect(panel()).toHaveTextContent(copy.note)
    expect(copy.note).toMatch(/GitHub is public/)
  })

  it('every link is 44 px high on a phone', () => {
    render(page())
    for (const link of within(panel()).getAllByRole('link')) {
      expect(link.className.split(/\s+/)).toContain('min-h-[44px]')
    }
  })

  it('counts a click, with the kind and the way', () => {
    render(page())
    const [email, github] = within(within(panel()).getAllByRole('listitem')[0]).getAllByRole('link')
    fireEvent.click(github)
    expect(trackEvent).toHaveBeenCalledWith('report_link_clicked', expect.objectContaining({ kind: 'wrong', channel: 'github', app: 'test-app', platform: 'macos' }))
    fireEvent.click(email)
    expect(trackEvent).toHaveBeenCalledWith('report_link_clicked', expect.objectContaining({ kind: 'wrong', channel: 'email' }))
  })

  it('after a click on Email, offers Gmail and the address, for a computer with no mail app', () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
    render(page())
    expect(within(panel()).queryByText(copy.mailHelp)).toBeNull()
    const [email] = within(within(panel()).getAllByRole('listitem')[1]).getAllByRole('link')
    fireEvent.click(email)
    const help = within(panel()).getByRole('status')
    expect(help).toHaveTextContent(copy.mailHelp)
    const gmail = within(help).getByRole('link', { name: copy.gmail })
    expect(gmail).toHaveAttribute('target', '_blank')
    expect(new URL(gmail.getAttribute('href')).searchParams.get('su')).toBe(`${MAIL_TAG} ${REPORT_KINDS.missing.topic}`)
    fireEvent.click(within(help).getByRole('button', { name: copy.copyAddress(SUPPORT_EMAIL) }))
    expect(writeText).toHaveBeenCalledWith(SUPPORT_EMAIL)
    expect(trackEvent).toHaveBeenCalledWith('report_link_clicked', expect.objectContaining({ kind: 'missing', channel: 'copy' }))
  })

  it('adds no button to the rows of the page as it is served', () => {
    // The flag of a row is drawn in the browser, for a mouse only: 119 of them
    // would weigh on the HTML of the Figma page and on a phone.
    expect(renderToString(page())).not.toContain(copy.rowLabel('Command Palette'))
  })
})

describe('the flag of a row, where there is a mouse', () => {
  const copy = CONTENT.shortcutPage.report
  const panel = () => screen.getByText(copy.title).closest('details')

  beforeEach(() => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
    Element.prototype.scrollIntoView = vi.fn()
  })

  it('opens the panel about that shortcut, and the links carry it', async () => {
    render(page())
    fireEvent.click(await screen.findByRole('button', { name: copy.rowLabel('Delete Line') }))
    expect(panel()).toHaveAttribute('open')
    expect(panel()).toHaveTextContent('Delete Line')
    const [email, github] = within(within(panel()).getAllByRole('listitem')[0]).getAllByRole('link')
    expect(mailOf(email.getAttribute('href')).body).toContain('Shortcut: Delete Line (⌘ + ⌫)')
    expect(new URL(github.getAttribute('href')).searchParams.get('shortcut')).toBe('Delete Line (⌘ + ⌫)')
  })

  it('can be taken back: the report is about the page again', async () => {
    render(page())
    fireEvent.click(await screen.findByRole('button', { name: copy.rowLabel('Delete Line') }))
    fireEvent.click(within(panel()).getByRole('button', { name: copy.clearLabel }))
    expect(panel()).not.toHaveTextContent('Delete Line')
    const [email] = within(panel()).getAllByRole('link')
    expect(mailOf(email.getAttribute('href')).body).toContain('Shortcut:\n')
  })

  it('stays out of the way of the keyboard: the panel is the way in', async () => {
    render(page())
    const flag = await screen.findByRole('button', { name: copy.rowLabel('Delete Line') })
    expect(flag).toHaveAttribute('tabindex', '-1')
  })
})

describe('About page', () => {
  const { missing, openSource } = CONTENT.about.cards

  it('an app can be suggested by email or on GitHub', () => {
    render(<CreatorBanner />)
    expect(screen.getByRole('link', { name: missing.buttonLabel })).toHaveAttribute('href', expect.stringMatching(/^mailto:/))
    const github = screen.getByRole('link', { name: missing.githubLabel })
    expect(new URL(github.getAttribute('href')).searchParams.get('template')).toBe(REPORT_KINDS.app.template)
  })

  it('links to the repository under its present name', () => {
    expect(openSource.buttonHref).toBe(REPO_URL)
    expect(REPO_URL).toMatch(/\/oss-keyshortcut$/)
  })
})
