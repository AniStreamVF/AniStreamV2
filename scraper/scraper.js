const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'https://voiranime.rip';
const MAX_CONCURRENCY = 3;
const DELAY_BETWEEN_REQUESTS = 500;
const OUTPUT_DIR = path.join(__dirname, 'data');
const PROGRESS_FILE = path.join(__dirname, 'progress.json');
const RESULTS_FILE = path.join(__dirname, 'results.json');

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

function loadProgress() {
  try { return JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8')); } catch { return { catalogueDone: false, animeSlugs: [], scrapedSlugs: [], startTime: Date.now() }; }
}
function saveProgress(p) { fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p, null, 2)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Phase 1: Get all anime slugs from catalogue
async function scrapeCatalogue(page, progress) {
  console.log('[Phase 1] Scraping catalogue...');
  const slugs = [];
  let currentPage = 1;
  const totalPages = 71; // From earlier: "Page 1 / 71"
  
  for (let p = currentPage; p <= totalPages; p++) {
    console.log(`  Catalogue page ${p}/${totalPages}...`);
    await page.goto(`${BASE}/catalogue/?page=${p}`, { timeout: 30000, waitUntil: 'networkidle' });
    await sleep(1000);
    
    const pageSlugs = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href]')];
      const animeLinks = links.filter(a => {
        const h = a.getAttribute('href');
        return h && /^\/[a-z0-9][a-z0-9-]+\/$/.test(h) && !h.startsWith('/catalogue') && !h.startsWith('/anime') && !h.includes('saison') && !h.includes('episode');
      });
      return [...new Set(animeLinks.map(a => a.getAttribute('href').replace(/\/$/, '')))];
    });
    
    console.log(`    Found ${pageSlugs.length} slugs`);
    slugs.push(...pageSlugs);
    
    // Save progress periodically
    if (p % 10 === 0) {
      progress.animeSlugs = [...new Set(slugs)];
      progress.catalogueDone = false;
      saveProgress(progress);
    }
    
    await sleep(DELAY_BETWEEN_REQUESTS);
  }
  
  progress.animeSlugs = [...new Set(slugs)];
  progress.catalogueDone = true;
  saveProgress(progress);
  console.log(`[Phase 1] Done! Total unique anime: ${progress.animeSlugs.length}`);
  return progress.animeSlugs;
}

// Phase 2: For each anime, get anime info + seasons
async function scrapeAnimeInfo(browser, slug, progress) {
  const page = await browser.newPage();
  try {
    await page.goto(`${BASE}${slug}/`, { timeout: 30000, waitUntil: 'networkidle' });
    await sleep(500);
    
    const data = await page.evaluate((slug) => {
      // Get structured data
      const scripts = [...document.querySelectorAll('script[type="application/ld+json"]')];
      const structured = scripts.map(s => { try { return JSON.parse(s.textContent); } catch { return null; } }).filter(Boolean);
      
      const h1 = document.querySelector('h1')?.innerText?.trim() || slug.replace(/-/g, ' ');
      
      // Get seasons from structured data or from page links
      let seasons = [];
      const tvSeries = structured.find(s => s['@type'] === 'TVSeries');
      if (tvSeries && tvSeries.containsSeason) {
        seasons = tvSeries.containsSeason.map(s => ({
          seasonNumber: s.seasonNumber,
          episodeCount: s.numberOfEpisodes,
          url: s.url
        }));
      }
      
      // Fallback: get from links
      if (seasons.length === 0) {
        const seasonLinks = [...document.querySelectorAll('a[href*="saison"]')];
        const seen = new Set();
        seasons = seasonLinks.map(a => {
          const href = a.getAttribute('href');
          if (!href || seen.has(href)) return null;
          seen.add(href);
          const m = href.match(/saison-(\d+)/);
          if (!m) return null;
          return { seasonNumber: parseInt(m[1]), url: href.startsWith('http') ? href : 'https://voiranime.rip' + href };
        }).filter(Boolean);
      }
      
      return { slug, title: h1, seasons, hasEpisodeContent: document.querySelector('[class*="episode"], [class*="player"], [class*="video"]') !== null };
    }, slug);
    
    return data;
  } catch (e) {
    console.error(`  Error scraping ${slug}: ${e.message}`);
    return { slug, title: slug.replace(/-/g, ' '), seasons: [], error: e.message };
  } finally {
    await page.close();
  }
}

// Phase 3: For each season, get episode list
async function scrapeSeasonEpisodes(browser, animeUrl, season) {
  const page = await browser.newPage();
  try {
    await page.goto(season.url, { timeout: 30000, waitUntil: 'networkidle' });
    await sleep(500);
    
    const episodes = await page.evaluate(() => {
      const links = [...document.querySelectorAll('a[href*="episode"]')];
      const seen = new Set();
      return links.map(a => {
        const href = a.getAttribute('href');
        if (!href || seen.has(href)) return null;
        seen.add(href);
        const epMatch = href.match(/episode-(\d+)/);
        if (!epMatch) return null;
        return { number: parseInt(epMatch[1]), url: href.startsWith('http') ? href : 'https://voiranime.rip' + href };
      }).filter(Boolean);
    });
    
    return episodes;
  } catch (e) {
    console.error(`  Error scraping season ${season.seasonNumber}: ${e.message}`);
    return [];
  } finally {
    await page.close();
  }
}

