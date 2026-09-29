# Audit notes

Phase 0 of the growth brief: discovery, no code changes. Measured on 2026-09-29, on `main` at `fa8fe4e` and on the live site.

## 1. What the site is built with

| Part | What is there |
|---|---|
| Framework | React 19.2, React Router 7.13 in framework mode, Vite 7.3, Tailwind CSS 4.2 |
| Pages | Pre-rendered at build time to `build/client/`, then hydrated in the browser |
| Hosting | Cloudflare Pages, project `keyshortcut`. Deployed by GitHub Actions (`ci.yml`) after lint, tests and build |
| Data | Supabase is the source. `pnpm export` writes it to `public/data/*.json`, which the build reads. CI runs the export on every push to `main` |
| Server code | Four Pages Functions in `functions/api/`: `geo`, `visit`, `vote`, `download`. One D1 database for votes and counts |
| Routes | `src/routes.ts`: home, platform index, app page, guides, compare, cheat sheets, about, privacy, sponsor, `/mac-hud`, two redirect routes, 404 |
| Redirects | `public/_redirects`, 34 lines, no splats. Every rule ends at the address with the closing slash |
| Headers | `public/_headers`: security headers on `/*`, one-year immutable cache on `/assets/*` |
| Sitemap | `scripts/generate-sitemap.mjs`. An index with six files. `robots.txt` names it and allows every crawler |
| Feeds | `rss.xml` and `llms.txt` are generated at build time |
| OG images | `scripts/generate-og-images.mjs`, 186 files, 7.2 MB, largest 61 KB |
| PDF | jsPDF in the browser (`generateShortcutPDF.js`), loaded only on click |
| Tests | Vitest, 1,342 tests. One Playwright file, `e2e/performance.spec.js`, run through `npx` |
| CI | `ci.yml`, `redirect-check.yml`, `docs-link-check.yml`, `update-readme.yml`, `shortcut-sync.yml`, `shortcut-sync-deploy.yml` |

Full build: 9 seconds for 206 pages.

## 2. Size of the site

| | macOS | Windows | Linux | Total |
|---|---|---|---|---|
| App pages | 113 | 48 | 10 | 171 |
| Shortcuts | 5,688 | 1,481 | 203 | 7,372 |

- 119 different apps. 74 are on one platform, 38 on two, 7 on three.
- 206 addresses in the sitemap files: 171 app pages, 3 platform pages, 10 guides, 15 in the compare file, 7 others.
- 827 files in a build, 49 MB.

## 3. Lighthouse, before any change

Lighthouse 12.8, Chrome on this Mac, live site. Phone numbers are the median of three runs with real throttling (slow 4G, CPU four times slower). Desktop is one run each.

