const p = JSON.parse(require('fs').readFileSync('progress.json','utf-8'));
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function block(p) {
  await p.route('**/*', r => {
    const u = r.request().url(), t = r.request().resourceType();
    if (t === 'image' || t === 'font' || t === 'media') { r.abort(); return; }
    if (u.includes('sibnet.ru')||u.includes('yandex')||u.includes('google-analytics')) { r.abort(); return; }
    if (u.endsWith('.woff')||u.endsWith('.woff2')||u.endsWith('.ttf')||u.endsWith('.svg')) { r.abort(); return; }
    r.continue();
  });
}

async function getSources(page, url) {
  try {
    await page.goto(url, { timeout: 15000, waitUntil: 'domcontentloaded' });
    await sleep(800);
    const s = {};
    const lang = await page.evaluate(() => {
      const b = [...document.querySelectorAll('.lang-btn')];
      const a = b.find(x => x.classList.contains('active'));
      return a ? a.innerText.trim().toLowerCase() : 'vf';
    });
    const ifr = await page.evaluate(() => {
      const f = document.querySelector('iframe');
      return f ? f.src : null;
    });
    if (ifr) s[lang] = ifr;
    const others = await page.evaluate(() => {
      return [...document.querySelectorAll('.lang-btn')].filter(b => !b.classList.contains('active')).map(b => b.innerText.trim().toLowerCase());
    });
    for (const l of others) {
      await page.evaluate((l2) => {
        const btns = [...document.querySelectorAll('.lang-btn')];
        const t = btns.find(b => b.innerText.trim().toLowerCase() === l2);
        if (t) t.click();
      }, l);
      await sleep(800);
      const src = await page.evaluate(() => {
        const f = document.querySelector('iframe');
        return f ? f.src : null;
      });
      if (src) s[l] = src;
    }
    return s;
  } catch(e) { return { error: e.message.substring(0,60) }; }
}

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--disable-gpu','--disable-software-rasterizer','--disable-extensions'] });
  const CONCURRENCY = 6;

  const missing = [];
  for (const a of p.info) {
    if (!a.seasons) continue;
    for (const s of a.seasons) {
      if (!s.episodes) continue;
      for (const ep of s.episodes) {
        if (!ep.sources || ep.sources.error) {
          missing.push({ anime: a, season: s, ep });
        }
      }
    }
  }
  console.log('Missing episodes:', missing.length);

  for (let i = 0; i < missing.length; i += CONCURRENCY) {
    const batch = missing.slice(i, i + CONCURRENCY);
    const end = Math.min(i + CONCURRENCY, missing.length);
    process.stdout.write('\r' + (i+1) + '-' + end + '/' + missing.length + '...');

    const pages = [];
    for (let j = 0; j < batch.length; j++) {
      const p2 = await browser.newPage();
      await block(p2);
      pages.push(p2);
    }

    const results = await Promise.all(batch.map((m, idx) => getSources(pages[idx], m.ep.url)));

    for (let j = 0; j < batch.length; j++) {
      batch[j].ep.sources = results[j] || { error: 'no result' };
    }

    for (const p2 of pages) await p2.close();

    if (i % 30 === 0) fs.writeFileSync('progress.json', JSON.stringify(p, null, 2));
  }

  fs.writeFileSync('progress.json', JSON.stringify(p, null, 2));
  console.log('\nDone!');
  await browser.close();

  // Generate final JSON
  const out = [];
  const exclude = new Set(['/film','/dmca','/privacy','/contact','/aide','/profil','/catalogue','/anime','/search','/login','/register','/']);
  for (const a of p.info) {
    if (exclude.has(a.slug) || a.error) continue;
    const entry = { slug: a.slug.replace(/^\//,''), title: a.title, episodes: [] };
    if (a.seasons) {
      for (const s of a.seasons) {
        if (s.episodes) {
          for (const ep of s.episodes) {
            if (ep.sources && typeof ep.sources === 'object' && !ep.sources.error) {
              for (const [lang, url] of Object.entries(ep.sources)) {
                if (lang !== 'error' && url && typeof url === 'string' && url.startsWith('http')) {
                  entry.episodes.push({ number: ep.n, title: 'Episode ' + ep.n, embedUrl: url, season: s.n, lang, sources: [] });
                }
              }
            }
          }
        }
      }
    }
    out.push(entry);
  }
  out.sort((a,b) => a.slug.localeCompare(b.slug));
  fs.writeFileSync('animes-consolidated.json', JSON.stringify(out, null, 2));
  const total = out.reduce((s,a) => s + a.episodes.length, 0);
  console.log('Final: ' + out.length + ' anime, ' + total + ' episodes');
})().catch(e => { console.error(e); process.exit(1); });
