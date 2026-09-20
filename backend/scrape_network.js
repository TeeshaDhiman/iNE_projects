const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  page.on('response', async response => {
    if (response.url().includes('api') || response.url().endsWith('.json')) {
      console.log('Found JSON/API:', response.url());
      try {
        console.log('Response:', await response.json());
      } catch(e) {}
    }
  });

  await page.goto('https://demo.inelabteamdev.com/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);
  
  await browser.close();
})();