| Page | Device | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/` | phone | 76 | 100 | 75 | 92 | 6.1 s | 0.002 | 26 ms |
| `/macos/vscode/` | phone | 96 | 100 | 75 | 92 | 2.1 s | 0.075 | 30 ms |
| `/windows/excel/` | phone | 83 | 100 | 75 | 92 | 4.5 s | 0.013 | 31 ms |
| `/` | desktop | 91 | 100 | 74 | 92 | 1.6 s | 0.003 | 0 ms |
| `/macos/vscode/` | desktop | 97 | 100 | 74 | 92 | 1.0 s | 0.059 | 0 ms |
| `/windows/excel/` | desktop | 97 | 100 | 74 | 92 | 1.2 s | 0.035 | 0 ms |

The fourth page of the brief, a single-shortcut page, does not exist yet.

Not measured: field data from real visitors. Google PageSpeed refused the requests (daily quota without a key).

A first set of phone runs used Lighthouse's estimated throttling and gave 57 to 71. A real browser paints the VS Code page at 0.36 s, so those estimates were wrong and are not used.

### What costs the points

| Finding | Where | Cause |
|---|---|---|
| LCP of 4.5 to 6.1 s on a phone | `/`, `/windows/excel/` | The largest element is the text of the cookie banner. It appears late: after the scripts, the region check and Google's consent message |
| CLS 0.06 to 0.075 | `/macos/vscode/` | The intro paragraph gets one line longer when the web font replaces the fallback font |
| Render-blocking script | every page with an email link | `email-decode.min.js`, put in by Cloudflare, not by the repo (see 6) |
| Render-blocking stylesheet | every page | Google Fonts CSS, then 71 KB of font files from `fonts.gstatic.com` |
| Best practices 74 to 75 | every page | A third-party cookie from AdSense, and a console error: the Cloudflare analytics beacon is refused by CORS |
| SEO 92 | every page | One link with the text "Learn more", in the cookie banner |

## 4. Page weight

| Page | HTML | HTML gzipped | JavaScript gzipped | CSS gzipped | Images |
|---|---|---|---|---|---|
| `/` | 701 KB | 135 KB | 208 KB | 11 KB | 128 |
| `/macos/` | 685 KB | 135 KB | 204 KB | 11 KB | 116 |
| `/macos/vscode/` | 191 KB | 22 KB | 212 KB | 11 KB | 21 |
| `/windows/excel/` | 107 KB | 15 KB | 212 KB | 11 KB | 14 |
| a guide | 41 KB | 9 KB | 196 KB | 11 KB | 3 |

Largest scripts of an app page, gzipped:

| File | Size | What it is |
|---|---|---|
| `entry.client` | 60 KB | React and the hydration entry |
| `content` | 50 KB | `src/data/content.js`: the copy of the whole site, loaded on every page |
| `chunk-LFPYN7LY` | 42 KB | React Router |
| `index` | 28 KB | shared code |
| `shortcut-page` | 12 KB | the app page itself |

- Two thirds of the home page HTML (470 KB) is the data of every macOS app, written into the page for hydration and search.
- The PDF code (128 KB gzipped) loads only on click. PostHog loads only after consent.
- AdSense adds 249 KB, after `load`.
- Every `<img>` has `width` and `height`. Images below the fold are lazy. None has `decoding="async"`.

## 5. Third-party scripts

| Script | When it loads |
|---|---|
| Google AdSense (`pagead2.googlesyndication.com`, with `doubleclick.net` and `adtrafficquality.google`) | For every visitor, after `load` and idle |
| Cloudflare Web Analytics beacon | For every visitor. It is loaded twice: once by the site's tag, once put in by Cloudflare |
| Google Fonts (CSS and font files) | For every visitor, render-blocking |
| Cloudflare `email-decode.min.js` | On pages with an email link |
| Google Analytics 4, Microsoft Clarity, PostHog | Only after consent |
| Stripe | Links only, no script |

## 6. Closing slash: confirmed

| Where | Form |
|---|---|
| Canonical, `og:url`, sitemap, redirects | `/macos/vscode/` |
| Every internal link (12,657 in the build) | `/macos/vscode` |
| What the host answers to `/macos/vscode` | 308 to `/macos/vscode/` |

- The host forces the closing slash, so the form to keep is the one with the slash. The brief recommends the other one "unless the host forces it".
- Canonical addresses come from `pageUrl()` in `src/utils/siteUrl.js`. Links are written by hand in the components (`<Link to="/macos/vscode">`).
- A visitor who clicks inside the site is not redirected: React Router loads the page data itself. A crawler, a new tab and a shared link do get the 308.

## 7. Windows and Linux pages against macOS pages

| Platform | Pages | Intro | "Start with these" | Tips | FAQ |
|---|---|---|---|---|---|
| macOS | 113 | 113 | 113 | 113 | 113 |
| Windows | 48 | 48 | 48 | 48 | 48 |
| Linux | 10 | 10 | 10 | 10 | 10 |

No page lacks a block. Checked in the built HTML of all 171 pages. The Mac app card already shows on macOS pages only.

Windows pages the brief names: Excel, Word, Chrome, VS Code, Photoshop, Teams and the Windows system page exist. Outlook, File Explorer, PowerShell and Windows Terminal do not.

## 8. The brief against the site

### Already there

| Brief | State |
|---|---|
| Sitemap index with `lastmod`, named in `robots.txt` | Done. But `lastmod` of app pages is the day of the build, not the day the page changed |
| JSON-LD: `WebSite` with `SearchAction`, `WebPage`, `FAQPage`, `BreadcrumbList`, `Article` | Done |
| `width` and `height` on images, lazy loading | Done. `decoding="async"` is missing |
| AdSense after `load`, slots that do not shift the page | Done in the code. No ad slot shifted the page in these runs, but the AdSense account is not approved yet, so an ad may never have filled. To measure again once ads show |
| One-year cache for hashed assets | Done |
| Shortcut in words only for screen readers | Done: the words are in a hidden span. The audit read them in the HTML |
| Copy button per shortcut | Done |
| One vote per visitor, kept in the browser | Done, and the server also keeps one vote per network address |
| Platform chosen from the visitor's system | Done. The choice is not remembered yet |
| `/` focuses the search on an app page | Done |
| Analytics with events | Done: 26 events, among them search, copy, PDF download, vote |
| `llms.txt`, RSS feed | Done |
| OG images under 150 KB | Done, the largest is 61 KB |
| Windows and Linux pages with the same blocks | Done (see 7) |

### Conflicts

| # | Brief | The site | Closest equivalent |
|---|---|---|---|
| 1 | No closing slash | The host answers 308 to the form without it | Keep the slash. Give every internal link the slash |
| 2 | About 22,000 shortcut pages | There are 7,372 shortcuts. 4,892 of them have no counterpart on another platform, none has a description, 1,295 sit in a section with fewer than six | See 9 |
| 3 | `dateModified` on app pages | The data has no date. A test fails on a date in the structured data of an app page | Leave it out until the data has a real date |
| 4 | Year in the title: "(2026)" | It says the list was checked this year. Links to the docs are checked weekly, shortcuts are not | Leave the year out, or add it only to pages verified in that year |
| 5 | Vote widget below the table, counts from 5 votes | You asked for it at the top (2026-09-28) and for numbers from the first one (2026-09-29) | Keep your decisions |
| 6 | Dark theme, Material Design 3 | One light theme by design ("Retro Stationery"), your taste is Apple-minimal | Take the rules that fit (spacing grid, 48 px targets, focus states, motion) and keep the look. Dark theme only if you ask for it |
| 7 | New top navigation, bottom bar on phones | The phone header was redesigned and approved on 2026-09-28 | Decide after the search field is in the header |
| 8 | "Decline" beside "Accept" for everyone | "Decline" shows only in GDPR regions. Google's own consent message runs first there | Your decision: it changes what is asked of visitors, and it touches the ads |
| 9 | JavaScript under 60 KB on app pages, no framework on static pages | React and React Router alone are about 100 KB gzipped. Removing them means another framework, which the brief forbids | My estimate of what is reachable without a rewrite: 130 to 160 KB, by taking `content.js` apart and loading less up front |
| 10 | Draft files for new Windows apps in the data folder | `public/data` is an export. CI overwrites it on every push to `main` | New apps go in through `pnpm add-app`. The missing pages become a list of content to write |
| 11 | Replace the `cdn-cgi/l/email-protection` links | The repo writes real `mailto:` links. Cloudflare rewrites them and adds a render-blocking script | Switch off "Email Address Obfuscation" in the Cloudflare dashboard (Scrape Shield). No code change |
| 12 | 40 to 80 words "What it does" per shortcut, for the top 20 apps | Several thousand paragraphs that nobody checked against the apps. The site's rule is: no claim the data does not show | Write them by hand for a small set first (see 9) |
| 13 | Add privacy-respecting analytics | Four tools are in place | Add no fifth. Remove the double beacon |

## 9. Single-shortcut pages: the risk and a smaller start

What a page would hold, from the data as it is:

| Block | Pages that can have it |
|---|---|
| Keys and action name | 7,372 |
| Five related shortcuts from the same section | 6,077 |
| The same action on another platform | 2,480 |
| "What it does" paragraph | 0 |

- Two pages in three would hold a title, one row of keys and five links. That is the app page cut into pieces.
- Google's spam policy names this: "many pages are generated for the primary purpose of manipulating search rankings and not helping users". The result it states: "may rank lower in results or not appear in results at all". That would hit the 206 pages that rank today.
- AdSense has not approved the site yet, and thin pages are a common reason for refusal.
- Hosting is not the limit: 7,372 pages are about 14,700 files, 15,600 with today's. Cloudflare Pages allows 20,000 on the free plan.

Proposal: start with the pages that have something to say.

1. Only shortcuts that exist on two or more platforms under the same name, in apps on two or more platforms: up to 2,480 pages, each with a real cross-platform table.
2. First batch: the "Start with these" actions of the 20 most visited apps, about 120 pages, each with a paragraph written and checked by hand.
3. Submit them, watch Search Console for four weeks, then decide on the rest.
4. Everything else stays a row on its app page, with an anchor so that a link can point at it.

## 10. Other findings

- `src/data/content.js` is loaded on every page and is the second largest script.
- The Cloudflare analytics beacon is in the page twice and its requests fail with a CORS error. Visitor counts from it may be wrong.
- The cookie banner is the largest element on two of three pages measured. Making it smaller, or the page's own heading larger, moves LCP to the content.
- Meta descriptions are generic: "All 71 VS Code keyboard shortcuts for macOS." The brief's template with real shortcuts from "Start with these" fits the site's rules: every value comes from the data.
- 72 action names occur twice inside one app. Slugs for them need the section name.

## 11. To decide before Phase 1

1. Closing slash: keep it (conflict 1)?
2. Single-shortcut pages: all 7,372, the smaller start of section 9, or none?
3. Look: keep the present design and take only the rules of Material Design 3 that fit, or a new design with a dark theme?
4. Vote card: stays at the top with numbers from the first one?
5. Cookie banner: "Decline" for every visitor?
6. Email obfuscation: will you switch it off in Cloudflare, or shall I do it in the dashboard?

---

# Phase 1: technical SEO

Done on 2026-09-29, on the branch `growth-ux-overhaul`. Nothing is merged or deployed.

Rules taken from the owner's answer to section 11: the closing slash stays, no year in titles, no date the data cannot prove, the vote card stays as it is.

## 1. What changed

| Item of the brief | What was done |
|---|---|
| Closing slash | Every link inside the site now ends with the slash, like canonical, `og:url` and the sitemap. One component (`SiteLink.jsx`) and one helper (`linkPath`) do it, so a new link cannot get it wrong |
| Proof by reading the build | `verify-build.mjs` reads every link, canonical and `og:url` of every built page. Before: 208 link targets in the wrong form. After: 0 of 13,907 links on 208 pages. CI runs this check before every deploy |
| Redirect for the other form | Nothing to add: the host answers it with one 308 |
| Titles | `VS Code Keyboard Shortcuts for macOS — 71 shortcuts`. 60 characters at most; four long names leave the count out. No year |
| Descriptions | `VS Code shortcuts for macOS: Command Palette ⇧⌘P, Quick Open File ⌘P, Toggle Terminal ⌃`, Add Next Match ⌘D. All 71, with a printable PDF.` 96 to 155 characters. Each of the 171 pages has its own, with two to four shortcuts from its "Start with these" |
| Structured data | Already there. `dateModified` is left out (conflict 3) |
| Sitemap dates | An app page states the day its shortcut list last changed, read from the git history: 126 pages 2026-03-31, 6 pages 2026-04-09, 39 pages 2026-09-28. Before, all 206 addresses claimed the day of the build. Pages without a known day state none |
| Links between pages | Already there: every app page links to 8 or more other apps and to each of its comparisons. 34 pages link to fewer than 6 apps of their own category, because the category has fewer on that platform |
| Images | `decoding="async"` on every image that does not load at once. `width`, `height` and lazy loading were there |
| Link text | The link in the cookie banner said "Learn more". It now says "Privacy policy" |

