# Launch checklist

Written on 2026-09-29. What is done, what waits for the owner, and drafts to post. Claude posts nothing and signs in nowhere: every item marked **You** is yours.

Numbers in the drafts come from `pnpm stats`. Run it on the day you post and correct them.

## 1. Where the site stands

| | Figure | Source |
|---|---|---|
| Visits in 30 days | about 150 | Cloudflare Web Analytics, to 2026-09-29 |
| Page views in 30 days | 810, of which 590 from one automatic reader | the same |
| Pages | 369: 171 app pages, 163 pages about one shortcut, 35 others | the build |
| Search data | none yet | Search Console was added on 2026-09-29 |

The goal is 50,000 visits a month. That is more than 300 times today's figure. Code alone does not get there. Three things do, in this order of weight:

1. **Other sites linking to this one.** Today almost none do. Sections 4 to 7 are about this.
2. **Pages that answer what people search for, better than the pages that rank now.** The Windows pages are the weakest part: Excel for Windows lists 22 shortcuts, Microsoft documents more than 200. Section 3.
3. **Time.** A site with few links is crawled slowly and trusted slowly. Expect months, not weeks. Nobody can promise a date.

## 2. Search engines

| Step | State |
|---|---|
| Google Search Console, property `https://keyshortcut.com/` | Done 2026-09-29. Verified by a tag on the home page (`SITE_VERIFICATION` in `src/data/siteConfig.js`). Taking the tag out ends the verification |
| Sitemap `sitemap.xml` submitted to Google | Done 2026-09-29. Google showed "Couldn't fetch" right after, which is its usual first answer. Look again after a day |
| Search data in Search Console | Arrives in one to three days |
| Domain property (covers every address form) | **You**, optional. Cloudflare → keyshortcut.com → DNS → Add record: type `TXT`, name `@`, content `google-site-verification=rDfUq55k13K9WHBO8rGjN2wPR_81GtQPblW9KoFRMRg`. Then Search Console → the property `keyshortcut.com` → Verify |
| Bing Webmaster Tools | **You**. bing.com/webmasters → sign in → "Import from Google Search Console". It takes the site and the sitemap over. Bing also feeds DuckDuckGo and the search of ChatGPT and Copilot. If Bing gives you a tag to add, put its value into `SITE_VERIFICATION['msvalidate.01']` |

After four weeks, read in Search Console:

| Report | What to look for |
|---|---|
| Pages → Indexed | How many of the 369 are in. "Crawled, currently not indexed" on the pages about one shortcut means Google finds them too thin: write no more of them until that changes |
| Performance → Queries | Searches where the site is shown on positions 8 to 20. These are the pages to improve first |
| Performance → Pages | Which app pages get shown. The next notes and the next data go there |

## 3. Content that waits for you

| Item | State | What you do |
|---|---|---|
| Complete Windows lists for Excel, Word, PowerPoint, Outlook, OneNote, Teams, Windows, File Explorer, Windows Terminal, Edge, Chrome, Firefox | Prepared as files in `content/pending-apps/`, parsed from the vendors' own pages. Not in the database | Read `content/pending-apps/README.md`, then run the command it gives for each file |
| More pages about one shortcut | 100 notes written. Wait for the index report of section 2 | Nothing now |

## 4. Show HN (draft)

Rules of the site: the title starts with "Show HN:", the thing must be usable at once, and you stay in the thread to answer.

> **Show HN: KeyShortcut – keyboard shortcuts for 119 apps, with printable PDFs**
>
> I collect the keyboard shortcuts of apps from their official documentation and put them in one searchable place: 7,372 shortcuts for macOS, Windows and Linux. Every page links to the documentation it was taken from and prints as a one-page PDF. The code and the data are open: https://github.com/vladik-Didyk/oss-keyshortcut

Post it when the Windows lists of section 3 are in. A reader who opens Excel for Windows and finds 22 shortcuts will say so in the thread.

## 5. Reddit (drafts)

One community a week. Read the rules of each before posting: most limit links to your own work, some allow them on one day of the week only. Write as the person who made it, and answer every comment.

| Community | Page to post | When |
|---|---|---|
| r/vscode | `https://keyshortcut.com/macos/vscode/` | Now |
| r/FigmaDesign | `https://keyshortcut.com/macos/figma/` | Now |
| r/blender | `https://keyshortcut.com/macos/blender/` | Now |
| r/excel | `https://keyshortcut.com/windows/excel/` | After the Windows list of section 3 is in |
| r/macapps | `https://keyshortcut.com/mac-hud/` | After Apple approves the app |

Draft for the first three, with the app's name changed:

> **I made a printable one-page cheat sheet of the VS Code shortcuts**
>
> I kept looking up the same shortcuts, so I put all 71 for macOS on one page, grouped by what they do, with a PDF to print. Taken from the official keybindings reference, which the page links to. Free, no account. If a shortcut is wrong or missing, the page has a report link and I fix it.

## 6. Product Hunt (draft, the Mac app)

Only after Apple approves the app. Until then the page has no download button.

| Field | Text |
|---|---|
| Name | KeyShortcut |
| Tagline | Keyboard shortcuts of your Mac apps, in a floating panel |
| Description | A panel for Mac that lists the keyboard shortcuts of an app. With active app detection switched on in Settings, it follows the app in front. One price, no subscription. The shortcuts come from the same open directory as keyshortcut.com. |
| First comment | Why you made it, what it does not do yet, and that you answer questions in the thread |

Check every sentence against the app before posting: `src/test/mac-app-claims.test.jsx` lists what the app does and does not do.

## 7. Lists and directories

| Where | What | Who |
|---|---|---|
| AlternativeTo | An entry for the Mac app, after approval | **You** |
| GitHub lists of cheat sheets and of Mac apps | A pull request that adds one line. Read the list's rules for contributions first | **You** |
| The apps' own communities | Where a forum has a thread about shortcuts, an answer with the page helps the reader and links the site | **You** |

Do not buy links and do not trade them. Google's spam policy names both, and a young site is the first to be hit.

## 8. Settings that wait for you

| Setting | Where | Why |
|---|---|---|
| Email Address Obfuscation: off | Cloudflare → keyshortcut.com → Security → Settings | It rewrites every email link and adds a script that every page waits for. Cost of switching it off: address collectors can read the address |
| `VITE_CF_ANALYTICS_TOKEN` | GitHub → the repository → Settings → Secrets → Actions | The secret holds "s" instead of a token. The site no longer prints a tag for such a value, and Cloudflare's own tag does the counting, so nothing is lost. Delete the secret or put the real token in |
| The old domain | `deploy/keysticker-app/README.md` has the command | Its new redirect rule for pages about one shortcut applies after that deploy |
