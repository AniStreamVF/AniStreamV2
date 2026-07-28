const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' });
  const page = await context.newPage();

  // Explore catalogue
  await page.goto('https://voiranime.rip/catalogue/', { timeout: 30000, waitUntil: 'networkidle' });
  
  const info = await page.evaluate(() => {
    const links = [...document.querySelectorAll('a[href*="/catalogue/"]')];
    const animeLinks = [...document.querySelectorAll('a[href^="/"]')].filter(a => {
      const h = a.getAttribute('href');
      return h && (h.match(/^\/([^\/]+)$/) || h.match(/^\/([^\/]+)\/$/));
    });
    const pagination = [...document.querySelectorAll('[class*="page"], [class*="pagination"], a[href*="page"]')];
    const h1 = document.title;
    const bodyText = document.body.innerText.substring(0, 1000);
    return { title: h1, bodyText, links: links.map(l => l.getAttribute('href')).slice(0, 20), animeLinksCount: animeLinks.length, pagination: pagination.map(p => ({text: p.innerText, href: p.getAttribute('href')})) };
  });
  
  console.log('Title:', info.title);
  console.log('Body:', info.bodyText);
  console.log('Anime links count:', info.animeLinksCount);

  await browser.close();
})();