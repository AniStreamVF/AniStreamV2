const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  await page.goto('https://voiranime.rip/naruto-shippuden/', { timeout: 30000, waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 2000));

  const info = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href*="saison"], a[href*="episode"]')].map(a => ({
      href: a.getAttribute('href'),
      text: a.innerText.trim()
    }));
    const title = document.title;
    const h1 = document.querySelector('h1')?.innerText;
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent);
    return { title, h1, links: links.slice(0, 20), scripts };
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();