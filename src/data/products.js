// What the site sells itself.
//
// PDF_BUNDLE: every cheat sheet of a platform in one file. The file is made by
// `node scripts/build-pdf-bundle.mjs` (written to dist/products/, which is not
// part of the site) and uploaded by hand to a seller that delivers it after
// payment: Lemon Squeezy, Gumroad, or another that hosts the file.
//
//   link   the seller's checkout page for the file. Empty = the offer is not shown.
//   price  as printed on the button, in US dollars: '$9' or '$9.50'.
//          Must be the price the seller charges.
//
// The single cheat sheets stay free. The offer says so.
export const PDF_BUNDLE = {
  link: '',
  price: '',
  platform: 'macos',
}

/** The offer, or null while the link or the price is missing or malformed. */
export function getPdfBundle(bundle = PDF_BUNDLE) {
  const linked = typeof bundle.link === 'string' && bundle.link.startsWith('https://')
  const priced = typeof bundle.price === 'string' && /^\$\d{1,3}(\.\d{2})?$/.test(bundle.price)
  return linked && priced ? bundle : null
}
