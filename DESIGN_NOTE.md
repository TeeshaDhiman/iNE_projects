# Design Note — Scraper Reliability, Trade-offs & AI Corrections

## Overview

The core challenge in this project was reliably extracting price and stock data from a mock store that was intentionally designed to resist automated scraping. This note documents the approach taken, the trade-offs made, and — critically — the specific mistakes the AI assistant made on first attempt and how each was diagnosed and corrected.

---

## How We Made the Scraper Reliable

### 1. Understanding the Anti-Bot Mechanism (the hard part)

The mock store does not expose the price through its REST API (`/api/product/:id`). Instead, the price is hidden behind a multi-step browser interaction:

1. A **"Reveal Price" button** is rendered in a `disabled` state on page load.
2. The button only enables after the user **moves their mouse across the price block** — specifically after a minimum of **8 `mousemove` events** are recorded AND a minimum **hover dwell time of 600ms** has elapsed.
3. When the button is clicked, the frontend POSTs a challenge payload (including the recorded mouse trajectory) to the backend, which responds with an auth token.
4. That token is used to fetch the actual price from a protected endpoint.

This was discovered by downloading and decompiling the frontend JavaScript bundle from the mock store and reading the `Ar` class (the mouse tracker) and `Dr` function (the price reveal flow).

### 2. Three-Layer Bot Detection — and How We Beat Each One

#### Layer 1 — Cookie overlay blocking mouse events

The cookie consent banner overlays the entire page. While the button text says "ACCEPT", the actual DOM element uses `aria-label="Accept cookies"`. The initial scraper used `text=ACCEPT` as a selector, which Playwright could not find (since the button says "Accept", not "ACCEPT"). The banner remained visible and intercepted all mouse events, so the price block never received any `mousemove` signals.

**Fix:** Changed cookie dismiss to `page.locator('button[aria-label="Accept cookies"]').waitFor({ state: 'visible' }).then(click)`.

#### Layer 2 — Mouse movement requirements

`page.hover('.price-block')` only fires `mouseenter` — not `mousemove`. The store's tracker (`Ar`) only records `mousemove` events. Since `page.hover()` produced zero moves, the button remained permanently disabled.

**Fix:** Replaced with an explicit loop of 16 `page.mouse.move(x, y)` calls across the bounding box of `.price-block`, spaced 80ms apart, followed by a 1200ms static dwell — satisfying both `minMoves=8` and `minDwellMs=600ms`.

#### Layer 3 — `isTrusted` event validation

The click handler reads `event.nativeEvent.isTrusted` and embeds the result in the challenge payload sent to the server. Playwright synthetic events have `isTrusted = false` by default, causing the server-side challenge to reject the token, which silently returned an error (the price block showed an error state rather than revealing the price).

**Fix:** Injected an `addInitScript` that patches `EventTarget.prototype.addEventListener` to wrap every listener and force-assign `isTrusted = true` on any synthetic event before it reaches the application handler. This makes Playwright-dispatched events indistinguishable from real user events from the store's perspective.

### 3. Correct Price Extraction

After the price is revealed, the DOM contains multiple price figures — both the crossed-out MRP (original price) and the actual selling price. A naïve regex on the block text picks up the MRP first, producing consistently wrong values.

**Fix:** The revealed DOM always includes a `<span data-price="true">` element containing the exact selling price as a machine-readable attribute. The scraper reads this element directly and falls back to text-parsing only if the attribute is absent.

### 4. Retry Strategy

The mock store deliberately introduces intermittent slow responses and occasional 429 rate limit errors. A single-attempt scraper would fail frequently in unattended operation.

**Strategy:**
- Up to 4 attempts per product per run.
- Exponential backoff between retries (`attempt × 4000ms`).
- Each attempt opens a fresh browser context (to avoid cookie/session state from a prior failed attempt contaminating the next one).
- All attempts — including failures — are logged to `ScrapeLog` in Supabase, so the failure rate is always visible.
- A scrape is never silently skipped or partially written; if price extraction yields `null`, no `PriceHistory` row is inserted.

### 5. Scheduling Approach

The requirement explicitly specified triggering scrapes via an external cron or scheduled function rather than an always-on loop (because free-tier backends sleep).

For production deployment, the backend exposes the `/api/scrape` endpoint which triggers a scrape of all products. This endpoint is secured and must be called by an external cron provider (GitHub Actions, cron-job.org, Vercel Cron, etc.) using:
```
POST /api/scrape
Authorization: Bearer <CRON_SECRET>
```

---

## Trade-offs Made

