const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  // Test episodes 1-5 of One Piece to see if video IDs are sequential
  for (let ep = 1; ep <= 5; ep++) {
    const page = await browser.newPage();
    await page.route('**/*', route => {
      const url = route.request().url();
      if (url.includes('sibnet') || url.includes('yandex') || url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.woff2')) {
        route.abort();
      } else {
        route.continue();
      }
    });

    try {
      await page.goto(`https://voiranime.rip/one-piece/saison-1/episode-${ep}/`, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 2000));

      const result = await page.evaluate(() => {
        const sources = {};
        const iframe = document.querySelector('iframe');
        if (iframe && iframe.src) sources['initial'] = iframe.src;
        sources['langs'] = [...document.querySelectorAll('.lang-btn')].map(b => b.innerText.trim());
        return sources;
      });

      console.log(`Ep ${ep}:`, JSON.stringify(result));
    } catch (e) {
      console.log(`Ep ${ep}: ERROR ${e.message.substring(0, 50)}`);
    }

    await page.close();
  }

  await browser.close();
})();
