const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://voiranime.rip';
const OUTPUT_DIR = path.join(__dirname, 'data');
const PROGRESS_FILE = path.join(__dirname, 'progress.json');

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')); } catch { return { catalogueDone: false, animeSlugs: [], scrapedSlugs: [], startTime: Date.now() }; }
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Non-anime paths to exclude
const EXCLUDE = new Set(['/planning', '/aide', '/profil', '/catalogue', '/anime', '/search', '/login', '/register', '/', '']);

function isAnimeSlug(slug) {
  if (!slug || typeof slug !== 'string') return false;
  const s = slug.replace(/\/$/, '');
  if (EXCLUDE.has(s.toLowerCase())) return false;
  if (s.includes('/')) return true; // already has path
  if (/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(s) || /^[a-z0-9]$/.test(s)) return true;
  return false;
}

// Phase 1: Get all anime slugs from catalogue
async function scrapeCatalogue() {
  console.log('[Phase 1] Scraping catalogue...');
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  const slugs = new Set();
  const totalPages = 71;
  
  for (let p = 1; p <= totalPages; p++) {
    console.log(`  Page ${p}/${totalPages}...`);
    try {
      await page.goto(`${BASE}/catalogue/?page=${p}`, { timeout: 30000, waitUntil: 'networkidle' });
      await sleep(1500);
      
      const pageSlugs = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a[href]')];
        const hrefs = links.map(a => a.getAttribute('href')).filter(h => h && !h.startsWith('#') && !h.startsWith('javascript') && !h.startsWith('http'));
        return [...new Set(hrefs)];
      });
      
      for (const s of pageSlugs) {
        const clean = s.replace(/\/$/, '');
        if (clean && !EXCLUDE.has(clean.toLowerCase()) && /^\/[a-z0-9][a-z0-9-]/.test(clean)) {
          slugs.add(clean);
        }
      }
    } catch (e) {
      console.error(`  Error on page ${p}: ${e.message}`);
    }
    
    if (p % 5 === 0) {
      saveProgress({ catalogueDone: false, animeSlugs: [...slugs], scrapedSlugs: [], startTime: Date.now() });
      console.log(`  Interim: ${slugs.size} unique slugs`);
    }
  }
  
  await browser.close();
  
  const result = [...slugs].sort();
  saveProgress({ catalogueDone: true, animeSlugs: result, scrapedSlugs: [], startTime: Date.now() });
  console.log(`[Phase 1] Done! Total unique anime: ${result.length}`);
  return result;
}

