/**
 * One JSON-LD block. Pass an object built from our own data (utils/structuredData.js),
 * never user input. "<" is written as <, so that no value can close the
 * script tag; a JSON parser reads it back as "<".
 */
export default function JsonLd({ data }) {
  if (!data) return null
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
