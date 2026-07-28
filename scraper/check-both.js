const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

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

      const sources = {};
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.src) sources['vf'] = iframe.src;

      // Click VOSTFR
      const btns = [...document.querySelectorAll('.lang-btn')];
      const vostfr = btns.find(b => b.innerText.trim().toLowerCase() === 'vostfr');
      if (vostfr) { vostfr.click(); await new Promise(r => setTimeout(r, 2000)); }
      const iframe2 = document.querySelector('iframe');
      if (iframe2 && iframe2.src) sources['vostfr'] = iframe2.src;

      console.log(`Ep ${ep}: VF=${sources.vf?.match(/videoid=(\d+)/)?.[1] || 'N/A'}  VOSTFR=${sources.vostfr?.match(/videoid=(\d+)/)?.[1] || 'N/A'}`);
    } catch (e) {
      console.log(`Ep ${ep}: ERROR`);
    }

    await page.close();
  }

  await browser.close();
})();