## 2. Lighthouse, before and after

Both builds on a local server on this Mac, same method as Phase 0 (phone: median of three runs with real throttling; desktop: one run). Local numbers differ from the live ones of Phase 0: no CDN, no network distance.

| Page | Device | Build | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|---|
| `/` | phone | before | 75 | 100 | 79 | 92 | 6.2 s | 0.002 | 46 ms |
| `/` | phone | after | 76 | 100 | 79 | 100 | 6.2 s | 0.002 | 29 ms |
| `/` | desktop | before | 97 | 100 | 78 | 92 | 1.0 s | 0.003 | 0 ms |
| `/` | desktop | after | 99 | 100 | 78 | 100 | 0.9 s | 0.002 | 0 ms |
| `/macos/vscode/` | phone | before | 98 | 100 | 79 | 92 | 1.5 s | 0.071 | 39 ms |
| `/macos/vscode/` | phone | after | 98 | 100 | 79 | 100 | 1.5 s | 0.075 | 30 ms |
| `/macos/vscode/` | desktop | before | 98 | 100 | 78 | 92 | 0.7 s | 0.078 | 0 ms |
| `/macos/vscode/` | desktop | after | 99 | 100 | 78 | 100 | 0.7 s | 0.043 | 0 ms |
| `/windows/excel/` | phone | before | 78 | 100 | 79 | 92 | 5.8 s | 0.013 | 45 ms |
| `/windows/excel/` | phone | after | 78 | 100 | 79 | 100 | 6.0 s | 0.013 | 29 ms |
| `/windows/excel/` | desktop | before | 98 | 100 | 78 | 92 | 0.7 s | 0.065 | 0 ms |
| `/windows/excel/` | desktop | after | 99 | 100 | 78 | 100 | 0.7 s | 0.042 | 0 ms |

