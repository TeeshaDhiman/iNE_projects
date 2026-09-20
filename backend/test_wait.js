const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.goto('https://demo.inelabteamdev.com/product/772', { waitUntil: 'networkidle' });
  
  console.log('Waiting 15 seconds without hovering...');
  await page.waitForTimeout(15000);
  
  const btn = page.locator('button[aria-label="Reveal price"]');
  console.log('Is button disabled after 15s?', await btn.evaluate(el => el.disabled));
  
  await browser.close();
})();
