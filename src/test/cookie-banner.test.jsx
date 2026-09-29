import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, cleanup, act } from '@testing-library/react'
import CookieConsent from '../components/CookieConsent'
import { CONTENT } from '../data/content'
import { CONSENT_KEY, REGION_PROMISE, REGION_SCRIPT } from '../lib/consent'

const cc = CONTENT.shared.cookieConsent
const words = (text) => text.replace(/\s+/g, ' ').trim()

async function showBanner({ gdpr = false } = {}) {
  vi.useFakeTimers()
  vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ gdpr }) })))
  render(<CookieConsent />)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1000)
  })
  return screen.queryByRole('dialog')
}

describe('cookie banner', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => {
    cleanup()
    vi.useRealTimers()
    vi.unstubAllGlobals()
    delete window[REGION_PROMISE]
  })

  // The region is asked for by a script in the head, so the banner does not
  // wait for the scripts of the page before it can ask.
  describe('region check started by the page', () => {
    const run = () => new Function(REGION_SCRIPT)()

    it('asks at once for a visitor who has not answered', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ gdpr: true }) })))
      run()
      expect(fetch).toHaveBeenCalledWith('/api/geo')
      await expect(window[REGION_PROMISE]).resolves.toEqual({ gdpr: true })
    })

    it('asks nothing for a visitor who has answered', () => {
      localStorage.setItem(CONSENT_KEY, 'accepted')
      vi.stubGlobal('fetch', vi.fn())
      run()
      expect(fetch).not.toHaveBeenCalled()
      expect(window[REGION_PROMISE]).toBeUndefined()
    })

    it('counts a failed request as a region without the rule', async () => {
      vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
      run()
      await expect(window[REGION_PROMISE]).resolves.toEqual({ gdpr: false })
    })

    it('is used by the banner, which then asks no second time', async () => {
      vi.useFakeTimers()
      vi.stubGlobal('fetch', vi.fn())
      window[REGION_PROMISE] = Promise.resolve({ gdpr: false })
      render(<CookieConsent />)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10)
      })
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(fetch).not.toHaveBeenCalled()
    })
  })

  it('says every word of its text, and links to the privacy policy', async () => {
    const banner = await showBanner()
    const text = document.getElementById('cookie-consent-desc')
    expect(banner).toHaveAttribute('aria-describedby', 'cookie-consent-desc')
    expect(words(text.textContent)).toBe(words(`${cc.text.replace(/\.\s+/g, '.')}${cc.learnMore}.`))
    expect(screen.getByRole('link', { name: cc.learnMore })).toHaveAttribute('href', '/privacy#cookies')
  })

  // The banner arrives after the page. As one paragraph it was the largest block
  // of text on a phone, and the page was measured by the moment it showed.
  it('is set as one block per sentence, none of them long', async () => {
    await showBanner()
    const blocks = [...document.querySelectorAll('#cookie-consent-desc > p')].map((p) => p.textContent)
    expect(blocks.length).toBeGreaterThanOrEqual(3)
    for (const block of blocks) expect(block.length).toBeLessThanOrEqual(130)
    expect(blocks.slice(0, -1).join(' ')).toBe(cc.text)
  })

  it('shows no "Decline" outside the regions that require it', async () => {
    await showBanner()
    expect(screen.getByRole('button', { name: cc.accept })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: cc.decline })).toBeNull()
  })

  it('stays away from a visitor who has answered', async () => {
    localStorage.setItem(CONSENT_KEY, 'declined')
    expect(await showBanner()).toBeNull()
  })
})
