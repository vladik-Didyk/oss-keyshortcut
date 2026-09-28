import { describe, it, expect, beforeAll } from 'vitest'
import { render } from '@testing-library/react'
import { createRoutesStub } from 'react-router'
import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import routerConfig from '../../react-router.config.ts'
import { readJsonLd, jsonLdTypes, jsonLdTypesDeep } from '../../scripts/lib/json-ld.mjs'
import * as platformIndex from '../routes/platform-index'
import * as shortcutPage from '../routes/shortcut-page'
import * as about from '../routes/about'
import JsonLd from '../components/JsonLd'
import { CONTENT } from '../data/content'
import { SITE_ORIGIN, pageUrl } from '../utils/siteUrl'
import {
  APPLICATION_CATEGORY,
  AUTHOR_ID,
  buildPlatformItemList,
  buildAppPageJsonLd,
  buildAuthorJsonLd,
  buildWebSiteJsonLd,
} from '../utils/structuredData'

const ROOT = process.cwd()
const readData = (name) => JSON.parse(readFileSync(join(ROOT, 'public/data', name), 'utf-8'))

const PLATFORMS = readData('platforms.json')
const appsOf = (platformId) => readData(`platforms/${platformId}.json`).apps
const APP_PAGES = PLATFORMS.flatMap((platform) => appsOf(platform.id).map((app) => ({ platform, app })))

// The values Google lists for applicationCategory (Software App documentation).
const GOOGLE_APPLICATION_CATEGORIES = [
  'GameApplication', 'SocialNetworkingApplication', 'TravelApplication', 'ShoppingApplication',
  'SportsApplication', 'LifestyleApplication', 'BusinessApplication', 'DesignApplication',
  'DeveloperApplication', 'DriverApplication', 'EducationalApplication', 'HealthApplication',
  'FinanceApplication', 'SecurityApplication', 'BrowserApplication', 'CommunicationApplication',
  'DesktopEnhancementApplication', 'EntertainmentApplication', 'MultimediaApplication',
  'HomeApplication', 'UtilitiesApplication', 'ReferenceApplication',
]

// The site has no price, rating, review or per-app date. None may appear.
const NOT_IN_THE_DATA = ['offers', 'aggregateRating', 'review', 'datePublished', 'dateModified', 'dateCreated']

/** Every property name in a JSON-LD object, nested ones included. */
const keysIn = (value) =>
  value && typeof value === 'object' ? Object.entries(value).flatMap(([key, v]) => [key, ...keysIn(v)]) : []

/** Every string in a JSON-LD object that is an address on this site. */
const siteUrlsIn = (value) => {
  if (typeof value === 'string') return value.startsWith(SITE_ORIGIN) ? [value] : []
  return value && typeof value === 'object' ? Object.values(value).flatMap(siteUrlsIn) : []
}

function renderRoute(module, pattern, path, data) {
  const Stub = createRoutesStub([{ id: 'page', path: pattern, Component: module.default }])
  return render(<Stub initialEntries={[path]} hydrationData={{ loaderData: { page: data } }} />)
}

const jsonLdIn = (container) =>
  [...container.querySelectorAll('script[type="application/ld+json"]')].map((script) => JSON.parse(script.textContent))

let served