| Decision | Alternative Considered | Reason for Choice |
|----------|----------------------|-------------------|
| **Playwright (headless browser)** | Lightweight HTTP fetch + HTML parsing | The price is not in the HTML source — it only appears after JavaScript executes the full reveal flow. HTTP fetching is impossible without executing that flow. |
| **Patching `isTrusted` via `addInitScript`** | Using Chrome DevTools Protocol to dispatch real input events | The CDP approach is more complex and brittle; the patch is simpler and equally effective for this use case. |
| **External cron service (cron-job.org)** | In-process `node-cron` | Adheres strictly to the requirement of not using an always-on loop, ensuring the free-tier backend is properly woken up. |
| **Per-product fresh context per retry** | Reusing a single page across retries | Fresh contexts avoid session/cookie leakage that could make successive retries more likely to fail after a previous bad attempt. |
| **Scraping all products sequentially** | Parallel scraping | The mock store rate-limits aggressively. Parallel scraping triggers 429 errors across all products simultaneously. Sequential scraping is slower but more reliable. |
| **`data-price="true"` attribute for price** | Parsing visible text | The text block contains MRP, deal price, and actual price mixed together. The attribute is unambiguous regardless of the store's display format variant. |

---

## What the AI Got Wrong on First Attempt — and How It Was Corrected

### Mistake 1 — Wrong cookie dismiss selector

**First attempt:** `page.click('text=ACCEPT', { timeout: 3000 })`

**Why it was wrong:** Playwright's `text=` selector is case-sensitive by default and does a full-text match. The button's visible text is "Accept" (sentence case), not "ACCEPT". The selector silently timed out, the banner remained, and mouse events over the price block were swallowed by the overlay.

**How it was found:** A screenshot taken immediately after the cookie-dismiss attempt showed the banner still visible. Inspecting the DOM confirmed the button had `aria-label="Accept cookies"`.

**Fix:** `page.locator('button[aria-label="Accept cookies"]').waitFor({ state: 'visible' }).click()`

---

### Mistake 2 — Using `page.hover()` instead of `page.mouse.move()`

**First attempt:** `await page.hover('.price-block', { force: true })`

**Why it was wrong:** `page.hover()` dispatches a `mouseover` + `mouseenter` event to the target element. The mock store's tracker (`Ar` class) only listens to `mousemove` events on the price block. No `mousemove` = no moves recorded = button stays `disabled`.

**How it was found:** Reading the decompiled bundle's `Ar` class — specifically the `move()` method — confirmed it only responds to `mousemove` events. Cross-referencing with Playwright's documentation confirmed `page.hover()` does not produce `mousemove` events.

**Fix:** Explicit loop of `page.mouse.move(x, y)` calls inside the price block bounding box.

---

### Mistake 3 — `waitForFunction` that could never resolve on success

**First attempt:**
```javascript
await page.waitForFunction(() => {
  const status = document.querySelector('.price-status')?.textContent;
  return status && !status.includes('Price hidden') && !status.includes('Loading');
});
```

**Why it was wrong:** On a successful price reveal, the entire price block DOM is replaced — the `<p class="price-status">` element does not exist at all in the success layout. The condition `status && ...` evaluates to `undefined && ...` which is falsy, so the wait never resolves and throws a 30-second timeout error.

**How it was found:** After confirming the button click was working (via a simple `waitForTimeout` + screenshot), the price block HTML was printed to console. The successful DOM contained no `.price-status` element whatsoever — the success layout renders a completely different structure.

**Fix:**
```javascript
await page.waitForFunction(() => {
  const statusEl = document.querySelector('.price-status');
  if (!statusEl) return true; // Success layout — element is gone
  const status = statusEl.textContent || '';
  return !status.includes('Price hidden') && !status.includes('Loading');
});
```

---

### Mistake 4 — Extracting the MRP instead of the selling price

**First attempt:** Regex `/₹\s*([\d,]+)/` applied to `.price-block` inner text.

**Why it was wrong:** The first ₹ figure in the text is the crossed-out MRP (original price). The actual selling price appears second (or third, when a "deal price" variant is active). The scraper was consistently recording the wrong, higher price.

**How it was found:** The extracted price (`12,160`) did not match the visibly displayed selling price (`9,971`) in a screenshot taken at the same moment.

**Fix:** Target `document.querySelector('[data-price="true"]')` — a hidden `<span>` the store injects with the machine-readable selling price — before falling back to text parsing.

---

## Summary

The overall pattern of failures followed a predictable arc: each layer of the mock store's anti-bot system looked simple on the surface but contained a precise, easily-missed detail. The AI assistant's first-attempt implementations were reasonable starting points but failed at each detail: wrong selector case, wrong event type, wrong wait condition logic, and wrong price element. Each failure was diagnosed through a combination of screenshots, DOM dumps, and decompiling the frontend bundle — and corrected with a targeted fix rather than a full rewrite.
