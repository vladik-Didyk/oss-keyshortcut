import Link from './SiteLink'
import AppIcon from './directory/AppIcon'
import FaqAccordion from './FaqAccordion'
import { PlatformGlyph } from './PlatformIcons'
import { Keycap, CopyableShortcut, ShortcutList, ACTION_LINK } from './ShortcutKeys'
import { ChevronRight } from '../utils/icons'
import { CONTENT } from '../data/content'
import { shortcutDetailFaq } from '../utils/shortcutDetail'

const SECTION_TITLE = 'text-[13px] font-semibold uppercase tracking-wider text-theme-muted mb-3'

/**
 * The page about one shortcut: the keys, what they do, the same action on the
 * other platforms, five neighbours from the same section, two questions.
 * Everything is in the page as it is served. The top padding leaves room for
 * the navigation bar, which is fixed and 48 px high.
 */
export default function ShortcutDetailPage({ data }) {
  const c = CONTENT.shortcutDetail
  const { platformId, platformName, app, shortcut, others, related } = data
  const appPath = `/${platformId}/${app.slug}`
  const known = others.filter((o) => o.keys)
  const links = Object.fromEntries(related.filter((r) => r.to).map((r) => [r.action, r.to]))

  return (
    <article className="mx-auto max-w-[980px] px-5 md:px-6 pt-14 sm:pt-16 pb-16">
      <nav aria-label={c.breadcrumbLabel}>
        <ol className="flex flex-wrap items-center gap-x-1 gap-y-0 m-0 p-0 list-none text-[13px] text-theme-muted">
          {[
            { to: '/', label: c.breadcrumbHome },
            { to: `/${platformId}`, label: c.platformCrumb(platformName) },
            { to: appPath, label: app.displayName },
          ].map((crumb) => (
            <li key={crumb.to} className="inline-flex items-center gap-1">
              <Link to={crumb.to} className="inline-flex items-center min-h-[44px] sm:min-h-[32px] text-theme-muted hover:text-theme-text no-underline transition-colors">
                {crumb.label}
              </Link>
              <ChevronRight size={13} aria-hidden="true" />
            </li>
          ))}
          <li aria-current="page" className="text-theme-text">{shortcut.title}</li>
        </ol>
      </nav>

      <header className="mt-3 flex items-center gap-3">
        <AppIcon slug={app.slug} displayName={app.displayName} size={44} loading="eager" className="shrink-0" />
        <h1 className="text-2xl sm:text-[28px] font-bold tracking-tight leading-tight m-0">
          {c.h1(shortcut.title, app.displayName, platformName)}
        </h1>
      </header>

      <section className="mt-6 rounded-2xl bg-theme-base-alt border border-theme-border px-5 py-7 sm:px-8 sm:py-9">
        <p className="m-0 flex flex-wrap items-center gap-2" aria-hidden="true">
          {shortcut.parts.map((part, i) => (
            <kbd key={i} className="keycap keycap-large">{part}</kbd>
          ))}
        </p>
        <p className="mt-5 mb-0 text-[17px] leading-relaxed text-theme-text max-w-[720px]">
          {c.pressLead} <strong className="font-semibold whitespace-nowrap">{shortcut.words}</strong> {c.press(shortcut.press)}
        </p>
      </section>

      <section className="mt-9">
        <h2 className={SECTION_TITLE}>{c.whatTitle}</h2>
        <p className="m-0 text-[15px] leading-relaxed text-theme-text max-w-[720px]">{shortcut.what}</p>
      </section>

      {known.length > 0 && (
        <section className="mt-9 max-w-[720px]">
          <h2 className={SECTION_TITLE}>{c.othersTitle}</h2>
          <table className="w-full border-collapse text-[14px]">
            <thead className="sr-only">
              <tr><th scope="col">{c.othersHead.platform}</th><th scope="col">{c.othersHead.keys}</th></tr>
            </thead>
            <tbody className="divide-y divide-theme-border border-y border-theme-border">
              <tr>
                <th scope="row" className="py-3 pr-3 text-left font-semibold text-theme-text">
                  <span className="inline-flex items-center gap-2"><PlatformGlyph id={platformId} />{platformName}</span>
                  <span className="ml-2 font-normal text-theme-muted">{c.here}</span>
                </th>
                <td className="py-3 text-right">
                  <span className="sr-only">{shortcut.words}</span>
                  <span aria-hidden="true" className="inline-flex flex-wrap justify-end gap-1.5">{shortcut.parts.map((part, i) => <Keycap key={i}>{part}</Keycap>)}</span>
                </td>
              </tr>
              {others.map((other) => (
                <tr key={other.platformId}>
                  <th scope="row" className="py-3 pr-3 text-left font-medium text-theme-text">
                    <Link to={other.to} className={`inline-flex items-center gap-2 ${ACTION_LINK}`}>
                      <PlatformGlyph id={other.platformId} />{other.platformName}
                    </Link>
                  </th>
                  <td className="py-3 text-right">
                    {other.keys ? (
                      <CopyableShortcut parts={other.parts} action={shortcut.title} appSlug={app.slug} platform={other.platformId} />
                    ) : (
                      <span className="text-theme-muted">
                        <span aria-hidden="true">— </span>{c.noShortcut(app.displayName, other.platformName)}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {related.length > 0 && (
        <section className="mt-9 max-w-[720px]">
          <h2 className={SECTION_TITLE}>{c.relatedTitle(shortcut.sectionName, app.displayName)}</h2>
          <ShortcutList shortcuts={related} appSlug={app.slug} platform={platformId} links={links} />
        </section>
      )}

      <p className="mt-9 mb-0 text-[15px]">
        <Link to={appPath} className="font-semibold text-theme-text underline underline-offset-4 hover:opacity-80">
          {c.fullList(app.displayName, platformName, app.shortcutCount)}
        </Link>
        <span className="block mt-1 text-[13px] text-theme-muted">{c.fullListNote}</span>
      </p>

      <section className="mt-10 max-w-[720px]">
        <h2 className={SECTION_TITLE}>{c.faqTitle}</h2>
        <div className="flex flex-col gap-2">
          {shortcutDetailFaq(data).map((item) => (
            <FaqAccordion key={item.question} question={item.question} answer={item.answer} />
          ))}
        </div>
      </section>
    </article>
  )
}
