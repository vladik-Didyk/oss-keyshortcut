import { useEffect, useRef, useState } from 'react'
import { ThumbsUp, ThumbsDown, BadgeCheck, Eye, Download } from '../utils/icons'
import { CONTENT } from '../data/content'

const BUTTON =
  'flex-1 lg:flex-none inline-flex items-center justify-center gap-1.5 min-h-[44px] lg:min-h-[40px] px-4 lg:px-5 whitespace-nowrap rounded-full border text-[14px] font-semibold cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-theme-good'

// A visitor who asked for less motion, and a browser without animation frames,
// get the number at once.
const canAnimate = () =>
  typeof window !== 'undefined' &&
  typeof window.requestAnimationFrame === 'function' &&
  !(typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)

// A number below this shows at once: counting up to 1 would print "0" first,
// which is a false number right after the visitor's own vote.
const COUNT_UP_FROM = 10

/**
 * A number that counts up to its value, once, when it first appears. A later
 * change of the value (the visitor's own vote) shows at once. The number is
 * decoration: the sentence beside it (sr-only) carries the value from the start.
 */
function useCountUp(value, duration = 700) {
  const [animated] = useState(() => canAnimate() && value >= COUNT_UP_FROM)
  const [progress, setProgress] = useState(animated ? 0 : 1)
  useEffect(() => {
    if (!animated) return
    let frame
    const start = performance.now()
    const step = (now) => {
      const t = Math.min(1, (now - start) / duration)
      setProgress(t)
      if (t < 1) frame = window.requestAnimationFrame(step)
    }
    frame = window.requestAnimationFrame(step)
    return () => window.cancelAnimationFrame(frame)
  }, [animated, duration])
  return Math.round(value * (1 - (1 - progress) ** 3))
}

function Stat({ icon, value, label, sentence }) {
  const Icon = icon
  const shown = useCountUp(value)
  return (
    <li className="flex items-start sm:items-center gap-3 min-w-0">
      <span className="hidden sm:inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-theme-good text-white">
        <Icon size={18} aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span aria-hidden="true" className="block text-[21px] sm:text-[24px] leading-none font-bold tracking-tight tabular-nums text-theme-good">
          {shown.toLocaleString('en-US')}
        </span>
        <span aria-hidden="true" className="block mt-1.5 text-[11px] sm:text-[13px] leading-tight sm:whitespace-nowrap text-theme-text/75">
          {label}
        </span>
        <span className="sr-only">{sentence}</span>
      </span>
    </li>
  )
}

/**
 * Votes and counts of an app page: a green card at the top of the page, under
 * the header. The numbers on the left, the question and its two buttons on
 * the right (on a phone: below).
 *
 * The card is in the page as it is served. The place of the numbers holds one
 * line of words until they arrive and has the same height after, so nothing
 * below the card moves.
 *
 *   numbers   from usePageFeedback; a value that is null is not printed
 *   mine      the visitor's vote on the page: 'works', 'broken' or undefined
 *   onVote    ('works' | 'broken') => void
 */
export default function VoteCard({ numbers, mine, onVote, className = '' }) {
  const c = CONTENT.shortcutPage.feedback
  // The thanks show for a moment after a vote, then the question comes back.
  const [thanks, setThanks] = useState(null)
  const timer = useRef(null)
  useEffect(() => () => clearTimeout(timer.current), [])

  const cast = (value) => {
    onVote(value)
    setThanks(value)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setThanks(null), 4000)
  }

  const stats = [
    numbers.confirmed != null && { key: 'confirmed', icon: BadgeCheck, value: numbers.confirmed, label: c.confirmedLabel(numbers.confirmed), sentence: c.confirmed(numbers.confirmed) },
    numbers.views != null && { key: 'views', icon: Eye, value: numbers.views, label: c.viewsLabel(numbers.views), sentence: c.views(numbers.views) },
    numbers.downloads != null && { key: 'downloads', icon: Download, value: numbers.downloads, label: c.downloadsLabel(numbers.downloads), sentence: c.downloads(numbers.downloads) },
  ].filter(Boolean)

  return (
    <section aria-label={c.title} className={`mx-auto max-w-[980px] px-5 md:px-6 ${className}`}>
      <div className="rounded-2xl border border-theme-good-border bg-theme-good-soft px-4 py-4 sm:px-6 sm:py-5 flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-8">
        <div className="flex-1 min-w-0 min-h-[48px] flex items-center">
          {stats.length ? (
            <ul className="w-full grid grid-cols-3 gap-3 sm:gap-6 lg:flex lg:gap-12">
              {stats.map(({ key, ...stat }) => (
                <Stat key={key} {...stat} />
              ))}
            </ul>
          ) : (
            <p className="m-0 flex items-center gap-3 text-[14px] leading-snug text-theme-text/80">
              <span className="hidden sm:inline-flex items-center justify-center w-10 h-10 shrink-0 rounded-full bg-theme-good text-white">
                <BadgeCheck size={18} aria-hidden="true" />
              </span>
              {c.empty}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3 lg:gap-2.5 lg:pl-8 lg:border-l lg:border-theme-good-border/60">
          <p role="status" className={`m-0 text-[14px] leading-snug font-semibold ${thanks ? 'text-theme-good' : 'text-theme-text'}`}>
            {thanks ? (thanks === 'works' ? c.thanksWorks : c.thanksBroken) : c.prompt}
          </p>
          <div className="flex items-center gap-2">
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
              {c.broken}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