- SEO went from 92 to 100 on every page.
- Performance did not move, and was not meant to: that is Phase 5. The slow LCP on the phone is still the cookie banner.
- Best practices stays at 78 to 79: a third-party cookie of AdSense, which the site cannot change.

## 3. Left as it is, and why

| Item of the brief | Why |
|---|---|
| Fixed height for every ad slot | The AdSense account is not approved, so no ad fills. A reserved height would be an empty box on every page today. To do on the day ads show, with a real ad to measure |
| One image sheet for the app icons | The icons below the fold load only when they come into view, and the host serves them over HTTP/2. A sheet would load all 119 at once |
| `dateModified` in the structured data | The data has no date. The sitemap now carries the day the list changed, which is what can be proven |
| Email links | See 4 |

## 4. For the owner

1. **Email Address Obfuscation.** Cloudflare rewrites every email link and adds a render-blocking script. The switch is in the Cloudflare dashboard: keyshortcut.com, Security, Settings, "Email Address Obfuscation". It is a security setting of the domain, so it is the owner's to change. Cost of switching it off: the address in the links becomes readable to address collectors.
2. **After `pnpm export`, run `pnpm page-dates`** before the commit, so the sitemap knows the new days. If it is forgotten, a changed list states the day of the build, as before.
3. **Search Console.** Titles and descriptions of 171 pages change with this branch. Expect positions to move for one to three weeks after the deploy. Submit `sitemap.xml` again on that day.

