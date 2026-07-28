const fs = require('fs');
const path = require('path');

const DATA = path.join(__dirname, 'data');
const PROG = path.join(__dirname, 'progress.json');
const OUTPUT = path.join(__dirname, 'animes-consolidated.json');

console.log('Consolidating scraped data...');

const p = JSON.parse(fs.readFileSync(PROG, 'utf-8'));
const results = [];

// Read individual JSON files first (they have the final format with sources)
const files = fs.readdirSync(DATA).filter(f => f.endsWith('.json'));
for (const f of files) {
  try {
    const data = JSON.parse(fs.readFileSync(path.join(DATA, f), 'utf-8'));
    results.push(data);
  } catch (e) {
    console.error(`Error reading ${f}: ${e.message}`);
  }
}

// Merge with progress info for anime that have info but no sources yet
for (const info of p.info) {
  if (info.error) continue;
  const slug = info.slug.replace(/^\//, '');
  const existing = results.find(r => r.slug === slug);
  if (existing) continue;

  // Build basic structure from progress (no sources yet)
  const entry = {
    slug: slug,
    title: info.title,
    episodes: []
  };

  if (info.seasons) {
    for (const season of info.seasons) {
      if (season.episodes) {
        for (const ep of season.episodes) {
          entry.episodes.push({
            number: ep.n,
            title: `Episode ${ep.n}`,
            embedUrl: '',
            season: season.n,
            lang: 'vf',
            sources: []
          });
        }
      }
    }
  }

  results.push(entry);
}

// Sort by slug
results.sort((a, b) => a.slug.localeCompare(b.slug));

fs.writeFileSync(OUTPUT, JSON.stringify(results, null, 2));

const totalEps = results.reduce((s, r) => s + (r.episodes?.length || 0), 0);
const withEmbed = results.filter(r => r.episodes?.some(e => e.embedUrl));
console.log(`\nConsolidated: ${results.length} anime, ${totalEps} episodes`);
console.log(`Anime with embed URLs: ${withEmbed.length}`);
console.log(`Output: ${OUTPUT}`);
