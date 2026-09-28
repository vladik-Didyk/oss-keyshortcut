// Hand-written notes for app pages, keyed by app slug (shared by every
// platform the app is on).
//
// {{Action name}} is replaced with that page's own keys (see src/utils/appCopy.js),
// so write action names exactly as they appear in public/data. An action a
// platform doesn't have renders as plain text. src/test/app-notes.test.js checks
// that every placeholder resolves on the app's main platform.
//
// `sections` (optional) lists the section names the text mentions. A note is
// used only on a page that has those sections, and the test checks each name
// against the data, so a renamed section cannot leave a wrong sentence behind.
//
// A platform whose data names its actions differently gets its own note in
// APP_NOTES_BY_PLATFORM (end of this file). Pages read notes through getAppNote().
//
// Rules: facts about how the app's shortcuts work, no invented numbers or claims.
// Never type a key by hand: name the action and let the page show its keys.

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

  // ─── Apple apps ───────────────────────────────────────────────────

  'apple-tv': {
    overview:
      'The Playback section has {{Play or pause video}} and the volume shortcuts. Playlists creates, refreshes and deletes playlists. View opens the Info window and the filter field, and General holds the window commands and a few others, such as {{View download activity}}.',
    tips: [
      '{{Open the Info window for the selected item}} shows the details of one item. {{See info for the previous item in the list}} then shows the info for the item before it.',
      '{{Show filter field}} opens a field for filtering the list on screen.',
    ],
    essentials: ['Play or pause video', 'Increase the volume', 'Decrease the volume', 'Enter or exit full screen', 'Create a new Smart Playlist', 'Show filter field'],
    sections: ['Playback', 'Playlists', 'View', 'General'],
  },

  news: {
    overview:
      'The Windows and Tabs section opens and closes windows and tabs, and moves between stories with {{Move to the next story}} and {{Move to the previous story}}. Stories acts on the story you are reading. View has the shortcuts for the zoom and the text size.',
    tips: [
      '{{Suggest more stories like this one}} and {{Suggest fewer stories like this one}} tell News which stories you want more or less of.',
      '{{Save or unsave a story}} saves the story you are reading, or removes it from your saved stories.',
      '{{Make the text bigger}} and {{Make the text smaller}} change the text size. {{Zoom in}} and {{Zoom out}} scale the content, and {{Return content to actual size}} resets it.',
    ],
    essentials: ['Move to the next story', 'Move to the previous story', 'Save or unsave a story', 'Refresh a feed', 'Close story and return to the feed', 'Make the text bigger'],
    sections: ['Windows and Tabs', 'Stories', 'View'],
  },

  'voice-memos': {
    overview:
      'Many Voice Memos shortcuts work on a recording, such as {{Create a recording}}, {{Play or pause a recording}}, {{Trim a recording}}, {{Enhance a recording}} and {{Skip silence in a recording}}. The others are Undo and Redo and the commands for the window, the sidebar and the app.',
    tips: [
      '{{Jump backward 15 seconds}} and {{Jump forward 15 seconds}} move through a recording in fixed steps.',
      '{{Duplicate a recording}} makes a copy, so you can trim the copy and keep the original.',
      '{{Undo}} reverses the last change and {{Redo}} applies it again.',
    ],
    essentials: ['Create a recording', 'Play or pause a recording', 'Trim a recording', 'Enhance a recording', 'Skip silence in a recording', 'Delete a recording'],
  },

  'find-my': {
    overview:
      'Find My’s sections are short. Sidebar switches between the lists: {{Switch to the People list}}, {{Switch to the Devices list}} and {{Switch to the Items list}}. Map has {{Zoom in}} and {{Zoom out}}. General holds the window commands and {{Share My Location}}.',
    tips: [
      'The list shortcuts use consecutive number keys: People, then Devices, then Items.',
      '{{Enter or exit full-screen view}} gives the map the whole screen. The same shortcut leaves full screen.',
    ],
    essentials: ['Switch to the People list', 'Switch to the Devices list', 'Switch to the Items list', 'Zoom in', 'Zoom out', 'Share My Location'],
    sections: ['Sidebar', 'Map', 'General'],
  },

  'disk-utility': {
    overview:
      'Most Disk Utility shortcuts do one of three jobs. Disk images: {{New blank image}}, {{New image from folder}}, {{New image from volume}} and {{Open disk image}}. Work on a disk or volume: {{Erase}}, {{Partition}}, {{Restore}} and {{Eject}}. The view: {{Switch to Show Only Volumes view}} and {{Switch to Show All Devices view}}.',
    tips: [
      '{{Switch to Show All Devices view}} and {{Switch to Show Only Volumes view}} switch between the two views.',
      'Check what is selected before you use {{Erase}}.',
      'The three shortcuts that create a disk image use the same letter with different modifiers: {{New blank image}}, {{New image from folder}} and {{New image from volume}}.',
    ],
    essentials: ['Get info', 'Eject', 'Open disk image', 'New blank image', 'Switch to Show All Devices view', 'Switch to Show Only Volumes view'],
  },

  'app-store': {
    overview:
      'Most App Store shortcuts switch between the pages of the store. The Navigation section has one for each page, from {{Display Discover apps}} to {{Display Updates}}. The General section has the rest: {{Search for an app}}, {{Refresh the current page}} and {{Go to the previous page}}.',
    tips: [
      'The page shortcuts use the number keys in order. {{Display Discover apps}} is the first and {{Display Updates}} is the last.',
      'Use {{Search for an app}} when you know the name of the app. The page shortcuts are for browsing.',
    ],
    essentials: ['Search for an app', 'Display Discover apps', 'Display Updates', 'Display Categories', 'Go to the previous page', 'Refresh the current page'],
    sections: ['Navigation', 'General'],
  },

  contacts: {
    overview:
      'Contacts shortcuts work on cards and lists. {{Create a card for a new contact}} adds a card, {{Edit the current contact}} opens it for editing and {{Save changes}} saves it. {{Go to the next card}} and {{Go to the previous card}} move through the cards.',
    tips: [
      '{{Merge or link selected cards}} combines the cards you have selected. Use it when one person has two cards.',
      '{{Open a card in a separate window}} keeps one card on screen while you look at another.',
      '{{Go to the next card}} and {{Go to the previous card}} use the two bracket keys with the same modifier.',
    ],
    essentials: ['Create a card for a new contact', 'Edit the current contact', 'Save changes', 'Go to the next card', 'Go to the previous card', 'Merge or link selected cards'],
  },

  maps: {
    overview:
      'Maps shortcuts change what the map shows and how you look at it. One group switches the view: {{Switch to explore view}}, {{Switch to driving view}}, {{Switch to transit view}} and {{Switch to satellite view}}. The others zoom and rotate the map, show your location, drop a pin, and show or hide parts of the view such as directions and the sidebar.',
    tips: [
      'After {{Rotate map clockwise}} or {{Rotate map counterclockwise}}, {{Return to north-facing orientation}} puts north at the top again.',
      'The four view shortcuts use the first four number keys with the same modifier, from {{Switch to explore view}} to {{Switch to satellite view}}.',
      '{{Drop a pin in the middle of the map}} marks the centre of the map as it is on screen.',
    ],
    essentials: ['Show your current location', 'Zoom in', 'Zoom out', 'Show or hide directions', 'Show or hide the 3D map', 'Drop a pin in the middle of the map'],
  },

  podcasts: {
    overview:
      'The Playback section controls the episode: {{Start playing or pause}}, {{Skip forward}}, {{Skip backward}}, the volume and the playback speed. General holds the window commands and a few others, such as {{Search your library or all podcasts}} and {{Refresh feed updates}}.',
    tips: [
      'The volume shortcuts and the speed shortcuts use the same arrow keys. {{Increase the playback speed}} and {{Decrease the playback speed}} add one more modifier.',
      '{{Skip forward}} and {{Skip backward}} move inside an episode.',
    ],
    essentials: ['Start playing or pause', 'Skip forward', 'Skip backward', 'Increase the playback speed', 'Decrease the playback speed', 'Search your library or all podcasts'],
    sections: ['Playback', 'General'],
  },

  spotlight: {
    overview:
      'Spotlight shortcuts open the search window, move through the results, open a result, and narrow the search. {{Open or close the Spotlight window}} starts a search. The Filters section limits the results to one kind: {{Search Applications}}, {{Search Files}}, {{Search Actions}} or {{Search Clipboard}}.',
    tips: [
      '{{Open a search result in Quick Look}} previews a result without opening it.',
      '{{See a file in an app or the Finder}} shows where a result is, instead of opening it.',
      '{{Open Finder with search field selected}} starts the search in a Finder window.',
    ],
    essentials: ['Open or close the Spotlight window', 'Open a result', 'Open a search result in Quick Look', 'Move to the next result', 'Search Applications', 'Search Files'],
    sections: ['Filters'],
  },

  calendar: {
    overview:
      'Most Calendar shortcuts move around the calendar or edit events. {{Switch to Day view}}, {{Switch to Week view}}, {{Switch to Month view}} and {{Switch to Year view}} change the view, and {{Go to today}} returns to the current date. The Events section edits and moves the selected event.',
    tips: [
      '{{Move event 15 minutes later}} and {{Move event 15 minutes earlier}} shift the selected event in small steps. {{Move event one day later}} and {{Move event one day earlier}} move it by a day.',
      '{{Go to the next day, week, month, or year}} moves forward by a day, a week, a month or a year.',
      '{{Go to a specific date}} uses the letter of {{Go to today}} with one modifier added.',
    ],
    essentials: ['New Event', 'Go to today', 'Switch to Week view', 'Switch to Month view', 'Edit the selected event', 'Go to a specific date'],
    sections: ['Events'],
  },

  mail: {
    overview:
      'The General section has {{New Message}}, {{Reply}}, {{Reply All}}, {{Forward}} and {{Send Message}}. Compose has the shortcuts for the message you are writing, such as {{Show the Bcc address field}} and {{Attach files to your email}}. Reading has the shortcuts for the selected emails, such as {{Archive emails}} and {{Redirect the selected email}}.',
    tips: [
      '{{Show the Bcc address field}} and {{Show the Reply-To address field}} add those fields to the message you are writing.',
      '{{Archive emails}} and {{Move selected emails to Junk}} file the selected emails from the keyboard.',
      '{{Enable or disable the message filter}} turns the filter on the message list on and off.',
    ],
    essentials: ['New Message', 'Reply', 'Reply All', 'Forward', 'Send Message', 'Archive emails'],
    sections: ['General', 'Compose', 'Reading'],
  },

  messages: {
    overview:
      'The General section covers the app: {{Start a new message}}, {{Search all conversations}} and the filters for the conversation list, such as {{Show conversations with unread messages}}. Conversations works inside a chat: {{Reply to the last incoming message}}, {{Edit a sent message}} and {{Delete a single message}}.',
    tips: [
      '{{Select the next conversation}} and {{Select the previous conversation}} move through the conversation list.',
      '{{Hide or unhide alerts for a conversation}} silences one conversation and leaves the others as they are.',
      '{{Mark a conversation as unread or read}} switches a conversation between the two states.',
    ],
    essentials: ['Start a new message', 'Search all conversations', 'Reply to the last incoming message', 'Edit a sent message', 'Mark a conversation as unread or read', 'Select the next conversation'],
    sections: ['General', 'Conversations'],
  },

  music: {
    overview:
      'The Playback section plays, stops and moves within a song, and moves between songs and albums. Playlists creates and deletes playlists. Library works on song files and their information. View opens the players and windows, such as {{Open or close MiniPlayer}} and {{Open or close Full Screen Player}}.',
    tips: [
      '{{Move forward within a song}} and {{Move backward within a song}} move inside the song. {{Play the next song in a list}} and {{Play the previous song in a list}} change the song.',
      '{{Show the currently playing song}} finds the playing song in the list.',
      'Three Playlists shortcuts use the same letter with different modifiers: {{Create a new playlist}}, {{Create a playlist from a selection}} and {{Create a new Smart Playlist}}.',
    ],
    essentials: ['Start playing or pause the selected song', 'Play the next song in a list', 'Play the previous song in a list', 'Increase the volume', 'Decrease the volume', 'Show the queue'],
    sections: ['Playback', 'Playlists', 'Library', 'View'],
  },

  notes: {
    overview:
      'A large part of the Notes shortcuts is formatting. The Editing section applies paragraph styles, such as {{Apply Title format}}, {{Apply Heading format}} and {{Apply Body format}}, and list styles, such as {{Apply Checklist format}} and {{Apply Dashed List format}}. Tables has its own section for moving between cells and adding rows and columns.',
    tips: [
      '{{Increase list level}} and {{Decrease list level}} indent a list item and bring it back. {{Move list item up}} and {{Move list item down}} change its position.',
      '{{Apply Title format}}, {{Apply Heading format}} and {{Apply Body format}} share their modifiers and use the first letter of the style.',
      'In a table, {{Add a new row below}} and {{Add a column to the right}} extend the table from the keyboard.',
    ],
    essentials: ['Create a new note', 'Search all notes', 'Apply Title format', 'Apply Heading format', 'Apply Checklist format', 'Insert a table'],
    sections: ['Editing', 'Tables'],
  },

  photos: {
    overview:
      'The Viewing section has {{All Photos view}}, {{Open or close an individual photo}} and {{Show or hide thumbnails}}. Editing opens the editing view, where single keys choose a tool: {{Crop a photo}}, {{Adjust a photo}} and {{Apply a filter}}. Organization creates albums and folders and marks favorites.',
    tips: [
      '{{Open or close editing view}} switches between viewing a photo and editing it.',
      '{{Show unadjusted photo without edits}} shows the original, so you can compare it with your edit.',
      '{{Go to the previous photo}} and {{Go to the next photo}} use the left and right arrow keys without a modifier.',
    ],
    essentials: ['Open or close editing view', 'Crop a photo', 'Automatically enhance a photo', 'Show unadjusted photo without edits', 'Make a photo a favorite', 'Create a new album'],
    sections: ['Viewing', 'Editing', 'Organization'],
  },

  reminders: {
    overview:
      'Many Reminders shortcuts create something or set a due date. {{New Reminder}} and {{New Section}} create. {{Set reminder as due today}}, {{Set reminder as due tomorrow}}, {{Set reminder as due this weekend}} and {{Set reminder as due next week}} set the date in one step.',
    tips: [
      '{{Set all overdue reminders as due today}} moves every overdue reminder to today at once.',
      '{{Indent reminder}} and {{Outdent reminder}} move a reminder in and out. {{Show all subtasks}} and {{Hide all subtasks}} expand and collapse the subtasks.',
      '{{Mark reminder completed or incomplete}} and {{Flag or unflag reminder}} each switch a reminder between two states.',
    ],
    essentials: ['New Reminder', 'Set reminder as due today', 'Set reminder as due tomorrow', 'Mark reminder completed or incomplete', 'Flag or unflag reminder', 'Show or hide completed reminders'],
  },

  imovie: {
    overview:
      'In Editing, single keys put the selection into the movie: {{Add the selection to the movie}}, {{Insert the selection at the playhead}} and {{Connect the selection at the playhead}}. Many of its shortcuts paste one kind of adjustment from a copied clip.',
    tips: [
      '{{Paste all adjustments}} applies every adjustment of the copied clip. The other paste shortcuts apply one kind only, such as {{Paste color correction adjustments}} or {{Paste volume adjustments}}.',
      '{{Move playhead one frame forward}} and {{Move playhead one frame backward}} place the playhead exactly. {{Divide a clip at the playhead}} then splits the clip there.',
    ],
    essentials: ['Play or pause video', 'Add the selection to the movie', 'Divide a clip at the playhead', 'Select an entire clip', 'Detach audio from a clip', 'Open or close the clip trimmer'],
    sections: ['Editing'],
  },

  // ─── Productivity, communication and media ────────────────────────

  '1password': {
    overview:
      'The Global section has {{Show Quick Access}} and {{Lock 1Password}}. The App sections work inside the 1Password window, where the item actions copy parts of a login: {{Copy Username}}, {{Copy Password}} and {{Copy One-Time Password}}. Browser extension has the shortcuts for the browser.',
    tips: [
      '{{Open Website & Autofill}} opens the website of the selected item and fills in the login.',
      '{{Reveal/Conceal Fields}} shows the hidden fields of an item and hides them again.',
      'There are two searches: {{Search}}, and {{Find in Current List}} for the list on screen.',
    ],
    essentials: ['Show Quick Access', 'Lock 1Password', 'Copy Username', 'Copy Password', 'Copy One-Time Password', 'Open Website & Autofill'],
    sections: ['Global', 'Browser extension'],
  },

  asana: {
    overview:
      'Many Asana shortcuts start with the same key, followed by a letter. Navigation uses them to open {{My Tasks}}, {{Inbox}} and {{Home}}. Task Actions uses them on the selected task: {{Assign Task}}, {{Set Due Date}}, {{Mark Complete}}. Editing has the text formatting: bold, italic, links and lists.',
    tips: [
      '{{Create Task Below}} adds a task under the selected one, and {{Create Subtask}} adds a subtask to it.',
      '{{Navigate Up}} and {{Navigate Down}} move through the task list. {{Open Task Detail}} opens the selected task and {{Close Detail}} closes it.',
    ],
    essentials: ['My Tasks', 'Inbox', 'Create Task Below', 'Assign Task', 'Set Due Date', 'Mark Complete'],
    sections: ['Navigation', 'Task Actions', 'Editing'],
  },

  bear: {
    overview:
      'Bear’s list is short and almost all of it is formatting. {{Heading 1}}, {{Heading 2}} and {{Heading 3}} set the heading level, {{Todo}} starts a to-do item, {{Unordered List}} starts a list, and {{Code Block}} marks code. {{New Note}} and {{Search}} are the only ones that are not about formatting.',
    tips: [
      'The heading shortcuts use the number of the heading level.',
      '{{Insert Link}} and {{Code Block}} use the same letter. {{Insert Link}} adds one more modifier.',
    ],
    essentials: ['New Note', 'Search', 'Heading 1', 'Todo', 'Unordered List', 'Code Block'],
  },

  clickup: {
    overview:
      'Many ClickUp shortcuts are single letters. Global has {{Create Task}}, {{Open Search}} and {{Open Notepad}}. Navigation jumps between places and views: {{Go to Home}}, {{Go to Inbox}}, {{Jump to list view}}, {{Jump to board view}}. Text Editor holds the formatting shortcuts.',
    tips: [
      '{{Create task from selected text}} and {{Create comment from selected text}} turn the selected text into a task or a comment.',
      '{{Tag a user}}, {{Mention a task}} and {{Mention a doc}} are typed characters, not key combinations.',
      '{{Move to previous task}} and {{Move to next task}} go from one task to the next.',
    ],
    essentials: ['Open Command Center', 'Create Task', 'Open Search', 'Go to Home', 'Go to Inbox', 'Assign current task to yourself'],
    sections: ['Global', 'Navigation', 'Text Editor'],
  },

  discord: {
    overview:
      'The Discord shortcuts cover moving around ({{Quick Switcher}}, {{Previous Channel}}, {{Next Channel}}, {{Search}}), voice ({{Toggle Mute}}, {{Toggle Deafen}}) and messages ({{Emoji Picker}}, {{Upload File}}, {{Toggle Pins}}).',
    tips: [
      '{{Keyboard Shortcuts}} opens Discord’s own shortcut list inside the app.',
      '{{Toggle Mute}} and {{Toggle Deafen}} share their modifiers and differ in one letter. Each one switches its state on and off.',
      '{{Previous Channel}} and {{Next Channel}} use the up and down arrow keys with one modifier.',
    ],
    essentials: ['Quick Switcher', 'Search', 'Toggle Mute', 'Toggle Deafen', 'Previous Channel', 'Next Channel'],
  },

  gmail: {
    overview:
      'A large part of Gmail works with single keys, without a modifier. Actions on Messages works on the open or selected conversation: {{Archive}}, {{Reply}}, {{Reply All}}, {{Forward}}. Navigation moves through the inbox with {{Older Conversation}} and {{Newer Conversation}}. In Formatting text every shortcut uses a modifier key.',
    tips: [
      '{{Reply in a new window}}, {{Reply all in a new window}} and {{Forward in a new window}} use the same letters as {{Reply}}, {{Reply All}} and {{Forward}}, with one modifier added.',
      '{{Open Conversation}} opens the conversation and {{Return To List}} goes back to the list.',
      '{{Show Shortcuts}} opens Gmail’s own shortcut list.',
    ],
    essentials: ['Compose', 'Send', 'Archive', 'Reply', 'Search', 'Older Conversation'],
    sections: ['Actions on Messages', 'Navigation', 'Formatting text'],
  },

  'google-drive': {
    overview:
      'The Selection section moves through the files with {{Move Down}} and {{Move Up}} and selects with {{Select Item}}. Navigation acts on the selection: {{Open Selected}}, {{Rename Selected}}, {{Share Selected}}, {{Move Selected}}. Create starts a new file or folder.',
    tips: [
      'The Create shortcuts share one modifier and use the first letter of what they create, as in {{New Spreadsheet}}, {{New Presentation}} and {{New Folder}}. {{New Document}} is the exception.',
      '{{Extend Selection Down}} and {{Extend Selection Up}} add the next file to the selection.',
    ],
    essentials: ['Search', 'Open Selected', 'Rename Selected', 'Share Selected', 'New Folder', 'Select Item'],
    sections: ['Navigation', 'Selection', 'Create'],
  },

  jira: {
    overview:
      'In this list, every Jira shortcut is a single key. Global shortcuts has {{Create Issue}}, {{Quick Search}} and {{Open Shortcut Help}}. Navigation moves between issues with {{Next Issue}} and {{Previous Issue}}. Issue actions works on the selected issue, and Board shortcuts changes the view of a board.',
    tips: [
      '{{Assign To Me}} assigns the issue to you. {{Assign Issue}} is for assigning it to someone else.',
      '{{Next Activity}} and {{Previous Activity}} use the first letters of “next” and “previous”.',
      '{{Detail View}} and {{List View}} use the first two number keys.',
    ],
    essentials: ['Create Issue', 'Quick Search', 'Next Issue', 'Previous Issue', 'Assign To Me', 'Edit Issue'],
    sections: ['Global shortcuts', 'Navigation', 'Issue actions', 'Board shortcuts'],
  },

  raycast: {
    overview:
      'The Launch section has one shortcut, {{Open Raycast}}. Navigation moves through the list and opens preferences. Built-in Commands opens Raycast’s own tools: {{Clipboard History}}, {{Snippets}}, {{Quick Links}}, {{File Search}} and {{Window Management}}.',
    tips: [
      '{{Move Down in List}} and {{Move Up in List}} move through the list without the arrow keys.',
      '{{Add/Remove Favorite}} makes the selected item a favorite, or removes it. {{Move Favorite Up}} and {{Move Favorite Down}} change the order of the favorites.',
    ],
    essentials: ['Open Raycast', 'Clipboard History', 'File Search', 'Snippets', 'Quick Links', 'Run Command'],
    sections: ['Launch', 'Navigation', 'Built-in Commands'],
  },

  spotify: {
    overview:
      'The Playback section controls the music: {{Play/Pause}}, {{Next Track}}, {{Previous Track}}, {{Shuffle}} and {{Repeat}}. Navigation opens a page of the app, such as {{Go to Home}}, {{Go to Liked Songs}} and {{Go to Queue}}. Layout shows, hides and resizes the sidebars.',
    tips: [
      '{{Seek Forward}} and {{Seek Backward}} move within the track. They are the track shortcuts with one modifier added.',
      'Most Navigation shortcuts share the same two modifiers and differ in the last key.',
      'In Basic, {{Search in Your Library}} uses the letter of {{Filter}} with one modifier added.',
    ],
    essentials: ['Play/Pause', 'Next Track', 'Previous Track', 'Open Search', 'Go to Liked Songs', 'Go to Queue'],
    sections: ['Basic', 'Playback', 'Navigation', 'Layout'],
  },

  teams: {
    overview:
      'The General section opens {{Activity}}, {{Chat}}, {{Teams}} and {{Calendar}} with the first four number keys and one modifier. It also has the meeting controls {{Toggle Mute}}, {{Toggle Video}} and {{Share Screen}}. Meeting and Calls adds the shortcuts for accepting, declining and starting calls.',
    tips: [
      '{{Show keyboard shortcuts}} opens the shortcut list inside Teams.',
      '{{Start new line}} starts a new line in the message without sending it.',
      '{{Search}} goes to the search box. {{Search current Chat/Channel messages}} looks only in the open chat or channel.',
    ],
    essentials: ['Search', 'New Chat', 'Toggle Mute', 'Toggle Video', 'Share Screen', 'Raise Hand'],
    sections: ['General', 'Meeting and Calls'],
  },

  telegram: {
    overview:
      '{{Next Chat}} and {{Previous Chat}} move through the chat list. {{Search}} and {{Quick search}} share one modifier and differ in the letter. {{Edit Last Message}} opens your last message for editing. The rest create a message or a channel, close a chat, format text and send.',
    tips: [
      'A new channel is the new-message shortcut plus one modifier: {{New message}}, {{New channel}}.',
      '{{Bold}}, {{Italic}} and {{Add link}} format the text of the message you are writing.',
    ],
    essentials: ['Quick search', 'Next Chat', 'Previous Chat', 'New message', 'Edit Last Message', 'Send Message'],
  },

  things: {
    overview:
      'Things has a section for each kind of work, among them Create new items, Edit items, Select items, Move items, Edit dates and Navigate. The General section has the ones to learn first: {{New To-Do}}, {{Complete To-Do}}, {{Move to Today}} and {{Show Today}}. Edit dates is for planning: it sets start dates and deadlines.',
    tips: [
      '{{Start date +1 day}} and {{Start date -1 day}} move the start date by a day. {{Start date +1 week}} and {{Start date -1 week}} move it by a week. The deadline shortcuts work the same way.',
      '{{Move to Today}}, {{Move to Evening}} and {{Move to Someday}} use the same letter with different modifiers.',
    ],
    essentials: ['New To-Do', 'Complete To-Do', 'Move to Today', 'Show Today', 'Open Quick Entry', 'Set Deadline'],
    sections: ['General', 'Create new items', 'Edit items', 'Select items', 'Move items', 'Edit dates', 'Navigate'],
  },

  todoist: {
    overview:
      'Todoist mixes two kinds of shortcuts. Some use modifier keys, such as {{Add Task}}, {{Complete Task}} and {{Set Due Date}}. Others are single letters, such as {{Add a task (with Quick Add)}}, {{Go to Home view}} and the shortcuts in Sorting tasks inside a project. The Global section is {{Show/hide Todoist}} and {{Open task Quick Add}}.',
    tips: [
      'The sorting shortcuts are {{Sort by date}}, {{Sort by priority}}, {{Sort by name}} and {{Sort by assignee}}.',
      'The section Creating and completing sub-tasks has {{Increase task indent (only works inside projects)}} and {{Decrease task indent (only works inside projects)}}. As their names say, they work only inside a project.',
    ],
    essentials: ['Add Task', 'Complete Task', 'Set Due Date', 'Set Priority', 'Go to Today', 'Add a task (with Quick Add)'],
    sections: ['Global', 'Sorting tasks inside a project', 'Creating and completing sub-tasks'],
  },

  trello: {
    overview:
      'Every Trello shortcut in this list is a single key. Card shortcuts works on a card: {{Insert Card}}, {{Quick Edit Card}}, {{Archive Card}}, {{Set Due Date}}. Navigation & board shortcuts filters the board and opens its menu. Label color shortcuts has one number key for each label color.',
    tips: [
      'The label shortcuts run from {{Toggle Green Label}} to {{Toggle Blue Label}}, on the number keys in order.',
      'Several card shortcuts use the first letter of what they change: {{Edit Title}}, {{Open Label Picker}}, {{Add Remove Members}} and {{Set Due Date}}.',
      '{{Assign Self To Card}} adds you to the card. {{Add Remove Members}} changes the other members.',
    ],
    essentials: ['Insert Card', 'Quick Edit Card', 'Open Card', 'Archive Card', 'Filter Cards', 'Focus Search'],
    sections: ['Card shortcuts', 'Navigation & board shortcuts', 'Label color shortcuts'],
  },

  vlc: {
    overview:
      'The Navigation section jumps in steps of different sizes, from {{Jump Forward 3 Seconds}} to {{Jump Forward 1 Minute}}. Volume & Audio also holds the subtitle shortcuts: {{Cycle Subtitles}}, {{Increase Subtitle Delay}} and {{Decrease Subtitle Delay}}.',
    tips: [
      'The jump shortcuts use the same arrow keys. The modifiers set the size of the jump.',
      '{{Increase Audio Delay}} and {{Decrease Audio Delay}} change the audio delay.',
      '{{Faster Playback}} and {{Slower Playback}} use the equals and minus keys with one modifier.',
    ],
    essentials: ['Full Screen', 'Volume Up', 'Volume Down', 'Jump Forward 10 Seconds', 'Jump Back 10 Seconds', 'Cycle Subtitles'],
    sections: ['Volume & Audio', 'Navigation'],
  },

  zoom: {
    overview:
      'Most Zoom shortcuts are for meetings. The Meeting section covers audio, video, screen sharing, recording and reactions: {{Mute/Unmute Audio}}, {{Start/Stop Video}}, {{Share Screen}}, {{Start/Stop Local Recording}}. Chat, General and Phone are shorter sections for messages, the app window and phone calls.',
    tips: [
      '{{Mute All (Host)}} and {{Unmute All (Host)}} are for the host of the meeting.',
      '{{Show/Hide Participants}} and {{Show/Hide Chat}} open and close those panels.',
      'Each reaction has its own shortcut, from {{Reaction: Clap}} to {{Reaction: Celebrate}}.',
    ],
    essentials: ['Mute/Unmute Audio', 'Start/Stop Video', 'Share Screen', 'Show/Hide Participants', 'Show/Hide Chat', 'Raise/Lower Hand'],
    sections: ['Meeting', 'Chat', 'General', 'Phone'],
  },

  // ─── JetBrains IDEs ───────────────────────────────────────────────

  'android-studio': {
    overview:
      'The Navigation section goes to code: {{Navigate To Class}}, {{Navigate To File}} and {{Navigate To Symbol}}. The same section has {{Find Action}}, {{Recent Files}} and {{Find Usages}}.',
    tips: [
      'Tool Windows opens the panels around the editor, such as {{Project Window}}, {{Logcat}} and {{Terminal}}.',
      'In Build, Run & Debug, {{Run}} and {{Debug}} use the same modifier with different letters, and {{Build Project}} uses a function key.',
      '{{Quick Fix}} shows the fixes the IDE suggests at the cursor.',
    ],
    essentials: ['Find Action', 'Navigate To File', 'Navigate To Class', 'Go To Declaration', 'Quick Fix', 'Run'],
    sections: ['Navigation', 'Build, Run & Debug', 'Tool Windows'],
  },

  clion: {
    overview:
      'One section belongs to the language: C/C++ Specific has {{Switch Header Source}}, which moves between a header and its source file. Search & Navigation has {{Open Class}}, {{Open File}} and {{Open Symbol}}, which use the same letter with different modifiers.',
    tips: [
      'In Run & Debug, four shortcuts use the same function key: {{Step Over}} alone, and {{Step Out}}, {{Toggle Breakpoint}} and {{Evaluate Expression}} with one modifier each.',
      'In Tool Windows, these four share one modifier and differ in the number key: {{Project Window}}, {{Run Window}}, {{Debug Window}} and {{Structure Window}}.',
      '{{Toggle Breakpoint}} sets a breakpoint on the current line, or removes it.',
    ],
    essentials: ['Find Action', 'Switch Header Source', 'Go To Declaration', 'Build Project', 'Debug', 'Rename'],
    sections: ['Search & Navigation', 'Run & Debug', 'Tool Windows', 'C/C++ Specific'],
  },

  intellij: {
    overview:
      'The Search & Navigation section has {{Find Action}}, {{Recent Files}} and {{Find Usages}}. It also moves through the places you have visited, with {{Navigate Back}} and {{Navigate Forward}}, and through problems in the file, with {{Next Error}} and {{Previous Error}}.',
    tips: [
      '{{Move Statement Up}} and {{Move Statement Down}} move a statement up or down.',
      '{{Join Lines}} joins the next line to the current one.',
    ],
    essentials: ['Find Action', 'Go to Declaration', 'Find Usages', 'Context Actions / Quick Fix', 'Reformat Code', 'Refactor This'],
    sections: ['Search & Navigation'],
  },

  pycharm: {
    overview:
      'In Run & Debug, {{Choose Run Config}} and {{Choose Debug Config}} are {{Run}} and {{Debug}} with one modifier added. The same section has {{Step Over}}, {{Step Into}}, {{Step Out}} and {{Evaluate Expression}}.',
    tips: [
      '{{Run To Cursor}} runs the program up to the line the cursor is on.',
      '{{Extract Method}}, {{Extract Variable}} and {{Extract Constant}} turn the selected code into a method, a variable or a constant.',
      '{{Structure Window}} shows the structure of the open file.',
    ],
    essentials: ['Find Action', 'Run', 'Debug', 'Toggle Breakpoint', 'Context Actions', 'Rename'],
    sections: ['Run & Debug'],
  },

  phpstorm: {
    overview:
      'The Editing section has {{Code Completion}}, {{Context Actions}}, {{Parameter Info}} and {{Generate}}. The other sections cover navigation, search, running and debugging, refactoring and version control, and tool windows.',
    tips: [
      '{{Extend Selection}} and {{Shrink Selection}} use the up and down arrow keys with the same modifier.',
      '{{Reformat Code}} reformats the code.',
      '{{Line Comment}} and {{Block Comment}} comment code out, and back in.',
    ],
    essentials: ['Code Completion', 'Context Actions', 'Parameter Info', 'Reformat Code', 'Find Action', 'Go To Declaration'],
    sections: ['Editing'],
  },

  rubymine: {
    overview:
      'The Find & Replace section works at two levels: {{Find}} and {{Replace}} in the open file, {{Find In Path}} and {{Replace In Path}} across the project. {{Find Usages}} lists the places where a symbol is used.',
    tips: [
      '{{Recent Files}} lists the files you opened last.',
      'Refactoring & VCS puts code changes and version control together: {{Rename}}, {{Extract Method}} and {{Extract Variable}} next to {{Commit}} and {{Vcs Operations}}.',
    ],
    essentials: ['Find Action', 'Find In Path', 'Find Usages', 'Recent Files', 'Rename', 'Commit'],
    sections: ['Find & Replace', 'Refactoring & VCS'],
  },

  goland: {
    overview:
      'GoLand’s list is long. Besides navigation, editing, debugging and refactoring, it has short sections for one feature each. Code Folding collapses and expands blocks of code. Bookmarks marks places in the code. Search (Find & Replace) includes the usage searches, such as {{Find Usages}} and {{Show Usages}}.',
    tips: [
      '{{Navigate To Test}} goes from the code to its test.',
      '{{Smart Step Into}} is {{Step Into}} with one modifier added.',
      '{{Toggle Bookmark}} marks the current line and {{Show Bookmarks}} lists the marks.',
    ],
    essentials: ['Find Action', 'Navigate To Declaration', 'Find Usages', 'Context Actions', 'Run', 'Rename'],
    sections: ['Code Folding', 'Bookmarks', 'Search (Find & Replace)'],
  },

  webstorm: {
    overview:
      'In WebStorm’s list, Multiple Carets is a short section: its three shortcuts, {{Select Next Occurrence}}, {{Select All Occurrences}} and {{Unselect Occurrence}}, use one letter with different modifiers. Usage Search finds where a symbol is used.',
    tips: [
      'The Usage Search shortcuts use one function key with different modifiers: {{Find Usages}}, {{Find Usages in File}}, {{Highlight Usages in File}} and {{Show Usages}}.',
      '{{Move Line Up}} and {{Move Line Down}} move the current line. {{Duplicate Line / Block}} copies it.',
      '{{Go to Declaration}} goes to where a symbol is defined, and {{Navigate Back}} returns to where you were.',
    ],
    essentials: ['Search Everywhere', 'Go to Declaration', 'Show Intention Actions / Quick Fixes', 'Select Next Occurrence', 'Reformat Code', 'Rename'],
    sections: ['Multiple Carets', 'Usage Search'],
  },

  rider: {
    overview:
      'Rider’s Navigation section has {{Go to file}}, {{Go to declaration}} and {{Go to implementation}}. Running and Debugging has {{Run}}, {{Debug}} and three step shortcuts: {{Step over}}, {{Step into}} and {{Step out}}.',
    tips: [
      'There are two completion shortcuts. {{Smart code completion}} adds one modifier to {{Basic code completion}}.',
      'In VCS / Git, {{Commit}} comes first. {{Push}} is the same shortcut with one more modifier.',
    ],
    essentials: ['Go to file', 'Go to declaration', 'Find action', 'Show quick fixes', 'Rename', 'Run'],
    sections: ['Navigation', 'Running and Debugging', 'VCS / Git'],
  },

  datagrip: {
    overview:
      'DataGrip has two sections for database work. Console runs SQL: {{Execute Statement}} runs one statement and {{Execute All}} runs all of them. Data Editor works on table data: {{Duplicate Row}}, {{Delete Row}} and {{Open Value Editor}}. Search and Editing cover finding and writing code.',
    tips: [
      '{{Revert Changes}} takes back changes made in the data editor.',
      'In Console, {{Execute All}} uses the key of {{Execute Statement}} with one more modifier.',
      '{{Find}} searches the open file and {{Find in Files}} searches all files.',
    ],
    essentials: ['Execute Statement', 'Execute All', 'Code Completion', 'Find Action', 'Duplicate Row', 'Open Value Editor'],
    sections: ['Search', 'Console', 'Data Editor', 'Editing'],
  },

  dataspell: {
    overview:
      'DataSpell has a Notebook section next to Navigation and Editing. The Notebook section has {{Edit Mode}} and {{Command Mode}}. Its cell shortcuts are single letters: {{Insert Cell Above}}, {{Insert Cell Below}}, {{Change to Markdown}} and {{Change to Code}}.',
    tips: [
      'A cell can be run in more than one way: {{Run Cell}}, {{Run Cell and Select Below}} and {{Run Cell and Insert Below}}.',
      '{{Show Intention Actions}} lists what the IDE can do at the cursor.',
    ],
    essentials: ['Run Cell', 'Run Cell and Select Below', 'Insert Cell Below', 'Command Mode', 'Edit Mode', 'Code Completion'],
    sections: ['Navigation', 'Notebook', 'Editing'],
  },

  // ─── Developer, design and web tools ──────────────────────────────

  blender: {
    overview:
      'Blender puts many of its commands on single keys. Transform starts with {{Grab / Move}}, {{Rotate}} and {{Scale}}. View Navigation uses the number pad to look at the scene from fixed sides: {{Front View}}, {{Side View}}, {{Top View}} and {{Camera View}}. Mesh Editing holds the modelling tools, such as {{Extrude}}, {{Bevel}} and {{Loop Cut}}.',
    tips: [
      'Each transform has a clearing shortcut on the same letter: {{Clear Location}} for {{Grab / Move}}, {{Clear Rotation}} for {{Rotate}}, {{Clear Scale}} for {{Scale}}.',
      '{{Hide Selection}} hides the selected objects and {{Unhide All}} brings everything back.',
      '{{Vertex Select}}, {{Edge Select}} and {{Face Select}} use the first three number keys.',
    ],
    essentials: ['Grab / Move', 'Rotate', 'Scale', 'Toggle Edit Mode', 'Extrude', 'Focus Selected'],
    sections: ['Transform', 'View Navigation', 'Mesh Editing'],
  },

  'chrome-devtools': {
    overview:
      'Chrome DevTools shortcuts start with opening the tools: {{Open Dev Tools}}, {{Open Console}} and {{Inspect Element}}. Panel Navigation moves between panels and changes the layout. Elements Panel walks through the page structure with the arrow keys, and Debugger (Sources Panel) pauses and steps through code.',
    tips: [
      '{{Open Command Menu}} opens the Command Menu, where a command is found by name.',
      'In Search, {{Search All Sources}} uses the letter of {{Find In Panel}} with one more modifier.',
      'No shortcut in Elements Panel uses a modifier. {{Hide Element}} is a single letter and {{Edit As HTML}} is a function key.',
    ],
    essentials: ['Open Dev Tools', 'Open Console', 'Inspect Element', 'Open Command Menu', 'Toggle Device Mode', 'Search All Sources'],
    sections: ['Panel Navigation', 'Elements Panel', 'Debugger (Sources Panel)', 'Search'],
  },

  cursor: {
    overview:
      'The General section opens and arranges the panels with {{Toggle Sidepanel}} and {{Toggle Agent Layout}}. Chat manages the conversation: {{Add Selected Code as Context}}, {{Cancel Generation}}, {{Reject All Changes}}. Code & Context accepts suggestions, and Terminal has the prompt bar.',
    tips: [
      '{{Accept Suggestion}} takes the whole suggestion. {{Accept Next Word}} takes one word of it.',
      '{{Previous Chat}} and {{Next Chat}} move between chats, and {{New Chat Tab}} opens a chat in a new tab.',
      'In Terminal, {{Open Terminal Prompt Bar}} and {{Run Generated Command}} use the same modifier with different keys.',
    ],
    essentials: ['Toggle Sidepanel', 'Command Palette', 'Add Selected Code as Context', 'Accept Suggestion', 'Open Terminal Prompt Bar', 'Cancel Generation'],
    sections: ['General', 'Chat', 'Code & Context', 'Terminal'],
  },

  github: {
    overview:
      'The GitHub list has a section for each kind of page: Source code browsing, Issue and pull request lists, Changes in pull requests, Project boards, Notifications and more. Site wide shortcuts is the section that applies on every page. Many of the shortcuts are single keys, such as {{File finder}} and {{Create issue}}.',
    tips: [
      'The same letter does different things in different sections. {{Apply label}} and {{Filter by labels}} share a key, and so do {{Set assignee}} and {{Filter by assignee}}.',
      'In a pull request, {{Open commits list}} and {{Open changed files}} switch between the commits and the files.',
    ],
    essentials: ['Command Palette', 'File finder', 'Switch branch or tag', 'Create issue', 'Open web editor', 'Show keyboard shortcuts'],
    sections: ['Site wide shortcuts', 'Source code browsing', 'Issue and pull request lists', 'Changes in pull requests', 'Project boards', 'Notifications'],
  },

  'sublime-text': {
    overview:
      'Editing is the long section in Sublime Text’s list: lines, selections and several cursors at once. {{Select Word}} selects the word at the cursor and {{Select All Occurrences}} selects every occurrence of it. {{Extra cursor on the line above}} and {{Extra cursor on the line below}} add cursors. Navigation / Goto Anywhere opens files, symbols and lines by typing.',
    tips: [
      'Split Window arranges the editor in columns: {{Single Column}}, {{Two Columns}}, {{Three Columns}} and {{Four Columns}}.',
      '{{Toggle Bookmark}} marks a line. {{Next Bookmark}} and {{Previous Bookmark}} jump between the marks, and {{Clear Bookmarks}} removes them.',
      '{{Command Palette}} finds a command by name.',
    ],
    essentials: ['Go to File', 'Command Palette', 'Select Word', 'Select All Occurrences', 'Toggle Comment', 'Find in Files'],
    sections: ['Navigation / Goto Anywhere', 'Split Window'],
  },

  emacs: {
    overview:
      'Many Emacs shortcuts take two steps: a prefix first, then a second key. The File and Buffer & Window sections work this way, as in {{Find open file}}, {{Save file}} and {{Switch buffer}}. Navigation moves the cursor without the arrow keys: {{Forward one character}}, {{Next line}}, {{Beginning of line}}, {{End of line}}.',
    tips: [
      'Emacs calls cutting “killing” and pasting “yanking”. {{Cut kill region}}, {{Copy kill ring save}} and {{Paste yank}} are its cut, copy and paste.',
      '{{Cancel current command}} stops a command you started by mistake.',
      '{{Incremental search forward}} and {{Incremental search backward}} search in the two directions.',
    ],
    essentials: ['Find open file', 'Save file', 'Cancel current command', 'Undo', 'Incremental search forward', 'Switch buffer'],
    sections: ['File', 'Buffer & Window', 'Navigation'],
  },

  tower: {
    overview:
      'The Navigation section opens {{Working copy}}, {{History}} and {{Stashes}} with the first three number keys and one modifier. Repository talks to the remote: {{Fetch}}, {{Pull}} and {{Push}}.',
    tips: [
      'In Commit, {{Stage all}} and {{Commit dialog}} use the same modifiers with different letters.',
      '{{Commit dialog}} opens the commit dialog and {{Confirm commit}} makes the commit.',
      '{{Save stash}} puts the changes into a stash, and {{Apply stash}} brings a stash back.',
    ],
    essentials: ['Working copy', 'Fetch', 'Pull', 'Push', 'Commit dialog', 'Create branch'],
    sections: ['Navigation', 'Repository', 'Commit'],
  },

  confluence: {
    overview:
      'Confluence has two kinds of shortcuts. Navigation uses single keys: {{Create Page}}, {{Edit Page}}, {{Share Page}}, {{Watch Page}}. Formatting, Actions and Tables work in the editor, where {{Publish Page}} publishes the page and {{Find and Replace}} searches it.',
    tips: [
      'In Formatting, {{Numbered List}}, {{Bullet List}} and {{Block Quote}} use three number keys in a row with the same modifiers.',
      'In a table, {{Next Cell}} and {{Previous Cell}} move between cells. {{Insert Row Below}} and {{Insert Column After}} extend the table.',
    ],
    essentials: ['Quick Search', 'Create Page', 'Edit Page', 'Publish Page', 'Insert Link', 'Find and Replace'],
    sections: ['Navigation', 'Formatting', 'Actions', 'Tables'],
  },

  dbeaver: {
    overview:
      'The SQL Editor section runs and formats queries: {{Execute SQL Statement}} runs one statement, {{Execute SQL Script}} runs the script, and {{Format SQL}} tidies the text. Data Editor edits the rows of a result. Navigation and Views open the panels and editors around them.',
    tips: [
      'In the Data Editor, {{Edit Cell Value}} opens the cell, {{Save Changes}} saves the edits and {{Refresh Data}} reloads the rows.',
      '{{Refresh Database Tree}} reloads the tree in the navigator.',
    ],
    essentials: ['Execute SQL Statement', 'Execute SQL Script', 'Format SQL', 'SQL Content Assist', 'New SQL Editor', 'Database Navigator'],
    sections: ['SQL Editor', 'Data Editor', 'Navigation', 'Views'],
  },

  gitlab: {
    overview:
      'Almost all GitLab shortcuts are built from letter keys. Global Navigation has {{Go to Projects}}, {{Focus search bar}} and {{Show keyboard shortcuts}}. Project shortcuts are two keys pressed one after the other, and they go to a part of the current project: {{Go to Issues}}, {{Go to Merge Requests}}, {{Go to Files}}, {{Go to Commits}}.',
    tips: [
      'All Project shortcuts start with the same key.',
      'Issues & Merge Requests has {{Edit description}}, {{Reply in comment}} and the shortcuts that change the assignee, the milestone and the labels.',
    ],
    essentials: ['Focus search bar', 'Show keyboard shortcuts', 'Go to Projects', 'Go to Issues', 'Go to Merge Requests', 'Go to Files'],
    sections: ['Global Navigation', 'Project', 'Issues & Merge Requests'],
  },

  insomnia: {
    overview:
      'The General section creates and organises: {{Create new request}}, {{Create new folder}}, {{Duplicate request}}. Request edits and sends: {{Focus URL bar}}, {{Send request}}. Response works on what came back: {{Search in response}} and {{Response history}}. Navigation moves between requests.',
    tips: [
      '{{Next request}} and {{Previous request}} go through the requests in order. {{Filter requests}} narrows the list.',
      '{{Create new folder}} uses the letter of {{Create new request}} with one more modifier.',
      '{{Send request}} and {{Send and download}} use the same key with different modifiers.',
    ],
    essentials: ['Send request', 'Create new request', 'Focus URL bar', 'Quick switcher', 'Manage Environments', 'Copy as cURL'],
    sections: ['General', 'Request', 'Response', 'Navigation'],
  },

  'jira-align': {
    overview:
      'No Jira Align shortcut in this list uses a modifier. In Global, {{Go to Dashboard}}, {{Go to Backlog}} and {{Go to Roadmap}} are two keys each and start with the same key. Board moves the focus through the items, and Actions works on the item in focus: {{Edit item}}, {{Assign item}}, {{Comment on item}}.',
    tips: [
      '{{Move focus down}} and {{Move focus up}} move through the board. {{Open selected item}} opens the item in focus.',
      '{{Next item}} and {{Previous item}} go through the items in order.',
    ],
    essentials: ['Quick search', 'Create work item', 'Go to Dashboard', 'Go to Backlog', 'Open selected item', 'Edit item'],
    sections: ['Global', 'Board', 'Actions'],
  },

  maya: {
    overview:
      'Maya uses single keys for many commands. Tools has {{Select Tool}}, {{Move Tool}}, {{Rotate Tool}} and {{Scale Tool}}. Display switches how the scene is drawn: {{Wireframe Display}}, {{Shaded Display}}, {{Shaded and Textured Display}}. Selection chooses the component type, and Animation sets keys and steps through them.',
    tips: [
      '{{Frame Selected}} and {{Frame All}} are single keys.',
      '{{Set Key on Translate}}, {{Set Key on Rotate}} and {{Set Key on Scale}} use the letters of {{Move Tool}}, {{Rotate Tool}} and {{Scale Tool}} with one modifier added.',
      '{{Go to Next Key}} and {{Go to Previous Key}} use the period and comma keys. {{Move Forward One Frame}} and {{Move Backward One Frame}} use the same two keys with one modifier.',
    ],
    essentials: ['Select Tool', 'Move Tool', 'Rotate Tool', 'Scale Tool', 'Frame Selected', 'Set Keyframe'],
    sections: ['Tools', 'Display', 'Selection', 'Animation'],
  },

  rstudio: {
    overview:
      'In the Editor section, {{Run Line/Selection}} runs the current line or the selection, and {{Run Entire Document}} runs the whole script. {{Move to Console}} and {{Move to Source}} move the cursor between the console and the editor.',
    tips: [
      '{{Interrupt Command}} stops the command that is running.',
      '{{Help for Function}} opens the help for the function at the cursor.',
      '{{Command History}} brings back earlier commands in the console.',
    ],
    essentials: ['Run Line/Selection', 'Run Entire Document', 'Comment/Uncomment', 'Move to Console', 'Go to File/Function', 'Knit Document'],
    sections: ['Editor'],
  },

  'sql-developer': {
    overview:
      'In Oracle SQL Developer, the Worksheet section has {{Execute Statement}}, {{Run Script}} and {{Explain Plan}}. Editor has the text commands, such as {{Format SQL}} and {{Toggle Comment}}. Debug has {{Step Into}} and {{Step Over}}.',
    tips: [
      '{{Code Completion}} offers completions.',
      '{{Toggle Comment}} comments the line out, or back in. {{Duplicate Line}} copies it.',
    ],
    essentials: ['Execute Statement', 'Run Script', 'Explain Plan', 'Format SQL', 'Code Completion', 'Find and Replace'],
    sections: ['Worksheet', 'Editor', 'Debug'],
  },

  'visual-studio': {
    overview:
      'Debug is the section to learn first: {{Start Debugging}} runs the program under the debugger, {{Start Without Debugging}} runs it without, and {{Stop Debugging}} ends the session. When the program is paused, {{Step Over}}, {{Step Into}} and {{Step Out}} move through the code.',
    tips: [
      '{{Toggle Breakpoint}} marks the line where the debugger should pause.',
      '{{Find}} and {{Replace}} work in the open file. {{Find in Files}} searches across files.',
      '{{Rename}} renames a symbol.',
    ],
    essentials: ['Start Debugging', 'Stop Debugging', 'Toggle Breakpoint', 'Step Over', 'Find in Files', 'Go to Declaration'],
    sections: ['Debug'],
  },

  wordpress: {
    overview:
      'These are the shortcuts of the WordPress block editor. Block works on whole blocks: {{Insert New Block Before}}, {{Insert New Block After}}, {{Duplicate Selected Block(s)}}, {{Move Selected Block(s) Up}} and {{Move Selected Block(s) Down}}. Global changes the editor itself, such as {{Switch Visual/Code Editor}} and {{Open Block List View}}. Text Formatting works on the text inside a block.',
    tips: [
      '{{Select All Text (press again for all blocks)}} selects the text of the block. Pressed again, it selects all blocks.',
      '{{Display Keyboard Shortcuts}} shows the shortcut list inside the editor.',
    ],
    essentials: ['Save Changes', 'Insert New Block After', 'Duplicate Selected Block(s)', 'Move Selected Block(s) Up', 'Open Block List View', 'Convert Text to Link'],
    sections: ['Global', 'Block', 'Text Formatting'],
  },
}

// Discord on Windows and on Linux has the same sections and action names.
const DISCORD_DESKTOP = {
  overview:
    'The Navigation section has {{Quick Switcher}}, {{Previous Channel}} and {{Next Channel}}. Chat works in the message box: {{Edit Last Message}}, {{New Line}}, {{Bold}} and {{Italic}}. Voice has {{Toggle Mute}}, {{Toggle Deafen}} and {{Toggle Screen Share}}.',
  tips: [
    '{{New Line}} starts a new line in the message box without sending the message.',
    'The Voice shortcuts differ only in their last key.',
  ],
  essentials: ['Quick Switcher', 'Previous Channel', 'Next Channel', 'Edit Last Message', 'Toggle Mute', 'Toggle Deafen'],
  sections: ['Navigation', 'Chat', 'Voice'],
}

// Figma on Windows and on Linux: same sections; the note uses actions both have.
const FIGMA_DESKTOP = {
  overview:
    'The Tools section uses single letters: {{Move Tool}}, {{Frame Tool}}, {{Rectangle}}, {{Pen Tool}} and {{Text Tool}}. View zooms: {{Zoom to Fit}} fits the design in the window and {{Zoom to 100%}} shows it at its real size. Editing works on the selected layers.',
  tips: [
    '{{Send Backward}} and {{Bring Forward}} move a layer one step in the stack.',
    '{{Group Selection}} groups the selected layers and {{Ungroup}} splits the group again.',
    '{{Zoom In}} and {{Zoom Out}} use the plus and minus keys with the same modifier as {{Zoom to Fit}}.',
  ],
  essentials: ['Move Tool', 'Frame Tool', 'Text Tool', 'Duplicate', 'Group Selection', 'Zoom to Fit'],
  sections: ['Tools', 'View', 'Editing'],
}

