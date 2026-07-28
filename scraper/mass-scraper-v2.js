const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = 'https://voiranime.rip';
const DATA = path.join(__dirname, 'data');
const PROG = path.join(__dirname, 'progress.json');
const EXCLUDE = new Set(['/planning','/aide','/profil','/catalogue','/anime','/search','/login','/register','/','/film','/dmca','/privacy','/contact']);
const CONCURRENCY = Math.min(6, os.cpus().length);

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

function load() {
  try { return JSON.parse(fs.readFileSync(PROG, 'utf-8')); }
  catch { return { slugs: [], info: [] }; }
}
function save(p) { fs.writeFileSync(PROG, JSON.stringify(p, null, 2)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function blockResources(page) {
  await page.route('**/*', route => {
    const url = route.request().url();
    const type = route.request().resourceType();
    // Block heavy/non-essential resources
    if (type === 'image' || type === 'font' || type === 'media') { route.abort(); return; }
    if (url.includes('sibnet') || url.includes('yandex') || url.includes('google-analytics') || url.includes('facebook')) { route.abort(); return; }
    if (url.endsWith('.woff') || url.endsWith('.woff2') || url.endsWith('.ttf') || url.endsWith('.svg')) { route.abort(); return; }
    route.continue();
  });
}

async function getEpsSources(page, episodeUrl) {
  try {
    await page.goto(episodeUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
    await sleep(800);

    const sources = {};
    
    // Get default language
    const activeLang = await page.evaluate(() => {
      const btns = [...document.querySelectorAll('.lang-btn')];
      const active = btns.find(b => b.classList.contains('active'));
      return active ? active.innerText.trim().toLowerCase() : 'vf';
    });

    const iframeSrc = await page.evaluate(() => {
      const iframe = document.querySelector('iframe');
      return iframe ? iframe.src : null;
    });
    if (iframeSrc) sources[activeLang] = iframeSrc;

    // Click inactive language buttons
    const otherLangs = await page.evaluate(() => {
      return [...document.querySelectorAll('.lang-btn')]
        .filter(b => !b.classList.contains('active'))
        .map(b => b.innerText.trim().toLowerCase());
    });

    for (const lang of otherLangs) {
      await page.evaluate((l) => {
        const btns = [...document.querySelectorAll('.lang-btn')];
        const target = btns.find(b => b.innerText.trim().toLowerCase() === l);
        if (target) target.click();
      }, lang);
      await sleep(800);
      const src = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.src : null;
      });
      if (src) sources[lang] = src;
    }

    return sources;
  } catch (e) {
    return { error: e.message.substring(0, 80) };
  }
}

async function run() {
  console.log(`Concurrency: ${CONCURRENCY}`);
  let p = load();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage',
      '--disable-gpu', '--disable-software-rasterizer', '--disable-extensions']
  });

  try {
    // === UPDATE: reset info to re-run cleanly ===
    // Only keep slugs, reset info for fresh run
    // (Comment out after first run)
    // p.info = []; save(p);

    // === PHASE 1: CATALOGUE ===
    if (p.slugs.length === 0) {
      console.log('\n=== PHASE 1: CATALOGUE ===');
      const page = await browser.newPage();
      const slugs = new Set();
      for (let i = 1; i <= 71; i++) {
        process.stdout.write(`\rPage ${i}/71`);
        await page.goto(`${BASE}/catalogue/?page=${i}`, { timeout: 30000, waitUntil: 'networkidle' }).catch(() => {});
        await sleep(1000);
        const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(Boolean));
        for (const lx of links) {
          const c = lx.replace(/\/$/, '');
          if (c && !EXCLUDE.has(c.toLowerCase()) && /^\/[a-z0-9]/.test(c) && !c.includes('saison') && !c.includes('episode')) {
            slugs.add(c);
          }
        }
        if (i % 20 === 0) { p.slugs = [...slugs].sort(); save(p); }
      }
      p.slugs = [...slugs].sort();
      await page.close();
      save(p);
      console.log(`\nCatalogue: ${p.slugs.length} anime`);
    } else {
      console.log(`Loaded ${p.slugs.length} slugs`);
    }

    // === PHASE 2: ANIME INFO + EPISODE LISTS ===
    const todoInfo = p.slugs.filter(s => !p.info.find(i => i.slug === s));
    console.log(`\n=== PHASE 2: INFO (${todoInfo.length} remaining) ===`);
    console.log(`Time est.: ~${Math.round(todoInfo.length * 3.5 / CONCURRENCY / 60)} min\n`);

    for (let idx = 0; idx < todoInfo.length; idx++) {
      const slug = todoInfo[idx];
      process.stdout.write(`\r[${idx+1}/${todoInfo.length}] ${slug.substring(0,38)}`);
      
      if (idx % 50 === 0) process.stdout.write('\n');

      const page = await browser.newPage();
      await blockResources(page);
      try {
        await page.goto(`${BASE}${slug}/`, { timeout: 15000, waitUntil: 'domcontentloaded' });
        await sleep(1200);

        const info = await page.evaluate((s) => {
          const title = document.querySelector('h1')?.innerText?.trim() || s.split('/').pop().replace(/-/g, ' ');
          const struct = [...document.querySelectorAll('script[type="application/ld+json"]')]
            .map(x => { try { return JSON.parse(x.textContent); } catch { return null; } }).filter(Boolean);
          const series = struct.find(x => x['@type'] === 'TVSeries');
          let seasons = [];
          if (series?.containsSeason) {
            seasons = series.containsSeason.map(sn => ({ n: sn.seasonNumber, eps: sn.numberOfEpisodes, url: sn.url }));
          } else {
            const seen = new Set();
            [...document.querySelectorAll('a[href*="saison"]')].forEach(a => {
              const h = a.getAttribute('href');
              if (!h || seen.has(h)) return; seen.add(h);
              const m = h.match(/saison-(\d+)/);
              if (m) seasons.push({ n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h });
            });
          }
          return { slug: s, title, seasons: seasons.sort((a, b) => a.n - b.n) };
        }, slug);

        if (info.seasons.length > 0) {
          await page.goto(info.seasons[0].url, { timeout: 15000, waitUntil: 'domcontentloaded' });
          await sleep(800);
          info.seasons[0].episodes = await page.evaluate(() => {
            const seen = new Set();
            return [...document.querySelectorAll('a[href*="episode"]')]
              .map(a => {
                const h = a.getAttribute('href');
                if (!h || seen.has(h)) return null; seen.add(h);
                const m = h.match(/episode-(\d+)/);
                if (!m) return null;
                return { n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h };
              })
              .filter(Boolean)
              .sort((a, b) => a.n - b.n);
          });
        }

        p.info.push(info);
        if (idx % 10 === 0) save(p);
      } catch (e) {
        p.info.push({ slug, title: slug.split('/').pop().replace(/-/g, ' '), seasons: [], error: e.message.substring(0, 80) });
        if (idx % 10 === 0) save(p);
      }
      await page.close();
    }
    save(p);

    const ok = p.info.filter(i => !i.error).length;
    const withEps = p.info.filter(i => i.seasons?.[0]?.episodes?.length > 0).length;
    const totalEps = p.info.reduce((s, i) => s + (i.seasons?.[0]?.episodes?.length || 0), 0);
    console.log(`\nPhase 2 done: ${ok}/${p.slugs.length} OK, ${withEps} with eps, ${totalEps} total eps`);

    // === PHASE 3: EPISODE SOURCES (MASSIVE - ALL EPISODES) ===
    console.log('\n=== PHASE 3: EPISODE SOURCES (Sibnet VF+VOSTFR) ===');

    const animeToProcess = p.info.filter(anime =>
      anime.seasons?.length > 0 && anime.seasons[0]?.episodes?.length > 0 &&
      !anime.seasons[0]._sourcesDone
    );
    console.log(`${animeToProcess.length} anime need source scraping`);
    const totalEpisodesToScrape = animeToProcess.reduce((s, a) => s + a.seasons[0].episodes.length, 0);
    console.log(`${totalEpisodesToScrape} total episodes`);
    const estHours = Math.round(totalEpisodesToScrape * 2 / CONCURRENCY / 3600 * 10) / 10;
    console.log(`Est. time: ~${estHours} hours (${CONCURRENCY} concurrent)`);

    for (let aIdx = 0; aIdx < animeToProcess.length; aIdx++) {
      const anime = animeToProcess[aIdx];
      const season = anime.seasons[0];
      if (!season.episodes || season.episodes.length === 0) continue;

      console.log(`\n[${aIdx+1}/${animeToProcess.length}] ${anime.title} (${season.episodes.length} eps)`);
      const pages = [];

      try {
        // Pre-create pages for concurrency
        for (let i = 0; i < Math.min(CONCURRENCY, season.episodes.length); i++) {
          const p = await browser.newPage();
          await blockResources(p);
          pages.push(p);
        }

        let epIdx = 0;
        while (epIdx < season.episodes.length) {
          const batchSize = Math.min(CONCURRENCY, season.episodes.length - epIdx);
          const batchEps = season.episodes.slice(epIdx, epIdx + batchSize);
          process.stdout.write(`  eps ${batchEps[0].n}-${batchEps[batchEps.length-1].n}...`);

          const results = await Promise.all(batchEps.map((ep, i) => {
            if (i < pages.length) {
              return getEpsSources(pages[i], ep.url);
            }
            return {};
          }));

          for (let i = 0; i < batchEps.length; i++) {
            batchEps[i].sources = results[i] || { error: 'no result' };
          }

          epIdx += batchSize;
          process.stdout.write('OK\n');
        }
      } catch(e) {
        console.log(`  Error: ${e.message.substring(0, 60)}`);
      } finally {
        for (const p of pages) await p.close();
      }

      // Convert to bridge format and save
      const output = {
        slug: anime.slug.replace(/^\//, ''),
        title: anime.title,
        episodes: []
      };

      for (const ep of season.episodes) {
        if (ep.sources && !ep.sources.error && typeof ep.sources === 'object') {
          for (const [lang, url] of Object.entries(ep.sources)) {
            if (url && url.startsWith('http')) {
              output.episodes.push({
                number: ep.n,
                title: `Episode ${ep.n}`,
                embedUrl: url,
                season: 1,
                lang: lang,
                sources: []
              });
            }
          }
        }
      }

      const fn = anime.slug.replace(/[\\/]/g, '_').replace(/^_/, '') + '.json';
      fs.writeFileSync(path.join(DATA, fn), JSON.stringify(output, null, 2));

      season._sourcesDone = true;
      save(p);

      // Also save a consolidated snapshot every 10 anime
      if (aIdx % 10 === 9) {
        consolidateSnapshot(p);
      }
    }

    console.log('\n=== PHASE 3 COMPLETE ===');
    consolidateSnapshot(p);

  } finally {
    await browser.close();
  }
}

