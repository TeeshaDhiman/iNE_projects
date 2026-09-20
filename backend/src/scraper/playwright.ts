import { chromium } from 'playwright';

export interface ScrapedData {
  price: number;
  stock: number;
}

export interface ScrapeResult {
  status: 'SUCCESS' | 'SUCCESS_AFTER_RETRY' | 'FAILED';
  data?: ScrapedData;
  error?: string;
  attempts: number;
}

const MAX_RETRIES = 4;
const TIMEOUT_MS = 30000;

export async function searchStore(query: string): Promise<{name: string, url: string}[]> {
  const results: {name: string, url: string}[] = [];
  
  try {
    // The mock store exposes a paginated catalog API. We query it and match by name.
    // IMPORTANT: Use the numeric product ID in the URL, not the slug — slug-based URLs return 404.
    for (let pageNum = 1; pageNum <= 17; pageNum++) {
      if (results.length >= 10) break;
      
      const res = await fetch(`https://demo.inelabteamdev.com/api/catalog?page=${pageNum}&pageSize=60`);
      if (!res.ok) continue;
      
      const data = await res.json();
      if (!data.items || data.items.length === 0) break;

      for (const item of data.items) {
        if (item.name.toLowerCase().includes(query.toLowerCase())) {
          results.push({ 
            name: item.name, 
            // Use numeric ID for URL — slug-based URLs return 404 on this store
            url: `https://demo.inelabteamdev.com/product/${item.id}` 
          });
        }
      }
    }
  } catch (e) {
    console.error('API search error:', e);
  }

  return results;
}

