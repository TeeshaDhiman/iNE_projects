// Intercept using CDP (Chrome DevTools Protocol) to capture all requests
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  const client = await context.newCDPSession(page);
  await client.send('Network.enable');
  
  client.on('Network.requestWillBeSent', (event) => {
    if (!event.request.url.includes('.js') && !event.request.url.includes('.css') && 
        !event.request.url.includes('.svg') && !event.request.url.includes('.woff')) {
      console.log(`REQUEST: [${event.request.method}] ${event.request.url}`);
      if (event.request.postData) {
        console.log('  PostData:', event.request.postData.substring(0, 400));
      }
    }
  });

  client.on('Network.responseReceived', (event) => {
    if (!event.response.url.includes('.js') && !event.response.url.includes('.css') && 
        !event.response.url.includes('.svg') && !event.response.url.includes('.woff')) {
      console.log(`RESPONSE: [${event.response.status}] ${event.response.url}`);
    }
  });

  // Wait for rate limit to clear
  console.log('Waiting 10s for rate limit...');
  await new Promise(r => setTimeout(r, 10000));

  await page.goto('https://demo.inelabteamdev.com/product/772', { waitUntil: 'networkidle' });
  console.log('Page loaded');
  await page.waitForTimeout(2000);

  // Real mouse movements over the price block
  const box = await page.locator('.price-block').boundingBox();
  if (box) {
    console.log('Moving mouse over price block with natural movement...');
    // Simulate natural mouse entry from outside
    await page.mouse.move(box.x - 20, box.y - 20);
    await page.waitForTimeout(200);
    
    for (let i = 0; i < 20; i++) {
      const x = box.x + 10 + (i % 8) * 25;
      const y = box.y + 8 + Math.floor(i / 5) * 12;
      await page.mouse.move(x, y);
      await page.waitForTimeout(90);
    }
    await page.waitForTimeout(1500);
  }

  // Check button state
  const btn = page.locator('button[aria-label="Reveal price"]');
  const disabled = await btn.evaluate(el => el.disabled);
  console.log('Button disabled?', disabled);
  
  if (!disabled) {
    console.log('=== CLICKING REVEAL PRICE ===');
    await btn.click();
    await page.waitForTimeout(8000);
  }

  await browser.close();
  console.log('Done.');
})();
