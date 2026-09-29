import { detectPlatform } from './detectPlatform'

/**
 * Which platform the home page opens on: the one the visitor chose last time,
 * else the one of their system.
 *
 * The page is served with the lists of every platform in it, and a short script
 * at its top picks the one to show before anything is drawn (platformScript).
 * So a visitor on Windows sees the Windows list at once, with no list of another
 * platform first and no request for data.
 */
export const PLATFORM_KEY = 'ks-platform'

/** The platform to show, from a list of ids the page has. Browser only. */
export function preferredPlatform(ids, fallback) {
  let chosen = null
  try {
    chosen = window.localStorage.getItem(PLATFORM_KEY)
  } catch {
    // Storage is closed (private mode, a setting): detect instead.
  }
  if (!ids.includes(chosen)) chosen = detectPlatform()
  return ids.includes(chosen) ? chosen : fallback
}

export function rememberPlatform(id) {
  try {
    window.localStorage.setItem(PLATFORM_KEY, id)
  } catch {
    // Not remembered. The page still shows what was chosen.
  }
}

/**
 * The same choice as preferredPlatform(), as a script for the top of the page.
 * It sets data-platform on the element it is the first child of. Keep the two
 * in step: `preferred-platform.test.js` runs both against the same visitors.
 */
export const platformScript = (ids, fallback) =>
  `(function(){var e=document.currentScript&&document.currentScript.parentElement;if(!e)return;` +
  `var ids=${JSON.stringify(ids)},p=null;` +
  `try{p=localStorage.getItem(${JSON.stringify(PLATFORM_KEY)})}catch(x){}` +
  `if(ids.indexOf(p)<0){var d=navigator.userAgentData&&navigator.userAgentData.platform;` +
  `if(d){p=/Windows/i.test(d)?'windows':/Linux/i.test(d)?'linux':'macos'}` +
  `else{var u=navigator.userAgent||'';p=/Windows/i.test(u)?'windows':/Linux/i.test(u)&&!/Android/i.test(u)?'linux':'macos'}}` +
  `if(ids.indexOf(p)<0)p=${JSON.stringify(fallback)};e.setAttribute('data-platform',p)})()`

/** Shows the list and the tab of the chosen platform. One rule per platform of the data. */
export const platformStyles = (ids) =>
  `[data-home] [data-panel]{display:none}` +
  ids
    .map(
      (id) =>
        `[data-home][data-platform="${id}"] [data-panel="${id}"]{display:block}` +
        `[data-home][data-platform="${id}"] [data-tab="${id}"]{background-color:var(--color-theme-base);color:var(--color-theme-text);` +
        `box-shadow:0 1px 3px rgba(26,26,26,.14),0 0 0 .5px rgba(26,26,26,.1)}`,
    )
    .join('')
