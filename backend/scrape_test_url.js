const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const response = await page.goto('https://demo.inelabteamdev.com/product/AMP-10584', { waitUntil: 'networkidle' });
  
  console.log('Status:', response.status());
  console.log('Title:', await page.title());
  
  await browser.close();
})();
