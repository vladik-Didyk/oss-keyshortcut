import { ThumbsUp, ThumbsDown, CircleCheck, Eye, Download } from '../utils/icons'
import { CONTENT } from '../data/content'

const BUTTON =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[36px] min-w-[88px] px-4 whitespace-nowrap rounded-full border text-[13px] font-medium cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-border-hover'
const CHOSEN = 'bg-theme-accent text-theme-accent-text border-theme-accent'
const OPEN = 'bg-theme-base text-theme-text border-theme-border hover:border-theme-border-hover'

/**
 * The numbers a page may show, as one quiet line. Renders nothing when the
 * server sent none.
 */
export function ProofLine({ numbers, className = '' }) {
  const c = CONTENT.shortcutPage.feedback
  const facts = [
    numbers.confirmed != null && { icon: CircleCheck, text: c.confirmed(numbers.confirmed) },
    numbers.views != null && { icon: Eye, text: c.views(numbers.views) },
    numbers.downloads != null && { icon: Download, text: c.downloads(numbers.downloads) },
  ].filter(Boolean)
  if (!facts.length) return null

  return (
    <ul className={`flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-theme-muted ${className}`}>
      {facts.map((fact) => {
        const Icon = fact.icon
        return (
          <li key={fact.text} className="inline-flex items-center gap-1.5">
            <Icon size={13} aria-hidden="true" />
            {fact.text}
          </li>
        )
      })}
    </ul>
  )
}

/**
 * "Do these shortcuts work for you?" under the list of an app page, with the
 * numbers of the page. Shown only while the server keeps votes.
 *
 *   numbers   from usePageFeedback
 *   mine      the visitor's vote on the page: 'works', 'broken' or undefined
 *   onVote    ('works' | 'broken') => void
 */
export default function PageVote({ numbers, mine, onVote, className = '' }) {
  const c = CONTENT.shortcutPage.feedback
  return (
    <section aria-label={c.title} className={`rounded-2xl border border-theme-border bg-theme-base px-5 py-4 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <h2 className="flex-1 min-w-[180px] text-[14px] font-medium text-theme-text m-0">{c.question}</h2>
        <div className="flex items-center gap-2 shrink-0">
          <button type="button" aria-label={c.worksLabel} aria-pressed={mine === 'works'} onClick={() => onVote('works')} className={`${BUTTON} ${mine === 'works' ? CHOSEN : OPEN}`}>
            <ThumbsUp size={14} aria-hidden="true" />
            {c.works}
          </button>
          <button type="button" aria-label={c.brokenLabel} aria-pressed={mine === 'broken'} onClick={() => onVote('broken')} className={`${BUTTON} ${mine === 'broken' ? CHOSEN : OPEN}`}>
            <ThumbsDown size={14} aria-hidden="true" />
            {c.broken}
          </button>
        </div>
      </div>
      <p role="status" className="text-[13px] text-theme-muted m-0 empty:hidden mt-2">
        {mine === 'works' ? c.thanksWorks : mine === 'broken' ? c.thanksBroken : ''}
      </p>
      <ProofLine numbers={numbers} className="mt-3 pt-3 border-t border-theme-border" />
    </section>
  )
}
