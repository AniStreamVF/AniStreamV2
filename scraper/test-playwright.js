const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  try {
    console.log('Testing voiranime.rip...');
    await page.goto('https://voiranime.rip/', { timeout: 30000, waitUntil: 'networkidle' });
    const title = await page.title();
    console.log('Page title:', title);
    const body = await page.evaluate(() => document.body.innerText.substring(0, 500));
    console.log('Body:', body);
    
    // Check for Cloudflare
    const cf = await page.evaluate(() => document.body.innerHTML.includes('challenge-platform') || document.body.innerHTML.includes('cf-chl-opt') || document.title.includes('Just a moment'));
    console.log('Cloudflare detected:', cf);
  } catch (e) {
    console.error('Error:', e.message);
  }

  await browser.close();
})();