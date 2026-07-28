const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Block heavy resources
  await page.route('**/*', route => {
    const url = route.request().url();
    if (url.includes('sibnet.ru') || url.includes('yandex') || url.endsWith('.png') || url.endsWith('.jpg') || url.endsWith('.woff2') || url.includes('fontawesome')) {
      route.abort();
    } else {
      route.continue();
    }
  });

  await page.goto('https://voiranime.rip/one-piece/saison-1/episode-1/', { timeout: 30000, waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1000));

  // Get the HTML content
  const html = await page.content();

  // Search for video/sibnet patterns in raw HTML
  for (const pat of ['sibnet', 'videoid', 'shell.php', 'iframe']) {
    const idx = html.toLowerCase().indexOf(pat);
    if (idx >= 0) {
      console.log('Found "' + pat + '" at offset', idx);
      console.log('Context:', html.substring(Math.max(0, idx - 60), idx + 120));
      console.log('---');
    }
  }

  // Also check what the page actually contains - look for the data
  const result = await page.evaluate(() => {
    return {
      iframeSrc: document.querySelector('iframe')?.src || 'none',
      langBtns: [...document.querySelectorAll('.lang-btn')].map(b => ({ text: b.innerText.trim(), cls: b.className })),
      scriptsWithData: [...document.querySelectorAll('script')]
        .filter(s => s.textContent.includes('video') || s.textContent.includes('sibnet') || s.textContent.includes('player'))
        .map(s => ({ type: s.type, id: s.id, len: s.textContent.length, text: s.textContent.substring(0, 500) }))
    };
  });

  console.log('\n=== Page Eval ===');
  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();
