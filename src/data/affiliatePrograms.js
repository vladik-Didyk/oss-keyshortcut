// The affiliate programs behind src/data/affiliates.js: where to apply, what
// the program says it pays, and the conditions that matter to this site.
//
// No page imports this file; it is for the owner (`pnpm affiliates`) and for
// the tests. Every quote was read on the program's own page or on its own
// listing at the network on CHECKED. Programs change their terms: read the
// page again before relying on a number, and never print one on the site.
//
// state: 'live'     a tracking link is in affiliates.js
//        'applied'  the owner applied; waiting for the answer
//        'open'     not applied yet

export const CHECKED = '2026-09-28'

export const AFFILIATE_PROGRAMS = {
  'Raycast (Rewardful)': {
    state: 'live',
    apply: '',
    pays: '',
    note: 'Link is live since 2026-09-27.',
  },
  'Setapp (Impact)': {
    state: 'live',
    apply: 'https://setapp.com/affiliate-program',
    pays: '"earn $25 for every user you refer"',
    note: 'Approved 2026-09-29; tracking link from Impact\'s welcome email. Shown on macOS pages of apps without a link of their own.',
  },
  'Adobe (Partnerize)': {
    state: 'applied',
    apply: 'https://www.adobe.com/affiliates.html',
    pays: '"85% of the first month\'s subscription price" of an eligible plan',
    note: 'Partnerize account made 2026-09-27; application pending.',
  },
  '1Password (CJ)': {
    state: 'open',
    apply: 'https://1password.com/affiliate/',
    pays: '"$2 for each completed signup and 25% of the first year or month\'s payment"',
    note: 'Needs a CJ (Commission Junction) publisher account. The same account serves Autodesk and Opera.',
  },
  'Canva (Impact)': {
    state: 'open',
    apply: '',
    pays: '',
    note: 'Canva\'s own page refused the robot, so nothing was read. Look for "Canva" in the Impact marketplace, inside the account that holds Setapp.',
  },
  'Microsoft (Impact)': {
    state: 'open',
    apply: 'https://app.impact.com/campaign-campaign-info-v2/Microsoft-Canada.brand',
    pays: 'Listing: "up to 10%". Contract: "Online Sale - Canada: $2.00-$10.00, 1%-7%", "Default Payout 1%". The rate for Microsoft 365 is not shown before joining.',
    note: 'One campaign per country: "Microsoft- Canada" pays for sales in the Canadian store, "Microsoft - US" in the US store. Click window 14 days. Teams is covered only as part of a Microsoft 365 plan.',
  },
  'Atlassian (Impact)': {
    state: 'open',
    apply: 'https://app.impact.com/campaign-campaign-info-v2/Atlassian.brand',
    pays: '"Sign Up Verified: $15.00"',
    note: 'Pays for signups by customers in the United States only; a signup from Canada pays nothing. Covers Jira and Confluence, not Trello or Jira Align.',
  },
  'Zoom (Impact)': {
    state: 'open',
    apply: 'https://app.impact.com/campaign-campaign-info-v2/Zoom.brand',
    pays: '"Online Sale: $50.00 per order"',
    note: 'Click window 30 days. No search ads on Zoom names; links only on sites you own.',
  },
  'Automattic (Impact)': {
    state: 'open',
    apply: 'https://wordpress.com/affiliates/',
    pays: 'WordPress.com hosting: "100% of item sale amount", limit "$300 payout per item"; themes 30%; domain names 5%',
    note: 'States no minimum traffic. Applications are judged on content quality.',
  },
  'Todoist (PartnerStack)': {
    state: 'open',
    apply: 'https://www.todoist.com/channelpartners',
    pays: '"Earn up to 25% commission on each sale"',
    note: 'Asks for "a sizeable existing audience", without a number. Purchases in the App Store or Google Play do not count.',
  },
  'ClickUp (PartnerStack)': {
    state: 'open',
    apply: 'https://clickup.com/partners/affiliates',
    pays: '"Get up to $25 for every new free workspace referral"',
    note: 'Pays per signup, not per sale. Some countries do not pay.',
  },
  'Webflow (PartnerStack)': {
    state: 'open',
    apply: 'https://webflow.com/solutions/affiliates',
    pays: '"50% revenue share for up to 12 months"',
    note: 'After acceptance: "Publish a piece of content within 30 days".',
  },
  'Autodesk (CJ)': {
    state: 'open',
    apply: 'https://www.autodesk.com/affiliate-program/overview',
    pays: '"Commission starting at 7%"',
    note: 'Runs on CJ. 60-day cookie.',
  },
  'Unity (Partnerize)': {
    state: 'open',
    apply: 'https://unity.com/partners/affiliates',
    pays: '"Unity Pro: $62.50 per subscription", "Asset Store: 5% of the sale"',
    note: 'Runs on Partnerize, the network of the Adobe program. No search ads on Unity trademarks.',
  },
  'Opera (CJ)': {
    state: 'open',
    apply: 'https://www.opera.com/opera/affiliate',
    pays: 'Not stated: "The rate depends on the traffic your links bring."',
    note: 'Pays per new Opera user, not per sale.',
  },
}

// Checked and left out, with the reason. An app is here so that nobody adds it
// again from a directory of affiliate programs: those were wrong about several.
export const NO_PROGRAM = {
  figma: 'Program closed since January 2025.',
  notion: 'Its own page: "Program is currently not accepting new affiliates."',
  tower: 'Program ended; the portal says it is no longer active.',
  slack: 'The terms (June 2026) make the publisher warrant five years in business and eight existing clients.',
  'adobe-xd': 'In maintenance mode; Adobe has no sales page for it.',
  asana: 'No program for publishers, only a referral route for paying customers.',
  cursor: 'Usage credit for users, not a program for publishers.',
  jetbrains: 'No affiliate program: resellers and a creators program that pays no cash. Covers the ten JetBrains IDE pages.',
  brave: 'No program for publishers.',
  obsidian: 'No program.',
  warp: 'No program for publishers.',
}

// Programs that fit the audience but have no place on the site yet: an app
// page sells the app, not a keyboard.
export const HARDWARE_PROGRAMS = {
  'Logitech (Impact)': {
    apply: 'https://www.logitech.com/en-us/programs/affiliate-program',
    pays: 'Page: "4 - 10% Standard Commission". Contract: "Sale: 4%".',
    note: 'The contract pays 0% on several accessory categories. Ask where keyboards and mice fall before building on it.',
  },
  'Keychron (own portal)': {
    apply: 'https://affiliates.keychron.ca/',
    pays: 'keychron.ca: "5% commission on each referral you make", 7-day cookie.',
    note: 'One portal per store; a link pays only for orders in its own store.',
  },
  'Amazon.ca Associates': {
    apply: 'https://associates.amazon.ca/',
    pays: '"Computers, Tablets & Components" 1.00%; "Office & School Supplies" 5.00%; "All Other Categories" 2.00%.',
    note: 'The account is closed unless it makes three qualifying sales within 180 days.',
  },
}
