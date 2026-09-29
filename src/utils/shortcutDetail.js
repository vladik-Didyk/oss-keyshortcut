/**
 * The questions of the page about one shortcut, as the page shows them and as
 * its JSON-LD states them: one source, so the two cannot differ.
 * Safe for the browser: it reads the data of the loader, not the notes.
 */
import { CONTENT } from '../data/content'

export function shortcutDetailFaq({ platformName, app, shortcut, others }) {
  const c = CONTENT.shortcutDetail
  const known = others.filter((o) => o.keys)
  const items = [
    {
      question: c.faqHere(shortcut.title, app.displayName, platformName),
      answer: c.faqHereAnswer(shortcut.keys, shortcut.words, shortcut.press),
    },
  ]
  if (known.length) {
    items.push({
      question: c.faqOthers(shortcut.title, app.displayName, known.map((o) => o.platformName)),
      answer: c.faqOthersAnswer(known),
    })
  }
  return items
}