---

# Phase 2: pages about one shortcut, the first batch

Done on 2026-09-29, on the branch `growth-ux-overhaul`. Phase 1 was deployed the same day (main `c92cf0e`); Phase 2 is not deployed.

## 1. What was built

| Item of the brief | What was done |
|---|---|
| Address | `/{platform}/{app}/{id}`, for example `/macos/vscode/toggle-comment/` |
| Which shortcuts | Only those with a hand-written note. 100 notes for 15 apps, which give 163 pages: 91 macOS, 43 Windows, 29 Linux |
| Breadcrumb, h1, large keys, "Press ... to ..." | On every page |
| "What it does" | 52 to 71 words, written for each action |
| The same shortcut on other platforms | A table, where another platform has the action. The action is matched by hand, because the platforms often name it differently ("Add Next Match" on macOS is "Select Word / Next Occurrence" on Windows) |
| Related shortcuts | Five from the same section: the ones that follow in the list. Each page of an app gets its own five |
| Link to the full list | On every page, with the count |
| Questions | One or two, with `FAQPage`. The second only where another platform has the action |
| Title and description | Within 60 and 155 characters, no two pages the same |
| Rows of the app page | The action of a row is a link where its shortcut has a page |
| Sitemap | In the sitemap of the platform |
| `noindex` for thin pages | Not needed: a page without a note does not exist |

The apps of the first batch: VS Code, Figma, Chrome, Safari, Photoshop, Excel, Slack, Notion, Blender, macOS, Terminal, Illustrator, Windows, Word, Vim. For each, the shortcuts of "Start with these".

## 2. Numbers

| | Before | After |
|---|---|---|
| Pages in a build | 206 | 369 |
| Files in a build | 827 | 1,158 |
| Full build | 9 s | 10 s |
| Links checked by `verify-build` | 13,907 | 22,528, none in the wrong form |
| Tests | 1,380 | 1,419 |

Lighthouse, local build, same method as before:

| Page | Device | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|---|
| `/macos/vscode/toggle-comment/` | phone | 100 | 100 | 79 | 100 | 1.4 s | 0.002 | 29 ms |
| `/macos/vscode/toggle-comment/` | desktop | 100 | 100 | 78 | 100 | 0.7 s | 0.000 | 0 ms |
| `/macos/vscode/` with the new links | phone | 98 | 100 | 79 | 100 | 1.5 s | 0.075 | 33 ms |

