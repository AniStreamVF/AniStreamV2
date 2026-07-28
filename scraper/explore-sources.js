const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  await page.goto('https://voiranime.rip/one-piece/saison-1/episode-1/', { timeout: 30000, waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3000));

  const dump = await page.evaluate(() => {
    const data = {};

    // 1. Iframes
    data.iframes = [...document.querySelectorAll('iframe')].map(f => ({
      src: f.src || f.getAttribute('src') || '',
      id: f.id,
      className: f.className,
      'data-src': f.getAttribute('data-src') || ''
    }));

    // 2. All lang/server buttons
    data.buttons = [];
    document.querySelectorAll('button, a[class*="server"], a[class*="lang"], a[class*="source"], [class*="server"], [class*="player"], [class*="source"]').forEach(el => {
      data.buttons.push({
        tag: el.tagName,
        text: el.innerText?.trim()?.substring(0, 30),
        href: el.href || el.getAttribute('href') || '',
        'data-*': el.getAttribute('data-src') || el.getAttribute('data-url') || el.getAttribute('data-embed') || '',
        className: el.className,
        id: el.id,
        onclick: (el.getAttribute('onclick') || '').substring(0, 100)
      });
    });

    // 3. Any element with server/lang/player/source in its class or id
    data.elements = [];
    document.querySelectorAll('[class*="server" i], [class*="player" i], [class*="source" i], [id*="server" i], [id*="player" i]').forEach(el => {
      data.elements.push({
        tag: el.tagName,
        text: el.innerText?.trim()?.substring(0, 30),
        'data-*': el.getAttribute('data-src') || el.getAttribute('data-url') || el.getAttribute('data-embed') || '',
        className: el.className,
        id: el.id,
        src: el.src || el.href || ''
      });
    });

    // 4. Scripts with video/player data
    data.scripts = [];
    document.querySelectorAll('script').forEach(s => {
      const t = s.textContent;
      if (t.includes('player') || t.includes('video') || t.includes('sibnet') || t.includes('embed') || t.includes('source')) {
        data.scripts.push({
          id: s.id,
          type: s.type,
          len: t.length,
          text: t.substring(0, 1000)
        });
      }
    });

    // 5. All data-* attributes on the page
    data.dataAttrs = [];
    document.querySelectorAll('[data-src], [data-url], [data-embed], [data-video], [data-player]').forEach(el => {
      data.dataAttrs.push({
        tag: el.tagName,
        'data-src': el.getAttribute('data-src') || '',
        'data-url': el.getAttribute('data-url') || '',
        'data-embed': el.getAttribute('data-embed') || '',
        'data-video': el.getAttribute('data-video') || '',
        className: el.className.substring(0, 50)
      });
    });

    return data;
  });

  console.log(JSON.stringify(dump, null, 2));
  
  await browser.close();
})();
