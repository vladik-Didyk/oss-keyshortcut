/**
 * AI-powered scraper using Google Gemini (free tier).
 * Used as a fallback for pages with non-standard layouts.
 *
 * The model is named by its alias, not by a version: Google switches versions
 * off ("gemini-2.0-flash is no longer available"), and a job that runs
 * unattended then fails on every source. GEMINI_MODEL overrides the list.
 */
import { GoogleGenAI } from '@google/genai'
import * as cheerio from 'cheerio'
import { BaseScraper } from './base-scraper.mjs'

// Tried in order. The second is used when the first is unknown or overloaded.
const MODELS = process.env.GEMINI_MODEL
  ? [process.env.GEMINI_MODEL]
  : ['gemini-flash-latest', 'gemini-flash-lite-latest']

// The free tier allows a few requests a minute. One request every 7 seconds stays under it.
const MIN_GAP_MS = 7000
const MAX_TRIES = 3

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/** HTTP status of a Gemini error, from the error object or from its JSON message. */
export function errorStatus(err) {
  if (typeof err?.status === 'number') return err.status
  const match = /"code":\s*(\d{3})/.exec(String(err?.message || ''))
  return match ? Number(match[1]) : null
}

/** True when the day's free quota is used up: waiting a minute does not help. */
export function isDailyQuota(err) {
  return errorStatus(err) === 429 && /PerDay/.test(String(err?.message || ''))
}

/** Seconds the API asks to wait ("retryDelay": "41s"), or null. */
export function retryDelaySeconds(err) {
  const match = /"retryDelay":\s*"(\d+)(?:\.\d+)?s"/.exec(String(err?.message || ''))
  return match ? Number(match[1]) : null
}

export class AiScraper extends BaseScraper {
  constructor() {
    super()
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required for AI extraction')
    }
    this.ai = new GoogleGenAI({ apiKey })
    this.lastCallAt = 0
    this.quotaUsedUp = false
  }

  /**
   * One request to Gemini, paced and retried.
   * 429 (per minute) and 503: wait and try again. 404 and 503 on the last try:
   * the next model. 429 (per day): stop asking for the rest of the run.
   */
  async generate(prompt) {
    if (this.quotaUsedUp) throw new Error('Gemini: the free quota of the day is used up')

    let lastError
    for (const model of MODELS) {
      for (let attempt = 1; attempt <= MAX_TRIES; attempt++) {
        const wait = this.lastCallAt + MIN_GAP_MS - Date.now()
        if (wait > 0) await sleep(wait)
        this.lastCallAt = Date.now()
        try {
          return await this.ai.models.generateContent({
            model,
            contents: prompt,
            config: { temperature: 0.1, maxOutputTokens: 8192 },
          })
        } catch (err) {
          lastError = err
          const status = errorStatus(err)
          if (isDailyQuota(err)) {
            this.quotaUsedUp = true
            throw new Error('Gemini: the free quota of the day is used up')
          }
          if (status === 404) break // this model is gone: the next one
          if (status !== 429 && status !== 503) throw err
          if (attempt < MAX_TRIES) await sleep((retryDelaySeconds(err) ?? 20 * attempt) * 1000)
        }
      }
    }
    throw lastError
  }

  /**
   * Extract shortcuts using Gemini AI.
   * @param {string} url - Page URL
   * @param {object} options
   * @param {string} options.platformFilter - Target platform (e.g. "mac", "windows")
   * @param {string} options.platform - Platform ID for context (e.g. "macos")
   */
  async extract(url, options = {}) {
    const { html } = await this.fetch(url)

    // Strip non-content elements to reduce token usage
    const cleanedHtml = stripChrome(html)

    const platformName = getPlatformLabel(options.platformFilter || options.platform || 'macos')

    const prompt = `Extract ALL keyboard shortcuts from this documentation page for the ${platformName} platform.

Return valid JSON in this exact format (no markdown, no code fences):
{"sections":[{"name":"Section Name","shortcuts":[{"modifiers":["Ctrl","Shift"],"key":"T","action":"Reopen closed tab"}]}]}

Rules:
- Only include keyboard shortcuts that are explicitly listed on the page
- Do NOT invent or guess shortcuts
- For ${platformName}, use these modifier names: ${getModifierNames(platformName)}
- Each shortcut must have: modifiers (array, can be empty), key (string), action (string)
- Group shortcuts into sections based on the page's own categories/headings
- If the page lists shortcuts for multiple platforms, only extract ${platformName} shortcuts
- Keep action descriptions concise (5-10 words max)
- For keys, use the key name as shown (e.g., "Tab", "Enter", "Space", "F5", "A", "1")

Page content:
${cleanedHtml}`

    const response = await this.generate(prompt)

    const text = (response.text || '').trim()

    // Parse the JSON response — handle potential markdown code fences
    let jsonStr = text
    const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (fenceMatch) {
      jsonStr = fenceMatch[1].trim()
    }

    try {
      const result = JSON.parse(jsonStr)

      // Validate structure
      if (!result.sections || !Array.isArray(result.sections)) {
        throw new Error('Response missing sections array')
      }

      for (const section of result.sections) {
        if (!section.name || !Array.isArray(section.shortcuts)) {
          throw new Error(`Invalid section: ${JSON.stringify(section).slice(0, 100)}`)
        }
        section.shortcuts = section.shortcuts.filter(s =>
          s.action && s.key && Array.isArray(s.modifiers)
        )
      }

      // Filter out empty sections
      result.sections = result.sections.filter(s => s.shortcuts.length > 0)

      return result
    } catch (err) {
      throw new Error(`Failed to parse AI response for ${url}: ${err.message}\nRaw: ${text.slice(0, 500)}`)
    }
  }
}

/**
 * Strip navigation, footer, scripts, styles from HTML to reduce token count.
 */
function stripChrome(html) {
  const $ = cheerio.load(html)

  // Remove non-content elements
  $('nav, footer, header, script, style, noscript, iframe, svg, img, video, audio').remove()
  $('[role="navigation"], [role="banner"], [role="contentinfo"]').remove()
  $('.sidebar, .nav, .footer, .header, .menu, .breadcrumb, .cookie-banner').remove()

  // Get the main content area
  const main = $('main, [role="main"], article, .article-body, .content, .documentation').first()
  const content = main.length ? main.html() : $('body').html()

  // Convert to plain text with structure markers, keeping tables and lists
  const $content = cheerio.load(content || '')

  // Truncate to ~30k chars to stay within token limits
  let text = $content.text()
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  if (text.length > 30000) {
    text = text.slice(0, 30000) + '\n[TRUNCATED]'
  }

  return text
}

function getPlatformLabel(filter) {
  const map = {
    mac: 'macOS', macos: 'macOS',
    windows: 'Windows', win: 'Windows',
    linux: 'Linux',
  }
  return map[filter?.toLowerCase()] || filter || 'macOS'
}

function getModifierNames(platform) {
  const names = {
    macOS: 'Command (⌘), Option (⌥), Control (⌃), Shift (⇧)',
    Windows: 'Ctrl, Alt, Shift, Win',
    Linux: 'Ctrl, Alt, Shift, Super',
  }
  return names[platform] || names.macOS
}