The notes are not in any file the browser loads.

## 3. How the notes were checked

- Every action name was checked against the data by a test, on every platform the note names.
- The texts were written from what the shortcut does in the app. For Slack, Notion, Safari, Terminal, macOS and Windows the official pages were read and compared. One sentence about Slack's switcher was not in its documentation and was taken out.
- Not checked against a running app. A reader who knows the app well may still find a detail to correct; the report links of the site are the way to say so.

## 4. Questions about the data, nothing changed

| Page | What stands out |
|---|---|
| `windows/notion` | "New Page" is Ctrl+Shift+9, which Notion documents as "create a new page, or turn a line into a page". It is not the same command as New Page on macOS, so the note does not name it |
| `macos/vim` | Keys are written in capitals ("U" for undo, "I" for insert). In Vim the capital is another command |
| `macos/vscode` | Has no "Find in Files"; `windows/vscode` and `linux/vscode` have no "Go to Definition" |
| `macos/chrome` and `windows/chrome` | Name the same actions differently ("Open a new tab, and jump to it" and "New Tab") |

## 5. Found while choosing the pages

**Visits.** Cloudflare Web Analytics, which counts browsers and leaves robots out, shows for the last 30 days: 150 visits and 810 page views. 590 of the page views came from Singapore, on Windows, moving from page to page inside the site, which looks like one automatic reader. Figures are sampled and rounded by Cloudflare.

The figure the site quotes, "9,000+ monthly visitors (Cloudflare, August 2026)", comes from the other Cloudflare report, HTTP Traffic. Its "unique visitors" are network addresses that asked the server for anything, robots and crawlers among them.

- The sponsor page states the figure to people who may pay for a slot. It should name what was counted, or use the number of visits.
- The goal of 50,000 visitors a month starts from a few hundred people, not from nine thousand.
- "Most visited apps" could not be taken from these numbers. The first batch follows the site's own list of popular apps.

**Search Console.** The Google account has no property for keyshortcut.com. Without it there is no data on which searches show the site. Adding the property takes a DNS record in Cloudflare.

## 6. For the owner

1. **The old domain.** `deploy/keysticker-app/_redirects` has a rule for addresses with three parts. It applies after that project is deployed with its own command.
2. **Search Console**: add the property, then submit `sitemap.xml`.
3. **The visitor figure on `/sponsor`**: decide what it should say.
4. **Next batch**: more notes can be added app by app. Each one needs the same check against the app's documentation.


---

# Phases 3 to 6: platforms, search, speed, measurement

Done on 2026-09-29, on the branch `growth-ux-overhaul`. Phase 2, the sponsor page without its visitor figure, and the tag for Search Console were deployed the same day (main `d4ad44d`). What follows is built and tested, and not deployed.

The owner's word for this part: "do all your recommendation, your goal is to achieve real 50000 users monthly".

## 1. Where the site stands

| | Figure | Source |
|---|---|---|
| Visits in 30 days | about 150 | Cloudflare Web Analytics |
| Goal | 50,000 a month | the owner |
| Search data | none until 2026-09-29 | Search Console was added that day |

Code does not close a gap of this size. What can: pages that answer a search better than the pages that rank now, other sites that link here, and time. This part of the work prepares the first and makes the third shorter. The second is in `LAUNCH_CHECKLIST.md`, and is the owner's to do.

## 2. Phase 3: platforms

| Item of the brief | What was done |
|---|---|
| Windows and Linux pages with every block | Were there already (Phase 0, section 7) |
| Home page opens on the visitor's platform | It is served with the app lists of all three platforms in it. A script at its top shows the one of the visitor's system before anything is drawn. Before: a Windows visitor got the macOS list, then a skeleton, then a request |
| All three lists in the HTML, for crawlers | Done: 171 app pages are linked from the home page, before 113 |
| The choice is remembered | In `localStorage`, read inside a try/catch |
| Lists of popular apps by platform | The footer, which is on every page, has five macOS, five Windows and two Linux pages. Before: eight, two and two. The row "Most shortcuts" of the home page follows the platform |
| New Windows pages as draft files in the data folder | Not as drafts in `public/data`, which the export overwrites. Prepared as input files for the database: see 3 |

