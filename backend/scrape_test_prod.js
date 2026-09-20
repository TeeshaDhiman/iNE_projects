const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://demo.inelabteamdev.com/product/AMP-10584', { waitUntil: 'networkidle' });
  
  await page.waitForTimeout(3000);
  console.log(await page.evaluate(() => document.body.innerText));
  
  await browser.close();
})();
