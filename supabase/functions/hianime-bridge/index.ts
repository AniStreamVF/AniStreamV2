import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const ANILIST_API = "https://graphql.anilist.co";
const ANILIST_ARTIST = "https://graphql.anilist.co";

const TRENDING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: TRENDING_DESC, type: ANIME) {
      id idMal title { romaji english native } coverImage { extraLarge large } description bannerImage genres averageScore popularity episodes duration status seasonYear season format
    }
  }
}`;

const POPULAR_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(sort: POPULARITY_DESC, type: ANIME) {
      id idMal title { romaji english native } coverImage { extraLarge large } description bannerImage genres averageScore popularity episodes duration status seasonYear season format
    }
  }
}`;

const SEASONAL_QUERY = `
query ($page: Int, $perPage: Int, $season: MediaSeason, $seasonYear: Int) {
  Page(page: $page, perPage: $perPage) {
    media(season: $season, seasonYear: $seasonYear, type: ANIME, sort: POPULARITY_DESC) {
      id idMal title { romaji english native } coverImage { extraLarge large } description bannerImage genres averageScore popularity episodes duration status seasonYear season format
    }
  }
}`;

const UPCOMING_QUERY = `
query ($page: Int, $perPage: Int) {
  Page(page: $page, perPage: $perPage) {
    media(status: NOT_YET_RELEASED, type: ANIME, sort: POPULARITY_DESC) {
      id idMal title { romaji english native } coverImage { extraLarge large } description bannerImage genres averageScore popularity episodes duration status seasonYear season format
    }
  }
}`;

const SEARCH_QUERY = `
query ($page: Int, $perPage: Int, $search: String) {
  Page(page: $page, perPage: $perPage) {
    pageInfo { total currentPage lastPage hasNextPage perPage }
    media(search: $search, type: ANIME) {
      id idMal title { romaji english native } coverImage { extraLarge large } description bannerImage genres averageScore popularity episodes duration status seasonYear season format
    }
  }
}`;

const ANIME_DETAIL_QUERY = `
query ($id: Int) {
  Media(id: $id, type: ANIME) {
    id idMal title { romaji english native } coverImage { extraLarge large } bannerImage description genres averageScore popularity episodes duration status seasonYear season format studios { nodes { name } } startDate { year month day } endDate { year month day } trailer { id site thumbnail } recommendations (sort: RATING_DESC, perPage: 10) { nodes { mediaRecommendation { id idMal title { romaji english native } coverImage { large } type } } } }
}`;

function anilistSlug(id: number): string {
  return `anilist-${id}`;
}

function pickTitle(title: any): string {
  return title?.userPreferred || title?.english || title?.romaji || title?.native || "Unknown";
}

function pickJapanese(title: any): string {
  return title?.native || title?.romaji || pickTitle(title);
}

function statusToHiAnime(status: string): string {
  const map: Record<string, string> = {
    RELEASING: "Ongoing",
    FINISHED: "Completed",
    NOT_YET_RELEASED: "Not yet aired",
    CANCELLED: "Cancelled",
    HIATUS: "Hiatus",
  };
  return map[status] || status;
}

function seasonYearStr(season: string, year: number): string {
  if (season && year) return `${season} ${year}`;
  return year ? String(year) : "";
}

function formatDuration(format: string, duration: number): string {
  if (duration) return `${duration}m`;
  if (format === "MOVIE") return "1 hr";
  return "24m";
}

function formatType(format: string): string {
  if (format === "TV") return "TV";
  if (format === "MOVIE") return "Movie";
  if (format === "TV_SHORT") return "TV Short";
  if (format === "OVA") return "OVA";
  if (format === "ONA") return "ONA";
  if (format === "SPECIAL") return "Special";
  return format || "TV";
}

function anilistMediaToSpotlight(media: any, rank: number): any {
  return {
    id: anilistSlug(media.id),
    name: pickTitle(media.title),
    jname: pickJapanese(media.title),
    poster: media.coverImage?.extraLarge || media.coverImage?.large || "",
    banner: media.bannerImage || "",
    description: media.description?.replace(/<[^>]*>/g, "") || "",
    rank,
    otherInfo: [
      formatType(media.format),
      formatDuration(media.format, media.duration),
      media.averageScore ? `${media.averageScore}%` : "",
      seasonYearStr(media.season, media.seasonYear),
    ].filter(Boolean),
    episodes: { sub: media.episodes || 0, dub: media.episodes ? Math.min(media.episodes, 12) : 0 },
  };
}

function anilistMediaToTrending(media: any, rank: number): any {
  return {
    id: anilistSlug(media.id),
    name: pickTitle(media.title),
    poster: media.coverImage?.large || "",
    rank,
  };
}

function anilistMediaToTop(media: any, rank: number): any {
  return {
    id: anilistSlug(media.id),
    name: pickTitle(media.title),
    poster: media.coverImage?.large || "",
    rank,
    episodes: { sub: media.episodes || 0, dub: media.episodes ? Math.min(media.episodes, 12) : 0 },
    malId: media.idMal,
    anilistId: media.id,
  };
}