## 3. The Windows lists

The thinnest part of the site, and the part with the most searches. Two agents read the vendors' own pages with parsers and wrote input files for `pnpm add-app`. Nothing was written to the database.

| App (Windows) | Shortcuts on the site | With the file |
|---|---|---|
| Excel | 22 | 159 |
| Word | 20 | 220 |
| PowerPoint | 15 | 134 |
| Teams | 14 | 133 |
| Windows | 30 | 150 |
| Chrome | 28 | 59 |
| Outlook, OneNote, Edge, File Explorer, Windows Terminal | no page | 53, 148, 82, 30, 50 |

Chrome for Linux: 22 to 59. Together 1,126 shortcuts and five new pages.

- A trial on this machine put the files into a copy of the data and built the site: 376 pages, every test green, every new page with its note.
- `scripts/add-app.mjs` linked every app to macOS, whatever the file said. Corrected. With the old script the five new apps would have shown on macOS, empty.
- Not verified: no shortcut was tried in its app. 180 were compared by eye with the vendor's page.
- Firefox is not done: Mozilla's page refuses requests that do not come from a browser.
- Found in the data of today, and not changed: see the table in `content/pending-apps/README.md` (Teams, PowerPoint, Windows, Chrome, and 30 macOS shortcuts with a doubled backslash).

## 4. Phase 4: search and targets, inside the present design

| Item of the brief | What was done |
|---|---|
| Search on every page | A button in the navigation bar opens a search field over the page. Command + K and Control + K open it. It searches the visitor's platform and can switch. Its code loads when it is opened |
| Search without JavaScript, on a server-rendered `/search?q=` | Not done. The site is static files, and a page rendered for each query needs a server |
| Targets of 44 px on a phone | Navigation bar (menu button was 36 px, menu links 37 px), copy buttons of the shortcut rows (28 px), section links of the app page (34 px), footer links (33 px), "Cookie settings" (20 px, below the 24 px the standard asks for) |
| "No votes to show yet" | Gone since the votes were built |
| Dark theme, Material look, new navigation, bottom bar | Not done, by the owner's answer to Phase 0 |
| App page: left rail, rows as one link, vote card below the table | Not done. The top of the app page was approved on 2026-09-28, and the vote card is where the owner put it |

## 5. Phase 5: speed

Scripts and HTML as they travel (gzip). "Before" is the site as it is live (main `d4ad44d`), built on this machine:

| Page | Scripts before | Scripts after | HTML before | HTML after |
|---|---|---|---|---|
| `/` | 211 KB | 155 KB | 139 KB | 29 KB |
| `/macos/` | 207 KB | 151 KB | 138 KB | 20 KB |
| `/windows/` | 207 KB | 151 KB | 45 KB | 13 KB |
| `/macos/vscode/` | 217 KB | 160 KB | 22 KB | 23 KB |
| `/macos/vscode/toggle-comment/` | 202 KB | 145 KB | 9 KB | 9 KB |

| Change | Effect |
|---|---|
| The notes of all apps (126 KB of text) and the text of all ten guides (110 KB) were in the scripts of every page: `content.js` imported the notes, the footer the guides. Now a page gets its own note from its loader, and the footer three titles | 60 KB less on every page, as it travels |
| Home and platform pages carried every shortcut of their platform, as HTML data | The home page's HTML: 704 KB to 409 KB, 139 KB to 29 KB as it travels. The search loads the shortcuts when somebody searches |
| Fonts from Google: a stylesheet from a second host, font files from a third | The fonts are the site's own files. Two are preloaded |
| A fallback font with other measures | System fonts scaled to the measures of IBM Plex Serif. Layout shift on the VS Code page: 0.075 to 0 |
| The cookie banner counted as the largest element of the page, and came late | One block per sentence, and the region check starts with the page. Largest paint on a phone: home page 6.3 s to 1.6 s, Excel page 6.4 s to 1.5 s |
| A broken analytics tag: the token "s" | No tag for a value that is no token. Every page logged failed requests because of it |
| Links | Fetch their page when the visitor points at them |

Left as it is:

