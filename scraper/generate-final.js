const fs = require('fs');
const path = require('path');
const PROG = path.join(__dirname, 'progress.json');
const OUTPUT = path.join(__dirname, 'animes-consolidated.json');

console.log('Generating final consolidated JSON from progress...');

const p = JSON.parse(fs.readFileSync(PROG, 'utf-8'));
const excludeSlugs = new Set(['/film', '/dmca', '/privacy', '/contact', '/aide', '/profil', '/catalogue', '/anime', '/search', '/login', '/register', '/']);

const out = [];

for (const anime of p.info) {
  if (excludeSlugs.has(anime.slug)) continue;
  if (anime.error) continue;
  
  const slug = anime.slug.replace(/^\//, '');
  const entry = { slug, title: anime.title, episodes: [] };
  
  if (!anime.seasons) {
    out.push(entry);
    continue;
  }
  
  for (const season of anime.seasons) {
    if (!season.episodes) continue;
    for (const ep of season.episodes) {
      if (ep.sources && typeof ep.sources === 'object' && !ep.sources.error && !ep.sources.error) {
        for (const [lang, url] of Object.entries(ep.sources)) {
          if (lang !== 'error' && url && typeof url === 'string' && url.startsWith('http')) {
            entry.episodes.push({
              number: ep.n,
              title: `Episode ${ep.n}`,
              embedUrl: url,
              season: season.n,
              lang,
              sources: []
            });
          }
        }
      }
    }
  }
  
  out.push(entry);
}

// Sort by slug
out.sort((a, b) => a.slug.localeCompare(b.slug));

fs.writeFileSync(OUTPUT, JSON.stringify(out, null, 2));

const totalEps = out.reduce((s, a) => s + a.episodes.length, 0);
const withEps = out.filter(a => a.episodes.length > 0).length;
const withBoth = out.filter(a => {
  const langs = new Set(a.episodes.map(e => e.lang));
  return langs.has('vf') && langs.has('vostfr');
}).length;

console.log(`Anime: ${out.length}`);
console.log(`Avec épisodes: ${withEps}`);
console.log(`Avec VF+VOSTFR: ${withBoth}`);
console.log(`Épisodes totaux: ${totalEps}`);
console.log(`Fichier: ${OUTPUT}`);
console.log(`Taille: ${(fs.statSync(OUTPUT).size / 1024 / 1024).toFixed(1)} MB`);
