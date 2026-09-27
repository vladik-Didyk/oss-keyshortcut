// Google AdSense configuration.
//
// The publisher ID comes from VITE_ADSENSE_ID (committed in .env.production).
// Ad unit IDs are the numbers AdSense shows as data-ad-slot="…" when you create
// a unit (AdSense → Ads → By ad unit). They are public, so they live here.

export const ADSENSE_CLIENT = import.meta.env.VITE_ADSENSE_ID || ''

// One "In-article" unit serves every placement below. Paste its data-ad-slot
// number here. Empty = the placements render nothing (Auto ads, if switched on
// in AdSense, can still place ads on the page).
const IN_ARTICLE_UNIT = ''

// Placement name (used by <AdSlot adSlot="…">) → ad unit ID. Give a placement
// its own unit only if you want separate reporting for it.
export const AD_UNITS = {
  shortcut_mid: IN_ARTICLE_UNIT,
  platform_mid: IN_ARTICLE_UNIT,
  home_mid: IN_ARTICLE_UNIT,
  guide_inline: IN_ARTICLE_UNIT,
  guides_mid: IN_ARTICLE_UNIT,
  compare_mid: IN_ARTICLE_UNIT,
  cheatsheets_mid: IN_ARTICLE_UNIT,
}

/** Resolve a placement name, or a raw numeric unit ID, to an ad unit ID ('' if none). */
export function resolveAdUnit(adSlot) {
  if (adSlot in AD_UNITS) return AD_UNITS[adSlot]
  return /^\d+$/.test(String(adSlot)) ? String(adSlot) : ''
}
