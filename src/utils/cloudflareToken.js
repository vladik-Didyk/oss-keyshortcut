// The token of Cloudflare Web Analytics, or '' when the value is not one.
export const cloudflareToken = (value) => (/^[a-f0-9]{32}$/i.test(value || '') ? value : '')
