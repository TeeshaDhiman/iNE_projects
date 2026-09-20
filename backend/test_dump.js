const { chromium } = require('playwright');
const fs = require('fs');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto('https://demo.inelabteamdev.com/product/772', { waitUntil: 'networkidle' });
  console.log('Navigated');
  
  try {
    await page.click('text=ACCEPT', { timeout: 2000, force: true });
  } catch(e) {}
  
  try {
    await page.hover('.price-block', { force: true });
    await page.waitForTimeout(2000);
    await page.click('.btn-primary', { force: true });
    await page.waitForTimeout(3000); // Wait for price to render
  } catch (e) { console.log(e.message) }
  
  const html = await page.evaluate(() => document.querySelector('.price-block')?.innerHTML);
  fs.writeFileSync('C:\\Users\\Teesha\\OneDrive\\Desktop\\iNE_project\\price_block_dump.html', html || 'Not found');
  console.log('Dumped HTML to file');
  
  const bodyHtml = await page.evaluate(() => document.body.innerHTML);
  fs.writeFileSync('C:\\Users\\Teesha\\OneDrive\\Desktop\\iNE_project\\body_dump.html', bodyHtml);
  
  await browser.close();
})();
