const fs = require('fs');
const SUPABASE_URL = 'https://fxqrmcinehnuwmkvogcl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cXJtY2luZWhudXdta3ZvZ2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTEzMzAsImV4cCI6MjEwMDA2NzMzMH0.JEnZl17WIpPL42fcMRnOx25HRu7zbaUkPilN9PSFhUM';

const DATA = JSON.parse(fs.readFileSync(__dirname + '/animes-consolidated.json', 'utf-8'));
const BATCH_SIZE = 100;

async function supabase(method, path, body = null) {
  const opts = {
    method,
    headers: {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates'
    }
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + path, opts);
  if (!r.ok) {
    const text = await r.text();
    throw new Error(method + ' ' + path + ' ' + r.status + ': ' + text.substring(0, 200));
  }
  return r;
}

(async () => {
  console.log('Preparing ' + DATA.length + ' anime for Supabase import...');

  // Format data to match existing schema with extra fields
  const formatted = DATA.map(anime => ({
    slug: anime.slug,
    title: anime.title || anime.slug,
    image: anime.image || '',
    synopsis: anime.synopsis || '',
    genres: anime.genres || null,
    year: anime.year || null,
    status: anime.status || null,
    studios: anime.studios || null,
    seasons: anime.seasons || null,
    source_slug: anime.source_slug || anime.slug,
    episodes: anime.episodes.map(ep => ({
      number: ep.number,
      title: ep.title || 'Episode ' + ep.number,
      embedUrl: ep.embedUrl,
      season: ep.season || 1,
      lang: ep.lang || 'vf',
      sources: ep.embedUrl ? [ep.embedUrl] : [],
      image: '',
      synopsis: '',
      videoUrl: ''
    }))
  })).filter(a => a.episodes.length > 0);

  console.log('Anime with episodes to import: ' + formatted.length);
  console.log('Total episode entries: ' + formatted.reduce((s, a) => s + a.episodes.length, 0));
  console.log('');

  // Import in batches
  let success = 0;
  let errors = 0;
  for (let i = 0; i < formatted.length; i += BATCH_SIZE) {
    const batch = formatted.slice(i, i + BATCH_SIZE);
    const end = Math.min(i + BATCH_SIZE, formatted.length);
    process.stdout.write('\rImporting ' + (i+1) + '-' + end + '/' + formatted.length + '...');

    try {
      await supabase('POST', 'animes?on_conflict=slug', batch);
      success += batch.length;
    } catch (e) {
      // Try one by one on batch failure
      for (const item of batch) {
        try {
          await supabase('POST', 'animes?on_conflict=slug', [item]);
          success++;
        } catch (e2) {
          console.log('\nError on ' + item.slug + ': ' + e2.message.substring(0, 80));
          errors++;
        }
      }
    }
  }

  console.log('\n\n=== IMPORT TERMINÉ ===');
  console.log('Importés: ' + success);
  console.log('Erreurs: ' + errors);

  // Verify
  const r = await supabase('GET', 'animes?select=slug');
  const all = await r.json();
  console.log('Total dans Supabase: ' + all.length);
})();
