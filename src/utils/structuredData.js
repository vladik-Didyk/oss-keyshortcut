/**
 * JSON-LD for the platform index, the app pages, the About page and the
 * site-wide WebSite node. Each builder returns a plain object; <JsonLd> writes it.
 *
 * Every value comes from the site's data (public/data, CONTENT) or is text the
 * page shows. No ratings, prices, reviews or dates: the data has none.
 * Page addresses go through pageUrl() (utils/siteUrl.js).
 */
import { CONTENT } from '../data/content'
import { groupByCategories } from './platformHelpers'
import { pageUrl } from './siteUrl'
import { shortcutDetailFaq } from './shortcutDetail'

const SCHEMA_ORG = 'https://schema.org'

// One id for the author, so that the Person on /about and the creator of the
// WebSite node are read as the same entity. An id, not a page: it has a fragment.
export const AUTHOR_ID = `${pageUrl('/about')}#creator`

/**
 * Category of the directory → applicationCategory, for the categories that say
 * what the application does. The values are the ones Google lists for software apps.
 * Left out on purpose: "Productivity" has no value of its own, and "Apple Apps"
 * and "Microsoft Office" name the vendor, not the kind of application.
 */
export const APPLICATION_CATEGORY = {
  Browsers: 'BrowserApplication',
  Communication: 'CommunicationApplication',
  Design: 'DesignApplication',
  Development: 'DeveloperApplication',
  Media: 'MultimediaApplication',
  'System Utils': 'UtilitiesApplication',
}

// Pages about the operating system itself or a part of it (macOS, Spotlight,
// Windows, Linux Desktop). They are not applications and get no app entity.
const SYSTEM_CATEGORIES = new Set(['macOS System', 'Windows System'])
const isSystemPage = (app, platformId) => SYSTEM_CATEGORIES.has(app.category) || app.slug === platformId

/**
 * ItemList of the app pages a platform index lists, in the order the page
 * shows them: by category, as ShortcutsIndex groups them.
 */
export function buildPlatformItemList({ platformId, platformName, apps, categories }) {
  const shown = groupByCategories(apps, categories).flatMap((group) => group.apps)
  return {
    '@context': SCHEMA_ORG,
    '@type': 'ItemList',
    name: `${platformName} Shortcuts`,
    numberOfItems: shown.length,
    itemListElement: shown.map((app, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: app.displayName,
      url: pageUrl(`/${platformId}/${app.slug}`),
    })),
  }
}

/**
 * The app an app page is about: a WebPage with the application under "about".
 * Not a SoftwareApplication of its own: the page lists shortcuts, it is not the
 * application's page, and the site has no price or rating, which Google
 * requires of a software app result. Returns null for a system page.
 *
 * The documentation link is softwareHelp, not url: docsUrl is the address of a
 * help page, not of the application.
 */
export function buildAppPageJsonLd({ app, platformId, platformName }) {
  if (isSystemPage(app, platformId)) return null

  const { title, url } = CONTENT.meta.shortcutPage(app.displayName, platformName, app.shortcutCount, platformId, app.slug)
  const category = APPLICATION_CATEGORY[app.category]
  return {
    '@context': SCHEMA_ORG,
    '@type': 'WebPage',
    name: title,
    url,
    about: {
      '@type': 'SoftwareApplication',
      name: app.displayName,
      operatingSystem: platformName,
      ...(category ? { applicationCategory: category } : {}),
      ...(app.docsUrl ? { softwareHelp: { '@type': 'CreativeWork', url: app.docsUrl } } : {}),
    },
  }
}

/**
 * The page about one shortcut: its place in the site and its two questions.
 * The questions are the ones the page shows (shortcutDetailFaq).
 */
export function buildShortcutDetailJsonLd(data) {
  const { platformId, platformName, app, shortcut } = data
  const c = CONTENT.shortcutDetail
  return [
    {
      '@context': SCHEMA_ORG,
      '@type': 'BreadcrumbList',
      itemListElement: [
        { name: c.breadcrumbHome, item: pageUrl('/') },
        { name: c.platformCrumb(platformName), item: pageUrl(`/${platformId}`) },
        { name: app.displayName, item: pageUrl(`/${platformId}/${app.slug}`) },
        { name: shortcut.title, item: pageUrl(`/${platformId}/${app.slug}/${shortcut.id}`) },
      ].map((entry, i) => ({ '@type': 'ListItem', position: i + 1, ...entry })),
    },
    {
      '@context': SCHEMA_ORG,
      '@type': 'FAQPage',
      mainEntity: shortcutDetailFaq(data).map((item) => ({
        '@type': 'Question',
        name: item.question,
        acceptedAnswer: { '@type': 'Answer', text: item.answer },
      })),
    },
  ]
}

/** The author, as the "Created by" card of the About page shows him. */
export function buildAuthorJsonLd() {
  const { name, url, links } = CONTENT.about.cards.creator
  return {
    '@context': SCHEMA_ORG,
    '@type': 'Person',
    '@id': AUTHOR_ID,
    name,
    url,
    sameAs: [links.linkedin, links.github].filter(Boolean),
  }
}

/** The site-wide WebSite node (CONTENT.structured.website), with its creator. */
export function buildWebSiteJsonLd() {
  return {
    ...CONTENT.structured.website,
    creator: {
      '@type': 'Person',
      '@id': AUTHOR_ID,
      name: CONTENT.about.cards.creator.name,
    },
  }
}
