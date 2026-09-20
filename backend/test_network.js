const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('request', request => {
    const url = request.url();
    if (!url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.ico') && !url.includes('.woff')) {
      console.log('REQUEST:', request.method(), url);
      try { 
        const body = request.postData();
        if (body) console.log('  BODY:', body.substring(0, 300));
        const headers = request.headers();
        if (headers.authorization) console.log('  AUTH:', headers.authorization.substring(0, 80));
      } catch(e) {}
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (!url.includes('.js') && !url.includes('.css') && !url.includes('.png') && !url.includes('.ico') && !url.includes('.woff')) {
      let body = '';
      try { body = await res.text(); } catch(e) {}
      console.log('RESPONSE:', res.status(), url, '->', body.substring(0, 300));
    }
  });

  await page.goto('https://demo.inelabteamdev.com/product/772', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Simulate real mouse movements
  const box = await page.locator('.price-block').boundingBox();
  if (box) {
    for (let i = 0; i < 15; i++) {
      await page.mouse.move(box.x + (i % 5) * 20, box.y + Math.floor(i / 5) * 10);
      await page.waitForTimeout(100);
    }
    await page.waitForTimeout(1000);
  }

  const btn = page.locator('button[aria-label="Reveal price"]');
  const disabled = await btn.evaluate(el => el.disabled);
  console.log('Button disabled?', disabled);
  if (!disabled) {
    await btn.click();
    await page.waitForTimeout(5000);
  }

  await browser.close();
})();
