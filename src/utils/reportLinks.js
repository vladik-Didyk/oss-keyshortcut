/**
 * Links a visitor reports a problem with: an email to the address of the site,
 * or an issue in the public repository. Both arrive filled in with the app, the
 * platform and, when the visitor chose one, the shortcut.
 *
 * An email is private. An issue is public, so its forms ask for no address.
 */
import { REPO_URL } from '../data/siteConfig'
import { siteMailto } from './siteMailto'
import { pageUrl } from './siteUrl'

/**
 * What a visitor can report.
 *   template  the issue form in .github/ISSUE_TEMPLATE
 *   topic     subject of the email, start of the title of the issue
 *   ask       what the email asks for; the issue form asks the same in its fields
 *   about     'shortcut': the report can be about one shortcut of the page
 */
export const REPORT_KINDS = {
  wrong: {
    template: 'wrong-shortcut.yml',
    topic: 'Wrong shortcut',
    about: 'shortcut',
    ask: ['What it should be:', 'Where it is documented (link):'],
  },
  missing: {
    template: 'missing-shortcut.yml',
    topic: 'Missing shortcut',
    ask: ['Action:', 'Keys:', 'Where it is documented (link):'],
  },
  remove: {
    template: 'remove.yml',
    topic: 'Remove',
    about: 'shortcut',
    ask: ['What to remove:', 'Why:'],
  },
  app: {
    template: 'add-app.yml',
    topic: 'App suggestion',
    ask: ['App:', 'Where its shortcuts are listed (link):'],
  },
}

/** "Duplicate (⌘ + D)" */
const nameOf = (shortcut) => (shortcut ? `${shortcut.action} (${shortcut.keys})` : '')

/**
 * mailto: link.
 *   kind      a key of REPORT_KINDS
 *   page      path of the page the link is on ("/macos/figma")
 *   app       name of the app ("Figma"), platform its name ("macOS"); both absent on a page about no app
 *   shortcut  { action, keys } when the report is about one shortcut
 */
export function reportEmail({ kind, page, app, platform, shortcut }) {
  const { topic, about, ask } = REPORT_KINDS[kind]
  const lines = []
  if (app) lines.push(`App: ${app} (${platform})`)
  if (about === 'shortcut') lines.push(`Shortcut:${shortcut ? ` ${nameOf(shortcut)}` : ''}`)
  lines.push(...ask)
  return siteMailto({ topic, page, body: `${lines.join('\n')}\n` })
}

/** Link to a new issue, with the fields of its form filled in. Same arguments as reportEmail(). */
export function reportIssue({ kind, page, app, platform, shortcut }) {
  const { template, topic, about } = REPORT_KINDS[kind]
  const chosen = about === 'shortcut' ? shortcut : null
  const subject = [app && `${app} (${platform})`, chosen?.action].filter(Boolean).join(', ')
  const params = new URLSearchParams({ template, title: subject ? `${topic}: ${subject}` : `${topic}: ` })
  if (app) {
    params.set('app', app)
    params.set('platform', platform)
  }
  if (chosen) params.set('shortcut', nameOf(chosen))
  params.set('page', pageUrl(page))
  return `${REPO_URL}/issues/new?${params}`
}