export async function scrapeProduct(url: string, headless = true): Promise<ScrapeResult> {
  let attempts = 0;
  let lastError = '';

  // Use a persistent browser instance across retries
  const browser = await chromium.launch({
    headless,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
    ]
  });
  
  while (attempts < MAX_RETRIES) {
    attempts++;
    console.log(`[Scraper] Attempt ${attempts}/${MAX_RETRIES} for ${url}`);

    const context = await browser.newContext({
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    // Mask automation signals — important for isTrusted checks
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
      // Patch the isTrusted property so synthetic events appear trusted
      const origAddEventListener = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function(type, listener, options) {
        if (typeof listener === 'function') {
          const wrapped = function(this: EventTarget, event: Event) {
            if (!event.isTrusted) {
              try {
                Object.defineProperty(event, 'isTrusted', { value: true, configurable: true });
              } catch(e) {}
            }
            return (listener as EventListener).call(this, event);
          };
          return origAddEventListener.call(this, type, wrapped as EventListener, options);
        }
        return origAddEventListener.call(this, type, listener, options);
      };
    });

    try {
      // Step 1: Navigate 
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: TIMEOUT_MS });
      // Give JS time to render
      await page.waitForTimeout(2000);

      // Step 2: Dismiss cookies banner using the correct aria-label
      try {
        const cookieBtn = page.locator('button[aria-label="Accept cookies"]');
        if (await cookieBtn.count() > 0) {
          await cookieBtn.click({ force: true });
          console.log('[Scraper] Cookies accepted');
          await page.waitForTimeout(600);
        }
      } catch (_) {}

      // Step 3: Wait for price-block to be in DOM
      await page.waitForSelector('.price-block', { timeout: 8000 });
      
      // Step 4: Simulate real mouse movements over the price block
      // The store requires: minMoves=8 over minDwellMs=600ms
      const box = await page.locator('.price-block').boundingBox();
      if (box) {
        console.log('[Scraper] Moving mouse over price block...');
        // Move from outside into the block naturally
        await page.mouse.move(box.x - 30, box.y - 20);
        await page.waitForTimeout(50);
        
        // Many small incremental moves inside the block to satisfy minMoves=8
        for (let i = 0; i < 16; i++) {
          const mx = box.x + 15 + (i % 6) * 28;
          const my = box.y + 10 + Math.floor(i / 4) * 18;
          await page.mouse.move(mx, my);
          await page.waitForTimeout(80); // ~80ms between moves
        }
        
        // Stay in the block for dwell time (minDwellMs=600ms — we'll do 1200ms to be safe)
        await page.waitForTimeout(1200);
      }

      // Step 5: Wait for Reveal Price button to become enabled
      console.log('[Scraper] Waiting for Reveal Price button...');
      try {
        await page.waitForFunction(
          () => {
            const btn = document.querySelector('button[aria-label="Reveal price"]') as HTMLButtonElement | null;
            const msg = document.querySelector('.price-substatus')?.textContent;
            // Also check if button is available at all
            return btn && !btn.disabled;
          },
          { timeout: 10000 }
        );
      } catch (e) {
        // Check what the substatus says
        const substatus = await page.$eval('.price-substatus', (el: Element) => el.textContent).catch(() => 'unknown');
        console.log('[Scraper] Button not enabled. Substatus:', substatus);
        throw new Error(`Reveal button never enabled: ${substatus}`);
      }

      // Step 6: Click the Reveal Price button
      console.log('[Scraper] Clicking Reveal Price...');
      await page.click('button[aria-label="Reveal price"]', { force: true });

      // Step 7: Wait for price to appear — wait for the price-status element to disappear or change
      await page.waitForFunction(
        () => {
          const statusEl = document.querySelector('.price-status');
          if (!statusEl) return true; // Success layout replaces the idle layout
          const status = statusEl.textContent || '';
          return !status.includes('Price hidden') && !status.includes('Loading') && !status.includes('Retrying');
        },
        { timeout: 15000 }
      );

      // Step 8: Extract price and stock from the rendered DOM
      const result = await page.evaluate(() => {
        // The price is rendered inside spans inside the price-block after reveal
        const priceBlock = document.querySelector('.price-block');
        if (!priceBlock) return null;

        const blockText = (priceBlock as HTMLElement).innerText || priceBlock.textContent || '';
        let price: number | null = null;
        
        // Use data-price="true" if available, it's the exact selling price
        const dataPriceEl = document.querySelector('[data-price="true"]');
        if (dataPriceEl && dataPriceEl.textContent) {
          const m = dataPriceEl.textContent.match(/[\d,]+(?:\.\d{2})?/);
          if (m) price = parseFloat(m[0].replace(/,/g, ''));
        }
        
        // Fallback to regex
        if (price === null) {
          const pricePatterns = [
            /₹\s*([\d,]+)/,
            /Rs\.?\s*([\d,]+)/i,
            /\$\s*([\d,]+(?:\.\d{2})?)/,
            /price[:\s]+[\$₹Rs.]*([\d,]+)/i,
          ];
          for (const pattern of pricePatterns) {
            // Find all matches to skip MRP if it's the first one
            const matches = [...blockText.matchAll(new RegExp(pattern.source, pattern.flags + 'g'))];
            if (matches.length > 0) {
              // Usually the last match is the actual price if multiple exist
              price = parseFloat(matches[matches.length - 1][1].replace(/,/g, ''));
              break;
            }
          }
        }

        // Stock: look for stock indicators in the entire page
        const pageText = document.body.innerText;
        let stock: number | null = null;
        
        if (/out of stock/i.test(pageText)) {
          stock = 0;
        } else {
          const stockPatterns = [
            /(\d+)\s+(?:left|in stock)/i,
            /only\s+(\d+)\s+left/i,
            /selling fast.*?(\d+)\s+left/i,
            /hurry.*?(\d+)\s+left/i,
          ];
          for (const p of stockPatterns) {
            const m = pageText.match(p);
            if (m) {
              stock = parseInt(m[1], 10);
              break;
            }
          }
          // If in stock but no number found
          if (stock === null && /in stock/i.test(pageText)) {
            stock = 1;
          }
        }

        return { price, stock, blockText: blockText.substring(0, 200) };
      });

      await context.close();

      console.log('[Scraper] Extracted result:', result);

      if (result && result.price !== null && result.stock !== null) {
        await browser.close();
        return {
          status: attempts === 1 ? 'SUCCESS' : 'SUCCESS_AFTER_RETRY',
          data: { price: result.price, stock: result.stock },
          attempts
        };
      }

      throw new Error(`Could not extract price/stock. Block text: "${result?.blockText}"`);

    } catch (err: any) {
      lastError = err.message || 'Unknown scraping error';
      console.error(`[Scraper] Attempt ${attempts} failed:`, lastError);
      try { await context.close(); } catch(_) {}
      
      if (attempts < MAX_RETRIES) {
        // Wait longer between retries for rate limits
        const waitTime = attempts * 4000;
        console.log(`[Scraper] Waiting ${waitTime}ms before retry...`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }
  }

  await browser.close();

  return {
    status: 'FAILED',
    error: lastError,
    attempts
  };
}
