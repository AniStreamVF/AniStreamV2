const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });

  for (let ep = 1; ep <= 5; ep++) {
    const page = await browser.newPage();
    try {
      await page.goto(`https://voiranime.rip/one-piece/saison-1/episode-${ep}/`, { timeout: 30000, waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 3000));

      const result = await page.evaluate(() => {
        const out = {};
        const iframe = document.querySelector('iframe');
        if (iframe) out['initial'] = iframe.src;
        const btns = [...document.querySelectorAll('.lang-btn')];
        out['langs'] = btns.map(b => b.innerText.trim());
        out['active'] = btns.find(b => b.classList.contains('active'))?.innerText.trim();
        return out;
      });
      console.log(`Ep ${ep}:`, JSON.stringify(result));

      // Now click VOSTFR
      await page.evaluate(() => {
        const btns = [...document.querySelectorAll('.lang-btn')];
        const cible = btns.find(b => b.innerText.trim().toLowerCase() === 'vostfr');
        if (cible) cible.click();
      });
      await new Promise(r => setTimeout(r, 3000));

      const after = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.src : 'no-iframe';
      });
      console.log(`Ep ${ep} after VOSTFR: videoid=${after.match(/videoid=(\d+)/)?.[1] || after}`);
    } catch (e) {
      console.log(`Ep ${ep}: ERROR ${e.message.substring(0, 60)}`);
    }
    await page.close();
  }

  await browser.close();
})();
