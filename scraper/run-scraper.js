const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = 'https://voiranime.rip';
const DATA = path.join(__dirname, 'data');
const PROG = path.join(__dirname, 'progress.json');
const EXCLUDE = new Set(['/planning','/aide','/profil','/catalogue','/anime','/search','/login','/register','/','/film','/dmca','/privacy','/contact']);
const CONCURRENCY = Math.min(5, os.cpus().length);

if (!fs.existsSync(DATA)) fs.mkdirSync(DATA, { recursive: true });

function load() {
  try { const d = JSON.parse(fs.readFileSync(PROG, 'utf-8')); return d; }
  catch { return { slugs: [], info: [] }; }
}
function save(p) { fs.writeFileSync(PROG, JSON.stringify(p, null, 2)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function getEpisodeSources(page, episodeUrl) {
  try {
    await page.goto(episodeUrl, { timeout: 20000, waitUntil: 'domcontentloaded' });
    await sleep(1500);

    // Get default language (VF typically)
    const result = await page.evaluate(() => {
      const sources = {};
      const iframe = document.querySelector('iframe');
      const btns = [...document.querySelectorAll('.lang-btn')];
      const langs = btns.map(b => b.innerText.trim()).filter(Boolean);

      if (iframe && iframe.src) {
        const active = btns.find(b => b.classList.contains('active'));
        const activeLang = active ? active.innerText.trim().toLowerCase() : 'vf';
        sources[activeLang] = iframe.src;
      }

      // Get the inactive language button text
      const inactives = btns.filter(b => !b.classList.contains('active'));
      for (const b of inactives) {
        sources['_inactive_lang'] = b.innerText.trim().toLowerCase();
      }
      return sources;
    });

    // Click the inactive language button to get its src
    if (result._inactive_lang && result._inactive_lang !== Object.keys(result).find(k => k.startsWith('_'))) {
      const targetLang = result._inactive_lang;
      delete result._inactive_lang;

      await page.evaluate((lang) => {
        const btns = [...document.querySelectorAll('.lang-btn')];
        const target = btns.find(b => b.innerText.trim().toLowerCase() === lang);
        if (target) target.click();
      }, targetLang);

      await sleep(1500);

      const secondSrc = await page.evaluate(() => {
        const iframe = document.querySelector('iframe');
        return iframe ? iframe.src : null;
      });

      if (secondSrc) result[targetLang] = secondSrc;
    } else {
      delete result._inactive_lang;
    }

    return result;
  } catch (e) {
    return { error: e.message.substring(0, 100) };
  }
}

async function processAnimeInfo(page, slug) {
  await page.goto(`${BASE}${slug}/`, { timeout: 25000, waitUntil: 'domcontentloaded' });
  await sleep(2000);

  return await page.evaluate((s) => {
    const title = document.querySelector('h1')?.innerText?.trim() || s.split('/').pop().replace(/-/g, ' ');
    const struct = [...document.querySelectorAll('script[type="application/ld+json"]')]
      .map(x => { try { return JSON.parse(x.textContent); } catch { return null; } }).filter(Boolean);
    const series = struct.find(x => x['@type'] === 'TVSeries');

    let seasons = [];
    if (series?.containsSeason) {
      seasons = series.containsSeason.map(sn => ({
        n: sn.seasonNumber,
        eps: sn.numberOfEpisodes,
        url: sn.url
      }));
    } else {
      const seen = new Set();
      [...document.querySelectorAll('a[href*="saison"]')].forEach(a => {
        const h = a.getAttribute('href');
        if (!h || seen.has(h)) return;
        seen.add(h);
        const m = h.match(/saison-(\d+)/);
        if (m) seasons.push({ n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h });
      });
    }
    return { slug: s, title, seasons: seasons.sort((a, b) => a.n - b.n) };
  }, slug);
}

async function getEpisodeList(page, seasonUrl) {
  await page.goto(seasonUrl, { timeout: 25000, waitUntil: 'domcontentloaded' });
  await sleep(1500);

  return await page.evaluate(() => {
    const seen = new Set();
    return [...document.querySelectorAll('a[href*="episode"]')]
      .map(a => {
        const h = a.getAttribute('href');
        if (!h || seen.has(h)) return null;
        seen.add(h);
        const m = h.match(/episode-(\d+)/);
        if (!m) return null;
        return { n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h };
      })
      .filter(Boolean)
      .sort((a, b) => a.n - b.n);
  });
}

async function run() {
  console.log(`Concurrency: ${CONCURRENCY}`);
  let p = load();

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  try {
    // === PHASE 1: CATALOGUE ===
    if (p.slugs.length === 0) {
      console.log('\n=== PHASE 1: CATALOGUE ===');
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
        if (i % 10 === 0) { p.slugs = [...slugs].sort(); save(p); }
      }
      p.slugs = [...slugs].sort();
      await page.close();
      save(p);
      console.log(`\nCatalogue: ${p.slugs.length} anime`);
    } else {
      console.log(`Loaded ${p.slugs.length} slugs from cache`);
    }

    // === PHASE 2: ANIME INFO + EPISODE LISTS ===
    const todoInfo = p.slugs.filter(s => !p.info.find(i => i.slug === s));
    console.log(`\n=== PHASE 2: INFO (${todoInfo.length} remaining) ===`);

    for (let idx = 0; idx < todoInfo.length; idx++) {
      const slug = todoInfo[idx];
      process.stdout.write(`\r[${idx+1}/${todoInfo.length}] ${slug.substring(0,40)}`);

      const page = await browser.newPage();
      try {
        const info = await processAnimeInfo(page, slug);

        // Get episode list for season 1
        if (info.seasons.length > 0) {
          info.seasons[0].episodes = await getEpisodeList(page, info.seasons[0].url);
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

    const okCount = p.info.filter(i => !i.error).length;
    console.log(`\nPhase 2 done: ${okCount}/${p.slugs.length} OK`);
    const withEps = p.info.filter(i => i.seasons?.length > 0 && i.seasons[0]?.episodes?.length > 0).length;
    console.log(`With episodes list: ${withEps}`);

    // === PHASE 3: EPISODE SOURCES (Sibnet) ===
    console.log('\n=== PHASE 3: EPISODE SOURCES ===');

    // Normalize: ensure all entries have 'episodes' (not 'eps')
    for (const info of p.info) {
      if (info.seasons) {
        for (const s of info.seasons) {
          if (s.eps && !s.episodes) {
            s.episodes = s.eps;
            delete s.eps;
          }
        }
      }
    }
    save(p);

    const animeWithEps = p.info.filter(anime =>
      anime.seasons?.length > 0 && anime.seasons[0]?.episodes?.length > 0 &&
      !anime.seasons[0].episodes[0]?.sources
    );
    console.log(`Need source scraping: ${animeWithEps.length} anime`);

    for (let aIdx = 0; aIdx < animeWithEps.length; aIdx++) {
      const anime = animeWithEps[aIdx];
      const firstSeason = anime.seasons[0];
      if (!firstSeason.episodes || firstSeason.episodes.length === 0) continue;

      console.log(`\n[${aIdx+1}/${animeWithEps.length}] ${anime.title} (${firstSeason.episodes.length} eps)`);

      // Process episodes in concurrent batches
      for (let e = 0; e < firstSeason.episodes.length; e += CONCURRENCY) {
        const batch = firstSeason.episodes.slice(e, e + CONCURRENCY);
        process.stdout.write(`  Eps ${batch[0].n}-${batch[batch.length-1].n}...`);

        const results = await Promise.all(batch.map(async (ep) => {
          const p = await browser.newPage();
          try { return { n: ep.n, sources: await getEpisodeSources(p, ep.url) }; }
          catch (err) { return { n: ep.n, sources: { error: err.message.substring(0, 60) } }; }
          finally { await p.close(); }
        }));

        for (const r of results) {
          const ep = firstSeason.episodes.find(e => e.n === r.n);
          if (ep) ep.sources = r.sources;
        }

        process.stdout.write('OK\n');
      }

      // Convert to bridge format and save
      const output = {
        slug: anime.slug.replace(/^\//, ''),
        title: anime.title,
        episodes: []
      };

      for (const ep of firstSeason.episodes) {
        if (ep.sources && !ep.sources.error) {
          for (const [lang, url] of Object.entries(ep.sources)) {
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

      const fn = anime.slug.replace(/[\\/]/g, '_').replace(/^_/, '') + '.json';
      fs.writeFileSync(path.join(DATA, fn), JSON.stringify(output, null, 2));

      // Update progress
      const progEntry = p.info.find(i => i.slug === anime.slug);
      if (progEntry && progEntry.seasons?.[0]) {
        progEntry.seasons[0]._sourcesDone = true;
        save(p);
      }
    }

    console.log(`\n=== DONE ===`);
    console.log(`Data in: ${DATA}`);

    // Summary
    const totalEps = p.info.reduce((s, i) => s + (i.seasons?.[0]?.episodes?.length || 0), 0);
    const totalWithSrc = p.info.reduce((s, i) => {
      const eps = i.seasons?.[0]?.episodes || [];
      return s + eps.filter(e => e.sources && !e.sources.error).length;
    }, 0);
    console.log(`Total anime: ${p.slugs.length}, Total episodes: ${totalEps}, With sources: ${totalWithSrc}`);

  } finally {
    await browser.close();
  }
}

run().catch(e => { console.error('FATAL:', e.message, e.stack); process.exit(1); });
