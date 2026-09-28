import { MIN_SECTIONS_FOR_SLOT } from '../data/sponsors'

/**
 * Counts for the /sponsor page, from the same data the app pages are built from.
 *
 * @param {Array<Array<{ sections?: Array }>>} appsByPlatform one array of apps per platform
 * @returns {{ appPages: number, slotPages: number }}
 *   appPages: every app page on the site.
 *   slotPages: the app pages long enough to show the sponsor card.
 */
export function countSponsorPages(appsByPlatform) {
  let appPages = 0
  let slotPages = 0
  for (const apps of appsByPlatform) {
    for (const app of apps) {
      appPages += 1
      if ((app.sections?.length ?? 0) >= MIN_SECTIONS_FOR_SLOT) slotPages += 1
    }
  }
  return { appPages, slotPages }
}
