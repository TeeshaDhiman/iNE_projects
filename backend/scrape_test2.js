const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://demo.inelabteamdev.com/', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(2000);
  
  // get current URL
  const initialUrl = page.url();
  
  // click the first tile CTA
  await page.click('.tile-cta');
  
  // wait for url to change
  await page.waitForFunction((initial) => document.location.href !== initial, initialUrl);
  
  console.log('Navigated to:', page.url());
  
  await browser.close();
})();
