const { chromium } = require('playwright');

async function getSources(page, episodeUrl) {
  await page.goto(episodeUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await sleep(800);
  const sources = {};
  const activeLang = await page.evaluate(() => {
    const btns = [...document.querySelectorAll('.lang-btn')];
    const active = btns.find(b => b.classList.contains('active'));
    return active ? active.innerText.trim().toLowerCase() : 'vf';
  });
  const iframeSrc = await page.evaluate(() => {
    const iframe = document.querySelector('iframe');
    return iframe ? iframe.src : null;
  });
  if (iframeSrc) sources[activeLang] = iframeSrc;
  const otherLangs = await page.evaluate(() => {
    return [...document.querySelectorAll('.lang-btn')]
      .filter(b => !b.classList.contains('active'))
      .map(b => b.innerText.trim().toLowerCase());
  });
  for (const lang of otherLangs) {
    await page.evaluate((l) => {
      const btns = [...document.querySelectorAll('.lang-btn')];
      const target = btns.find(b => b.innerText.trim().toLowerCase() === l);
      if (target) target.click();
    }, lang);
    await sleep(800);
    const src = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
    });
    if (src) sources[lang] = src;
  }
  return sources;
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Test: scrape first 3 episodes of several different anime to check ID patterns
  const tests = [
    { slug: 'naruto-shippuden', name: 'Naruto Shippuden' },
    { slug: 'attack-on-titan', name: 'AoT' },
    { slug: 'demon-slayer-kimetsu-no-yaiba', name: 'Demon Slayer' },
  ];

  for (const t of tests) {
    console.log(`\n=== ${t.name} ===`);
    for (let ep = 1; ep <= 3; ep++) {
      const url = `https://voiranime.rip/${t.slug}/saison-1/episode-${ep}/`;
      const sources = await getSources(page, url);
      const vfMatch = sources.vf?.match(/videoid=(\d+)/);
      const vfId = vfMatch ? parseInt(vfMatch[1]) : 'N/A';
      const vostfrMatch = sources.vostfr?.match(/videoid=(\d+)/);
      const vostfrId = vostfrMatch ? parseInt(vostfrMatch[1]) : 'N/A';
      console.log(`Ep ${ep}: VF=${vfId} VOSTFR=${vostfrId}`);
    }
  }

  await browser.close();
})();
