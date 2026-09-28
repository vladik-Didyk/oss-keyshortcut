// Hand-written notes for app pages, keyed by app slug (shared by every
// platform the app is on).
//
// {{Action name}} is replaced with that page's own keys (see src/utils/appCopy.js),
// so write action names exactly as they appear in public/data. An action a
// platform doesn't have renders as plain text. src/test/app-notes.test.js checks
// that every placeholder resolves on the app's main platform.
//
// Rules: facts about how the app's shortcuts work, no invented numbers or claims.

export const APP_NOTES = {
  vscode: {
    overview:
      'VS Code runs almost everything through the {{Command Palette}}: a command without its own shortcut is still reachable by typing part of its name. {{Quick Open File}} opens any file in the project by name, and {{Add Next Match}} adds a cursor at the next occurrence of the selection, which replaces many small find-and-replace jobs.',
    tips: [
      'Learn the {{Command Palette}} first. It lists every command with its current shortcut next to it, so it teaches you shortcuts while you use it.',
      'With nothing selected, {{Cut line (empty selection)}} and {{Copy line (empty selection)}} work on the whole line. With {{Move Line Up}} and {{Move Line Down}} you can rearrange code without selecting anything.',
      '{{Go to Symbol}} lists the functions and classes in the current file, so you can jump to one without scrolling.',
    ],
    essentials: ['Command Palette', 'Quick Open File', 'Toggle Terminal', 'Add Next Match', 'Toggle Comment', 'Go to Definition'],
  },

  excel: {
    overview:
      'The Excel shortcuts that save the most time are the navigation ones: {{Move to Edge Down}} and the other "move to edge" shortcuts jump to the end of the current block of data, and holding Shift selects the cells on the way. {{Format Cells}} opens the full formatting dialog, and {{Fill Down}} copies the top cell of the selection into the cells below.',
    tips: [
      'Add Shift to any "move to edge" shortcut to select everything between the active cell and the edge of the data. It is the fastest way to select a column for a formula or a chart.',
      '{{Paste Special}} pastes only what you choose: values, formats or formulas. Use it to paste the results of formulas without the formulas themselves.',
      '{{Add/Remove Filter}} turns the header row into filter drop-downs. Press it again to remove them.',
    ],
    essentials: ['Fill Down', 'Format Cells', 'Paste Special', 'Add/Remove Filter', 'Go To', 'Find and Replace'],
  },

  chrome: {
    overview:
      'Most Chrome shortcuts are about tabs and the address bar. {{Jump to Address Bar}} puts the cursor in the address bar to search or type a URL, and {{Reopen the last closed tab, and jump to it}} brings back a tab you closed by mistake, with its back-and-forward history.',
    tips: [
      '{{Jump to the last tab}} always goes to the rightmost tab, however many are open.',
      'Type one word in the address bar and press {{Add www. and .com, Open}} to open www.word.com without typing the rest.',
      '{{Hard Reload (Ignore Cache)}} reloads the page without cached files. Try it when a site looks broken or out of date.',
    ],
    essentials: ['Open a new tab, and jump to it', 'Close the current tab', 'Reopen the last closed tab, and jump to it', 'Jump to Address Bar', 'Open a new window in Incognito mode', 'Bookmark This Page'],
  },

  figma: {
    overview:
      'Most Figma tools have a single-letter shortcut: {{Move}}, {{Frame}}, {{Rectangle}}, {{Text}}, {{Pen}}. There is nothing to hold down, so one hand stays on the keyboard while the other places things with the mouse. {{Quick Actions}} finds any menu command or plugin by name.',
    tips: [
      '{{Shortcuts Panel}} opens Figma’s own shortcut reference inside the app.',
      '{{Zoom to Selection}} and {{Zoom to Fit}} replace most manual zooming. {{Zoom to 100%}} shows the design at its real size.',
      '{{Copy Properties}} and {{Paste Properties}} copy fills, strokes and effects from one layer to another without copying the layer.',
    ],
    essentials: ['Quick Actions', 'Frame', 'Duplicate', 'Group', 'Frame Selection', 'Create Component'],
  },

  photoshop: {
    overview:
      'Every Photoshop tool has a single-letter shortcut, and tools that share a letter (the Marquee tools, the Lasso tools) cycle when you add Shift to the letter. {{Default colors (B&W)}} and {{Swap foreground/background}} are worth learning early, because masks and adjustment layers are painted in black and white.',
    tips: [
      '{{Quick Mask mode}} lets you paint a selection with any brush. Press it again to turn the painted area back into a selection.',
      'Hold the {{Add to selection}} modifier while dragging to add to a selection, and the {{Subtract from selection}} modifier to take away from it.',
      '{{Hide all tools and panels}} clears the screen so you see only the image. Press it again to bring everything back.',
    ],
    essentials: ['Move tool', 'Brush / Pencil', 'Default colors (B&W)', 'Swap foreground/background', 'Fit on screen', 'Quick Mask mode'],
  },

  slack: {
    overview:
      '{{Jump To Conversation}} is the Slack shortcut to learn first: it opens a switcher where you type part of a channel or person’s name. Message actions such as {{Edit Message}} and {{Save Message}} are single keys that work on the message you have highlighted.',
    tips: [
      '{{Next unread channel DM}} and {{Previous unread channel DM}} move only between conversations with unread messages.',
      '{{Mark all messages as read}} clears every unread badge at once.',
      '{{Search current conversation}} searches only the channel or DM you are in.',
    ],
    essentials: ['Jump To Conversation', 'Jump to most recent unread', 'Compose new message', 'Open threads view', 'Search current conversation', 'Mark all messages as read'],
  },

  notion: {
    overview:
      'Notion pages are made of blocks, and many shortcuts act on the block your cursor is in. {{Turn Into / Commands}} changes a block into another type, {{Duplicate Block}} copies it, and {{Indent / nest content}} nests it under the block above.',
    tips: [
      '{{Quick Find}} searches every page in the workspace. Once you have more than a few pages it is faster than the sidebar.',
      '{{Select block you’re currently in}} selects the whole block. The arrow keys then move the selection one block at a time.',
      'You can type Markdown while writing: # for a heading, - for a bullet, [] for a checkbox.',
    ],
    essentials: ['Quick Find', 'New Page', 'Turn Into / Commands', 'Duplicate Block', 'Indent / nest content', 'Add Link'],
  },

  word: {
    overview:
      'Beyond the usual editing keys, the most useful Word shortcuts format whole paragraphs: {{Center Align}}, {{Justify}}, {{Single Spacing}} and {{Double Spacing}} change the paragraph the cursor is in, with no need to select it first.',
    tips: [
      '{{Copy Formatting}} and {{Paste Formatting}} copy the look of text (font, size, color) without the text itself.',
      '{{Paste Text Only}} pastes without the source formatting, so pasted text matches the rest of the document.',
      '{{Move Down One Paragraph}} and {{Move Up One Paragraph}} move through long documents faster than the arrow keys.',
    ],
    essentials: ['Paste Text Only', 'Find and Replace', 'Copy Formatting', 'Paste Formatting', 'Insert Link', 'Center Align'],
  },

  powerpoint: {
    overview:
      'PowerPoint shortcuts split into building slides and presenting them. {{Insert New Slide}} and {{Duplicate Slide}} cover most slide creation. {{Start Slideshow}} starts presenting, and {{Presenter View}} opens the view with your notes and a timer.',
    tips: [
      '{{Group Objects}} keeps shapes and text together, so they move and resize as one.',
      '{{Copy Animation}} and {{Paste Animation}} reuse an animation on another object, so you don’t set it up twice.',
      'During a slideshow, {{End Slideshow}} stops it and returns to editing.',
    ],
    essentials: ['Insert New Slide', 'Duplicate Slide', 'Start Slideshow', 'Presenter View', 'Group Objects', 'Copy Formatting'],
  },

  safari: {
    overview:
      'Safari shortcuts cover tabs, scrolling and the Smart Search field. {{Focus Address Bar}} puts the cursor in the Smart Search field, {{Show tab overview}} shows all open tabs as thumbnails, and {{Reopen the last tab you closed}} brings back a tab closed by mistake.',
    tips: [
      '{{Go to Tab 1}} and the number keys after it jump to a tab by its position; {{Go to Last Tab}} goes to the last one.',
      '{{Scroll down a screen}} pages down; add Shift to page up.',
      '{{Show Downloads}} opens the downloads list without leaving the page.',
    ],
    essentials: ['Focus Address Bar', 'New Tab', 'Close Tab', 'Reopen the last tab you closed', 'Show tab overview', 'New Private Window'],
  },

  macos: {
    overview:
      'These shortcuts work across macOS, not in one app. {{Show or hide Spotlight search}} opens Spotlight to launch apps and find files, {{Switch to the next most recently used app}} switches between apps, and {{Capture selected area screenshot}} and {{Screenshot or screen recording options}} cover screenshots and screen recordings.',
    tips: [
      '{{Force quit an app}} opens the Force Quit window when an app stops responding.',
      '{{Paste and Match Style}} pastes text in the style of the document you paste into.',
      '{{Lock your screen}} locks the Mac immediately when you step away.',
    ],
    essentials: ['Show or hide Spotlight search', 'Switch to the next most recently used app', 'Capture selected area screenshot', 'Hide the front app', 'Force quit an app', 'Lock your screen'],
  },

  'google-docs': {
    overview:
      'Google Docs shortcuts are mostly about structure. {{Heading1}} to {{Heading6}} apply heading styles, {{Normal Text}} turns a line back into body text, and {{Numbered List}} and {{Bulleted List}} start lists. Headings also build the document outline that Docs shows next to the page.',
    tips: [
      '{{Clear Formatting}} removes bold, italic and other text formatting from the selection.',
      '{{Insert Comment}} adds a comment to the selected text, and collaborators can reply in the same thread.',
      'Docs has its own searchable shortcut list: press ⌘/ in any document.',
    ],
    essentials: ['Heading1', 'Heading2', 'Normal Text', 'Bulleted List', 'Insert Link', 'Clear Formatting'],
  },

  'google-sheets': {
    overview:
      'In Google Sheets, {{Jump To Bottom Of Data}} and the other "jump to" shortcuts move to the edge of the current block of data. {{Format Currency}}, {{Format Percent}} and {{Format Date}} change a number format in one step, without opening a menu.',
    tips: [
      '{{Fill Down}} copies the top cell of the selection into every cell below it.',
      '{{New Line In Cell}} starts a new line inside the cell instead of moving to the next row.',
      '{{Insert Note}} adds a note to a cell. Unlike comments, notes don’t notify anyone.',
    ],
    essentials: ['Edit Cell', 'Fill Down', 'Jump To Bottom Of Data', 'Format Currency', 'Insert Row Or Column', 'Find And Replace'],
  },

  illustrator: {
    overview:
      'Illustrator has two selection tools: {{Selection Tool}} selects whole objects and groups, and {{Direct Selection}} selects individual anchor points and path segments. Most edits start with picking the right one. {{Toggle Outline Preview}} shows only the paths, which makes hidden or stacked objects easy to find.',
    tips: [
      '{{Lock Selection}} and {{Hide Selection}} move finished objects out of the way. {{Unlock All}} and {{Show All}} bring them back.',
      '{{Make Clipping Mask}} uses the top object to crop everything selected below it.',
      '{{Join Paths}} connects two open end points.',
    ],
    essentials: ['Selection Tool', 'Direct Selection', 'Pen Tool', 'Group', 'Toggle Outline Preview', 'Make Clipping Mask'],
  },

  'premiere-pro': {
    overview:
      'Premiere Pro playback is built around three keys: {{Shuttle Left}} plays backward, {{Shuttle Stop}} stops and {{Shuttle Right}} plays forward, and pressing J or L again plays faster. {{Set In Point}} and {{Set Out Point}} mark the part of a clip you want before it goes into the timeline.',
    tips: [
      '{{Ripple Trim Previous to Playhead}} and {{Ripple Trim Next to Playhead}} cut from the playhead to the previous or next edit and close the gap in one step.',
      '{{Add Edit at Playhead}} splits the clip at the playhead without switching to the Razor tool.',
      '{{Zoom to Sequence}} fits the whole sequence into the timeline panel.',
    ],
    essentials: ['Play/Stop', 'Set In Point', 'Set Out Point', 'Add Edit at Playhead', 'Ripple Trim Previous to Playhead', 'Add Marker'],
  },

  'final-cut-pro': {
    overview:
      'Final Cut Pro uses single keys to put clips into the timeline: {{Connect To Timeline}}, {{Insert Clip}}, {{Append To Timeline}} and {{Overwrite Clip}}. Playback uses the same J, K, L keys as other editors, and {{Blade At Playhead}} cuts the clip under the playhead.',
    tips: [
      '{{Toggle Skimming}} turns skimming on or off. With it on, the playhead follows the pointer across clips.',
      '{{Create Storyline}} groups connected clips into a storyline, so they move together.',
      '{{Change Duration}} sets the exact length of a clip, title or transition by typing it.',
    ],
    essentials: ['Blade At Playhead', 'Connect To Timeline', 'Insert Clip', 'Append To Timeline', 'Play Pause', 'Toggle Skimming'],
  },

  xcode: {
    overview:
      'The core Xcode loop is {{Build}}, {{Run}} and {{Test}}. {{Clean Build Folder}} deletes cached build products, which fixes many build errors that make no sense. In the editor, {{Edit All in Scope}} renames a variable everywhere it is used in the current scope.',
    tips: [
      '{{Find in Project}} searches every file in the workspace, not only the open one.',
      '{{Re-indent Code}} fixes the indentation of the selected lines.',
      '{{Quick Help}} shows the documentation summary for the symbol at the cursor.',
    ],
    essentials: ['Build', 'Run', 'Test', 'Clean Build Folder', 'Find in Project', 'Comment/Uncomment'],
  },

  terminal: {
    overview:
      'The Terminal app’s own shortcuts manage windows, tabs, text size and scrollback. The command line inside it uses standard shell editing keys. {{Split Window into Two Panes}} shows two parts of the same session, and marks let you jump between commands in long output.',
    tips: [
      '{{New Tab with Same Command}} opens a tab that runs the same command as the current one.',
      '{{Show or Hide Inspector}} shows the running processes and settings of the current window.',
      '{{Make Fonts Bigger}} and {{Make Fonts Smaller}} change the text size of the current window.',
    ],
    essentials: ['New tab', 'New window', 'Split Window into Two Panes', 'Close tab', 'Next Tab', 'Previous Tab'],
  },

  obsidian: {
    overview:
      'Obsidian is built for the keyboard: {{Command Palette}} runs any command by name, {{Quick Open}} opens a note by typing part of its title, and {{Toggle Edit/Preview}} switches between editing and the rendered note.',
    tips: [
      '{{Insert Link}} adds a Markdown link. Typing [[ starts a link to another note in the vault.',
      '{{Search in All Files}} searches the whole vault; {{Search in File}} searches the current note.',
      'Every command can get its own shortcut in Settings → Hotkeys.',
    ],
    essentials: ['Command Palette', 'Quick Open', 'New Note', 'Toggle Edit/Preview', 'Search in All Files', 'Go Back'],
  },
}