// Phase 2: Scrape anime info + season + episode sources in one go
async function scrapeAnime(browser, slug) {
  console.log(`\n=== Scraping: ${slug} ===`);
  const animeResult = {
    slug,
    title: slug.split('/').pop().replace(/-/g, ' '),
    url: `${BASE}${slug}/`,
    seasons: []
  };

  const page = await browser.newPage();
  try {
    // Load anime page to get seasons structure
    await page.goto(animeResult.url, { timeout: 30000, waitUntil: 'networkidle' });
    await sleep(1500);

    const meta = await page.evaluate(() => {
      const h1 = document.querySelector('h1')?.innerText?.trim() || '';
      const structured = [...document.querySelectorAll('script[type="application/ld+json"]')].map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean);
      const tvSeries = structured.find(s => s['@type'] === 'TVSeries');
      const seasons = tvSeries?.containsSeason?.map(s => ({ seasonNumber: s.seasonNumber, episodeCount: s.numberOfEpisodes, url: s.url })) || [];
      return { title: h1, seasons };
    });
    
    animeResult.title = meta.title || animeResult.title;
    
    // If no structured data, extract season links from page
    if (meta.seasons.length === 0) {
      const seasonLinks = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a[href*="saison"]')];
        const seen = new Set();
        return links.map(a => {
          const href = a.getAttribute('href');
          if (!href || seen.has(href)) return null;
          seen.add(href);
          const m = href.match(/saison-(\d+)/);
          if (!m) return null;
          const fullUrl = href.startsWith('http') ? href : 'https://voiranime.rip' + href;
          return { seasonNumber: parseInt(m[1]), url: fullUrl };
        }).filter(Boolean);
      });
      meta.seasons = seasonLinks.sort((a, b) => a.seasonNumber - b.seasonNumber);
    }
    
    console.log(`  Title: "${animeResult.title}", Seasons: ${meta.seasons.length}`);

    // Process each season
    for (const season of meta.seasons.slice(0, 3)) { // limit to 3 seasons for now
      console.log(`  Season ${season.seasonNumber}...`);
      
      // Get episode list from season page
      await page.goto(season.url, { timeout: 30000, waitUntil: 'networkidle' });
      await sleep(1500);
      
      const episodes = await page.evaluate(() => {
        const links = [...document.querySelectorAll('a[href*="episode"]')];
        const seen = new Set();
        return links.map(a => {
          const href = a.getAttribute('href');
          if (!href || seen.has(href)) return null;
          seen.add(href);
          const m = href.match(/episode-(\d+)/);
          if (!m) return null;
          const fullUrl = href.startsWith('http') ? href : 'https://voiranime.rip' + href;
          return { number: parseInt(m[1]), url: fullUrl };
        }).filter(Boolean).sort((a, b) => a.number - b.number);
      });
      
      console.log(`    Episodes: ${episodes.length}`);
      
      const seasonResult = {
        seasonNumber: season.seasonNumber,
        episodes: []
      };
      
      // Process first few episodes to get sources
      for (const ep of episodes.slice(0, 3)) {
        await page.goto(ep.url, { timeout: 30000, waitUntil: 'networkidle' });
        await sleep(2000);
        
        const sources = await page.evaluate(async () => {
          const result = {};
          
          // Get current iframe
          const getIframeSrc = () => {
            const iframe = document.querySelector('iframe[src*="sibnet"], iframe[data-src*="sibnet"], iframe[src*="video"]');
            return iframe?.getAttribute('src') || iframe?.getAttribute('data-src') || '';
          };
          
          // Get active lang
          const activeLang = document.querySelector('.lang-btn.lang-switch.active')?.innerText?.trim() || 'VF';
          const src = getIframeSrc();
          if (src) result[activeLang] = src;
          
          // Try other langs
          const btns = [...document.querySelectorAll('.lang-btn.lang-switch')];
          for (const btn of btns) {
            const lang = btn.innerText.trim();
            if (result[lang]) continue;
            btn.click();
            await new Promise(r => setTimeout(r, 2000));
            const newSrc = getIframeSrc();
            if (newSrc && newSrc !== src) result[lang] = newSrc;
          }
          
          return result;
        });
        
        seasonResult.episodes.push({
          number: ep.number,
          url: ep.url,
          sources: Object.entries(sources).map(([lang, embedUrl]) => ({
            language: lang,
            embedUrl
          }))
        });
        
        console.log(`      Ep ${ep.number}: ${Object.keys(sources).join(' + ') || 'no sources'}`);
        await sleep(500);
      }
      
      animeResult.seasons.push(seasonResult);
    }
    
  } catch (e) {
    console.error(`  Error scraping ${slug}: ${e.message}`);
    animeResult.error = e.message;
  } finally {
    await page.close();
  }
  
  return animeResult;
}

async function main() {
  let progress = loadProgress();
  
  // Phase 1: Get all slugs from catalogue
  let allSlugs = progress.animeSlugs;
  if (!progress.catalogueDone || allSlugs.length === 0) {
    allSlugs = await scrapeCatalogue();
  } else {
    console.log(`Loaded ${allSlugs.length} slugs from progress.`);
  }
  
  // Filter out slugs that don't look like anime
  allSlugs = allSlugs.filter(s => {
    const name = s.replace(/^\//, '').replace(/\/$/, '');
    return name && !EXCLUDE.has('/' + name) && !name.includes('saison') && !name.includes('episode') && !name.match(/^[0-9]+$/);
  });
  
  console.log(`\nFiltered anime slugs: ${allSlugs.length}`);
  
  // Resume from progress
  const remaining = allSlugs.filter(s => !progress.scrapedSlugs.includes(s));
  console.log(`Already scraped: ${progress.scrapedSlugs.length}, Remaining: ${remaining.length}`);
  
  if (remaining.length === 0) {
    console.log('All anime already scraped!');
    return;
  }
  
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'] });
  
  try {
    // Process in small batches
    const batch = remaining.slice(0, 5);
    for (const slug of batch) {
      const result = await scrapeAnime(browser, slug);
      
      // Save individual result
      const filename = slug.replace(/[\/\\]/g, '_').replace(/^_/, '') + '.json';
      fs.writeFileSync(path.join(OUTPUT_DIR, filename), JSON.stringify(result, null, 2));
      
      // Update progress
      progress.scrapedSlugs.push(slug);
      saveProgress(progress);
      
      console.log(`  Saved: ${filename}`);
      await sleep(1000);
    }
    
    console.log(`\nBatch complete. Total scraped: ${progress.scrapedSlugs.length}/${allSlugs.length}`);
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);