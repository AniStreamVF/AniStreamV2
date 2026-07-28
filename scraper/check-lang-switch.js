const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();

  // Find an episode with both VF and VOSTFR
  // From earlier: "grand-blues/saison-3/episode-4/" has both languages in listing
  await page.goto('https://voiranime.rip/grand-blues/saison-3/episode-4/', { timeout: 30000, waitUntil: 'networkidle' });
  await new Promise(r => setTimeout(r, 3000));

  const info = await page.evaluate(async () => {
    const btns = [...document.querySelectorAll('.lang-btn.lang-switch')];
    const result = {};
    
    for (const btn of btns) {
      const lang = btn.innerText.trim();
      
      // Check if active
      const isActive = btn.classList.contains('active');
      
      // Get current iframe
      const getSrc = () => {
        const f = document.querySelector('iframe[src*="sibnet"], iframe[data-src*="sibnet"], iframe');
        return f?.getAttribute('src') || f?.getAttribute('data-src') || '';
      };
      
      if (isActive) {
        result[lang] = { active: true, src: getSrc() };
      } else {
        // Click it
        btn.click();
        await new Promise(r => setTimeout(r, 2000));
        result[lang] = { active: false, src: getSrc() };
        
        // Switch back
        const origBtn = btns.find(b => b.innerText.trim() === Object.keys(result).find(k => result[k].active));
        if (origBtn) origBtn.click();
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    return {
      buttons: btns.map(b => ({ lang: b.innerText.trim(), active: b.classList.contains('active') })),
      result,
      url: window.location.href
    };
  });

  console.log(JSON.stringify(info, null, 2));
  await browser.close();
})();