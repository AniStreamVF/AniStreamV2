const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36' });
  const page = await context.newPage();

  await page.goto('https://voiranime.rip/', { timeout: 30000, waitUntil: 'networkidle' });
  
  // Get the HTML source
  const html = await page.content();
  
  // Find links and structure
  const links = await page.evaluate(() => {
    const anchors = document.querySelectorAll('a[href]');
    return [...new Set([...anchors].map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('#') && !h.startsWith('javascript')))].slice(0, 100);
  });
  
  console.log('=== LINKS (first 100) ===');
  links.forEach(l => console.log(l));
  
  await browser.close();
})();