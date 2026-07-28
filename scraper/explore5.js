const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' });
  const page = await context.newPage();

  // Check season page
  await page.goto('https://voiranime.rip/one-piece/saison-1/', { timeout: 30000, waitUntil: 'networkidle' });
  
  const info = await page.evaluate(() => {
    const episodeLinks = [...document.querySelectorAll('a[href*="episode"]')].map(a => ({
      href: a.getAttribute('href'),
      text: a.innerText.trim()
    }));
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent);
    const title = document.title;
    const bodyText = document.body.innerText.substring(0, 500);
    return { title, bodyText, episodeLinks: episodeLinks.slice(0, 30), scripts: scripts.slice(0, 2) };
  });
  
  console.log('Season page:');
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
})();