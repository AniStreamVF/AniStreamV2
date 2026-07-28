import { createServer } from 'http';

const PORT = process.env.PORT || 4567;
const ANILIST_API = 'https://graphql.anilist.co';
const CACHE = new Map();
const CACHE_TTL = 5 * 60 * 1000;

const envURL = process.env.SUPABASE_URL;
const envKey = process.env.SUPABASE_KEY;
const SUPABASE_URL = (envURL && !envURL.includes('your_supabase')) ? envURL : 'https://fxqrmcinehnuwmkvogcl.supabase.co';
const SUPABASE_KEY = (envKey && !envKey.includes('your_supabase')) ? envKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4cXJtY2luZWhudXdta3ZvZ2NsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0OTEzMzAsImV4cCI6MjEwMDA2NzMzMH0.JEnZl17WIpPL42fcMRnOx25HRu7zbaUkPilN9PSFhUM';
console.log(`[Bridge] SUPABASE_URL=${SUPABASE_URL.slice(0,30)}...`);

const Q = {
  trending: `query($p:Int,$n:Int){Page(page:$p,perPage:$n){media(sort:TRENDING_DESC,type:ANIME){id idMal title{romaji english native userPreferred}coverImage{extraLarge large}bannerImage description genres averageScore popularity episodes duration status seasonYear season format studios{nodes{name}}}}}`,
  popular: `query($p:Int,$n:Int){Page(page:$p,perPage:$n){media(sort:POPULARITY_DESC,type:ANIME){id idMal title{romaji english native userPreferred}coverImage{extraLarge large}bannerImage description genres averageScore popularity episodes duration status seasonYear season format studios{nodes{name}}}}}`,
  seasonal: `query($p:Int,$n:Int,$s:MediaSeason,$y:Int){Page(page:$p,perPage:$n){media(season:$s,seasonYear:$y,type:ANIME,sort:POPULARITY_DESC){id idMal title{romaji english native userPreferred}coverImage{extraLarge large}bannerImage description genres averageScore popularity episodes duration status seasonYear season format studios{nodes{name}}}}}`,
  upcoming: `query($p:Int,$n:Int){Page(page:$p,perPage:$n){media(status:NOT_YET_RELEASED,type:ANIME,sort:POPULARITY_DESC){id idMal title{romaji english native userPreferred}coverImage{extraLarge large}bannerImage description genres averageScore popularity episodes duration status seasonYear season format studios{nodes{name}}}}}`,
  search: `query($p:Int,$n:Int,$q:String){Page(page:$p,perPage:$n){pageInfo{total currentPage lastPage hasNextPage}media(search:$q,type:ANIME){id idMal title{romaji english native userPreferred}coverImage{extraLarge large}bannerImage description genres averageScore popularity episodes duration status seasonYear season format studios{nodes{name}}}}}`,
  anime: `query($id:Int){Media(id:$id,type:ANIME){id idMal title{romaji english native userPreferred}coverImage{extraLarge large}bannerImage description genres averageScore popularity episodes duration status seasonYear season format studios{nodes{name}}startDate{year month day}endDate{year month day}trailer{id site thumbnail}recommendations(sort:RATING_DESC,perPage:10){nodes{mediaRecommendation{id idMal title{romaji english native userPreferred}coverImage{large}type}}}}}`,
  genre: `query($p:Int,$n:Int,$g:String){Page(page:$p,perPage:$n){pageInfo{total currentPage lastPage hasNextPage}media(genre:$g,type:ANIME,sort:POPULARITY_DESC){id idMal title{romaji english native userPreferred}coverImage{extraLarge large}bannerImage description genres averageScore popularity episodes duration status seasonYear season format studios{nodes{name}}}}}`,
};

