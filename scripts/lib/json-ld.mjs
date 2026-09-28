/**
 * Reads the JSON-LD of a built page. Shared by scripts/verify-build.mjs and
 * src/test/structured-data.test.jsx.
 */

/**
 * Every <script type="application/ld+json"> block of the page, parsed.
 * Throws when a block is not valid JSON.
 */
export function readJsonLd(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].map((match, index) => {
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      throw new Error(`JSON-LD block ${index + 1} is not valid JSON: ${error.message}`);
    }
  });
}

/** The @type of each block, in page order. */
export function jsonLdTypes(blocks) {
  return blocks.map((block) => block["@type"]);
}

/** Every @type in the blocks, nested nodes included, each named once. */
export function jsonLdTypesDeep(value) {
  const found = new Set();
  (function walk(node) {
    if (!node || typeof node !== "object") return;
    if (typeof node["@type"] === "string") found.add(node["@type"]);
    Object.values(node).forEach(walk);
  })(value);
  return [...found];
}
