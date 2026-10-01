// Impact.com's tracking tag (Universal Tracking Tag) for the Impact account
// that holds Setapp and the other Impact programs. It turns links to brands on
// the page into tracking links and records that a page was viewed, data Impact
// may share with the brands. So it loads like the analytics tools: only for a
// visitor who accepted cookies.
//
// IMPACT_SCRIPT goes into the <head> of every page (root.jsx). Impact checks
// the head of the home page for its tag when the website is added, so the tag
// is there as Impact gives it, wrapped in a function. It runs at once for a
// visitor who accepted cookies on an earlier visit; initAnalytics() runs it
// when a visitor accepts now.
export const IMPACT_UTT_URL = 'https://utt.impactcdn.com/P-A7865306-744d-4242-a824-a02934f80f0f1.js'

export const IMPACT_SCRIPT = `window.ksImpact=function(){if(window.ksImpactOn)return;window.ksImpactOn=1;(function(i,m,p,a,c,t){c.ire_o=p;c[p]=c[p]||function(){(c[p].a=c[p].a||[]).push(arguments)};t=a.createElement(m);var z=a.getElementsByTagName(m)[0];t.async=1;t.src=i;z.parentNode.insertBefore(t,z)})('${IMPACT_UTT_URL}','script','impactStat',document,window);impactStat('transformLinks');impactStat('trackImpression')};try{if(localStorage.getItem('cookie-consent')==='accepted')window.ksImpact()}catch(e){}`

// Hosts the tag needs (CSP in root.jsx). The tag file was not served yet on
// 2026-10-01 (403), so these are Impact's documented hosts; check the console
// for a blocked request once the website is added in Impact.
export const IMPACT_HOSTS = 'https://utt.impactcdn.com https://*.impactcdn.com https://*.impactradius-event.com'