// Phase 4: Extract video sources from episode page (VF + VOSTFR)
async function scrapeEpisodeSources(browser, episodeUrl) {
  const page = await browser.newPage();
  try {
    await page.goto(episodeUrl, { timeout: 30000, waitUntil: 'networkidle' });
    await sleep(1000);
    
    const sources = await page.evaluate(async () => {
      const result = {};
      
      // Get current iframe source
      const iframe = document.querySelector('iframe[src*="sibnet"], iframe[data-src*="sibnet"]');
      if (iframe) {
        const currentLang = document.querySelector('.lang-btn.lang-switch.active')?.innerText?.trim() || 'VF';
        result[currentLang] = iframe.getAttribute('src') || iframe.getAttribute('data-src') || '';
      }
      
      // Try clicking other language buttons
      const langBtns = [...document.querySelectorAll('.lang-btn.lang-switch')];
      for (const btn of langBtns) {
        const lang = btn.innerText.trim();
        if (result[lang]) continue;
        
        // Click and wait for iframe update
        btn.click();
        await new Promise(r => setTimeout(r, 1500));
        
        const newIframe = document.querySelector('iframe[src*="sibnet"], iframe[data-src*="sibnet"], iframe[src]');
        if (newIframe) {
          const src = newIframe.getAttribute('src') || newIframe.getAttribute('data-src') || '';
          if (src && src.includes('sibnet')) {
            result[lang] = src;
          }
        }
      }
      
      return result;
    });
    
    return sources;
  } catch (e) {
    console.error(`  Error scraping episode sources: ${e.message}`);
    return {};
  } finally {
    await page.close();
  }
}

async function main() {
  console.log('=== Voiranime Mega Scraper ===');
  let progress = loadProgress();
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  
  try {
    // Phase 1: Catalogue
    if (!progress.catalogueDone || progress.animeSlugs.length === 0) {
      const p = await browser.newPage();
      await scrapeCatalogue(p, progress);
      await p.close();
    }
    
    console.log(`\nTotal anime to process: ${progress.animeSlugs.length}`);
    
    // Phase 2-4: Process anime in batches
    const toScrape = progress.animeSlugs.filter(s => !progress.scrapedSlugs.includes(s));
    console.log(`Remaining to scrape: ${toScrape.length}`);
    
    // Process first few to test
    const batch = toScrape.slice(0, 3);
    const allResults = [];
    
    for (const slug of batch) {
      console.log(`\n[${progress.scrapedSlugs.length + 1}/${progress.animeSlugs.length}] Processing: ${slug}`);
      
      // Phase 2: Anime info
      const anime = await scrapeAnimeInfo(browser, slug, progress);
      if (!anime || anime.error) {
        progress.scrapedSlugs.push(slug);
        saveProgress(progress);
        continue;
      }
      
      console.log(`  Title: ${anime.title}, Seasons: ${anime.seasons.length}`);
      
      // Phase 3-4: For each season, get episodes and sources
      const seasonResults = [];
      for (const season of anime.seasons.slice(0, 2)) { // Limit to 2 seasons for testing
        console.log(`  Season ${season.seasonNumber}...`);
        const episodes = await scrapeSeasonEpisodes(browser, slug, season);
        console.log(`    Episodes: ${episodes.length}`);
        
        const episodeResults = [];
        for (const ep of episodes.slice(0, 3)) { // Limit to 3 episodes for testing
          console.log(`    Episode ${ep.number}...`);
          const sources = await scrapeEpisodeSources(browser, ep.url);
          episodeResults.push({
            number: ep.number,
            sources: Object.entries(sources).map(([lang, url]) => ({
              language: lang,
              embedUrl: url
            }))
          });
          
          await sleep(300);
        }
        
        seasonResults.push({
          seasonNumber: season.seasonNumber,
          episodes: episodeResults
        });
      }
      
      const result = {
        slug: anime.slug,
        title: anime.title,
        seasons: seasonResults
      };
      
      allResults.push(result);
      
      // Save individual file
      fs.writeFileSync(path.join(OUTPUT_DIR, `${slug.replace(/\//g, '_')}.json`), JSON.stringify(result, null, 2));
      
      // Save progress
      progress.scrapedSlugs.push(slug);
      saveProgress(progress);
      
      await sleep(DELAY_BETWEEN_REQUESTS);
    }
    
    console.log(`\nDone processing batch. Results:`, JSON.stringify(allResults, null, 2));
    
  } finally {
    await browser.close();
  }
}

main().catch(console.error);