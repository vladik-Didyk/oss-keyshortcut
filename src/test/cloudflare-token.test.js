import { describe, it, expect } from 'vitest'
import { cloudflareToken } from '../utils/cloudflareToken'

describe('token of Cloudflare Web Analytics', () => {
  it('passes a token of 32 hex characters', () => {
    const token = '0123456789abcdef0123456789abcdef'
    expect(cloudflareToken(token)).toBe(token)
  })

  // The live site carried "s" on 2026-09-29: the tag loaded on every page and
  // every request it made was refused.
  it('gives no token for anything else', () => {
    for (const value of ['s', '', undefined, null, 'undefined', '0123456789abcdef', '"><script>']) {
      expect(cloudflareToken(value)).toBe('')
    }
  })
})
