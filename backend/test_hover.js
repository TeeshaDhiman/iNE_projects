const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  await page.goto('https://demo.inelabteamdev.com/product/772', { waitUntil: 'networkidle' });
  
  // Real mouse movement
  const box = await page.locator('.price-block').boundingBox();
  if (box) {
    await page.mouse.move(box.x + box.width / 4, box.y + box.height / 4);
    await page.waitForTimeout(100);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.waitForTimeout(100);
    await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.75);
  } else {
    console.log('Price block not found');
  }
  
  // Wait for the button to become enabled or the price to appear
  try {
    await page.waitForFunction(() => {
      const btn = document.querySelector('button[aria-label="Reveal price"]');
      return !btn || !btn.disabled;
    }, { timeout: 15000 });
    console.log('Button became enabled!');
    
    // Check if button exists
    const btn = await page.$('button[aria-label="Reveal price"]');
    if (btn) {
      await btn.click();
      console.log('Clicked button natively');
    }
  } catch (e) {
    console.log('Timeout waiting for button to be enabled');
  }
  
  await page.waitForTimeout(3000);
  
  const html = await page.evaluate(() => document.querySelector('.price-block')?.innerHTML);
  console.log('HTML:', html);
  
  const allText = await page.evaluate(() => document.body.innerText);
  console.log('Price Match:', allText.match(/\$([0-9]+(?:\.[0-9]{2})?)/));
  
  await browser.close();
})();
