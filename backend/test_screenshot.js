const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });
  await page.goto('https://demo.inelabteamdev.com/product/772', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);
  
  // Real mouse movement using bounding box
  const box = await page.locator('.price-block').boundingBox();
  if (box) {
    // Move mouse over the price block
    await page.mouse.move(box.x + 50, box.y + 20);
    await page.waitForTimeout(500);
    await page.mouse.move(box.x + box.width/2, box.y + box.height/2);
    await page.waitForTimeout(2000); // Give it time to load the price
  }
  
  // Check if button is enabled
  const btn = page.locator('button[aria-label="Reveal price"]');
  if (await btn.count() > 0) {
    const disabled = await btn.evaluate(el => el.disabled);
    console.log('Is button disabled after hover?', disabled);
    if (!disabled) {
      await btn.click();
      console.log('Clicked Reveal Price!');
      await page.waitForTimeout(2000);
    }
  }
  
  await page.screenshot({ path: 'C:\\Users\\Teesha\\OneDrive\\Desktop\\iNE_project\\debug_after_click.png' });
  console.log('Saved screenshot after hover and click attempt');
  
  await browser.close();
})();
