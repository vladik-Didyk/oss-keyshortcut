import { ChevronDown } from '../utils/icons'
import { trackEvent } from '../lib/analytics'

/* ─── FAQ Accordion ───
   Native <details>: the answer is in the pre-rendered HTML (the FAQPage JSON-LD
   must describe text that is on the page) and it opens without JavaScript. */
export default function FaqAccordion({ question, answer }) {
  return (
    <details
      className="group rounded-xl border border-theme-border overflow-hidden"
      onToggle={(e) => {
        if (e.currentTarget.open) trackEvent('faq_item_expanded', { question })
      }}
    >
      <summary className="focus-ring-inset flex items-center justify-between px-5 py-4 cursor-pointer text-theme-text hover:bg-theme-base-alt transition-colors list-none [&::-webkit-details-marker]:hidden">
        <span className="text-[15px] font-medium pr-4">{question}</span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className="shrink-0 text-theme-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="px-5 pb-4">
        <p className="text-theme-muted text-[14px] leading-relaxed">{answer}</p>
      </div>
    </details>
  )
}