function anilistMediaToCard(media: any, _idx?: number): any {
  return {
    id: anilistSlug(media.id),
    name: pickTitle(media.title),
    jname: pickJapanese(media.title),
    poster: media.coverImage?.large || "",
    type: formatType(media.format),
    duration: formatDuration(media.format, media.duration),
    rating: media.averageScore ? `${media.averageScore}` : "",
    episodes: { sub: media.episodes || 0, dub: media.episodes ? Math.min(media.episodes, 12) : 0 },
    malId: media.idMal,
    anilistId: media.id,
  };
}

async function fetchAnilist(query: string, variables: any): Promise<any> {
  const resp = await fetch(ANILIST_API, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!resp.ok) {
    console.error("AniList error:", resp.status, await resp.text());
    throw new Error(`AniList HTTP ${resp.status}`);
  }
  const json = await resp.json();
  if (json.errors) {
    console.error("AniList errors:", JSON.stringify(json.errors));
    throw new Error(json.errors[0]?.message || "AniList error");
  }
  return json.data;
}

async function handleHome(): Promise<Response> {
  const [trendingData, popularData, seasonData, upcomingData] = await Promise.all([
    fetchAnilist(TRENDING_QUERY, { page: 1, perPage: 20 }),
    fetchAnilist(POPULAR_QUERY, { page: 1, perPage: 20 }),
    fetchAnilist(SEASONAL_QUERY, { page: 1, perPage: 20, season: getCurrentSeason(), seasonYear: getCurrentYear() }),
    fetchAnilist(UPCOMING_QUERY, { page: 1, perPage: 20 }),
  ]);

  const trending = trendingData.Page?.media || [];
  const popular = popularData.Page?.media || [];
  const seasonal = seasonData.Page?.media || [];
  const upcoming = upcomingData.Page?.media || [];

  const homeData = {
    genres: ["Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror", "Mecha", "Music", "Mystery", "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"],
    spotlightAnimes: upcoming.slice(0, 10).map((m: any, i: number) => anilistMediaToSpotlight(m, i + 1)),
    trendingAnimes: trending.slice(0, 20).map((m: any, i: number) => anilistMediaToTrending(m, i + 1)),
    top10Animes: {
      today: trending.slice(0, 10).map((m: any, i: number) => anilistMediaToTop(m, i + 1)),
      week: trending.slice(0, 10).map((m: any, i: number) => anilistMediaToTop(m, i + 1)),
      month: popular.slice(0, 10).map((m: any, i: number) => anilistMediaToTop(m, i + 1)),
    },
    topAiringAnimes: seasonal.slice(0, 20).map(anilistMediaToCard),
    topUpcomingAnimes: upcoming.slice(0, 20).map(anilistMediaToCard),
    latestEpisodeAnimes: trending.slice(0, 20).map(anilistMediaToCard),
    mostPopularAnimes: popular.slice(0, 20).map(anilistMediaToCard),
    mostFavoriteAnimes: popular.slice(0, 20).map(anilistMediaToCard),
    latestCompletedAnimes: [],
  };

  return new Response(JSON.stringify(homeData), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleSearch(url: URL): Promise<Response> {
  const q = url.searchParams.get("q") || "";
  const page = parseInt(url.searchParams.get("page") || "1");
  if (!q) {
    return new Response(JSON.stringify({ animes: [], mostPopularAnimes: [], currentPage: 1, totalPages: 0, hasNextPage: false, searchQuery: "" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await fetchAnilist(SEARCH_QUERY, { page, perPage: 20, search: q });
  const pageInfo = data.Page?.pageInfo || {};
  const media = data.Page?.media || [];
  const popularData = await fetchAnilist(POPULAR_QUERY, { page: 1, perPage: 5 });
  const mostPopular = (popularData.Page?.media || []).slice(0, 5);

  return new Response(JSON.stringify({
    animes: media.map(anilistMediaToCard),
    mostPopularAnimes: mostPopular.map(anilistMediaToCard),
    currentPage: pageInfo.currentPage || 1,
    totalPages: pageInfo.lastPage || 1,
    hasNextPage: pageInfo.hasNextPage || false,
    searchQuery: q,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleAnime(animeSlug: string): Promise<Response> {
  let anilistId = parseInt(animeSlug);
  if (isNaN(anilistId)) {
    const match = animeSlug.match(/^anilist-(\d+)$/);
    if (match) anilistId = parseInt(match[1]);
  }
  if (isNaN(anilistId)) {
    return new Response(JSON.stringify({ error: "Invalid anime ID" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await fetchAnilist(ANIME_DETAIL_QUERY, { id: anilistId });
  const media = data.Media;
  if (!media) {
    return new Response(JSON.stringify({ error: "Anime not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const recNodes = media.recommendations?.nodes || [];
  const recommended = recNodes.filter((n: any) => n?.mediaRecommendation).map((n: any) => n.mediaRecommendation);

  const result = {
    anime: {
      info: {
        id: anilistSlug(media.id),
        name: pickTitle(media.title),
        poster: media.coverImage?.extraLarge || media.coverImage?.large || "",
        description: media.description?.replace(/<[^>]*>/g, "") || "",
        stats: {
          rating: media.averageScore ? `${media.averageScore}%` : "",
          quality: "HD",
          episodes: { sub: media.episodes || 0, dub: media.episodes ? Math.min(media.episodes, 12) : 0 },
          type: formatType(media.format),
          duration: formatDuration(media.format, media.duration),
        },
        promotionalVideos: media.trailer ? [{
          title: "Trailer",
          source: media.trailer.id ? `https://www.youtube.com/watch?v=${media.trailer.id}` : "",
          thumbnail: media.trailer.thumbnail || "",
        }] : [],
        characterVoiceActor: [],
      },
      moreInfo: {
        aired: media.startDate ? `${media.startDate.year || ""}` : "",
        genres: media.genres || [],
        status: statusToHiAnime(media.status),
        studios: (media.studios?.nodes || []).map((s: any) => s.name).join(", ") || "Unknown",
        duration: formatDuration(media.format, media.duration),
        malId: media.idMal,
        anilistId: media.id,
      },
    },
    recommendedAnimes: recommended.map(anilistMediaToCard),
    relatedAnimes: [],
  };

  return new Response(JSON.stringify(result), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handleGenre(url: URL, genreSlug: string): Promise<Response> {
  const page = parseInt(url.searchParams.get("page") || "1");
  const genre = genreSlug.charAt(0).toUpperCase() + genreSlug.slice(1).toLowerCase();

  const GENRE_QUERY = `
  query ($page: Int, $perPage: Int, $genre: String) {
    Page(page: $page, perPage: $perPage) {
      pageInfo { total currentPage lastPage hasNextPage }
      media(genre: $genre, type: ANIME, sort: POPULARITY_DESC) {
        id idMal title { romaji english native } coverImage { extraLarge large } description bannerImage genres averageScore popularity episodes duration status seasonYear season format
      }
    }
  }`;

  const data = await fetchAnilist(GENRE_QUERY, { page, perPage: 20, genre });
  const pageInfo = data.Page?.pageInfo || {};
  const media = data.Page?.media || [];

  return new Response(JSON.stringify({
    genreName: genre,
    animes: media.map(anilistMediaToCard),
    currentPage: pageInfo.currentPage || 1,
    totalPages: pageInfo.lastPage || 1,
    hasNextPage: pageInfo.hasNextPage || false,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getCurrentSeason(): string {
  const m = new Date().getMonth();
  if (m >= 0 && m <= 2) return "WINTER";
  if (m >= 3 && m <= 5) return "SPRING";
  if (m >= 6 && m <= 8) return "SUMMER";
  return "FALL";
}

function getCurrentYear(): number {
  return new Date().getFullYear();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    let path = url.pathname;

    const fnPrefix = "/functions/v1/hianime-bridge";
    if (path.startsWith(fnPrefix)) {
      path = path.slice(fnPrefix.length) || "/";
    }

    if (path === "/home" || path === "/" || path === "") {
      return await handleHome();
    }

    if (path.startsWith("/search")) {
      return await handleSearch(url);
    }

    const genreMatch = path.match(/^\/genre\/([^/]+)$/);
    if (genreMatch) {
      return await handleGenre(url, genreMatch[1]);
    }

    const producerMatch = path.match(/^\/producer\/([^/]+)$/);
    if (producerMatch) {
      return new Response(JSON.stringify({ producerName: producerMatch[1], animes: [], top10Animes: { today: [], week: [], month: [] }, topAiringAnimes: [], currentPage: 1, totalPages: 0, hasNextPage: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const animeEpisodesMatch = path.match(/^\/anime\/([^/]+)\/episodes$/);
    if (animeEpisodesMatch) {
      return new Response(JSON.stringify({ totalEpisodes: 12, episodes: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const nextEpMatch = path.match(/^\/anime\/([^/]+)\/next-episode-schedule$/);
    if (nextEpMatch) {
      return new Response(JSON.stringify({ episode: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const animeMatch = path.match(/^\/anime\/([^/]+)$/);
    if (animeMatch) {
      return await handleAnime(animeMatch[1]);
    }

    if (path.startsWith("/servers/")) {
      return new Response(JSON.stringify({ episodeId: "", episodeNo: 0, sub: [], dub: [], raw: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (path.startsWith("/stream")) {
      return new Response(JSON.stringify({ headers: { Referer: "", "User-Agent": "" }, sources: [], subtitles: [], anilistID: null, malID: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Bridge error:", error.message);
    return new Response(JSON.stringify({ error: error.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