// Notion on Windows and on Linux: same sections; the note uses actions both have.
const NOTION_DESKTOP = {
  overview:
    'The Content section formats the text inside a block: bold, italic, {{Inline Code}}, {{Add Link}}. Blocks sets the type of a block: {{Heading 1}}, {{To-do List}}, {{Bulleted List}}, {{Toggle List}}, {{Code Block}}.',
  tips: [
    'The Blocks shortcuts share their modifiers and use the number keys in order, starting with {{Text Block}}.',
    '{{Strikethrough (when text selected)}} works only when text is selected, as its name says.',
  ],
  essentials: ['Command Menu', 'Add Link', 'Heading 1', 'To-do List', 'Bulleted List', 'Code Block'],
  sections: ['Content', 'Blocks'],
}

// Slack on Windows and on Linux: same sections; the note uses actions both have.
const SLACK_DESKTOP = {
  overview:
    'The Navigation section has {{Quick Switcher}} for jumping to a conversation, {{Previous Channel}} and {{Next Channel}} for moving through the list, and {{Go Back}} and {{Go Forward}} for the history. Messaging works in the message box, and Actions opens {{All Unreads}}, {{All Threads}} and {{Preferences}}.',
  tips: [
    'In the message box, {{Upload File}} attaches a file and {{New Line in Message}} adds a line break.',
    '{{Go Back}} and {{Go Forward}} use the left and right arrow keys with one modifier.',
  ],
  essentials: ['Quick Switcher', 'Previous Channel', 'Next Channel', 'New Message', 'All Unreads', 'All Threads'],
  sections: ['Navigation', 'Messaging', 'Actions'],
}

