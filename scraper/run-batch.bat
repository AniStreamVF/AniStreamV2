@echo off
cd /d "C:\Users\Mouns\Downloads\Tatakai-main\scraper"
echo Starting Voiranime scraper batch...
echo Logging to scraper-log.txt

:: Run the scraper for about 2 hours, processing as many anime as possible
node -e "
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://voiranime.rip';
const OUT = path.join(__dirname, 'data');
const PROG = path.join(__dirname, 'progress.json');
const l = () => { try { return JSON.parse(fs.readFileSync(PROG,'utf-8')); } catch { return { slugs:[], info:[] }; } };
const s = p => fs.writeFileSync(PROG, JSON.stringify(p,null,2));
const sl = ms => new Promise(r => setTimeout(r, ms));
const EXC = new Set(['/planning','/aide','/profil','/catalogue','/anime','/search','/login','/register','/']);

if (!fs.existsSync(OUT)) fs.mkdirSync(OUT, { recursive: true });

(async () => {
  let p = l();
  const br = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });

  // Step 1: Catalogue
  if (p.slugs.length === 0) {
    console.log('=== CATALOGUE ===');
    const pg = await br.newPage();
    const slugs = new Set();
    for (let i = 1; i <= 71; i++) {
      process.stdout.write('Page ' + i + '/71\r');
      await pg.goto(BASE + '/catalogue/?page=' + i, { timeout: 30000, waitUntil: 'networkidle' });
      await sl(1500);
      const links = await pg.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(Boolean));
      for (const lx of links) {
        const c = lx.replace(/\/$/, '');
        if (c && !EXC.has(c.toLowerCase()) && /^\/[a-z0-9]/.test(c) && !c.includes('saison') && !c.includes('episode')) slugs.add(c);
      }
      if (i % 10 === 0) { p.slugs = [...slugs]; s(p); }
    }
    p.slugs = [...slugs].sort();
    await pg.close();
    console.log('\nCatalogue: ' + p.slugs.length + ' anime');
    s(p);
  }

  // Step 2: Anime info
  const todo = p.slugs.filter(x => !p.info.find(i => i.slug === x));
  console.log('\\n=== ANIME INFO (' + todo.length + ' remaining) ===');
  const startTime = Date.now();
  const MAX_TIME = 120 * 60 * 1000; // 2 hours max

  for (let idx = 0; idx < todo.length; idx++) {
    if (Date.now() - startTime > MAX_TIME) { console.log('\\nTime limit reached, stopping'); break; }
    const slug = todo[idx];
    console.log('\n[' + (idx+1) + '/' + todo.length + '] ' + slug);
    
    const pg = await br.newPage();
    try {
      await pg.goto(BASE + slug + '/', { timeout: 30000, waitUntil: 'networkidle' });
      await sl(2000);
      const info = await pg.evaluate((s) => {
        const title = document.querySelector('h1')?.innerText?.trim() || s.split('/').pop().replace(/-/g,' ');
        const struct = [...document.querySelectorAll('script[type=\"application/ld+json\"]')].map(x => { try { return JSON.parse(x.textContent); } catch { return null; } }).filter(Boolean);
        const series = struct.find(x => x['@type'] === 'TVSeries');
        let seasons = [];
        if (series?.containsSeason) seasons = series.containsSeason.map(sn => ({ n: sn.seasonNumber, eps: sn.numberOfEpisodes, url: sn.url }));
        else {
          const seen = new Set();
          [...document.querySelectorAll('a[href*=\"saison\"]')].forEach(a => {
            const h = a.getAttribute('href'); if (!h || seen.has(h)) return; seen.add(h);
            const m = h.match(/saison-(\\d+)/); if (m) seasons.push({ n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h });
          });
        }
        return { slug: s, title, seasons: seasons.sort((a,b) => a.n - b.n) };
      }, slug);
      
      // Get episode lists for first season
      if (info.seasons.length > 0) {
        const s1 = info.seasons[0];
        await pg.goto(s1.url, { timeout: 30000, waitUntil: 'networkidle' });
        await sl(1500);
        s1.eps = await pg.evaluate(() => {
          const seen = new Set();
          return [...document.querySelectorAll('a[href*=\"episode\"]')].map(a => {
            const h = a.getAttribute('href'); if (!h || seen.has(h)) return null; seen.add(h);
            const m = h.match(/episode-(\\d+)/); if (!m) return null;
            return { n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h };
          }).filter(Boolean).sort((a,b) => a.n - b.n);
        });
      }
      
      p.info.push(info);
      s(p);
      const fn = slug.replace(/[\\/]/g,'_').replace(/^_/,'') + '.json';
      fs.writeFileSync(path.join(OUT, fn), JSON.stringify(info, null, 2));
      console.log('  -> ' + info.title + ' | Seasons: ' + info.seasons.length + ' | Episodes S1: ' + (info.seasons[0]?.eps?.length || 0));
    } catch(e) { 
      console.log('  ERROR: ' + e.message);
      p.info.push({ slug, title: slug.split('/').pop().replace(/-/g,' '), seasons: [], error: e.message });
      s(p);
    }
    await pg.close();
    await sl(1000);
  }

  console.log('\\n=== DONE ===');
  console.log('Scraped: ' + p.info.length + '/' + p.slugs.length);
  await br.close();
})().catch(e => { console.error(e); process.exit(1); });
" > scraper-log.txt 2>&1
echo Batch complete! Check scraper-log.txt for details.