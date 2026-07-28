const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const cluster = require('os').cpus().length;

const BASE = 'https://voiranime.rip';
const DATA = path.join(__dirname, 'data');
const PROG = path.join(__dirname, 'progress.json');
const EXCLUDE = new Set(['/planning','/aide','/profil','/catalogue','/anime','/search','/login','/register','/','/film','/dmca','/privacy','/contact']);

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(PROG, 'utf-8')); }
  catch { return { slugs: [], info: [] }; }
}
function save(p) { fs.writeFileSync(PROG, JSON.stringify(p, null, 2)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getSources(page, episodeUrl) {
  try {
    await page.goto(episodeUrl, { timeout: 20000, waitUntil: 'domcontentloaded' });
    await sleep(2000);

    const sources = await page.evaluate(() => {
      const langs = [...document.querySelectorAll('.lang-btn')].map(b => b.innerText.trim()).filter(Boolean);
      const iframe = document.querySelector('iframe');
      const current = iframe ? iframe.src : '';
      // Get all lang data from buttons
      const data = {};
      // The active button's language
      const active = document.querySelector('.lang-btn.active');
      const activeLang = active ? active.innerText.trim().toLowerCase() : '';
      if (activeLang && current) data[activeLang] = current;
      return { langs, current, activeLang, data };
    });

    // If only 1 language found
    if (sources.langs.length <= 1) {
      return { [sources.langs[0]?.toLowerCase() || 'vf']: sources.current };
    }

    // Get all languages by clicking each inactive button
    const result = {};
    for (const lang of sources.langs) {
      const langKey = lang.trim().toLowerCase();
      result[langKey] = await page.evaluate((l) => {
        const btns = [...document.querySelectorAll('.lang-btn')];
        const target = btns.find(b => b.innerText.trim().toLowerCase() === l.toLowerCase());
        if (!target) return null;
        if (target.classList.contains('active')) {
          const ifr = document.querySelector('iframe');
          return ifr ? ifr.src : null;
        }
        target.click();
        return new Promise(resolve => {
          setTimeout(() => {
            const ifr = document.querySelector('iframe');
            resolve(ifr ? ifr.src : null);
          }, 1500);
        });
      }, lang);
    }

    return result;
  } catch (e) {
    return { error: e.message.substring(0, 100) };
  }
}

async function run() {
  let p = load();
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // === PHASE 1: CATALOGUE ===
    if (p.slugs.length === 0) {
      console.log('=== PHASE 1: CATALOGUE ===');
      const page = await browser.newPage();
      const slugs = new Set();
      for (let i = 1; i <= 71; i++) {
        process.stdout.write(`\rPage ${i}/71`);
        await page.goto(`${BASE}/catalogue/?page=${i}`, { timeout: 30000, waitUntil: 'networkidle' }).catch(() => {});
        await sleep(1500);
        const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(Boolean));
        for (const lx of links) {
          const c = lx.replace(/\/$/, '');
          if (c && !EXCLUDE.has(c.toLowerCase()) && /^\/[a-z0-9]/.test(c) && !c.includes('saison') && !c.includes('episode')) {
            slugs.add(c);
          }
        }
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
    console.log(`\n=== PHASE 2: INFO (${todo.length} remaining) ===`);

    for (let idx = 0; idx < todo.length; idx++) {
      const slug = todo[idx];
      process.stdout.write(`\r[${idx+1}/${todo.length}] ${slug.substring(0,40)}`);

      const page = await browser.newPage();
      try {
        await page.goto(`${BASE}${slug}/`, { timeout: 25000, waitUntil: 'domcontentloaded' });
        await sleep(2000);

        const info = await page.evaluate((s) => {
          const title = document.querySelector('h1')?.innerText?.trim() || s.split('/').pop().replace(/-/g, ' ');
          const struct = [...document.querySelectorAll('script[type="application/ld+json"]')]
            .map(x => { try { return JSON.parse(x.textContent); } catch { return null; } })
            .filter(Boolean);
          const series = struct.find(x => x['@type'] === 'TVSeries');
          let seasons = [];
          if (series?.containsSeason) {
            seasons = series.containsSeason.map(sn => ({ n: sn.seasonNumber, eps: sn.numberOfEpisodes, url: sn.url }));
          } else {
            const seen = new Set();
            [...document.querySelectorAll('a[href*="saison"]')].forEach(a => {
              const h = a.getAttribute('href'); if (!h || seen.has(h)) return; seen.add(h);
              const m = h.match(/saison-(\d+)/);
              if (m) seasons.push({ n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h });
            });
          }
          return { slug: s, title, seasons: seasons.sort((a, b) => a.n - b.n) };
        }, slug);

        // Episode lists for season 1
        if (info.seasons.length > 0) {
          await page.goto(info.seasons[0].url, { timeout: 25000, waitUntil: 'domcontentloaded' });
          await sleep(1500);
          info.seasons[0].episodes = await page.evaluate(() => {
            const seen = new Set();
            return [...document.querySelectorAll('a[href*="episode"]')]
              .map(a => {
                const h = a.getAttribute('href'); if (!h || seen.has(h)) return null; seen.add(h);
                const m = h.match(/episode-(\d+)/); if (!m) return null;
                return { n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h };
              })
              .filter(Boolean)
              .sort((a, b) => a.n - b.n);
          });
        }

        p.info.push(info);
        save(p);

        const fn = slug.replace(/[\\/]/g, '_').replace(/^_/, '') + '.json';
        fs.writeFileSync(path.join(DATA, fn), JSON.stringify(info, null, 2));
      } catch (e) {
        p.info.push({ slug, title: slug.split('/').pop().replace(/-/g, ' '), seasons: [], error: e.message.substring(0, 100) });
        save(p);
      }
      await page.close();
    }

    console.log(`\nPhase 2 done: ${p.info.filter(i => !i.error).length}/${p.slugs.length} OK`);

    // === PHASE 3: EPISODE SOURCES (Sibnet URLs) ===
    console.log(`\n=== PHASE 3: SOURCES ===`);
    console.log(`Getting Sibnet embed URLs for each episode...`);

    // Process anime that have episodes but no sources yet
    const needsSources = p.info.filter(anime => 
      anime.seasons?.length > 0 && anime.seasons[0]?.episodes?.length > 0 &&
      !anime.seasons[0].episodes[0]?.sources
    );
    console.log(`${needsSources.length} anime need source scraping`);

    const concurrency = Math.min(3, cluster);
    for (let aIdx = 0; aIdx < needsSources.length; aIdx++) {
      const anime = needsSources[aIdx];
      console.log(`\n[${aIdx+1}/${needsSources.length}] ${anime.title} (${anime.slug})`);

      // For each season
      for (const season of anime.seasons) {
        if (!season.episodes || season.episodes.length === 0) continue;
        console.log(`  Season ${season.n}: ${season.episodes.length} episodes`);

        // Process episodes in batches with limited concurrency
        for (let e = 0; e < season.episodes.length; e += concurrency) {
          const batch = season.episodes.slice(e, e + concurrency);
          const batchNum = Math.floor(e / concurrency) + 1;
          const totalBatches = Math.ceil(season.episodes.length / concurrency);
          process.stdout.write(`    Batch ${batchNum}/${totalBatches} [ep ${e+1}-${Math.min(e+concurrency, season.episodes.length)}]`);

          const pagePromises = batch.map(async (ep) => {
            const p = await browser.newPage();
            try {
              const sources = await getSources(p, ep.url);
              ep.sources = sources;
            } catch (err) {
              ep.sources = { error: err.message.substring(0, 100) };
            }
            await p.close();
          });

          await Promise.all(pagePromises);
          process.stdout.write(` ✓\n`);
        }

        // Save progress after each season
        const fn = anime.slug.replace(/[\\/]/g, '_').replace(/^_/, '') + '.json';
        fs.writeFileSync(path.join(DATA, fn), JSON.stringify(anime, null, 2));
      }
    }

    console.log(`\n=== ALL DONE ===`);
    console.log(`Data saved in: ${DATA}`);

  } finally {
    await browser.close();
  }
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });