// Consent helpers shared by the cookie banner and the footer.
//
// Two layers:
// - Ads: Google's certified consent message (AdSense → Privacy & messaging),
//   served by the AdSense script to EEA/UK/Swiss visitors. It writes the IAB
//   TCF consent that AdSense reads before requesting ads.
// - Analytics (GA4, Clarity, PostHog): our own banner, CookieConsent.jsx.
// SSR-safe: every entry point guards `typeof window`.

export const CONSENT_KEY = "cookie-consent";
export const OPEN_SETTINGS_EVENT = "ks:open-cookie-settings";

function fcQueue() {
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
  return window.googlefc.callbackQueue;
}

/**
 * Calls `done` once Google's consent message is settled: the visitor made a
 * choice, or a stored choice was found. If the message script has not started
 * within `timeoutMs` (not switched on in AdSense, blocked by an ad blocker, or
 * slow network), calls `done` anyway so our banner still appears.
 * Used so the two banners don't stack on top of each other.
 */
export function whenGoogleConsentSettled(done, timeoutMs = 4000) {
  if (typeof window === "undefined") return;
  let finished = false;
  let apiReady = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    done();
  };
  const queue = fcQueue();
  queue.push({ CONSENT_API_READY: () => { apiReady = true; } });
  queue.push({ CONSENT_DATA_READY: finish });
  setTimeout(() => {
    if (!apiReady) finish();
  }, timeoutMs);
}

/** Ask AdSense for non-personalised ads (true) or personalised ads (false) from the next ad request on. */
export function setNonPersonalizedAds(on) {
  if (typeof window === "undefined") return;
  (window.adsbygoogle = window.adsbygoogle || []).requestNonPersonalizedAds = on ? 1 : 0;
}

/** Reopen our cookie banner, and Google's consent message where it runs. */
export function openCookieSettings() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(OPEN_SETTINGS_EVENT));
  if (typeof window.googlefc?.showRevocationMessage === "function") {
    window.googlefc.showRevocationMessage();
  }
}
