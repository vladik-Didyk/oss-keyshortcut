import { useEffect, useRef, useState } from 'react'
import { ThumbsUp, ThumbsDown, BadgeCheck, Eye, Download } from '../utils/icons'
import { CONTENT } from '../data/content'

const BUTTON =
  'inline-flex items-center justify-center gap-1.5 min-h-[44px] sm:min-h-[38px] min-w-[44px] px-3.5 sm:px-4 whitespace-nowrap rounded-full border text-[14px] font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-good'

/**
 * Votes and counts of an app page, in a green bar that stays under the top of
 * the page while the list scrolls.
 *
 * Two lines, always two, so the bar keeps its height when the numbers arrive:
 *   1. "Confirmed by 14 visitors", or the question while there are none
 *   2. views and PDF downloads (a phone shows the first of them), or a hint
 *      while there are none
 *
 *   numbers   from usePageFeedback; a value that is null is not printed
 *   mine      the visitor's vote on the page: 'works', 'broken' or undefined
 *   onVote    ('works' | 'broken') => void
 *   top       where the bar sticks, in pixels
 *   barRef    the page measures the bar to place what sticks under it
 */
export default function VoteBar({ numbers, mine, onVote, top = 48, barRef }) {
  const c = CONTENT.shortcutPage.feedback
  // The thanks show for a moment after a vote, then the counts come back.
  const [thanks, setThanks] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const cast = (value) => {
    onVote(value)
    setThanks(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setThanks(null), 4000)
  }

  const facts = [
    numbers.views != null && { icon: Eye, text: c.views(numbers.views) },
    numbers.downloads != null && { icon: Download, text: c.downloads(numbers.downloads) },
  ].filter(Boolean)
  const confirmed = numbers.confirmed != null

  return (
    <section
      ref={barRef}
      aria-label={c.title}
      className="sticky z-[15] -mt-px border-y border-theme-good-border bg-theme-good-soft"
      style={{ top }}
    >
      <div className="mx-auto max-w-[980px] px-5 md:px-6 py-2 min-h-[60px] flex items-center gap-3 sm:gap-5">
        <BadgeCheck size={26} strokeWidth={2} className="hidden sm:block shrink-0 text-theme-good" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className={`m-0 text-[14px] sm:text-[15px] leading-tight font-semibold ${confirmed ? 'text-theme-good' : 'text-theme-text'}`}>
            {confirmed ? c.confirmed(numbers.confirmed) : c.prompt}
          </p>
          <div role="status" className="mt-0.5 text-[12px] sm:text-[13px] leading-tight text-theme-text/75">
            {thanks ? (
              <span className="font-medium text-theme-good">{thanks === 'works' ? c.thanksWorks : c.thanksBroken}</span>
            ) : facts.length ? (
              <ul className="flex flex-wrap gap-x-3 gap-y-0.5">
                {facts.map((fact, i) => {
                  const Icon = fact.icon
                  // A phone has room for one count beside the buttons: a second one
                  // would wrap and change the height of the bar.
                  return (
                    <li key={fact.text} className={`${i > 0 ? 'hidden sm:inline-flex' : 'inline-flex'} items-center gap-1`}>
                      <Icon size={12} className="text-theme-good" aria-hidden="true" />
                      {fact.text}
                    </li>
                  )
                })}
              </ul>
            ) : (
              <span>{confirmed ? c.hintToo : c.hint}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            aria-label={c.worksLabel}
            aria-pressed={mine === 'works'}
            onClick={() => cast('works')}
            className={`${BUTTON} ${thanks === 'works' ? 'vote-pop' : ''} ${
              mine === 'works'
                ? 'bg-theme-good-hover text-white border-theme-good-hover'
                : 'bg-theme-good text-white border-theme-good hover:bg-theme-good-hover'
            }`}
          >
            <ThumbsUp size={15} aria-hidden="true" fill={mine === 'works' ? 'currentColor' : 'none'} />
            {c.works}
          </button>
          <button
            type="button"
            aria-label={c.brokenLabel}
            aria-pressed={mine === 'broken'}
            onClick={() => cast('broken')}
            className={`${BUTTON} ${thanks === 'broken' ? 'vote-pop' : ''} ${
              mine === 'broken'
                ? 'bg-theme-text text-theme-base border-theme-text'
                : 'bg-theme-base text-theme-text border-theme-good-border hover:border-theme-good'
            }`}
          >
            <ThumbsDown size={15} aria-hidden="true" />
            <span className="hidden sm:inline">{c.broken}</span>
          </button>
        </div>
      </div>
    </section>
  )
}
