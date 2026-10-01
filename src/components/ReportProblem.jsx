import { useState } from 'react'
import { ChevronDown, Flag, Mail, X } from '../utils/icons'
import { CONTENT } from '../data/content'
import { SUPPORT_EMAIL } from '../data/siteConfig'
import { reportEmail, reportGmail, reportIssue } from '../utils/reportLinks'
import { trackEvent } from '../lib/analytics'

const KINDS = ['wrong', 'missing', 'remove']

const LINK =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] px-2.5 sm:px-3 rounded-lg text-[13px] text-theme-text no-underline hover:bg-theme-surface transition-colors'

function GitHubMark({ size }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true">
      <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
    </svg>
  )
}

/**
 * "Report a problem": what to fix, to add or to remove, by email or as an issue
 * on GitHub. A native <details>, so it is in the page as it is served and opens
 * without JavaScript.
 *
 *   page         path of the page ("/macos/figma")
 *   app          { slug, displayName }
 *   platform     { id, name }
 *   shortcut     { action, keys } when the visitor chose a row, else null
 *   onClear      takes the chosen shortcut back
 *   detailsRef   the page opens the panel from the flag of a row
 */
export default function ReportProblem({ page, app, platform, shortcut, onClear, detailsRef, className = '' }) {
  const copy = CONTENT.shortcutPage.report
  const about = { page, app: app.displayName, platform: platform.name, shortcut }
  const count = (kind, channel) => () =>
    trackEvent('report_link_clicked', { kind, channel, app: app.slug, platform: platform.id, shortcut: shortcut?.action ?? null })
  // The kind of the last Email click. An email link opens the computer's mail
  // app; for a visitor without one, the panel then offers Gmail and the address.
  const [emailed, setEmailed] = useState(null)
  const [copied, setCopied] = useState(false)
  const copyAddress = () => {
    count(emailed, 'copy')()
    navigator.clipboard?.writeText(SUPPORT_EMAIL).then(() => setCopied(true), () => {})
  }

  return (
    <details ref={detailsRef} className={`group rounded-2xl border border-theme-border bg-theme-base ${className}`}>
      <summary className="focus-ring-inset flex items-center gap-2 px-5 min-h-[48px] cursor-pointer select-none rounded-2xl text-[14px] font-medium text-theme-text list-none [&::-webkit-details-marker]:hidden">
        <Flag size={14} className="text-theme-muted shrink-0" aria-hidden="true" />
        {copy.title}
        <ChevronDown size={16} aria-hidden="true" className="ml-auto shrink-0 text-theme-muted transition-transform group-open:rotate-180" />
      </summary>

      {/* Not the shape of an FAQ answer (details > summary + div > p): a test counts those. */}
      <section className="px-5 pb-4" aria-label={copy.title}>
        {shortcut && (
          <p className="flex items-center gap-1 mb-1 text-[13px] text-theme-muted">
            <span>
              {copy.aboutLabel} <span className="text-theme-text">{shortcut.action}</span> ({shortcut.keys})
            </span>
            <button
              type="button"
              onClick={onClear}
              aria-label={copy.clearLabel}
              title={copy.clearLabel}
              className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] sm:min-w-[32px] sm:min-h-[32px] -my-2 bg-transparent border-none rounded-full text-theme-muted hover:text-theme-text cursor-pointer"
            >
              <X size={14} aria-hidden="true" />
            </button>
          </p>
        )}

        <ul className="divide-y divide-theme-border">
          {KINDS.map((kind) => (
            <li key={kind} className="flex items-center justify-between gap-3 py-1">
              <span className="text-[14px] text-theme-text">{copy.kinds[kind]}</span>
              <span className="flex items-center gap-1 -mr-2.5 sm:-mr-3 shrink-0">
                <a
                  href={reportEmail({ kind, ...about })}
                  onClick={() => {
                    count(kind, 'email')()
                    setEmailed(kind)
                    setCopied(false)
                  }}
                  className={LINK}
                >
                  <Mail size={14} className="text-theme-muted" aria-hidden="true" />
                  {copy.email}
                </a>
                <a
                  href={reportIssue({ kind, ...about })}
                  onClick={count(kind, 'github')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={LINK}
                >
                  <span className="text-theme-muted inline-flex"><GitHubMark size={14} /></span>
                  {copy.github}
                </a>
              </span>
            </li>
          ))}
        </ul>

        {emailed && (
          <p role="status" className="mt-2 flex flex-wrap items-center gap-x-3 text-[13px] text-theme-muted">
            <span>{copy.mailHelp}</span>
            <a
              href={reportGmail({ kind: emailed, ...about })}
              onClick={count(emailed, 'gmail')}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center min-h-[44px] sm:min-h-[32px] text-theme-text underline underline-offset-2 hover:no-underline"
            >
              {copy.gmail}
            </a>
            <button
              type="button"
              onClick={copyAddress}
              className="inline-flex items-center min-h-[44px] sm:min-h-[32px] p-0 bg-transparent border-none text-theme-text underline underline-offset-2 hover:no-underline cursor-pointer"
            >
              {copied ? copy.copied : copy.copyAddress(SUPPORT_EMAIL)}
            </button>
          </p>
        )}

        <p className="mt-3 text-[12px] text-theme-muted">{copy.note}</p>
      </section>
    </details>
  )
}