// Notes for one platform only: APP_NOTES_BY_PLATFORM[platformId][slug].
// For pages whose data names actions differently from the shared note, and for
// apps that are not on macOS. Same shape and rules as APP_NOTES.
export const APP_NOTES_BY_PLATFORM = {
  windows: {
    discord: DISCORD_DESKTOP,

    teams: {
      overview:
        'The Navigation section opens {{Activity}}, {{Chat}}, {{Teams}} and {{Calendar}} with the first four number keys and one modifier. Messaging has {{New Chat}} and the text formatting. Meetings has the controls for a call, such as {{Toggle Mute}}, {{Toggle Video}} and {{Share Screen}}.',
      tips: [
        '{{New Line}} starts a new line in the message without sending it.',
        'The Meetings shortcuts use the same modifiers, so only the letter changes.',
      ],
      essentials: ['Search', 'New Chat', 'Chat', 'Toggle Mute', 'Toggle Video', 'Share Screen'],
      sections: ['Navigation', 'Messaging', 'Meetings'],
    },

    figma: FIGMA_DESKTOP,
    notion: NOTION_DESKTOP,
    slack: SLACK_DESKTOP,

    excel: {
      overview:
        'The Navigation section jumps to the ends of the sheet with {{Go to Cell A1}} and {{Go to Last Cell}}, and between sheets with {{Previous Sheet}} and {{Next Sheet}}. Formulas has {{AutoSum}}, {{Show Formulas}} and {{Toggle Absolute Reference}}.',
      tips: [
        '{{Fill Down}} fills the selection downward and {{Fill Right}} fills it to the right.',
        '{{Insert Current Date}} and {{Insert Current Time}} put the date or the time into the cell.',
        '{{Toggle Absolute Reference}} switches a cell reference in a formula between relative and absolute.',
      ],
      essentials: ['Edit Cell', 'Fill Down', 'AutoSum', 'Format Cells', 'Go To Dialog', 'Insert Current Date'],
      sections: ['Navigation', 'Formulas'],
    },

    photoshop: {
      overview:
        'The Tools section uses single letters, such as {{Move tool}}, {{Brush Tool}} and {{Eyedropper}}. Layers creates and arranges layers: {{New layer}}, {{Duplicate layer}}, {{Group layers}}, {{Merge layers}}. Image has {{Free Transform}}, {{Image Size}} and {{Canvas Size}}.',
      tips: [
        '{{Send Layer Back}} and {{Bring Layer Forward}} move the selected layer down or up in the stack.',
        '{{Image Size}} and {{Canvas Size}} use the same modifiers with different letters.',
      ],
      essentials: ['Move tool', 'Brush Tool', 'New layer', 'Duplicate layer', 'Free Transform', 'Merge layers'],
      sections: ['Tools', 'Layers', 'Image'],
    },

    powerpoint: {
      overview:
        'The Presentation section runs the show: {{Start Slideshow}} starts it, {{Start from Current Slide}} starts at the slide you are on, and {{End Slideshow}} stops it. Editing builds slides, and Navigation moves between them.',
      tips: [
        'During a show, {{Black Screen (during show)}} and {{White Screen (during show)}} replace the slide with a black or a white screen.',
        '{{Copy Formatting}} and {{Paste Formatting}} copy the look of one object to another.',
        '{{First Slide}} and {{Last Slide}} jump to the ends of the presentation.',
      ],
      essentials: ['New Slide', 'Duplicate Slide', 'Start Slideshow', 'Start from Current Slide', 'End Slideshow', 'Group Objects'],
      sections: ['Presentation', 'Editing', 'Navigation'],
    },

    tortoisegit: {
      overview:
        'TortoiseGit shortcuts belong to its dialogs, and the list has a section for each: Commit Dialog, Log Dialog, Diff and Merge, and Explorer. The same key refreshes in three of them: {{Rescan Working Tree}} in the commit dialog, {{Refresh Log}} in the log and {{Refresh Overlays}} in Explorer.',
      tips: [
        'In a diff, {{Next Difference}} and {{Previous Difference}} jump from change to change.',
        '{{Search in Log}} searches the log and {{Find Next}} goes to the next match.',
        '{{Confirm Commit}} makes the commit from the keyboard.',
      ],
      essentials: ['Confirm Commit', 'Show Diff', 'Next Difference', 'Previous Difference', 'Search in Log', 'Save Merged File'],
      sections: ['Commit Dialog', 'Log Dialog', 'Diff and Merge', 'Explorer'],
    },
  },

  linux: {
    discord: DISCORD_DESKTOP,

    figma: FIGMA_DESKTOP,
    notion: NOTION_DESKTOP,
    slack: SLACK_DESKTOP,

    vscode: {
      overview:
        'The General section has the shortcuts to learn first: {{Command Palette}} runs any command by name and {{Quick Open File}} opens a file by name. View opens the panels of the side bar: {{Explorer}}, {{Source Control}} and {{Extensions}}.',
      tips: [
        '{{Select Word / Next Occurrence}} selects the word at the cursor. Pressed again, it adds the next occurrence. {{Select All Occurrences}} takes them all.',
        'Search has both scopes: {{Find}} and {{Find and Replace}} for the open file, {{Find in Files}} and {{Replace in Files}} for all files.',
        'In Debug, {{Stop Debugging}} uses the function key of {{Start Debugging}} with one modifier.',
      ],
      essentials: ['Command Palette', 'Quick Open File', 'Toggle Terminal', 'Select Word / Next Occurrence', 'Toggle Comment', 'Find in Files'],
      sections: ['General', 'Search', 'View', 'Debug'],
    },

    vim: {
      overview:
        'Vim works in modes. The Modes section lists them: {{Normal Mode}}, {{Insert Mode}}, {{Visual Mode}}, {{Visual Line Mode}}, {{Visual Block Mode}} and {{Command Mode}}. Navigation moves the cursor with letter keys: {{Move Left}}, {{Move Down}}, {{Move Up}} and {{Move Right}}.',
      tips: [
        '{{Delete Line}} and {{Yank (Copy) Line}} are one key pressed twice.',
        'After {{Search Forward}} or {{Search Backward}}, {{Next Match}} and {{Previous Match}} move between the matches.',
      ],
      essentials: ['Normal Mode', 'Insert Mode', 'Delete Line', 'Undo', 'Search Forward', 'Repeat Last Command'],
      sections: ['Modes', 'Navigation'],
    },

    linux: {
      overview:
        'These shortcuts belong to the desktop, not to one app. Window Management tiles and resizes windows: {{Tile Window Left}}, {{Tile Window Right}}, {{Maximize Window}}. Workspaces moves between workspaces, and moves a window to another one. System opens the terminal, locks the screen and takes screenshots. Files works in the file manager.',
      tips: [
        '{{Move Window to Previous Workspace}} and {{Move Window to Next Workspace}} are the workspace shortcuts with one modifier added.',
        'The screenshot shortcuts use the same key. {{Screenshot Region}} captures an area and {{Screenshot Window}} captures one window.',
        '{{Toggle Hidden Files}} shows or hides hidden files in the file manager.',
      ],
      essentials: ['Switch Windows', 'Show Desktop', 'Tile Window Left', 'Tile Window Right', 'Open Terminal', 'Lock Screen'],
      sections: ['Window Management', 'Workspaces', 'System', 'Files'],
    },
  },
}

/** The note for one app page: the platform's own note if it has one, else the shared note. */
export function getAppNote(slug, platform) {
  return APP_NOTES_BY_PLATFORM[platform]?.[slug] ?? APP_NOTES[slug]
}
