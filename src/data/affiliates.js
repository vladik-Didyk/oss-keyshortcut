// Affiliate links shown as a "Get <App>" button on app pages.
//
// Kept here, not in Supabase: CI runs `pnpm export` on every main build and
// rewrites public/data/, and this needs no schema change.
//
// Keyed by app slug (the same slug on every platform). An entry with an empty
// `url` renders nothing, so a program can sit here until it approves you.
// Paste the tracking link the program gives you (must start with https://).
// Where to apply, what each program pays and its conditions:
// src/data/affiliatePrograms.js, or `pnpm affiliates` for the list.

export const AFFILIATES = {
  photoshop: { program: 'Adobe (Partnerize)', label: 'Get Photoshop', url: '' },
  illustrator: { program: 'Adobe (Partnerize)', label: 'Get Illustrator', url: '' },
  'after-effects': { program: 'Adobe (Partnerize)', label: 'Get After Effects', url: '' },
  'premiere-pro': { program: 'Adobe (Partnerize)', label: 'Get Premiere Pro', url: '' },
  acrobat: { program: 'Adobe (Partnerize)', label: 'Get Acrobat', url: '' },
  raycast: { program: 'Raycast (Rewardful)', label: 'Get Raycast', url: 'https://raycast.com/?via=vlad-didyk' },
  '1password': { program: '1Password (CJ)', label: 'Get 1Password', url: '' },
  canva: { program: 'Canva (Impact)', label: 'Get Canva Pro', url: '' },
  // Added 2026-09-28, after every app of the directory was checked for a program.
  word: { program: 'Microsoft (Impact)', label: 'Get Microsoft 365', url: '' },
  excel: { program: 'Microsoft (Impact)', label: 'Get Microsoft 365', url: '' },
  powerpoint: { program: 'Microsoft (Impact)', label: 'Get Microsoft 365', url: '' },
  teams: { program: 'Microsoft (Impact)', label: 'Get Microsoft 365', url: '' },
  jira: { program: 'Atlassian (Impact)', label: 'Try Jira', url: '' },
  confluence: { program: 'Atlassian (Impact)', label: 'Try Confluence', url: '' },
  zoom: { program: 'Zoom (Impact)', label: 'Get Zoom', url: '' },
  wordpress: { program: 'Automattic (Impact)', label: 'Get WordPress.com', url: '' },
  todoist: { program: 'Todoist (PartnerStack)', label: 'Get Todoist', url: '' },
  clickup: { program: 'ClickUp (PartnerStack)', label: 'Try ClickUp', url: '' },
  webflow: { program: 'Webflow (PartnerStack)', label: 'Try Webflow', url: '' },
  maya: { program: 'Autodesk (CJ)', label: 'Get Maya', url: '' },
  unity: { program: 'Unity (Partnerize)', label: 'Get Unity Pro', url: '' },
  opera: { program: 'Opera (CJ)', label: 'Get Opera', url: '' },
}

// Shown on app pages of a platform when the app has no link of its own.
export const PLATFORM_FALLBACK = {
  macos: {
    program: 'Setapp (Impact)',
    label: 'Try Setapp',
    tagline: 'One subscription for a curated set of Mac apps',
    url: '',
  },
}

const isLive = (entry) => Boolean(entry && /^https:\/\//.test(entry.url))

/** The affiliate link for an app page, or null. `kind` is 'app' or 'platform'. */
export function getAffiliate(slug, platform) {
  const app = AFFILIATES[slug]
  if (isLive(app)) return { ...app, kind: 'app' }
  const fallback = PLATFORM_FALLBACK[platform]
  if (isLive(fallback)) return { ...fallback, kind: 'platform' }
  return null
}

/** True once at least one affiliate link is live (drives the footer disclosure). */
export const HAS_AFFILIATE_LINKS = [...Object.values(AFFILIATES), ...Object.values(PLATFORM_FALLBACK)].some(isLive)
