import { chromium } from 'playwright';

/**
 * Headed Scraper Script for Submission
 * Runs the scraper in headed mode (visible browser window) for screen recording.
 */

async function scrapeProductHeaded(url: string) {
  console.log(`\nStarting headed scrape for: ${url}`);

  const browser = await chromium.launch({
    headless: false,
    slowMo: 30,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
    ]
  });

  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 720 },
  });

  // Patch isTrusted so synthetic events pass the store's check
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    const origAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions) {
      if (typeof listener === 'function') {
        const wrapped = function(this: EventTarget, event: Event) {
          if (!event.isTrusted) {
            try { Object.defineProperty(event, 'isTrusted', { value: true, configurable: true }); } catch(e) {}
          }
          return (listener as EventListener).call(this, event);
        };
        return origAddEventListener.call(this, type, wrapped as EventListener, options);
      }
      return origAddEventListener.call(this, type, listener, options);
    };
  });

  const page = await context.newPage();

  for (let attempt = 1; attempt <= 4; attempt++) {
    console.log(`\n[Attempt ${attempt}/4]`);
    
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2000);
      console.log('Page loaded.');

      // Accept cookies
      try {
        const cookieBtn = page.locator('button[aria-label="Accept cookies"]');
        if (await cookieBtn.count() > 0) {
          await cookieBtn.click({ force: true });
          console.log('Accepted cookies.');
          await page.waitForTimeout(600);
        }
      } catch (e: any) {
        console.log('No cookie banner:', e.message);
      }

      // Wait for price block
      await page.waitForSelector('.price-block', { timeout: 8000 });

      // Real mouse movements over the price block
      const box = await page.locator('.price-block').boundingBox();
      if (box) {
        console.log('Simulating mouse hover over price block...');
        await page.mouse.move(box.x - 30, box.y - 20);
        await page.waitForTimeout(50);
        
        for (let i = 0; i < 16; i++) {
          const mx = box.x + 15 + (i % 6) * 28;
          const my = box.y + 10 + Math.floor(i / 4) * 18;
          await page.mouse.move(mx, my);
          await page.waitForTimeout(80);
        }
        await page.waitForTimeout(1200);
      }

      // Wait for button to enable
      console.log('Waiting for Reveal Price button...');
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[aria-label="Reveal price"]') as HTMLButtonElement | null;
          return btn && !btn.disabled;
        },
        { timeout: 10000 }
      );

      // Click it
      console.log('Clicking Reveal Price...');
      await page.click('button[aria-label="Reveal price"]', { force: true });

      // Wait for price to appear
      await page.waitForFunction(
        () => {
          const statusEl = document.querySelector('.price-status');
          if (!statusEl) return true;
          const status = statusEl.textContent || '';
          return !status.includes('Price hidden') && !status.includes('Loading') && !status.includes('Retrying');
        },
        { timeout: 15000 }
      );

      // Extract price and stock
      const result = await page.evaluate(() => {
        const priceBlock = document.querySelector('.price-block');
        const blockText = priceBlock ? (priceBlock as HTMLElement).innerText : '';
        
        let price: number | null = null;
        const dataPriceEl = document.querySelector('[data-price="true"]');
        if (dataPriceEl && dataPriceEl.textContent) {
          const m = dataPriceEl.textContent.match(/[\d,]+(?:\.\d{2})?/);
          if (m) price = parseFloat(m[0].replace(/,/g, ''));
        }
        
        if (price === null) {
          const pricePatterns = [/₹\s*([\d,]+)/, /Rs\.?\s*([\d,]+)/i, /\$\s*([\d,]+(?:\.\d{2})?)/];
          for (const p of pricePatterns) {
            const matches = [...blockText.matchAll(new RegExp(p.source, p.flags + 'g'))];
            if (matches.length > 0) {
              price = parseFloat(matches[matches.length - 1][1].replace(/,/g, ''));
              break;
            }
          }
        }

        const pageText = document.body.innerText;
        let stock: number | null = null;
        if (/out of stock/i.test(pageText)) {
          stock = 0;
        } else {
          const sm = pageText.match(/(\d+)\s+(?:left|in stock)/i) || pageText.match(/only\s+(\d+)/i);
          if (sm) stock = parseInt(sm[1], 10);
          else if (/in stock/i.test(pageText)) stock = 1;
        }

        return { price, stock, blockText };
      });

      if (result.price !== null && result.stock !== null) {
        console.log(`\n🎉 SUCCESS on attempt ${attempt}!`);
        console.log(`Price: ${result.price} (raw block: "${result.blockText.substring(0, 100)}")`);
        console.log(`Stock: ${result.stock}`);
        await browser.close();
        return;
      }

      console.log(`Could not extract data. Block text: "${result.blockText}"`);
      throw new Error('Price or stock null');

    } catch (e: any) {
      console.log(`❌ Attempt ${attempt} failed: ${e.message}`);
      if (attempt < 4) {
        const wait = attempt * 4000;
        console.log(`Waiting ${wait}ms...`);
        await page.goto('about:blank');
        await new Promise(r => setTimeout(r, wait));
      }
    }
  }

  console.log('\n❌ All attempts failed.');
  await browser.close();
}

scrapeProductHeaded('https://demo.inelabteamdev.com/product/772').catch(console.error);
