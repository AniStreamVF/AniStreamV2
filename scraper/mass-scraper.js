const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://voiranime.rip';
const OUTPUT = path.join(__dirname, 'data');
const PROGRESS = path.join(__dirname, 'progress.json');

if (!fs.existsSync(OUTPUT)) fs.mkdirSync(OUTPUT, { recursive: true });

function loadP() { try { return JSON.parse(fs.readFileSync(PROGRESS,'utf-8')); } catch { return { slugs:[], info:[], sources:[] }; } }
function saveP(p) { fs.writeFileSync(PROGRESS, JSON.stringify(p,null,2)); }
const sleep = ms => new Promise(r => setTimeout(r, ms));

const EXCLUDE = new Set(['/planning','/aide','/profil','/catalogue','/anime','/search','/login','/register','/']);

async function getCatalogue(browser) {
  const page = await browser.newPage();
  const slugs = new Set();
  for (let p = 1; p <= 71; p++) {
    console.log(`Catalogue page ${p}/71...`);
    await page.goto(`${BASE}/catalogue/?page=${p}`, { timeout: 30000, waitUntil: 'networkidle' });
    await sleep(1500);
    const links = await page.evaluate(() => [...document.querySelectorAll('a[href]')].map(a => a.getAttribute('href')).filter(Boolean));
    for (const l of links) {
      const c = l.replace(/\/$/,'');
      if (c && !EXCLUDE.has(c.toLowerCase()) && /^\/[a-z0-9]/.test(c) && !c.includes('saison') && !c.includes('episode')) slugs.add(c);
    }
    if (p % 5 === 0) console.log(`  -> ${slugs.size} unique so far`);
  }
  await page.close();
  const arr = [...slugs].sort();
  console.log(`Catalogue: ${arr.length} anime`);
  return arr;
}

async function getAnimeInfo(browser, slug) {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}${slug}/`, { timeout: 30000, waitUntil: 'networkidle' });
    await sleep(2000);
    return await page.evaluate((s) => {
      const title = document.querySelector('h1')?.innerText?.trim() || s.split('/').pop().replace(/-/g,' ');
      const structured = [...document.querySelectorAll('script[type="application/ld+json"]')].map(x => { try { return JSON.parse(x.textContent); } catch { return null; } }).filter(Boolean);
      const series = structured.find(x => x['@type'] === 'TVSeries');
      let seasons = [];
      if (series?.containsSeason) {
        seasons = series.containsSeason.map(sn => ({ n: sn.seasonNumber, eps: sn.numberOfEpisodes, url: sn.url }));
      } else {
        const seen = new Set();
        [...document.querySelectorAll('a[href*="saison"]')].forEach(a => {
          const h = a.getAttribute('href'); if (!h || seen.has(h)) return; seen.add(h);
          const m = h.match(/saison-(\d+)/); if (m) seasons.push({ n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h });
        });
      }
      return { slug: s, title, seasons: seasons.sort((a,b) => a.n - b.n) };
    }, slug);
  } catch(e) { return { slug, title: slug.split('/').pop().replace(/-/g,' '), seasons: [], error: e.message }; }
  finally { await page.close(); }
}

async function getSeasonEps(browser, url) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { timeout: 30000, waitUntil: 'networkidle' });
    await sleep(1500);
    return await page.evaluate(() => {
      const seen = new Set();
      return [...document.querySelectorAll('a[href*="episode"]')].map(a => {
        const h = a.getAttribute('href'); if (!h || seen.has(h)) return null; seen.add(h);
        const m = h.match(/episode-(\d+)/); if (!m) return null;
        return { n: parseInt(m[1]), url: h.startsWith('http') ? h : 'https://voiranime.rip' + h };
      }).filter(Boolean).sort((a,b) => a.n - b.n);
    });
  } catch { return []; }
  finally { await page.close(); }
}

async function getEpSources(browser, url) {
  const page = await browser.newPage();
  try {
    await page.goto(url, { timeout: 30000, waitUntil: 'networkidle' });
    await sleep(2000);
    const sources = await page.evaluate(async () => {
      const r = {};
      const getIframe = () => { const f = document.querySelector('iframe[src*="sibnet"], iframe[data-src*="sibnet"]'); return f?.getAttribute('src') || f?.getAttribute('data-src') || ''; };
      const active = document.querySelector('.lang-btn.lang-switch.active')?.innerText?.trim() || 'VF';
      const src = getIframe(); if (src) r[active] = src;
      const btns = [...document.querySelectorAll('.lang-btn.lang-switch')];
      for (const b of btns) {
        const l = b.innerText.trim(); if (r[l]) continue;
        b.click(); await new Promise(ok => setTimeout(ok, 2000));
        const ns = getIframe(); if (ns && ns !== src) r[l] = ns;
      }
      return r;
    });
    return sources;
  } catch { return {}; }
  finally { await page.close(); }
}

async function main() {
  let p = loadP();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox','--disable-setuid-sandbox'] });

  // Step 1: Catalogue
  if (p.slugs.length === 0) {
    p.slugs = await getCatalogue(browser);
    saveP(p);
  } else console.log(`Loaded ${p.slugs.length} slugs`);

  // Step 2: Anime info + seasons
  const todo = p.slugs.filter(s => !p.info.find(i => i.slug === s));
  console.log(`\nAnime info remaining: ${todo.length}`);
  
  for (const slug of todo.slice(0, 5)) {
    const info = await getAnimeInfo(browser, slug);
    if (!info.error) {
      // Get episode lists for first 2 seasons
      for (const s of info.seasons.slice(0, 2)) {
        s.episodesList = await getSeasonEps(browser, s.url);
        // Get sources for first 3 episodes
        for (const e of (s.episodesList || []).slice(0, 3)) {
          e.sources = await getEpSources(browser, e.url);
          console.log(`  ${info.title} S${s.n}Ep${e.n}: ${Object.keys(e.sources).join('/')}`);
          await sleep(500);
        }
      }
    }
    p.info.push(info);
    saveP(p);
    // Save individual file
    const fn = slug.replace(/[\/\\]/g,'_').replace(/^_/,'') + '.json';
    fs.writeFileSync(path.join(OUTPUT, fn), JSON.stringify(info, null, 2));
    console.log(`Done: ${info.title} (${slug})`);
    await sleep(1000);
  }
  
  console.log(`\nProgress: ${p.info.length}/${p.slugs.length} anime scraped`);
  await browser.close();
}

main().catch(e => { console.error(e); process.exit(1); });