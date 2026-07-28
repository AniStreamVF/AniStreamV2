const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Try Naruto Shippuden first episode (likely has VF)
  await page.goto('https://voiranime.rip/naruto-shippuden/saison-1/episode-1/', { timeout: 30000, waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 3000));

  const info = await page.evaluate(async () => {
    const btns = [...document.querySelectorAll('.lang-btn.lang-switch')];
    const result = { buttons: btns.map(b => ({ lang: b.innerText.trim(), active: b.classList.contains('active') })) };
    
    // Get current iframe
    const getSrc = () => {
      const f = document.querySelector('iframe[src*="sibnet"], iframe[data-src*="sibnet"], iframe');
      return f?.getAttribute('src') || f?.getAttribute('data-src') || '';
    };
    
    result.default = { lang: result.buttons.find(b => b.active)?.lang, src: getSrc() };
    
    // Try clicking all non-active buttons
    for (const btn of btns) {
      if (btn.classList.contains('active')) continue;
      const lang = btn.innerText.trim();
      btn.click();
      await new Promise(r => setTimeout(r, 2500));
      const newSrc = getSrc();
      result['click_' + lang] = { src: newSrc, different: newSrc !== result.default.src };
      
      // Click back
      const activeBtn = btns.find(b => b.classList.contains('active'));
      if (activeBtn) { activeBtn.click(); await new Promise(r => setTimeout(r, 2500)); }
    }
    
    return result;
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();