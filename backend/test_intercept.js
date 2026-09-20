// Intercept all network requests when the reveal price button is clicked
// and log exactly what APIs are called

const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 50 });
  const page = await browser.newPage();
  
  // Intercept ALL requests
  const requests = [];
  page.on('request', request => {
    const url = request.url();
    const method = request.method();
    if (!url.includes('.js') && !url.includes('.css') && !url.includes('.svg') && !url.includes('.woff')) {
      const entry = {
        method,
        url,
        headers: { ...request.headers() },
        body: request.postData(),
      };
      requests.push(entry);
    }
  });

  page.on('response', async res => {
    const url = res.url();
    if (!url.includes('.js') && !url.includes('.css') && !url.includes('.svg') && !url.includes('.woff')) {
      let body = '';
      try { body = await res.text(); } catch(e) {}
      console.log(`RESPONSE [${res.status()}] ${url}`);
      if (body) console.log('  Body:', body.substring(0, 400));
    }
  });

  // Wait 5 seconds before loading to avoid rate limits from prior runs
  console.log('Waiting 5s to avoid rate limits...');
  await new Promise(r => setTimeout(r, 5000));

  await page.goto('https://demo.inelabteamdev.com/product/772', { waitUntil: 'networkidle' });
  console.log('Page loaded');
  await page.waitForTimeout(1000);

  // Accept cookies if present
  try {
    await page.click('button[aria-label="Accept cookies"]', { timeout: 2000 });
    console.log('Accepted cookies');
    await page.waitForTimeout(500);
  } catch(e) {}

  // Simulate many mouse movements over the price-block
  const box = await page.locator('.price-block').boundingBox();
  if (box) {
    console.log('Moving mouse over price block...');
    for (let i = 0; i < 20; i++) {
      const x = box.x + 10 + (i % 8) * 30;
      const y = box.y + 5 + Math.floor(i / 8) * 15;
      await page.mouse.move(x, y);
      await page.waitForTimeout(80);
    }
    // Stay hovering
    await page.waitForTimeout(1500);
  }

  // Check if button is enabled
  const btn = page.locator('button[aria-label="Reveal price"]');
  const disabled = await btn.evaluate(el => el.disabled);
  console.log('Button disabled?', disabled);
  
  if (!disabled) {
    console.log('Clicking reveal price...');
    await btn.click();
    await page.waitForTimeout(5000);
  }

  console.log('All captured requests:');
  for (const r of requests) {
    console.log(`[${r.method}] ${r.url}`);
    if (r.body) console.log('  Body:', r.body.substring(0, 300));
    if (r.headers.authorization) console.log('  Auth:', r.headers.authorization.substring(0, 80));
  }

  await browser.close();
})();
