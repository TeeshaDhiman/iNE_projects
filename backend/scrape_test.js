const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('https://demo.inelabteamdev.com/', { waitUntil: 'networkidle' });
  
  // wait 3 seconds just in case
  await page.waitForTimeout(3000);
  
  const html = await page.content();
  const text = await page.evaluate(() => document.body.innerText);
  
  fs.writeFileSync('mock_store.html', html);
  fs.writeFileSync('mock_store.txt', text);
  
  await browser.close();
})();
