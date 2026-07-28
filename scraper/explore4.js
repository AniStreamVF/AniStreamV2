const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' });
  const page = await context.newPage();

  // Check anime page (One Piece)
  await page.goto('https://voiranime.rip/one-piece/', { timeout: 30000, waitUntil: 'networkidle' });
  
  const info = await page.evaluate(() => {
    // Find seasons
    const seasonLinks = [...document.querySelectorAll('a[href*="saison"]')].map(a => ({
      href: a.getAttribute('href'),
      text: a.innerText.trim()
    }));
    
    // Find episode links on the page
    const episodeLinks = [...document.querySelectorAll('a[href*="episode"]')].map(a => ({
      href: a.getAttribute('href'),
      text: a.innerText.trim()
    }));
    
    const title = document.title;
    const h1 = document.querySelector('h1')?.innerText;
    
    // Look for all structured data
    const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => s.textContent);
    
    return { title, h1, seasonLinks: seasonLinks.slice(0, 20), episodeLinks: episodeLinks.slice(0, 20), scripts: scripts.slice(0, 2) };
  });
  
  console.log('Anime page:');
  console.log(JSON.stringify(info, null, 2));

  await browser.close();
})();