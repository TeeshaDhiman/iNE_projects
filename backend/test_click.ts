import { chromium } from 'playwright';

async function testClick() {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 100, // Make it easier to see
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-blink-features=AutomationControlled']
  });

  const context = await browser.newContext();
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
  await page.goto('https://demo.inelabteamdev.com/product/772', { waitUntil: 'domcontentloaded' });
  
  // Wait explicitly for the cookie button to be visible
  try {
    const cookieBtn = page.locator('button[aria-label="Accept cookies"]');
    await cookieBtn.waitFor({ state: 'visible', timeout: 5000 });
    await cookieBtn.click({ force: true });
    console.log('Clicked cookie button');
    // Wait for the overlay to disappear
    await page.waitForTimeout(1000);
  } catch (e) {
    console.log('No cookie banner found or timed out');
  }

  const box = await page.locator('.price-block').boundingBox();
  if (box) {
    console.log('Moving mouse...');
    await page.mouse.move(box.x - 30, box.y - 20);
    await page.waitForTimeout(50);
    for (let i = 0; i < 16; i++) {
      await page.mouse.move(box.x + 15 + (i % 6) * 28, box.y + 10 + Math.floor(i / 4) * 18);
      await page.waitForTimeout(80);
    }
    await page.waitForTimeout(1200);
  }

  // Check if button is enabled
  const isEnabled = await page.evaluate(() => {
    const btn = document.querySelector('button[aria-label="Reveal price"]') as HTMLButtonElement;
    return btn && !btn.disabled;
  });
  console.log('Button is enabled before click:', isEnabled);

  if (isEnabled) {
    console.log('Clicking Reveal price...');
    await page.click('button[aria-label="Reveal price"]', { force: true });
    
    // Just wait and screenshot to see what happens
    await page.waitForTimeout(5000);
  }
  
  const html = await page.evaluate(() => {
    const el = document.querySelector('.price-block');
    return el ? el.innerHTML : 'no price block';
  });
  console.log('Final Price block HTML:', html);
  
  await page.screenshot({ path: 'final_state.png' });
  await browser.close();
}

testClick().catch(console.error);
