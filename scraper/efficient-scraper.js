const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = 'https://voiranime.rip';
const DATA = path.join(__dirname, 'data');
const PROG = path.join(__dirname, 'progress.json');

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

const load = () => { try { return JSON.parse(fs.readFileSync(PROG,'utf-8')); } catch { return { slugs:[], info:[] }; } };
const save = p => fs.writeFileSync(PROG, JSON.stringify(p,null,2));
const sl = ms => new Promise(r => setTimeout(r, ms));
const EXC = new Set(['/planning','/aide','/profil','/catalogue','/anime','/search','/login','/register','/']);

async function scrapeAll() {
  let p = load();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage'] });

  try {
    // === PHASE 1: CATALOGUE ===
    if (p.slugs.length === 0) {
      console.log('=== PHASE 1: CATALOGUE ===');
      const page = await browser.newPage();
      const slugs = new Set();
      for (let i = 1; i <= 71; i++) {
        process.stdout.write(`\rPage ${i}/71`);
        await page.goto(`${BASE}/catalogue/?page=${i}`, { timeout: 30000, waitUntil: 'networkidle' }).catch(() => {});
        await sl(1000);
        const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(Boolean));
        for (const lx of links) {
          const c = lx.replace(/\/$/,'');
          if (c && !EXC.has(c.toLowerCase()) && /^\/[a-z0-9]/.test(c) && !c.includes('saison') && !c.includes('episode')) slugs.add(c);
        }
        if (i % 10 === 0) { p.slugs = [...slugs]; save(p); }
      }
      p.slugs = [...slugs].sort();
      await page.close();
      save(p);
      console.log(`\nCatalogue: ${p.slugs.length} anime`);
    } else {
      console.log(`Loaded ${p.slugs.length} slugs from cache`);
    }

    // === PHASE 2: ANIME INFO + EPISODE LISTS ===
    const todo = p.slugs.filter(s => !p.info.find(i => i.slug === s));
    console.log(`\n=== PHASE 2: ANIME INFO (${todo.length} remaining) ===`);

    const MAX_TIME = 60 * 60 * 1000; // 1 hour
    const startTime = Date.now();

    for (let idx = 0; idx < todo.length; idx++) {
      if (Date.now() - startTime > MAX_TIME) { console.log('\nTime limit'); break; }
      const slug = todo[idx];
      process.stdout.write(`\r[${idx+1}/${todo.length}] ${slug}                         `);

      const page = await browser.newPage();
      try {
        await page.goto(`${BASE}${slug}/`, { timeout: 25000, waitUntil: 'domcontentloaded' });
        await sl(2000);

        const info = await page.evaluate((s) => {
          const title = document.querySelector('h1')?.innerText?.trim() || s.split('/').pop().replace(/-/g,' ');
          const struct = [...document.querySelectorAll('script[type="application/ld+json"]')].map(x => { try { return JSON.parse(x.textContent); } catch { return null; } }).filter(Boolean);
          const series = struct.find(x => x['@type'] === 'TVSeries');
          let seasons = [];
          if (series?.containsSeason) seasons = series.containsSeason.map(sn => ({ n: sn.seasonNumber, eps: sn.numberOfEpisodes, url: sn.url }));
          else {
            const seen = new Set();
            [...document.querySelectorAll('a[href*="saison"]')].forEach(a => {
              const h = a.getAttribute('href'); if (!h || seen.has(h)) return; seen.add(h);
              const m = h.match(/saison-(\d+)/); if (m) seasons.push({ n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h });
            });
          }
          return { slug: s, title, seasons: seasons.sort((a,b) => a.n - b.n) };
        }, slug);

        // Get episode lists for season 1
        if (info.seasons.length > 0) {
          await page.goto(info.seasons[0].url, { timeout: 25000, waitUntil: 'domcontentloaded' });
          await sl(1500);
          info.seasons[0].eps = await page.evaluate(() => {
            const seen = new Set();
            return [...document.querySelectorAll('a[href*="episode"]')].map(a => {
              const h = a.getAttribute('href'); if (!h || seen.has(h)) return null; seen.add(h);
              const m = h.match(/episode-(\d+)/); if (!m) return null;
              return { n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h };
            }).filter(Boolean).sort((a,b) => a.n - b.n);
          });
        }

        p.info.push(info);
        save(p);
        
        const fn = slug.replace(/[\\/]/g,'_').replace(/^_/,'') + '.json';
        fs.writeFileSync(path.join(DATA, fn), JSON.stringify(info, null, 2));
      } catch(e) {
        p.info.push({ slug, title: slug.split('/').pop().replace(/-/g,' '), seasons: [], error: e.message.substring(0,100) });
        save(p);
      }
      await page.close();
    }

    console.log(`\nPhase 2 done: ${p.info.length}/${p.slugs.length}`);
    console.log(`Results saved to: ${DATA}`);
    
  } finally {
    await browser.close();
  }
}

scrapeAll().catch(e => { console.error(e); process.exit(1); });