beforeAll(async () => {
  served = new Set((await routerConfig.prerender()).map(pageUrl))
  // jsdom has no IntersectionObserver (useScrollspy).
  globalThis.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('ItemList of a platform index', () => {
  describe.each(PLATFORMS)('$id', ({ id }) => {
    let data
    let list

    beforeAll(async () => {
      data = await platformIndex.loader({ params: { platformId: id } })
      list = buildPlatformItemList(data)
    })

    it('is an ItemList named as the page heading', () => {
      expect(list['@context']).toBe('https://schema.org')
      expect(list['@type']).toBe('ItemList')
      expect(list.name).toBe(`${data.platformName} Shortcuts`)
    })

    it('has as many items as the platform has apps in the data', () => {
      const apps = appsOf(id)
      expect(apps.length).toBeGreaterThan(0)
      expect(list.itemListElement).toHaveLength(apps.length)
      expect(list.numberOfItems).toBe(apps.length)
    })

    it('gives each item a position, the name of the app and the address of its page', () => {
      const bySlug = new Map(appsOf(id).map((app) => [pageUrl(`/${id}/${app.slug}`), app]))
      list.itemListElement.forEach((item, index) => {
        expect(Object.keys(item).sort()).toEqual(['@type', 'name', 'position', 'url'])
        expect(item['@type']).toBe('ListItem')
        expect(item.position).toBe(index + 1)
        expect(served.has(item.url), `${item.url} is not a pre-rendered page`).toBe(true)
        expect(item.name).toBe(bySlug.get(item.url).displayName)
      })
      expect(new Set(list.itemListElement.map((item) => item.url)).size).toBe(list.itemListElement.length)
    })

    it('lists the apps in the order the page shows them', () => {
      const { container } = renderRoute(platformIndex, '/:platformId', `/${id}`, data)
      const cards = [...container.querySelectorAll('a.app-card')].map((a) => a.getAttribute('href'))
      expect(cards).toHaveLength(appsOf(id).length)

      const [rendered] = jsonLdIn(container).filter((block) => block['@type'] === 'ItemList')
      expect(rendered).toEqual(list)
      expect(rendered.itemListElement.map((item) => item.url)).toEqual(cards.map(pageUrl))
    })
  })
})

describe('JSON-LD of an app page', () => {
  const macos = { platformId: 'macos', platformName: 'macOS' }
  const figma = appsOf('macos').find((app) => app.slug === 'figma')

  it('is the page, with the application under "about"', () => {
    expect(buildAppPageJsonLd({ ...macos, app: figma })).toEqual({
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Figma macOS Shortcuts — KeyShortcut',
      url: 'https://keyshortcut.com/macos/figma/',
      about: {
        '@type': 'SoftwareApplication',
        name: 'Figma',
        operatingSystem: 'macOS',
        applicationCategory: 'DesignApplication',
        softwareHelp: { '@type': 'CreativeWork', url: figma.docsUrl },
      },
    })
  })

  it('has the title and the canonical address of the page', () => {
    for (const { platform, app } of APP_PAGES) {
      const page = { platformId: platform.id, platformName: platform.display_name, app }
      const jsonLd = buildAppPageJsonLd(page)
      if (!jsonLd) continue
      const meta = shortcutPage.meta({ data: page })
      expect(meta).toContainEqual({ title: jsonLd.name })
      expect(meta).toContainEqual({ tagName: 'link', rel: 'canonical', href: jsonLd.url })
      expect(served.has(jsonLd.url), `${jsonLd.url} is not a pre-rendered page`).toBe(true)
      expect(siteUrlsIn(jsonLd)).toEqual([jsonLd.url])
    }
  })

  it('takes name, operating system, category and documentation link from the data', () => {
    for (const { platform, app } of APP_PAGES) {
      const jsonLd = buildAppPageJsonLd({ platformId: platform.id, platformName: platform.display_name, app })
      if (!jsonLd) continue
      const expected = { '@type': 'SoftwareApplication', name: app.displayName, operatingSystem: platform.display_name }
      if (APPLICATION_CATEGORY[app.category]) expected.applicationCategory = APPLICATION_CATEGORY[app.category]
      if (app.docsUrl) expected.softwareHelp = { '@type': 'CreativeWork', url: app.docsUrl }
      expect(jsonLd.about).toEqual(expected)
    }
  })

  it('leaves out the documentation link when the data has none', () => {
    const withoutDocs = APP_PAGES.filter(({ app }) => !app.docsUrl)
    expect(withoutDocs.length).toBeGreaterThan(0)
    for (const { platform, app } of withoutDocs) {
      const jsonLd = buildAppPageJsonLd({ platformId: platform.id, platformName: platform.display_name, app })
      expect(keysIn(jsonLd)).not.toContain('softwareHelp')
      expect(Object.keys(jsonLd.about)).not.toContain('url')
    }
  })

  it('leaves out the category when the directory category is not a kind of application', () => {
    const notion = appsOf('macos').find((app) => app.slug === 'notion')
    const keynote = appsOf('macos').find((app) => app.slug === 'keynote')
    expect(notion.category).toBe('Productivity')
    expect(keynote.category).toBe('Apple Apps')
    for (const app of [notion, keynote]) {
      expect(Object.keys(buildAppPageJsonLd({ ...macos, app }).about)).not.toContain('applicationCategory')
    }
  })

  it('maps only categories of the directory, and only to values Google lists', () => {
    const categories = readData('categories.json').map((category) => category.display_name)
    for (const [category, value] of Object.entries(APPLICATION_CATEGORY)) {
      expect(categories).toContain(category)
      expect(GOOGLE_APPLICATION_CATEGORIES).toContain(value)
    }
  })

  it('states no price, rating, review or date', () => {
    for (const { platform, app } of APP_PAGES) {
      const jsonLd = buildAppPageJsonLd({ platformId: platform.id, platformName: platform.display_name, app })
      for (const key of NOT_IN_THE_DATA) expect(keysIn(jsonLd)).not.toContain(key)
    }
  })

  it('describes no application on a page about the operating system', () => {
    const systemPages = APP_PAGES.filter(
      ({ platform, app }) => buildAppPageJsonLd({ platformId: platform.id, platformName: platform.display_name, app }) === null
    )
    for (const { platform, app } of systemPages) {
      expect(app.slug === platform.id || /System$/.test(app.category), `${platform.id}/${app.slug}`).toBe(true)
    }
    expect(systemPages.map(({ platform, app }) => `${platform.id}/${app.slug}`)).toEqual(
      expect.arrayContaining(['macos/macos', 'macos/spotlight', 'windows/windows', 'linux/linux'])
    )
  })

  it('is on the page, next to the FAQ and the breadcrumb', async () => {
    const data = await shortcutPage.loader({ params: { platformId: 'macos', slug: 'figma' } })
    const { container } = renderRoute(shortcutPage, '/:platformId/:slug', '/macos/figma', data)
    const blocks = jsonLdIn(container)
    expect(jsonLdTypes(blocks).sort()).toEqual(['BreadcrumbList', 'FAQPage', 'WebPage'])
    expect(blocks.find((block) => block['@type'] === 'WebPage')).toEqual(buildAppPageJsonLd(data))
  })

  it('is not on a page about the operating system', async () => {
    const data = await shortcutPage.loader({ params: { platformId: 'macos', slug: 'macos' } })
    const { container } = renderRoute(shortcutPage, '/:platformId/:slug', '/macos/macos', data)
    expect(jsonLdTypes(jsonLdIn(container)).sort()).toEqual(['BreadcrumbList', 'FAQPage'])
  })
})

describe('Person of the About page', () => {
  const { creator } = CONTENT.about.cards
  const person = buildAuthorJsonLd()

  it('is the author the page names, with his profiles as sameAs', () => {
    expect(person).toEqual({
      '@context': 'https://schema.org',
      '@type': 'Person',
      '@id': AUTHOR_ID,
      name: creator.name,
      url: creator.url,
      sameAs: [creator.links.linkedin, creator.links.github],
    })
    expect(person.sameAs).toHaveLength(2)
    for (const key of NOT_IN_THE_DATA) expect(keysIn(person)).not.toContain(key)
  })

  it('has an id under the canonical address of the About page', () => {
    expect(AUTHOR_ID).toBe('https://keyshortcut.com/about/#creator')
    expect(served.has(AUTHOR_ID.split('#')[0])).toBe(true)
  })

  it('says nothing the page does not show', () => {
    const { container } = renderRoute(about, '/about', '/about', undefined)
    const links = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href'))

    expect(jsonLdIn(container)).toEqual([person])
    expect(container.textContent).toContain(person.name)
    for (const url of [person.url, ...person.sameAs]) expect(links).toContain(url)
  })
})

describe('site-wide WebSite node', () => {
  const website = buildWebSiteJsonLd()

  it('keeps everything it had', () => {
    expect(website).toMatchObject(CONTENT.structured.website)
    expect(website['@type']).toBe('WebSite')
  })

  it('names the creator the About page names, as the same entity', () => {
    expect(website.creator).toEqual({
      '@type': 'Person',
      '@id': buildAuthorJsonLd()['@id'],
      name: CONTENT.about.cards.creator.name,
    })
    expect(Object.keys(website)).toEqual([...Object.keys(CONTENT.structured.website), 'creator'])
  })
})

describe('<JsonLd>', () => {
  it('writes the object as JSON', () => {
    const data = { '@type': 'Thing', name: 'Figma' }
    const { container } = render(<JsonLd data={data} />)
    expect(jsonLdIn(container)).toEqual([data])
  })

  it('cannot be closed by a value', () => {
    const data = { '@type': 'Thing', name: '</script><script>alert(1)</script>' }
    const { container } = render(<JsonLd data={data} />)
    const scripts = container.querySelectorAll('script')
    expect(scripts).toHaveLength(1)
    expect(scripts[0].innerHTML).not.toContain('<')
    expect(JSON.parse(scripts[0].textContent)).toEqual(data)
  })

  it('writes nothing without data', () => {
    expect(render(<JsonLd data={null} />).container.innerHTML).toBe('')
  })
})

describe('readJsonLd', () => {
  const block = (json) => `<script type="application/ld+json">${json}</script>`

  it('reads every block of a page', () => {
    const html = `<head>${block('{"@type":"WebSite"}')}</head><body><script>var a = 1</script>${block('{"@type":"Person","worksFor":{"@type":"Organization"}}')}</body>`
    const blocks = readJsonLd(html)
    expect(jsonLdTypes(blocks)).toEqual(['WebSite', 'Person'])
    expect(jsonLdTypesDeep(blocks)).toEqual(['WebSite', 'Person', 'Organization'])
  })

  it('fails on a block that is not JSON', () => {
    expect(() => readJsonLd(block('{"@type":"WebSite",}'))).toThrow(/block 1 is not valid JSON/)
  })
})

describe('JSON-LD of the built pages (if built)', () => {
  const buildDir = join(ROOT, 'build/client')
  const built = existsSync(join(buildDir, 'index.html'))
  const blocksOf = (file) => readJsonLd(readFileSync(join(buildDir, file), 'utf-8'))

  const pages = [
    ['macos/index.html', ['BreadcrumbList', 'ItemList', 'WebSite']],
    ['macos/figma/index.html', ['BreadcrumbList', 'FAQPage', 'WebPage', 'WebSite']],
    ['about/index.html', ['Person', 'WebSite']],
  ]

  it.skipIf(!built).each(pages)('%s: every block is JSON, of the types %j', (file, types) => {
    expect(jsonLdTypes(blocksOf(file)).sort()).toEqual(types)
  })

  it.skipIf(!built)('holds what the builders return', async () => {
    const byType = (file, type) => blocksOf(file).find((block) => block['@type'] === type)
    const macos = await platformIndex.loader({ params: { platformId: 'macos' } })
    const figma = await shortcutPage.loader({ params: { platformId: 'macos', slug: 'figma' } })

    expect(byType('macos/index.html', 'ItemList')).toEqual(buildPlatformItemList(macos))
    expect(byType('macos/index.html', 'ItemList').itemListElement).toHaveLength(appsOf('macos').length)
    expect(byType('macos/figma/index.html', 'WebPage')).toEqual(buildAppPageJsonLd(figma))
    expect(byType('about/index.html', 'Person')).toEqual(buildAuthorJsonLd())
    for (const [file] of pages) expect(byType(file, 'WebSite')).toEqual(buildWebSiteJsonLd())
  })
})
