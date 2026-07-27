import type {
  MangaSearchItem, MangaSearchResult, MangaDetailResponse,
  MangaChapterResponse, MangaReadResponse, MangaPage,
} from "@/types/manga";

export type MangaFeedTimeWindow = "day" | "week" | "month" | "all";
export type MangaSearchMode = "search" | "latest" | "recent" | "added" | "new-chap" | "category" | "genre" | "author" | "explore" | "popular" | "recommendation" | "foryou" | "origin" | "random";
export type MangaSearchProvider = string;
export type MangaSortOption = "relevance" | "trending" | "latestUpdate" | "rating" | "popularity" | "chapterCount";
export interface MangaSearchOptions {
  mode?: MangaSearchMode;
  provider?: MangaSearchProvider;
  category?: string;
  genre?: string;
  origin?: string;
  language?: string;
  author?: string;
  adult?: boolean;
  timeWindow?: MangaFeedTimeWindow;
  sort?: MangaSortOption;
  minYear?: number;
  maxYear?: number;
  minScore?: number;
  maxScore?: number;
  minChapters?: number;
  maxChapters?: number;
  types?: string[];
  statuses?: string[];
  mangaType?: "all" | "manga" | "manhwa" | "manhua" | "comics";
  requiresQuery?: boolean;
}

const MANGADEX_API = "https://api.mangadex.org";
const MANGADEX_UPLOADS = "https://uploads.mangadex.org";

