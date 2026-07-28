const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' });
  const page = await context.newPage();

  // Monitor all XHR/fetch requests
  const apiCalls = [];
  page.on('request', req => {
    const url = req.url();
    if (url.includes('voiranime') || url.includes('sibnet') || url.includes('api') || url.includes('json')) {
      apiCalls.push({ url, method: req.method(), type: req.resourceType() });
    }
  });

  await page.goto('https://voiranime.rip/one-piece/saison-12/episode-16/', { timeout: 30000, waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 3000));

  console.log('=== API Calls ===');
  apiCalls.forEach(c => console.log(`${c.method} ${c.type} ${c.url}`));

  // Try clicking VF button if it exists
  const buttons = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.lang-btn.lang-switch')];
    return btns.map(b => ({ text: b.innerText.trim(), classes: b.className }));
  });
  console.log('\n=== Language buttons ===');
  console.log(buttons);

  await browser.close();
})();