| Item of the brief | Why |
|---|---|
| Scripts under 60 KB | React and React Router are about 100 KB. 145 to 160 KB is what is reached; the brief forbids another framework |
| HTML of an app page under 120 KB | 196 KB unpacked, 23 KB as it travels. The list is the page |
| Critical CSS inline | The stylesheet is 12 KB as it travels and comes from the same host. Measured first paint on a slow phone: 1.6 s |
| Platform pages on a slow phone | The banner is still their largest block: their heading is smaller than one sentence of it. Shorter banner text would end it, and the text is the owner's |
| Best practices 77 | The cookies of AdSense. The site cannot change them |

## 6. Phase 6: measurement

| Item of the brief | What was done |
|---|---|
| Analytics with events | Was there. Two new events: `site_search_opened`, `site_search_performed` |
| Search Console | Property added and verified, sitemap submitted, 2026-09-29 |
| Bing and others | IndexNow: after a deploy, the pages that changed in the last two days are reported. Bing Webmaster Tools itself needs the owner's sign-in |
| `llms.txt`, robots, RSS | Were there |
| "Embed this cheat sheet" as an image with a link | Not done. There is no image of a cheat sheet: the PDF is drawn in the visitor's browser. An image per page would be 171 files to build and keep right |
| "Was this page helpful?" on guides | Not done. The ten guides get a small part of 150 visits; votes there would stay empty |
| `LAUNCH_CHECKLIST.md` | Written: what is done, what waits for the owner, drafts for Show HN, Reddit and Product Hunt |

What the events measure, by the HEART scheme of the brief:

| | Measured by |
|---|---|
| Happiness | Votes "Works" and "Not right" on app pages, reports of a problem |
| Engagement | `shortcut_copied`, `faq_item_expanded`, pages per visit |
| Adoption | PDF downloads (counted on the server), `mac_hud_promo_clicked` |
| Retention | Returning visitors in Cloudflare Web Analytics |
| Task success | `directory_search_performed` and `site_search_performed` with `has_results`, then the page opened |

## 7. Lighthouse

Lighthouse 12.8 on this machine, both builds served by the same local server. "Before" is the site as it is live (main `d4ad44d`). Phone: median of three runs with real throttling (slow 4G, CPU four times slower). Desktop: one run. Nothing else ran on the machine during a run.

| Page | Device | Build | Performance | Accessibility | Best practices | SEO | Largest paint | Layout shift | Blocking time |
|---|---|---|---|---|---|---|---|---|---|
| `/` | phone | before | 75 | 100 | 77 | 100 | 6.3 s | 0.002 | 27 ms |
| `/` | phone | after | 99 | 100 | 77 | 100 | 1.6 s | 0.000 | 38 ms |
| `/macos/vscode/` | phone | before | 98 | 100 | 77 | 100 | 1.5 s | 0.075 | 26 ms |
| `/macos/vscode/` | phone | after | 99 | 100 | 77 | 100 | 1.6 s | 0.000 | 25 ms |
| `/windows/excel/` | phone | before | 77 | 100 | 77 | 100 | 6.4 s | 0.013 | 27 ms |
| `/windows/excel/` | phone | after | 99 | 100 | 77 | 100 | 1.5 s | 0.000 | 25 ms |
| `/macos/vscode/toggle-comment/` | phone | before | 100 | 100 | 77 | 100 | 1.4 s | 0.002 | 28 ms |
| `/macos/vscode/toggle-comment/` | phone | after | 99 | 100 | 77 | 100 | 1.6 s | 0.000 | 31 ms |
| `/windows/` | phone | before | 77 | 100 | 77 | 100 | 6.3 s | 0.000 | 28 ms |
| `/windows/` | phone | after | 80 | 100 | 77 | 100 | 5.1 s | 0.000 | 27 ms |
| all five | desktop | before | 99 to 100 | 100 | 77 | 100 | 0.2 to 1.0 s | 0 to 0.051 | 0 ms |
| all five | desktop | after | 100 | 100 | 77 | 100 | 0.1 s | 0.000 | 0 ms |

- The pages that were slow on a phone because of the banner are fast now: the home page and the Excel page.
- The pages that were fast stay where they were. The page about one shortcut went from 1.4 s to 1.6 s: it now preloads two fonts, which it then has from the first paint on.
- `/windows/` and the other two platform pages are the exception, see section 5.
- These are laboratory numbers from one machine. Numbers from real visitors (Core Web Vitals in Search Console) need more visits than the site has.
