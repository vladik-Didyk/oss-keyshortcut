import { useState } from 'react'
import { Link } from 'react-router'
import { CONTENT } from '../data/content'
import { GUIDES } from '../data/guides/index.js'
import { COMPARISONS } from '../data/comparisons.js'
import { trackEvent } from '../lib/analytics'
import { openCookieSettings } from '../lib/consent'
import { HAS_AFFILIATE_LINKS } from '../data/affiliates'

// Turn a comparison slug pair into a readable label, e.g.
// { slugA: 'vscode', slugB: 'cursor' } → "VS Code vs Cursor".
const SLUG_LABELS = {
  vscode: 'VS Code',
  'sublime-text': 'Sublime Text',
  intellij: 'IntelliJ',
  'google-sheets': 'Google Sheets',
  'google-docs': 'Google Docs',
}
function prettySlug(slug) {
  if (SLUG_LABELS[slug]) return SLUG_LABELS[slug]
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

// Top resource links: static entry points + a few top guides + top comparisons.
const TOP_GUIDES = GUIDES.slice(0, 3).map((g) => ({
  label: g.title.length > 42 ? `${g.title.slice(0, 40)}…` : g.title,
  to: `/guides/${g.slug}`,
}))
const TOP_COMPARISONS = COMPARISONS.slice(0, 3).map((c) => ({
  label: `${prettySlug(c.slugA)} vs ${prettySlug(c.slugB)}`,
  to: `/compare/${c.slugA}-vs-${c.slugB}`,
}))

export default function Footer() {
  const year = new Date().getFullYear()
  const { footer } = CONTENT.shared
  const creator = CONTENT.about.cards.creator

  const resourceLinks = [
    ...footer.resourcesStaticLinks,
    ...TOP_GUIDES,
    ...TOP_COMPARISONS,
  ]

  return (
    <footer className="border-t border-theme-border pt-14 pb-8 px-5 md:px-6">
      <div className="mx-auto max-w-[980px]">

        {/* ─── Top: Logo + Columns ─── */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-10 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="flex items-center gap-2.5 no-underline mb-4">
              <img
                src="/images/app-icon.svg"
                alt="KeyShortcut icon"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <span className="text-[17px] font-semibold text-theme-text">{CONTENT.shared.siteName}</span>
            </Link>
            <p className="text-[14px] text-theme-muted leading-relaxed max-w-[240px]">
              {footer.tagline}
            </p>
          </div>

          {footer.columns.map((col) => (
            <FooterColumn key={col.heading} heading={col.heading} links={col.links} />
          ))}

          <FooterColumn heading={footer.popularAppsHeading} links={footer.popularApps} />

          <FooterColumn heading={footer.resourcesHeading} links={resourceLinks} />
        </div>

        {/* ─── Bottom bar ─── */}
        <div className="border-t border-theme-border pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex flex-col items-center sm:items-start gap-1">
            <span className="text-[13px] text-theme-muted">
              &copy; {year} {footer.copyright}
              {' · '}
              <button
                type="button"
                onClick={openCookieSettings}
                className="bg-transparent border-none p-0 cursor-pointer text-[13px] text-theme-muted underline underline-offset-2 hover:text-theme-text"
              >
                {footer.cookieSettings}
              </button>
            </span>
            {HAS_AFFILIATE_LINKS && (
              <span className="text-[12px] text-theme-muted">{footer.affiliateNote}</span>
            )}
          </div>

          {/* Created by badge */}
          <a href={creator.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 no-underline group">
            <FooterAvatar src={creator.avatar} name={creator.name} />
            <span className="flex flex-col">
              <span className="text-[11px] text-theme-muted leading-none">{creator.label}</span>
              <span className="text-[13px] font-medium text-theme-text group-hover:text-accent transition-colors leading-tight">{creator.name}</span>
            </span>
          </a>
        </div>
      </div>
    </footer>
  )
}

function FooterColumn({ heading, links }) {
  return (
    <div>
      <p className="text-[13px] font-semibold uppercase tracking-wider text-theme-text mb-3">{heading}</p>
      <ul className="flex flex-col">
        {links.map((link) => (
          <FooterLink key={link.to} to={link.to} heading={heading}>
            {link.label}
          </FooterLink>
        ))}
      </ul>
    </div>
  )
}

function FooterAvatar({ src, name }) {
  const [failed, setFailed] = useState(false)
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2)

  if (failed) {
    return (
      <span className="w-7 h-7 rounded-full bg-theme-accent text-theme-accent-text flex items-center justify-center text-[11px] font-semibold shrink-0">
        {initials}
      </span>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      width={28}
      height={28}
      className="w-7 h-7 rounded-full object-cover shrink-0"
      onError={() => setFailed(true)}
    />
  )
}

function FooterLink({ to, heading, children }) {
  const hasHash = to.includes('#')
  // py-1.5 inline-block gives ~36px touch targets with comfortable spacing.
  const cls = "text-[14px] text-theme-muted hover:text-theme-text transition-colors no-underline py-1.5 inline-block"
  const onClick = () => trackEvent('footer_link_clicked', { label: typeof children === 'string' ? children : to, to, section: heading })
  return (
    <li className="list-none">
      {hasHash ? (
        <a href={to} className={cls} onClick={onClick}>{children}</a>
      ) : (
        <Link to={to} className={cls} onClick={onClick}>{children}</Link>
      )}
    </li>
  )
}
