const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' });
  const page = await context.newPage();

  // Check an episode page
  await page.goto('https://voiranime.rip/one-piece/saison-12/episode-16/', { timeout: 30000, waitUntil: 'networkidle' });
  
  const epInfo = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    
    // Find iframe sources
    const iframes = [...document.querySelectorAll('iframe[src], iframe[data-src]')];
    
    // Find player/streaming related elements
    const playerDivs = [...document.querySelectorAll('[class*="player"], [class*="video"], [class*="embed"], [id*="player"], [id*="video"]')];
    
    // Find all script tags that might contain video config
    const scripts = [...document.querySelectorAll('script')].slice(0, 5).map(s => (s.textContent || '').substring(0, 200));
    
    // Find links on the page
    const links = [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('#')).slice(0, 30);
    
    // Look for language/server selection
    const langSelectors = [...document.querySelectorAll('[class*="lang"], [class*="server"], [class*="source"], select, [class*="tab"]')].map(el => ({
      tag: el.tagName,
      text: (el.innerText || '').substring(0, 100),
      type: el.className
    }));
    
    return { iframeCount: iframes.length, iframeSrcs: iframes.map(f => f.getAttribute('src') || f.getAttribute('data-src')), links, playerDivs: playerDivs.map(d => ({className: d.className, id: d.id})).slice(0, 10), scripts, langSelectors: langSelectors.slice(0, 15) };
  });
  
  console.log('Episode info:');
  console.log(JSON.stringify(epInfo, null, 2));

  await browser.close();
})();