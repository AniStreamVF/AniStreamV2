const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto('https://anime-sama.com', { timeout: 30000, waitUntil: 'domcontentloaded' })
    .catch(e => console.log('Erreur navigation:', e.message.substring(0, 80)));

  await new Promise(r => setTimeout(r, 3000));

  const title = await page.title().catch(() => 'N/A');
  const html = await page.content().catch(() => '');
  const blocked = html.includes('Just a moment') || html.includes('challenge') || html.includes('cf-browser') || html.includes('cloudflare');
  
  console.log('Titre:', title);
  console.log('Blocked by CF:', blocked);
  console.log('HTML (first 500):', html.substring(0, 500).replace(/\n/g, ' '));
  
  await browser.close();
})();