function consolidateSnapshot(progress) {
  const results = [];
  for (const info of progress.info) {
    if (info.error) continue;
    const slug = info.slug.replace(/^\//, '');
    const fn = slug.replace(/[\\/]/g, '_').replace(/^_/, '') + '.json';
    const fp = path.join(DATA, fn);
    if (fs.existsSync(fp)) {
      try {
        results.push(JSON.parse(fs.readFileSync(fp, 'utf-8')));
        continue;
      } catch {}
    }
    // Fallback: build from progress
    const entry = { slug, title: info.title, episodes: [] };
    if (info.seasons) {
      for (const s of info.seasons) {
        if (s.episodes) {
          for (const ep of s.episodes) {
            if (ep.sources && typeof ep.sources === 'object' && !ep.sources.error) {
              for (const [lang, url] of Object.entries(ep.sources)) {
                if (url && url.startsWith('http')) {
                  entry.episodes.push({ number: ep.n, title: `Episode ${ep.n}`, embedUrl: url, season: s.n, lang, sources: [] });
                }
              }
            }
          }
        }
      }
    }
    results.push(entry);
  }

  const outFile = path.join(__dirname, 'animes-consolidated.json');
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

  const totalEps = results.reduce((s, r) => s + (r.episodes?.length || 0), 0);
  const withEmbed = results.filter(r => r.episodes?.some(e => e.embedUrl)).length;
  console.log(`\n[SNAPSHOT] ${results.length} anime, ${totalEps} episodes, ${withEmbed} with embed URLs`);
}

run().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