function slug(id) { return `anilist-${id}`; }
function title(t) { return t?.userPreferred || t?.english || t?.romaji || t?.native || 'Unknown'; }
function jp(t) { return t?.native || t?.romaji || title(t); }
function status(s) { return ({RELEASING:'Ongoing',FINISHED:'Completed',NOT_YET_RELEASED:'Not yet aired',CANCELLED:'Cancelled',HIATUS:'Hiatus'})[s]||s; }
function type(f) { return ({TV:'TV',MOVIE:'Movie',TV_SHORT:'TV Short',OVA:'OVA',ONA:'ONA',SPECIAL:'Special'})[f]||f||'TV'; }
function dur(f,d) { return d?d+'m':f==='MOVIE'?'1 hr':'24m'; }
function season() { const m=new Date().getMonth(); return m<=2?'WINTER':m<=5?'SPRING':m<=8?'SUMMER':'FALL'; }
function toSlug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,''); }

async function gql(query, vars) {
  const key = JSON.stringify({query,vars});
  const c = CACHE.get(key);
  if (c && Date.now() < c.expires) return c.data;
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const r = await fetch(ANILIST_API, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({query,variables:vars}) });
      if (r.status === 429) {
        if (attempt < maxAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 8000);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw new Error('AniList rate limit exceeded');
      }
      if (!r.ok) { const t=await r.text(); throw new Error(`AniList ${r.status}: ${t.slice(0,200)}`); }
      const j = await r.json();
      if (j.errors) throw new Error(j.errors[0]?.message || 'AniList error');
      CACHE.set(key, { data:j.data, expires:Date.now()+CACHE_TTL });
      return j.data;
    } catch(e) {
      if (attempt >= maxAttempts) throw e;
      const delay = Math.min(500 * Math.pow(2, attempt), 5000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}

async function supabaseFetch(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}`, 'Connection': 'close', 'Accept': 'application/json' },
      signal: controller.signal,
    });
    if (!r.ok) {
      const body = await r.text().catch(() => '');
      console.log(`[Bridge] Supabase error ${r.status}: ${body.slice(0,200)}`);
      return null;
    }
    return r.json();
  } catch(e) {
    console.log(`[Bridge] Supabase fetch error: ${e.message}`);
    return null;
  }
  finally { clearTimeout(timeout); }
}

function toSpot(m,i) { return { id:slug(m.id), name:title(m.title), jname:jp(m.title), poster:m.coverImage?.extraLarge||m.coverImage?.large||'', banner:m.bannerImage||'', description:(m.description||'').replace(/<[^>]*>/g,''), rank:i+1, otherInfo:[type(m.format),dur(m.format,m.duration),m.averageScore?m.averageScore+'%':'',m.seasonYear?m.season+' '+m.seasonYear:''].filter(Boolean), episodes:{sub:m.episodes||0,dub:m.episodes?Math.min(m.episodes,12):0} }; }
function toTrend(m,i) { return { id:slug(m.id), name:title(m.title), poster:m.coverImage?.large||'', rank:i+1 }; }
function toTop(m,i) { return { id:slug(m.id), name:title(m.title), poster:m.coverImage?.large||'', rank:i+1, episodes:{sub:m.episodes||0,dub:m.episodes?Math.min(m.episodes,12):0}, malId:m.idMal, anilistId:m.id }; }
function toCard(m) { return { id:slug(m.id), name:title(m.title), jname:jp(m.title), poster:m.coverImage?.large||'', type:type(m.format), duration:dur(m.format,m.duration), rating:m.averageScore?String(m.averageScore):'', episodes:{sub:m.episodes||0,dub:m.episodes?Math.min(m.episodes,12):0}, malId:m.idMal, anilistId:m.id }; }

async function home() {
  const [t,p,s,u] = await Promise.all([
    gql(Q.trending,{p:1,n:20}), gql(Q.popular,{p:1,n:20}),
    gql(Q.seasonal,{p:1,n:20,s:season(),y:new Date().getFullYear()}),
    gql(Q.upcoming,{p:1,n:20})
  ]);
  const tr=t.Page?.media||[], po=p.Page?.media||[], se=s.Page?.media||[], up=u.Page?.media||[];
  return { genres:['Action','Adventure','Comedy','Drama','Fantasy','Horror','Mecha','Music','Mystery','Psychological','Romance','Sci-Fi','Slice of Life','Sports','Supernatural','Thriller'], spotlightAnimes:up.slice(0,10).map(toSpot), trendingAnimes:tr.slice(0,20).map(toTrend), top10Animes:{today:tr.slice(0,10).map(toTop),week:tr.slice(0,10).map(toTop),month:po.slice(0,10).map(toTop)}, topAiringAnimes:se.slice(0,20).map(toCard), topUpcomingAnimes:up.slice(0,20).map(toCard), latestEpisodeAnimes:tr.slice(0,20).map(toCard), mostPopularAnimes:po.slice(0,20).map(toCard), mostFavoriteAnimes:po.slice(0,20).map(toCard), latestCompletedAnimes:[] };
}

async function search(u) {
  const q = u.searchParams.get('q')||'', p = parseInt(u.searchParams.get('page')||'1');
  if (!q) return { animes:[], mostPopularAnimes:[], currentPage:1, totalPages:0, hasNextPage:false, searchQuery:'' };
  const d = await gql(Q.search,{p,n:20,q}), pi = d.Page?.pageInfo||{}, pd = await gql(Q.popular,{p:1,n:5});
  return { animes:(d.Page?.media||[]).map(toCard), mostPopularAnimes:(pd.Page?.media||[]).slice(0,5).map(toCard), currentPage:pi.currentPage||1, totalPages:pi.lastPage||1, hasNextPage:pi.hasNextPage||false, searchQuery:q };
}

async function anime(idStr) {
  let id = parseInt(idStr);
  if (isNaN(id)) { const m=idStr.match(/^anilist-(\d+)$/); if(m) id=parseInt(m[1]); }

  // If not an AniList ID, try Supabase lookup by slug
  if (isNaN(id)) {
    const rows = await supabaseFetch(`animes?select=slug,title,image,synopsis,genres,year,studios,status&slug=eq.${encodeURIComponent(idStr)}`);
    if (rows && rows.length > 0) {
      const a = rows[0];
      return {
        anime: {
          info: {
            id: a.slug,
            name: a.title || a.slug,
            poster: a.image || '',
            description: (a.synopsis || '').replace(/<[^>]*>/g,''),
            stats: { rating:'', quality:'HD', episodes:{sub:0,dub:0}, type:'TV', duration:'24m' },
            malId: null,
            anilistId: null,
            promotionalVideos: [],
            characterVoiceActor: [],
          },
          moreInfo: {
            aired: String(a.year || ''),
            genres: a.genres || [],
            status: a.status || '',
            studios: (a.studios||[]).join(', ') || 'Inconnu',
            duration: '24m',
          },
        },
        recommendedAnimes: [],
        relatedAnimes: [],
      };
    }
    return null;
  }

  const d = await gql(Q.anime,{id}), m = d.Media;
  if (!m) return null;
  const rec = (m.recommendations?.nodes||[]).filter(n=>n?.mediaRecommendation).map(n=>n.mediaRecommendation);
  return { anime:{ info:{ id:slug(m.id), name:title(m.title), poster:m.coverImage?.extraLarge||m.coverImage?.large||'', description:(m.description||'').replace(/<[^>]*>/g,''), stats:{ rating:m.averageScore?m.averageScore+'%':'', quality:'HD', episodes:{sub:m.episodes||0,dub:m.episodes?Math.min(m.episodes,12):0}, type:type(m.format), duration:dur(m.format,m.duration) }, malId:m.idMal, anilistId:m.id, promotionalVideos:m.trailer?.id?[{title:'Trailer',source:'https://www.youtube.com/watch?v='+m.trailer.id,thumbnail:m.trailer.thumbnail||''}]:[], characterVoiceActor:[] }, moreInfo:{ aired:m.startDate?.year?String(m.startDate.year):'', genres:m.genres||[], status:status(m.status), studios:(m.studios?.nodes||[]).map(s=>s.name).join(', ')||'Unknown', duration:dur(m.format,m.duration), malId:m.idMal, anilistId:m.id } }, recommendedAnimes:rec.map(toCard), relatedAnimes:[] };
}

async function genre(u, slug) {
  const p = parseInt(u.searchParams.get('page')||'1'), g = slug.charAt(0).toUpperCase()+slug.slice(1).toLowerCase();
  const d = await gql(Q.genre,{p,n:20,g}), pi = d.Page?.pageInfo||{};
  return { genreName:g, animes:(d.Page?.media||[]).map(toCard), currentPage:pi.currentPage||1, totalPages:pi.lastPage||1, hasNextPage:pi.hasNextPage||false };
}

function toEpisodes(rows) {
  const seen = new Map();
  for (const row of rows) {
    for (const ep of (row.episodes || [])) {
      const s = ep.season || 1;
      const n = ep.number;
      const key = `${row.slug}-s${s}-e${n}`;
      if (!seen.has(key)) {
        seen.set(key, {
          number: n,
          title: ep.title || `Épisode ${n}`,
          episodeId: key,
          isFiller: false,
          season: s,
          lang: ep.lang || 'vf',
          sources: ep.sources || [],
          embedUrl: ep.embedUrl || '',
        });
      }
    }
  }
  const episodes = [...seen.values()].sort((a,b) => a.season - b.season || a.number - b.number);
  return {
    totalEpisodes: episodes.length,
    episodes: episodes.map(e => ({ number:e.number, title:e.title, episodeId:e.episodeId, isFiller:e.isFiller })),
    _raw: episodes,
  };
}

async function fetchEpisodes(animeId) {
  // Direct Supabase lookup by slug
  const rows = await supabaseFetch(`animes?select=slug,episodes&slug=eq.${encodeURIComponent(animeId)}`);
  if (rows && rows.length > 0) return toEpisodes(rows);

  // Try partial slug match (for anilist-{id} → title → slug matching)
  let id = parseInt(animeId);
  if (isNaN(id)) { const m=animeId.match(/^anilist-(\d+)$/); if(m) id=parseInt(m[1]); }
  if (isNaN(id)) {
    // Try like search as last resort
    const rows2 = await supabaseFetch(`animes?select=slug,episodes&slug=like.${encodeURIComponent(animeId + '%')}`);
    if (rows2 && rows2.length > 0) return toEpisodes(rows2);
    return {totalEpisodes:0,episodes:[]};
  }

  const d = await gql(Q.anime,{id}), media = d?.Media;
  if (!media) return {totalEpisodes:0,episodes:[]};

  const titles = [
    media.title?.english,
    media.title?.romaji,
    media.title?.userPreferred,
    media.title?.native,
  ].filter(Boolean);

  for (const t of titles) {
    const slugBase = toSlug(t);
    if (!slugBase) continue;
    const rows3 = await supabaseFetch(`animes?select=slug,episodes&slug=like.${encodeURIComponent(slugBase + '%')}`);
    if (rows3 && rows3.length > 0) return toEpisodes(rows3);
  }

  // Fallback: placeholder episodes from AniList
  const epCount = media.episodes || 12;
  const slugBase = toSlug(media.title?.userPreferred || media.title?.english || media.title?.romaji || 'anime');
  const placeholder = [];
  for (let i = 1; i <= epCount; i++) {
    placeholder.push({ number:i, title:`Épisode ${i}`, episodeId:`${slugBase}-s1-e${i}`, isFiller:false, season:1, lang:'vf', sources:[], embedUrl:'' });
  }
  return {
    totalEpisodes: placeholder.length,
    episodes: placeholder.map(e => ({ number:e.number, title:e.title, episodeId:e.episodeId, isFiller:e.isFiller })),
    _raw: placeholder,
  };
}

function parseEpisodeId(episodeId) {
  // Format: {slug}-s{season}-e{number}  OR  {slug}?ep={something}
  const m = episodeId.match(/^(.+)-s(\d+)-e(\d+)$/);
  if (m) return { slug: m[1], season: parseInt(m[2]), number: parseInt(m[3]) };
  const m2 = episodeId.match(/^(.+?)(\?|$)/);
  if (m2) return { slug: m2[1], season: 1, number: 0 };
  return null;
}

async function findEpisode(episodeId) {
  const parsed = parseEpisodeId(episodeId);
  if (!parsed) return null;
  const { slug, season, number } = parsed;
  const rows = await supabaseFetch(`animes?select=slug,episodes&slug=eq.${encodeURIComponent(slug)}`);
  if (!rows || rows.length === 0) return null;
  for (const row of rows) {
    const epList = row.episodes || [];
    const ep = epList.find(e => e.number === number && (e.season || 1) === season);
    if (ep) return { ...ep, slug: row.slug };
  }
  return null;
}

async function fetchEpisodeServers(episodeId) {
  const parsed = parseEpisodeId(episodeId);
  if (!parsed) return { episodeId, episodeNo: 0, sub: [], dub: [], raw: [] };
  const ep = await findEpisode(episodeId);
  if (!ep || !ep.embedUrl) return { episodeId, episodeNo: parsed.number, sub: [], dub: [], raw: [] };
  return {
    episodeId,
    episodeNo: parsed.number,
    sub: [{ serverId: 1, serverName: 'Sibnet', type: 'sub' }],
    dub: [],
    raw: [],
  };
}

async function fetchPageText(url, options = {}) {
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  ];
  const referers = ['https://sibnet.ru/', 'https://video.sibnet.ru/', 'https://sibnet.ru/'];
  // Try up to 3 times with different User-Agent and longer timeout
  for (let i = 0; i < 3; i++) {
    try {
      const ua = options.ua || agents[i % agents.length];
      const ref = options.referer || referers[i % referers.length];
      const headers = {
        'User-Agent': ua,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': ref,
      };
      if (i > 0) headers['Cookie'] = 'sibnet_uid=1; sibnet_hash=1';
      const r = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(15000)
      });
      if (!r.ok) continue;
      const text = await r.text();
      if (text && text.length > 50) return text;
    } catch (e) {
      if (i === 2) console.error('[Bridge] Échec de récupération de la page :', e.message);
    }
  }
  return null;
}

function extractVideoUrl(html) {
  let m;

  // Pattern 1 (Sibnet-specific): player.src([{src: "/v/hash/id.mp4"}]) with relaxed matching
  m = html.match(/player\.src\s*\(\s*\[.*?src\s*:\s*["']([^"']+)["']/is);
  if (m) return m[1];

  // Pattern 2: player.src([{src:"/v/hash/id.mp4"}]) without newlines - more flexible
  m = html.match(/player\s*\.\s*src\s*\([\s\S]*?src\s*[:=]\s*["']([^"']+)["']/i);
  if (m) return m[1];

  // Pattern 3: src: in any JSON-like object (generalized)
  m = html.match(/(?:src|video|file|url)\s*[:=]\s*["']([^"']*\.(?:mp4|m3u8)[^"']*)["']/i);
  if (m) return m[1];

  // Pattern 4: <source src="...mp4" type="video/mp4"> or data-src
  m = html.match(/<source\s+[^>]*(?:src|data-src)\s*=\s*"([^"]+\.(?:mp4|m3u8)[^"]*)"[^>]*>/i);
  if (m) return m[1];
  m = html.match(/<source\s+[^>]*src\s*=\s*"([^"]+\.mp4[^"]*)"[^>]*>/i);
  if (m) return m[1];

  // Pattern 5: <video ... src="...mp4" or data-video
  m = html.match(/<video\s+[^>]*(?:src|data-video)\s*=\s*"([^"]+\.(?:mp4|m3u8)[^"]*)"[^>]*>/i);
  if (m) return m[1];
  m = html.match(/<video\s+[^>]*src\s*=\s*"([^"]+\.mp4[^"]*)"[^>]*>/i);
  if (m) return m[1];
  m = html.match(/<video\s+[^>]*src\s*=\s*"([^"]+\.m3u8[^"]*)"[^>]*>/i);
  if (m) return m[1];

  // Pattern 6: file: "..." or file: '...' in JavaScript (jwplayer, videojs, etc.)
  m = html.match(/["']file["']\s*:\s*["']([^"']+)["']/i);
  if (m) return m[1];

  // Pattern 7: src: "..." or src: '...' in JavaScript (hls.js, plyr, etc.)
  m = html.match(/["']src["']\s*:\s*["']([^"']+)["']/i);
  if (m) return m[1];

  // Pattern 8: JS variable assignments like var videoUrl = '...' or let src = "..."
  m = html.match(/(?:var|let|const)\s+(?:videoUrl|video_url|src|videoSrc|fileUrl|mp4|url)\s*[:=]\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
  if (m) return m[1];
  m = html.match(/(?:var|let|const)\s+\w+\s*[:=]\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
  if (m) return m[1];

  // Pattern 9: video_url: '...' or video_url: "..." (common in PHP/JSON configs)
  m = html.match(/(?:video_url|videoUrl|video_src|mp4_url|src_url)\s*[:=]\s*["']([^"']+\.(?:mp4|m3u8)[^"']*)["']/i);
  if (m) return m[1];

  // Pattern 10: data-src or data-video attribute (general)
  m = html.match(/(?:data-src|data-video|data-url)\s*=\s*"([^"]+\.(?:mp4|m3u8)[^"]*)"/i);
  if (m) return m[1];

  // Pattern 11: direct .mp4 URL anywhere in the page
  m = html.match(/https?:\/\/[^"'\s<>]+\.mp4[^"'\s<>]*/i);
  if (m) return m[0];

  // Pattern 12: direct .m3u8 URL anywhere in the page
  m = html.match(/https?:\/\/[^"'\s<>]+\.m3u8[^"'\s<>]*/i);
  if (m) return m[0];

  // Pattern 13: addVariable("file","...") or Flash embed
  m = html.match(/addVariable\s*\(\s*["']file["']\s*,\s*["']([^"']+)["']/i);
  if (m) return m[1];

  // Pattern 14: data-src attribute (legacy)
  m = html.match(/data-src\s*=\s*"([^"]+\.(mp4|m3u8)[^"]*)"/i);
  if (m) return m[1];

  return null;
}

function resolveUrl(url, baseUrl) {
  if (!url) return url;
  // Already absolute
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Protocol-relative
  if (url.startsWith('//')) return 'https:' + url;
  // Absolute path relative to origin
  if (url.startsWith('/')) {
    const origin = new URL(baseUrl).origin;
    return origin + url;
  }
  // Relative path - join with base directory
  const base = baseUrl.replace(/\/[^/]*$/, '/');
  return base + url;
}

async function fetchEpisodeStream(episodeId, server, category) {
  const ep = await findEpisode(episodeId);
  if (!ep || !ep.embedUrl) {
    return { streamingLink: [], tracks: [], anilistID: null, malID: null, intro: null, outro: null };
  }
  console.log('[Bridge] Extraction vidéo Sibnet :', ep.embedUrl);
  try {
    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    const shellResp = await fetch(ep.embedUrl, {
      headers: { 'User-Agent': ua, 'Referer': 'https://sibnet.ru/' },
      redirect: 'manual',
      signal: AbortSignal.timeout(15000)
    });
    if (!shellResp.ok) throw new Error(`Shell ${shellResp.status}`);
    const html = await shellResp.text();
    const srcMatch = html.match(/player\.src\s*\(\s*\[\s*\{\s*src\s*:\s*["']([^"']+)["']/i);
    if (!srcMatch) throw new Error('Vidéo non trouvée dans la page');
    let videoUrl = resolveUrl(srcMatch[1], ep.embedUrl);
    console.log('[Bridge] URL vidéo initiale :', videoUrl);
    // Follow GET manually to capture the final CDN URL (with noip=1, no headers required)
    const mp4Resp = await fetch(videoUrl, { redirect: 'manual', headers: { 'User-Agent': ua, 'Referer': ep.embedUrl, 'Cookie': 'sibnet_uid=1; sibnet_hash=1' }, signal: AbortSignal.timeout(15000) });
    if (mp4Resp.status >= 300 && mp4Resp.status < 400) {
      const loc = mp4Resp.headers.get('location');
      if (loc) {
        const cdnUrl = resolveUrl(loc, videoUrl);
        console.log('[Bridge] CDN URL (noip=1) :', cdnUrl.slice(0, 100));
        videoUrl = cdnUrl;
      }
    }
    console.log('[Bridge] URL CDN finale (sans proxy) :', videoUrl);
    return {
      streamingLink: [{
        link: videoUrl,
        type: 'mp4',
        server: 'Sibnet'
      }],
      referer: ep.embedUrl,
      tracks: [],
      anilistID: null,
      malID: null,
      intro: null,
      outro: null,
    };
  } catch(e) {
    console.error('[Bridge] Échec extraction vidéo Sibnet :', e.message);
    return { streamingLink: [], tracks: [], anilistID: null, malID: null, intro: null, outro: null };
  }
}

async function proxyPage(req, res, url) {
  console.log('[Bridge] Proxy de la page :', url);
  try {
    const r = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://sibnet.ru/',
        'Cookie': 'sibnet_uid=1; sibnet_hash=1',
      },
      signal: AbortSignal.timeout(15000)
    });
    if (!r.ok) { res.writeHead(502); res.end('Erreur proxy : amont ' + r.status); return; }
    let html = await r.text();
    // Inject base tag so relative resources resolve against the original host
    const baseUrl = url.split('/').slice(0,3).join('/');
    html = html.replace('<head>', `<head><base href="${baseUrl}/">`);
    // Neutralize frame-busting JavaScript
    html = html.replace(/if\s*\(\s*top\s*(!==|!=)\s*self\s*\)/gi, 'if (false)');
    html = html.replace(/if\s*\(\s*self\s*(!==|!=)\s*top\s*\)/gi, 'if (false)');
    html = html.replace(/window\.top\s*(!==|!=)\s*window\.self/gi, 'false');
    // Inject frame-busting prevention
    html = html.replace('</head>', '<script>window.top=window;window.self=window;try{Object.defineProperty(window,"top",{get:function(){return window}})}catch(e){}</script></head>');
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    });
    res.end(html);
  } catch(e) {
    res.writeHead(502);
    res.end('Erreur proxy : ' + e.message);
  }
}

async function proxyVideo(req, res, url, referer, userAgent, cookie) {
  console.log('[Bridge] Proxy de la vidéo :', url);
  try {
    const ua = userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    const headers = { 'User-Agent': ua };
    if (referer) headers['Referer'] = referer;
    // Always send Sibnet cookies – they are required for video auth even if shell.php didn't set them
    headers['Cookie'] = cookie || 'sibnet_uid=1; sibnet_hash=1';
    console.log('[Bridge] Proxy headers:', JSON.stringify({...headers, Cookie: headers.Cookie ? headers.Cookie.slice(0,60)+'...' : '(none)'}));
    // Pass through Range header for seeking support
    if (req.headers['range']) headers['Range'] = req.headers['range'];
    const r = await fetch(url, { headers, signal: AbortSignal.timeout(120000) });
    console.log('[Bridge] Proxy response status:', r.status);
    if (!r.ok && r.status !== 206) { res.writeHead(502); res.end(JSON.stringify({error:`Amont ${r.status}`})); return; }
    // Forward upstream headers needed by the video player
    const contentType = r.headers.get('content-type') || 'video/mp4';
    const contentRange = r.headers.get('content-range');
    const contentLength = r.headers.get('content-length');
    const responseHeaders = {
      'Content-Type': contentType,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'public, max-age=3600',
    };
    if (contentRange) responseHeaders['Content-Range'] = contentRange;
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    res.writeHead(r.status, responseHeaders);
    // Compatible body streaming (Node 18+ with native fetch)
    const reader = r.body.getReader();
    const pump = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) { res.end(); break; }
          res.write(value);
        }
      } catch(e) {
        console.error('[Bridge] Stream error:', e.message);
        if (!res.writableEnded) res.end();
      }
    };
    pump();
  } catch(e) {
    res.writeHead(502);
    res.end(JSON.stringify({error: e.message}));
  }
}

const server = createServer(async (req, res) => {
  console.log(`[Bridge] ${req.method} ${req.url}`);
  res.setHeader('Access-Control-Allow-Origin','*');
  res.setHeader('Access-Control-Allow-Headers','*');
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const write = (data, status=200) => { res.writeHead(status, {'Content-Type':'application/json'}); res.end(JSON.stringify(data)); };
  const writeErr = (msg, s=500) => { console.error(msg); write({error:String(msg)}, s); };

  try {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let path = url.pathname;

    // Strip API version prefix(es) so the same bridge works with or without a reverse proxy
    if (path.startsWith('/api/v2/hianime')) { path = path.replace('/api/v2/hianime','') || '/'; console.log('[Bridge] Path after strip:', path); }
    if (path.startsWith('/api/v2/anime')) path = path.replace('/api/v2/anime','') || '/';
    if (path.startsWith('/api/v2/manga')) path = path.replace('/api/v2/manga','') || '/';

    // Page proxy – serves third-party HTML pages on the same origin (avoids cross-origin iframe issues)
    if (path.startsWith('/proxy/page')) {
      const pageUrl = url.searchParams.get('url');
      if (!pageUrl) { write({error:'Paramètre url manquant'},400); return; }
      await proxyPage(req, res, pageUrl);
      return;
    }

    // Video proxy – streams content from third-party CDNs with proper headers, avoiding CORS
    if (path.startsWith('/proxy/video')) {
      const videoUrl = url.searchParams.get('url');
      if (!videoUrl) { write({error:'Paramètre url manquant'},400); return; }
      await proxyVideo(req, res, videoUrl, url.searchParams.get('referer'), url.searchParams.get('userAgent'), url.searchParams.get('cookie'));
      return;
    }

    // Aniskip proxy – clean fetch (no Sibnet cookies) to api.aniskip.com
    if (path.startsWith('/aniskip')) {
      const malId = url.searchParams.get('malId');
      const ep = url.searchParams.get('ep');
      if (!malId || !ep) { write({error:'Paramètres malId et ep requis'},400); return; }
      const length = url.searchParams.get('length') || '1440';
      const apiUrl = `https://api.aniskip.com/v2/skip-times/${malId}/${ep}?types[]=op&types[]=ed&types[]=recap&episodeLength=${length}`;
      try {
        const r = await fetch(apiUrl, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(10000) });
        const data = await r.json().catch(() => null);
        write(data || {found:false,results:[]});
      } catch(e) { write({found:false,results:[],error:e.message}); }
      return;
    }

    // Streaming routes must be checked BEFORE /anime/ catch-all
    if (path.startsWith('/servers/')) write(await fetchEpisodeServers(decodeURIComponent(path.slice(9))));
    else if (path.startsWith('/stream')) write(await fetchEpisodeStream(url.searchParams.get('id')||'', url.searchParams.get('server')||'', url.searchParams.get('type')||''));
    else if (path==='/'||path==='/home') write(await home());
    else if (path.startsWith('/search')) write(await search(url));
    else if (path.startsWith('/genre/')) write(await genre(url, path.slice(7)));
    else if (path.startsWith('/producer/')) write({producerName:path.slice(10),animes:[],top10Animes:{today:[],week:[],month:[]},topAiringAnimes:[],currentPage:1,totalPages:0,hasNextPage:false});
    else if (path.match(/^\/anime\/[^/]+\/episodes$/)) write(await fetchEpisodes(path.split('/')[2]));
    else if (path.match(/^\/anime\/[^/]+\/next-episode-schedule$/)) write({episode:null});
    else if (path.startsWith('/anime/')) { const d=await anime(path.slice(7)); if(d) write(d); else write({error:'Non trouvé'},404); }
    else write({error:'Non trouvé'},404);
  } catch(e) { writeErr(e.message); }
});

server.listen(PORT, () => console.log(`Bridge démarré sur http://localhost:${PORT}`));
