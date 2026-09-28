import { useLoaderData } from "react-router";
import { CONTENT, buildMeta } from "../data/content";
import { getPlatformApps, getCategories } from "../utils/supabase.server";
import { groupByCategories } from "../utils/platformHelpers";
import { MAC_APP_COUNT, PRICE, APP_STORE_URL, MAC_SHORTCUT_COUNT, formatShortcutCount } from "../data/siteConfig";
import { pageUrl } from "../utils/siteUrl";
import Navbar from "../components/Navbar";
import Hero from "../components/Hero";
import Problem from "../components/Problem";
import Features from "../components/Features";
import Details from "../components/Details";
import MacAppStoreButton from "../components/MacAppStoreButton";
import ShortcutPreview from "../components/ShortcutPreview";
import AppCoverage from "../components/AppCoverage";
import AppGrid from "../components/AppGrid";
import FAQ from "../components/FAQ";
import Policies from "../components/Policies";
import CTABanner from "../components/CTABanner";
import Footer from "../components/Footer";

export function meta() {
  return buildMeta(CONTENT.meta.productPage);
}

/**
 * Compact, scannable value/pricing strip built from REAL siteConfig constants.
 * Inline copy (candidate for content.js later): the dot-separated value line.
 */
function ValueStrip() {
  const items = [
    `${PRICE} once`,
    `${MAC_APP_COUNT} apps`,
    `${MAC_SHORTCUT_COUNT.toLocaleString("en-US")}+ shortcuts`,
    "no subscription",
    "no tracking",
  ];
  return (
    <div className="px-5 md:px-6 -mt-2 mb-2">
      <ul className="mx-auto flex max-w-[980px] flex-wrap items-center justify-center gap-x-3 gap-y-1.5 text-[13px] text-theme-muted">
        {items.map((item, i) => (
          <li key={item} className="flex items-center gap-3">
            {i > 0 && <span aria-hidden="true" className="text-theme-border">·</span>}
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Mid-page inline CTA — App Store badge + one-line price/value microcopy.
 * Inserted after long sections so the buy action is never far away.
 * Inline copy (candidate for content.js later): the microcopy below the badge.
 */
function InlineCTA({ location }) {
  // Honor the project invariant: no store URL → render no CTA (avoids an
  // orphaned headline/microcopy with nothing to click).
  if (!APP_STORE_URL) return null;
  return (
    <section className="py-14 px-5 md:px-6">
      <div className="mx-auto max-w-md text-center">
        <MacAppStoreButton eventProps={{ location }} />
        <p className="mt-4 text-[15px] text-theme-muted">
          {PRICE} once · {MAC_APP_COUNT} apps · {formatShortcutCount(MAC_SHORTCUT_COUNT)} shortcuts · no subscription
        </p>
      </div>
    </section>
  );
}

export async function loader() {
  const [macosApps, categories] = await Promise.all([
    getPlatformApps("macos"),
    getCategories(),
  ]);
  const categoryOrder = categories.map((c) => c.display_name);
  const appCategories = groupByCategories(macosApps, categoryOrder).map(
    (group) => ({
      name: group.name,
      apps: group.apps.map(({ slug, displayName }) => ({ slug, displayName })),
    })
  );
  return { appCategories };
}

/**
 * SoftwareApplication JSON-LD for Google rich results.
 * Safe: all values come from our own static siteConfig, not user input.
 */
const SOFTWARE_APP_JSONLD = JSON.stringify({
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'KeyShortcut',
  operatingSystem: 'macOS',
  applicationCategory: 'UtilitiesApplication',
  description: `Floating keyboard shortcut panel for macOS. ${formatShortcutCount(MAC_SHORTCUT_COUNT)} shortcuts across ${MAC_APP_COUNT} apps with active app detection and search.`,
  url: pageUrl('/mac-hud'),
  // An offer only while the app can be bought: without a store URL nothing is for sale.
  ...(APP_STORE_URL
    ? {
        downloadUrl: APP_STORE_URL,
        offers: {
          '@type': 'Offer',
          price: PRICE.replace('$', ''),
          priceCurrency: 'USD',
          availability: 'https://schema.org/InStock',
          url: APP_STORE_URL,
        },
      }
    : {}),
  screenshot: 'https://keyshortcut.com/images/og-image.png',
});

export default function ProductPageRoute() {
  const { appCategories } = useLoaderData();
  return (
    <>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <Hero />
        <ValueStrip />
        <Problem />
        {/* CTA after the problem narrative — long page, keep buy action nearby */}
        <InlineCTA location="after_problem" />
        <Features />
        {/* CTA after the feature walkthrough */}
        <InlineCTA location="after_features" />
        {/* <section className="py-20 md:py-28 px-5 md:px-6">
          <div className="mx-auto max-w-md">
            <HotkeyShowcase />
          </div>
        </section> */}
        <Details />
        <InlineCTA location="after_details" />
        <ShortcutPreview />
        <AppCoverage />
        <AppGrid appCategories={appCategories} />
        <FAQ />
        <Policies />
        <CTABanner />
      </main>
      <Footer />
      {/* Safe: built from our own static siteConfig constants, not user input */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: SOFTWARE_APP_JSONLD }} />
    </>
  );
}
