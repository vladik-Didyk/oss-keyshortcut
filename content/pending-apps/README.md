# Shortcut lists that wait for the database

Prepared on 2026-09-29. Each file is input for `pnpm add-app -- --from-json <file>`. Nothing here is in the database or on the site.

## Why

The Windows pages are the thinnest part of the site, and Windows is where most people search. Excel for Windows lists 22 shortcuts; Microsoft's own page has more than 200.

## What the files add

| Platform | App | On the site | With the file | Page |
|---|---|---|---|---|
| Windows | Excel | 22 | 159 | exists |
| Windows | Word | 20 | 220 | exists |
| Windows | PowerPoint | 15 | 134 | exists |
| Windows | Teams | 14 | 133 | exists |
| Windows | Windows | 30 | 150 | exists |
| Windows | Chrome | 28 | 59 | exists |
| Windows | Outlook | none | 53 | new |
| Windows | OneNote | none | 148 | new |
| Windows | Edge | none | 82 | new on Windows |
| Windows | File Explorer | none | 30 | new |
| Windows | Windows Terminal | none | 50 | new |
| Linux | Chrome | 22 | 59 | exists |

Together: 1,126 shortcuts and five new pages. `node scripts/preview-pending-apps.mjs` prints this table from the files.

## Where they come from

- Each list was read from the vendor's own page, the one the file names in `docsUrl`, on 2026-09-29. A script read the keys; the action names were written by hand, in the site's own words.
- A file holds only keys its app does not have on the site. Nothing that is there is changed.
- 180 shortcuts were compared by eye with the page, 15 per file. All agreed.
- **No shortcut was tried in its app.** Several of Microsoft's pages contradict themselves; where they do, the row was left out.

## How to write them to the database

An icon is needed first for the four apps the site does not know: Outlook, OneNote, File Explorer, Windows Terminal. Add `"iconPath": "/path/to/icon.png"` to their files. Without it the page shows a letter.

For each file, first the trial, then the real run:

```bash
node scripts/add-app.mjs --from-json content/pending-apps/windows/excel.json --dry-run
```

```bash
node scripts/add-app.mjs --from-json content/pending-apps/windows/excel.json
```

Then, once for all of them:

```bash
pnpm export && pnpm page-dates && pnpm test
```

Delete the files that were written, commit, deploy. The notes for the five new pages are already in `src/data/appNotes.js` and show from the day the pages exist.

`scripts/add-app.mjs` was corrected on 2026-09-29 for this: it used to link every app to macOS, whatever the file said.

## Decisions for you

| Question | What was done | The other choice |
|---|---|---|
| Outlook: Microsoft has the new Outlook and classic Outlook, with different keys | The file holds the new Outlook, the one the page opens with | A second list for classic Outlook (about 320 shortcuts) |
| Rows of a page that give two key combinations for one action | Left out: about 80 rows, among them the emoji panel of Windows and the address bar of File Explorer | Write each combination as a shortcut of its own |
| Firefox for Windows and Linux | Not done. Mozilla's page refuses requests that do not come from a browser | Copy the page by hand, or leave Firefox as it is |

## What the site has today that the pages do not confirm

Found while comparing. Nothing was changed: the database is the place to change it.

| Page | Keys | The site says | The vendor's page says |
|---|---|---|---|
| Teams, Windows | Ctrl + Shift + B | Raise Hand | it inserts a code block |
| Teams, Windows | Ctrl + Shift + K | Accept Call | it raises or lowers the hand |
| PowerPoint, Windows | Ctrl + D | Duplicate Slide | it duplicates the selected objects |
| Windows | Ctrl + S, Ctrl + P | Save, Print | the keys are not on the page |
| Chrome, Windows and Linux | Ctrl + Shift + I | Developer Tools | the keys are not on the page |
| macOS, 17 apps | 30 shortcuts | a key written as two backslashes | one backslash is meant |

## Files that are not in the repository

`content/pending-apps/local/` holds the two full reports (every row left out, with its reason) and the parsers for the Windows, Edge, Chrome, File Explorer and Windows Terminal pages. They quote the vendors' pages at length, so they stay on this disk and are not published. The parser for Microsoft's Office pages quotes nothing and is in `tools/`.