async function mdFetch<T>(path: string, params?: Record<string, string | number | string[]>): Promise<T> {
  const url = new URL(`${MANGADEX_API}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      if (Array.isArray(v)) v.forEach(i => url.searchParams.append(k, String(i)));
      else if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    });
  }
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`MangaDex error ${res.status}: ${res.statusText}`);
  return res.json();
}

function getCoverUrl(mangaId: string, fileName?: string): string {
  if (!fileName) return "";
  return `${MANGADEX_UPLOADS}/covers/${mangaId}/${fileName}.512.jpg`;
}

function mapMangaDexItem(manga: any): MangaSearchItem {
  const attrs = manga.attributes || {};
  const title = attrs.title || {};
  const canonicalTitle = title.fr || title.en || Object.values(title)[0] as string || "Inconnu";
  const coverRel = (manga.relationships || []).find((r: any) => r.type === "cover_art");
  const coverFileName = coverRel?.attributes?.fileName;
  const tags = attrs.tags || [];
  const isAdult = tags.some((t: any) => t.attributes?.name?.en === "Pornographic");

  return {
    id: manga.id,
    mediaType: attrs.publicationDemographic === "shoujo" || attrs.publicationDemographic === "shounen" || attrs.publicationDemographic === "seinen" || attrs.publicationDemographic === "josei" ? "manga" : "manga",
    canonicalTitle,
    title: { fr: title.fr, en: title.en, native: title.ja || title["ja-ro"] },
    poster: getCoverUrl(manga.id, coverFileName),
    status: attrs.status || "unknown",
    year: attrs.year || null,
    score: null,
    popularity: null,
    providersAvailable: ["mangadex"],
    matchConfidence: 1,
    adult: isAdult,
    chapters: null,
    volumes: null,
    originLanguage: "jp",
    readingDirection: attrs.originalLanguage === "ko" ? "rtl" : attrs.originalLanguage === "zh" ? "ltr" : "rtl",
    providerSource: "mangadex",
  };
}

const CONTENT_RATINGS = ["safe", "suggestive", "moderate", "erotica"];

const STATUS_MAP: Record<string, string> = {
  ongoing: "ongoing", completed: "completed", hiatus: "hiatus", cancelled: "cancelled",
};

const TAG_CACHE = new Map<string, string>();

async function getTagId(name: string): Promise<string | null> {
  const lower = name.toLowerCase();
  if (TAG_CACHE.has(lower)) return TAG_CACHE.get(lower)!;
  try {
    const data = await mdFetch<any>("/tag");
    for (const tag of data.data || []) {
      const en = tag.attributes?.name?.en?.toLowerCase();
      const fr = tag.attributes?.name?.fr?.toLowerCase();
      TAG_CACHE.set(en, tag.id);
      TAG_CACHE.set(fr, tag.id);
    }
    return TAG_CACHE.get(lower) || null;
  } catch { return null; }
}

export async function searchManga(query: string, page: number = 1, limit: number = 20, options: Record<string, any> = {}): Promise<MangaSearchResult> {
  const offset = (page - 1) * limit;
  const params: Record<string, any> = {
    limit, offset,
    "availableTranslatedLanguage[]": "fr",
    "contentRating[]": ["safe", "suggestive"],
    "includes[]": "cover_art",
  };

  const mode = options.mode || "search";

  if (mode === "search" && query.trim()) {
    params.title = query.trim();
    params["order[relevance]"] = "desc";
  } else if (mode === "latest" || mode === "new-chap" || mode === "added") {
    params["order[updatedAt]"] = "desc";
  } else if (mode === "popular" || mode === "trending") {
    params["order[followedCount]"] = "desc";
  } else {
    params["order[followedCount]"] = "desc";
  }

  if (options.genre && typeof options.genre === "string") {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(options.genre)
      ? options.genre
      : await getTagId(options.genre);
    if (uuid) {
      params["includedTags[]"] = uuid;
      params["includedTagsMode"] = "AND";
    }
  }

  if (options.statuses?.length) {
    const s = Array.isArray(options.statuses) ? options.statuses[0] : options.statuses;
    params.status = STATUS_MAP[s.toLowerCase()] || s;
  }

  const type = options.mangaType || options.category;
  if (type === "manhwa") params.originalLanguage = "ko";
  else if (type === "manhua") params.originalLanguage = "zh";
  else if (type === "comics") params.originalLanguage = "en";

  if (options.year) params.year = options.year;
  if (options.adult) params["contentRating[]"] = CONTENT_RATINGS;

  try {
    const data = await mdFetch<any>("/manga", params);
    const items = (data.data || []).map(mapMangaDexItem);
    const total = data.total || 0;
    return {
      query: query.trim(),
      page, limit,
      partial: false,
      failedProviders: [],
      results: items,
      currentPage: page,
      totalPages: Math.ceil(total / limit) || 1,
      hasNextPage: offset + limit < total,
      source: "mangadex",
    };
  } catch (e) {
    return { query: query.trim(), page, limit, partial: false, failedProviders: ["mangadex"], results: [], currentPage: page, totalPages: 1, hasNextPage: false, source: "mangadex" };
  }
}

export async function getMangaDetail(id: string, _options?: Record<string, any>): Promise<MangaDetailResponse> {
  const data = await mdFetch<any>(`/manga/${id}`, { "includes[]": ["cover_art", "author", "artist", "tag"] });
  const manga = data.data;
  const attrs = manga.attributes || {};
  const title = attrs.title || {};
  const canonicalTitle = title.fr || title.en || Object.values(title)[0] as string || "Inconnu";
  const coverRel = (manga.relationships || []).find((r: any) => r.type === "cover_art");
  const coverFileName = coverRel?.attributes?.fileName;
  const tags = attrs.tags?.map((t: any) => t.attributes?.name?.en).filter(Boolean) || [];
  const authors = (manga.relationships || []).filter((r: any) => r.type === "author").map((r: any) => r.attributes?.name).filter(Boolean);

  return {
    success: true,
    id: manga.id,
    detail: {
      mediaType: "manga",
      anilistId: 0,
      canonicalTitle,
      title: { fr: title.fr, en: title.en, native: title.ja },
      status: attrs.status || "unknown",
      genres: tags,
      themes: [],
      origin: null,
      originLanguage: "jp",
      adult: tags.some((t: string) => t === "Pornographic"),
      yearStart: attrs.year || null,
      yearEnd: null,
      score: null,
      popularity: null,
      coverImage: getCoverUrl(manga.id, coverFileName),
      providersAvailable: ["mangadex"],
      synopsis: attrs.description?.fr || attrs.description?.en || null,
      authors,
      artists: [],
      publishers: [],
      serialization: null,
      totalChapters: null,
      totalVolumes: null,
      latestChapter: null,
      lastUpdatedAt: attrs.updatedAt || null,
      languagesAvailable: ["fr"],
      providerCoverage: { available: ["mangadex"], failed: [] },
      matchConfidence: 1,
      matchedBy: "provider",
    },
  };
}

export async function getMangaChapters(id: string, _providers?: string, _language?: string, _options?: Record<string, any>): Promise<MangaChapterResponse> {
  const data = await mdFetch<any>(`/manga/${id}/feed`, {
    limit: 100, offset: 0,
    "translatedLanguage[]": "fr",
    "order[chapter]": "desc",
    "includes[]": ["scanlation_group"],
  });

  const chapters = (data.data || []).map((ch: any) => {
    const a = ch.attributes || {};
    const groupRel = (ch.relationships || []).find((r: any) => r.type === "scanlation_group");
    return {
      chapterKey: ch.id,
      anilistId: 0,
      provider: "mangadex",
      providerChapterId: ch.id,
      number: a.chapter ? parseFloat(a.chapter) : null,
      volume: a.volume ? parseFloat(a.volume) : null,
      title: a.title || null,
      language: "fr",
      scanlator: groupRel?.attributes?.name || null,
      releaseDate: a.publishAt || null,
      pageCount: a.pages || null,
      canonicalOrder: a.chapter ? parseFloat(a.chapter) : 0,
      isOfficial: false,
      isPremium: false,
    };
  });

  return {
    success: true,
    anilistId: 0,
    partial: false,
    failedProviders: [],
    chapters,
    mappedChapters: chapters.map((ch: any) => ({
      chapterNumber: ch.number,
      chapterTitle: ch.title,
      volume: ch.volume,
      canonicalOrder: ch.canonicalOrder,
      sources: [{ provider: "mangadex", chapterKey: ch.chapterKey, providerChapterId: ch.providerChapterId, language: "fr", scanlator: ch.scanlator, releaseDate: ch.releaseDate }],
    })),
  };
}

export async function getMangaReadByKey(id: string, chapterKey: string, _options?: Record<string, any>): Promise<MangaReadResponse> {
  const data = await mdFetch<any>(`/at-home/server/${chapterKey}`);
  const baseUrl = data.baseUrl || "https://uploads.mangadex.org";
  const chapter = data.chapter || {};

  const useDataSaver = !chapter.data || chapter.data.length === 0;
  const filenames = useDataSaver
    ? (chapter.dataSaver || [])
    : (chapter.data || []);
  const dataPath = useDataSaver ? "data-saver" : "data";

  const pages: MangaPage[] = filenames.map((filename: string, i: number) => ({
    pageNumber: i + 1,
    imageUrl: `${baseUrl}/${dataPath}/${chapter.hash}/${filename}`,
    proxiedImageUrl: null,
    width: null,
    height: null,
  }));

  if (pages.length === 0) {
    return {
      success: false,
      data: {
        pages: [],
        chapter: {
          chapterKey,
          anilistId: 0,
          provider: "mangadex",
          providerChapterId: chapterKey,
          number: chapter.chapter ? parseFloat(chapter.chapter) : null,
          title: null,
          language: "fr",
        },
        readMeta: {
          provider: "mangadex",
          fetchedAt: new Date().toISOString(),
          fallbackUsed: false,
        },
      },
      guidance: {
        code: "MANGADEX_NO_PAGES",
        message: "Ce chapitre ne contient aucune page disponible sur MangaDex. Il a peut-être été supprimé ou n'est pas encore publié.",
        retryable: true,
        attemptedProviders: ["mangadex"],
      },
    };
  }

  return {
    success: true,
    data: {
      pages,
      chapter: {
        chapterKey,
        anilistId: 0,
        provider: "mangadex",
        providerChapterId: chapterKey,
        number: chapter.chapter ? parseFloat(chapter.chapter) : null,
        title: null,
        language: "fr",
      },
      readMeta: {
        provider: "mangadex",
        fetchedAt: new Date().toISOString(),
        fallbackUsed: useDataSaver,
      },
    },
  };
}

export async function getAtsuFilters(): Promise<any> { return { genres: [], types: [], statuses: [] }; }
export async function getMangaFilterSchema(): Promise<any> { return { facets: [], sorts: [] }; }
export async function getMangaFilterCounts(_query: string): Promise<any> { return { query: _query, groups: [] }; }
export function parseMangaSearchProvider(value: unknown, fallback: string = "mangadex"): string {
  return String(value || fallback);
}
