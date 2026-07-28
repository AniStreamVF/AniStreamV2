const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

const BASE = 'https://voiranime.rip';
const DATA = path.join(__dirname, 'data');
const PROG = path.join(__dirname, 'progress.json');
const CONCURRENCY = Math.min(6, os.cpus().length);

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
    if (type === 'image' || type === 'font' || type === 'media') { route.abort(); return; }
    if (url.includes('sibnet') || url.includes('yandex') || url.includes('google-analytics') || url.includes('facebook')) { route.abort(); return; }
    if (url.endsWith('.woff') || url.endsWith('.woff2') || url.endsWith('.ttf') || url.endsWith('.svg')) { route.abort(); return; }
    route.continue();
  });
}

async function getEpisodeList(page, seasonUrl) {
  await page.goto(seasonUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
  await sleep(800);
  return await page.evaluate(() => {
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

async function getSources(page, episodeUrl) {
  try {
    await page.goto(episodeUrl, { timeout: 15000, waitUntil: 'domcontentloaded' });
    await sleep(800);
    const sources = {};
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
    // Find anime with multiple seasons where episode lists aren't fetched yet
    const needsEpList = p.info.filter(a => 
      a.seasons?.length > 1 && a.seasons.some((s, i) => i > 0 && !s.episodes && !s._episodesFetched)
    );
    console.log(`Anime needing season episode lists: ${needsEpList.length}`);

    // Phase 2b: Fetch episode lists for remaining seasons
    if (needsEpList.length > 0) {
      console.log('\n=== PHASE 2b: EPISODE LISTS FOR REMAINING SEASONS ===');
      for (let idx = 0; idx < needsEpList.length; idx++) {
        const anime = needsEpList[idx];
        console.log(`\n[${idx+1}/${needsEpList.length}] ${anime.title} (${anime.seasons.length} seasons)`);

        for (let si = 1; si < anime.seasons.length; si++) {
          const season = anime.seasons[si];
          if (season.episodes || season._episodesFetched) continue;
          
          process.stdout.write(`  Season ${season.n}...`);
          const page = await browser.newPage();
          await blockResources(page);
          try {
            season.episodes = await getEpisodeList(page, season.url);
            season._episodesFetched = true;
            process.stdout.write(`${season.episodes?.length || 0} eps\n`);
          } catch (e) {
            season._episodesFetched = true;
            season.episodes = [];
            process.stdout.write(`ERROR ${e.message.substring(0, 40)}\n`);
          }
          await page.close();
        }
        if (idx % 10 === 0) save(p);
      }
      save(p);
    }

    // Phase 3b: Get sources for all missing seasons
    const needsSources = p.info.filter(a =>
      a.seasons?.length > 0 && a.seasons.some((s, i) => (i > 0 || !a.seasons[0]._sourcesDone) && s.episodes?.length > 0 && !s._sourcesDone)
    );
    
    // Re-process season 0 if not done, plus all other seasons
    const allMissingSeasons = [];
    for (const anime of p.info) {
      if (!anime.seasons) continue;
      for (let si = 0; si < anime.seasons.length; si++) {
        const s = anime.seasons[si];
        if (s.episodes?.length > 0 && !s._sourcesDone) {
          allMissingSeasons.push({ anime, seasonIdx: si, season: s });
        }
      }
    }
    
    console.log(`\n=== PHASE 3b: SOURCES FOR ALL REMAINING SEASONS ===`);
    console.log(`${allMissingSeasons.length} seasons to process`);

    let totalEpsToProcess = 0;
    for (const { season } of allMissingSeasons) {
      totalEpsToProcess += season.episodes.length;
    }
    console.log(`${totalEpsToProcess} total episodes`);
    const estMin = Math.round(totalEpsToProcess * 1.8 / CONCURRENCY / 60);
    console.log(`Est. time: ~${estMin} min`);

    for (let sIdx = 0; sIdx < allMissingSeasons.length; sIdx++) {
      const { anime, seasonIdx, season } = allMissingSeasons[sIdx];
      console.log(`\n[${sIdx+1}/${allMissingSeasons.length}] ${anime.title} - Season ${season.n} (${season.episodes.length} eps)`);

      const pages = [];
      try {
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
            if (i < pages.length) return getSources(pages[i], ep.url);
            return {};
          }));

          for (let i = 0; i < batchEps.length; i++) {
            batchEps[i].sources = results[i] || { error: 'no result' };
          }

          epIdx += batchSize;
          process.stdout.write('OK\n');
        }
      } finally {
        for (const p of pages) await p.close();
      }

      season._sourcesDone = true;
      save(p);

      // Generate/output JSON for this anime
      const output = {
        slug: anime.slug.replace(/^\//, ''),
        title: anime.title,
        episodes: []
      };
      for (const s of anime.seasons) {
        if (s.episodes) {
          for (const ep of s.episodes) {
            if (ep.sources && typeof ep.sources === 'object' && !ep.sources.error) {
              for (const [lang, url] of Object.entries(ep.sources)) {
                if (url && url.startsWith('http')) {
                  output.episodes.push({
                    number: ep.n,
                    title: `Episode ${ep.n}`,
                    embedUrl: url,
                    season: s.n,
                    lang,
                    sources: []
                  });
                }
              }
            }
          }
        }
      }
      const fn = anime.slug.replace(/[\\/]/g, '_').replace(/^_/, '') + '.json';
      fs.writeFileSync(path.join(DATA, fn), JSON.stringify(output, null, 2));
    }

    // Final consolidation
    console.log('\n=== FINAL ===');

  } finally {
    await browser.close();
  }
}

run().catch(e => { console.error('FATAL:', e.message); process.exit(1); });
