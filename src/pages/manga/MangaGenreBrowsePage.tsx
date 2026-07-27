import { useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Compass, Loader2 } from "lucide-react";
import { Background } from "@/components/layout/Background";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/button";
import { CardSkeleton } from "@/components/ui/skeleton-custom";
import { UnifiedMediaCard, type UnifiedMediaCardProps } from "@/components/UnifiedMediaCard";
import { cn } from "@/lib/utils";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { useContentSafetySettings } from "@/hooks/useContentSafetySettings";
import {
  getAtsuFilters,
  getMangaFilterCounts,
  getMangaFilterSchema,
  parseMangaSearchProvider,
  searchManga,
  type MangaFeedTimeWindow,
  type MangaSearchProvider,
  type MangaSearchMode,
  type MangaSortOption,
} from "@/services/manga.service";
import type { MangaSearchItem, MangaSearchResult } from "@/types/manga";

const BASE_GENRE_PRESETS = [
  "",
  "action",
  "romance",
  "fantasy",
  "thriller",
  "horror",
  "comedy",
  "adventure",
  "mystery",
  "drama",
  "historical",
  "isekai",
  "sports",
  "martial arts",
];

const HENTAI_GENRE = "hentai";

const PROVIDER_OPTIONS: Array<{ value: MangaSearchProvider; label: string }> = [
  { value: "all", label: "Tous les fournisseurs" },
  { value: "mapped", label: "Mapped" },
  { value: "atsu", label: "Atsu" },
  { value: "mangafire", label: "MangaFire" },
  { value: "mangaball", label: "MangaBall" },
  { value: "allmanga", label: "AllManga" },
];

const TYPE_OPTIONS = [
  { value: "all", label: "Tous les types" },
  { value: "manga", label: "Manga" },
  { value: "manhwa", label: "Manhwa" },
  { value: "manhua", label: "Manhua" },
  { value: "comics", label: "Comics" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "Tous les statuts" },
  { value: "ongoing", label: "En cours" },
  { value: "completed", label: "Terminé" },
  { value: "hiatus", label: "En pause" },
  { value: "cancelled", label: "Annulé" },
  { value: "unreleased", label: "Non publié" },
] as const;

const FEED_MODE_OPTIONS = [
  { value: "auto", label: "Auto (Genre/Découverte)" },
  { value: "latest", label: "Récents" },
  { value: "added", label: "Ajoutés récemment" },
  { value: "new-chap", label: "Nouveaux chapitres" },
  { value: "recent", label: "Lus récemment" },
  { value: "foryou", label: "Pour vous" },
  { value: "popular", label: "Populaire" },
  { value: "recommendation", label: "Recommandation" },
  { value: "origin", label: "Par origine" },
  { value: "random", label: "Sélection aléatoire" },
] as const;

const FEED_WINDOW_OPTIONS: Array<{ value: MangaFeedTimeWindow; label: string }> = [
  { value: "day", label: "Quotidien" },
  { value: "week", label: "Hebdomadaire" },
  { value: "month", label: "Mensuel" },
  { value: "all", label: "Tout le temps" },
];

const ORIGIN_OPTIONS = [
  { value: "all", label: "Toutes les origines" },
  { value: "jp", label: "Japon (Manga)" },
  { value: "kr", label: "Corée (Manhwa)" },
  { value: "zh", label: "Chine (Manhua)" },
] as const;

const SORT_LABELS: Record<MangaSortOption, string> = {
  relevance: "Pertinence",
  trending: "Tendance",
  latestUpdate: "Dernière mise à jour",
  rating: "Meilleure note",
  popularity: "Popularité",
  chapterCount: "Nombre de chapitres",
};

type MangaTypeFilter = (typeof TYPE_OPTIONS)[number]["value"];
type MangaStatusFilter = (typeof STATUS_OPTIONS)[number]["value"];
type MangaSortFilter = "default" | MangaSortOption;
type MangaDiscoverFeedMode = "auto" | Extract<MangaSearchMode, "latest" | "added" | "new-chap" | "recent" | "foryou" | "popular" | "recommendation" | "origin" | "random">;
type MangaOriginFilter = (typeof ORIGIN_OPTIONS)[number]["value"];

function normalizeProvider(value: string | null): MangaSearchProvider {
  return parseMangaSearchProvider(value, "all");
}

function normalizeType(value: string | null): MangaTypeFilter {
  const lowered = String(value || "all").trim().toLowerCase();
  if (lowered === "manwha" || lowered === "manwah") return "manhwa";
  if (TYPE_OPTIONS.some((option) => option.value === lowered)) {
    return lowered as MangaTypeFilter;
  }
  return "all";
}

function normalizeStatus(value: string | null): MangaStatusFilter {
  const lowered = String(value || "all").trim().toLowerCase();
  if (STATUS_OPTIONS.some((option) => option.value === lowered)) {
    return lowered as MangaStatusFilter;
  }
  return "all";
}

function normalizeSort(value: string | null): MangaSortFilter {
  const lowered = String(value || "default").trim().toLowerCase();
  if (lowered === "default") return "default";
  if (Object.keys(SORT_LABELS).includes(lowered)) {
    return lowered as MangaSortOption;
  }
  return "default";
}

function normalizeFeedMode(value: string | null): MangaDiscoverFeedMode {
  const lowered = String(value || "auto").trim().toLowerCase();
  if (FEED_MODE_OPTIONS.some((option) => option.value === lowered)) {
    return lowered as MangaDiscoverFeedMode;
  }
  return "auto";
}

function normalizeFeedWindow(value: string | null): MangaFeedTimeWindow {
  const lowered = String(value || "day").trim().toLowerCase();
  if (FEED_WINDOW_OPTIONS.some((option) => option.value === lowered)) {
    return lowered as MangaFeedTimeWindow;
  }
  return "day";
}

function normalizeOrigin(value: string | null): MangaOriginFilter {
  const lowered = String(value || "all").trim().toLowerCase();
  if (ORIGIN_OPTIONS.some((option) => option.value === lowered)) {
    return lowered as MangaOriginFilter;
  }
  return "all";
}

function parsePositiveNumberParam(value: string | null): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return parsed;
}

function formatCount(count: number | undefined): string {
  if (!Number.isFinite(count) || !count || count <= 0) return "";
  return ` (${count.toLocaleString()})`;
}

function normalizeStatusValue(value: unknown): MangaStatusFilter | "unknown" {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("ongoing") || normalized.includes("releasing")) return "ongoing";
  if (normalized.includes("completed") || normalized.includes("finished")) return "completed";
  if (normalized.includes("hiatus")) return "hiatus";
  if (normalized.includes("cancel")) return "cancelled";
  if (normalized.includes("unreleased") || normalized.includes("not")) return "unreleased";
  return "unknown";
}

function toMangaCard(item: MangaSearchItem): UnifiedMediaCardProps["item"] | null {
  const title = item.canonicalTitle || item.title?.english || item.title?.romaji || item.title?.native;
  const id = String(item.id || item.anilistId || item.malId || "").trim();
  if (!title || !id) return null;

  return {
    id,
    name: title,
    poster: item.poster || "",
    type: item.mediaType || "manga",
    status: item.status || undefined,
    rating: typeof item.score === "number" && Number.isFinite(item.score) ? (item.score / 10).toFixed(1) : undefined,
    chapters: typeof item.chapters === "number" && item.chapters > 0 ? item.chapters : undefined,
    malId: typeof item.malId === "number" ? item.malId : undefined,
    anilistId: typeof item.anilistId === "number" ? item.anilistId : undefined,
    mediaType: "manga",
    isAdult: Boolean(item.adult),
  };
}

function dedupeCards(items: UnifiedMediaCardProps["item"][]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = String(item.anilistId ?? item.malId ?? item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function formatGenreLabel(genre: string): string {
  if (!genre) return "Tous les genres";
  return genre.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

async function fetchGenreCatalogPage(
  page: number,
  genre: string,
  provider: MangaSearchProvider,
  mangaType: MangaTypeFilter,
  mangaStatus: MangaStatusFilter,
  sort: MangaSortFilter,
  feedMode: MangaDiscoverFeedMode,
  feedWindow: MangaFeedTimeWindow,
  feedOrigin: MangaOriginFilter,
  minYear: number,
  minScore: number,
  minChapters: number,
  canShowAdult: boolean,
): Promise<MangaSearchResult> {
  const limit = 24;
  const isAdultGenre = genre === HENTAI_GENRE;
  const statuses = mangaStatus !== "all" ? [mangaStatus] : undefined;
  const sortValue = sort !== "default" ? sort : undefined;
  const effectiveProvider = isAdultGenre ? "atsu" : provider;

  if (isAdultGenre && !canShowAdult) {
    return {
      query: genre,
      page,
      limit,
      partial: false,
      failedProviders: [],
      results: [],
      currentPage: page,
      totalPages: page,
      hasNextPage: false,
      source: "genre",
    };
  }

  if (feedMode !== "auto") {
    return searchManga("", page, limit, {
      mode: feedMode,
      provider: effectiveProvider,
      mangaType,
      adult: isAdultGenre,
      statuses,
      sort: sortValue,
      timeWindow:
        feedMode === "foryou" || feedMode === "recent" || feedMode === "popular"
          ? feedWindow
          : undefined,
      origin: feedMode === "origin" && feedOrigin !== "all" ? feedOrigin : undefined,
      minYear,
      minScore,
      minChapters,
      requiresQuery: false,
    });
  }

  if (genre) {
    const supportsGenreMode = provider === "all" || provider === "atsu" || provider === "mangafire" || provider === "allmanga";
    if (supportsGenreMode) {
      const genreMode = await searchManga("", page, limit, {
        mode: "genre",
        provider: effectiveProvider,
        genre,
        mangaType,
        adult: isAdultGenre,
        statuses,
        sort: sortValue,
        minYear,
        minScore,
        minChapters,
        requiresQuery: false,
      });

      if (Array.isArray(genreMode?.results) && genreMode.results.length > 0) {
        return genreMode;
      }
    }

    return searchManga(`${genre} manga`, page, limit, {
      mode: "search",
      provider: effectiveProvider,
      mangaType,
      adult: isAdultGenre,
      statuses,
      sort: sortValue,
      minYear,
      minScore,
      minChapters,
    });
  }

  if (provider !== "all") {
    return searchManga("", page, limit, {
      mode: "latest",
      provider,
      mangaType,
      statuses,
      sort: sortValue,
      minYear,
      minScore,
      minChapters,
      requiresQuery: false,
    });
  }

  return searchManga("", page, limit, {
    mode: "explore",
    provider,
    mangaType,
    statuses,
    sort: sortValue,
    minYear,
    minScore,
    minChapters,
    requiresQuery: false,
  });
}

export default function MangaGenreBrowsePage() {
  const navigate = useNavigate();
  const isNative = useIsNativeApp();
  const { settings: contentSafetySettings } = useContentSafetySettings();
  const { genre: routeGenre } = useParams<{ genre?: string }>();
  const [searchParams, setSearchParams] = useSearchParams();

  const canShowAdultEverywhere = contentSafetySettings.showAdultEverywhere;

  const { data: atsuFilterSchema } = useQuery({
    queryKey: ["manga-discover-atsu-filters"],
    queryFn: getAtsuFilters,
    staleTime: 30 * 60 * 1000,
  });

  const { data: mangaFilterSchema } = useQuery({
    queryKey: ["manga-discover-filter-schema"],
    queryFn: getMangaFilterSchema,
    staleTime: 30 * 60 * 1000,
  });

  const normalizedRouteGenre = routeGenre ? decodeURIComponent(routeGenre).trim().toLowerCase() : "";
  const queryGenre = String(searchParams.get("genre") || "").trim().toLowerCase();
  const activeGenre = normalizedRouteGenre || queryGenre;
  const isAdultGenre = activeGenre === HENTAI_GENRE;
  const isAdultGenreLocked = isAdultGenre && !canShowAdultEverywhere;

  const provider = normalizeProvider(searchParams.get("provider"));
  const feedMode = normalizeFeedMode(searchParams.get("feed"));
  const feedWindow = normalizeFeedWindow(searchParams.get("window"));
  const feedOrigin = normalizeOrigin(searchParams.get("origin"));
  const mangaType = normalizeType(searchParams.get("type"));
  const mangaStatus = normalizeStatus(searchParams.get("status"));
  const sortMode = normalizeSort(searchParams.get("sort"));
  const minYear = parsePositiveNumberParam(searchParams.get("minYear"));
  const minScore = parsePositiveNumberParam(searchParams.get("minScore"));
  const minChapters = parsePositiveNumberParam(searchParams.get("minChapters"));

  const facetQueryText = useMemo(() => {
    if (activeGenre) return `${activeGenre} manga`;
    if (mangaType !== "all") return mangaType;
    return "manga";
  }, [activeGenre, mangaType]);

  const { data: mangaFilterCounts } = useQuery({
    queryKey: ["manga-discover-filter-counts", facetQueryText],
    queryFn: () => getMangaFilterCounts(facetQueryText),
    enabled: facetQueryText.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const genrePresets = useMemo(() => {
    const fromSchema = Array.isArray(atsuFilterSchema?.genres)
      ? atsuFilterSchema.genres
          .map((genre) => String(genre?.slug || "").trim().toLowerCase())
          .filter(Boolean)
      : [];

    const fallbackGenres = BASE_GENRE_PRESETS.map((genre) => String(genre).trim().toLowerCase()).filter(Boolean);
    const merged = fromSchema.length > 0 ? fromSchema : fallbackGenres;
    const unique = Array.from(new Set(merged));

    if (canShowAdultEverywhere && !unique.includes(HENTAI_GENRE)) {
      unique.push(HENTAI_GENRE);
    }

    const safeGenres = canShowAdultEverywhere
      ? unique
      : unique.filter((genre) => genre !== HENTAI_GENRE);

    return ["", ...safeGenres];
  }, [atsuFilterSchema, canShowAdultEverywhere]);

  const availableSortOptions = useMemo(() => {
    const schemaSorts = Array.isArray(mangaFilterSchema?.sorts)
      ? mangaFilterSchema.sorts.filter((sort): sort is MangaSortOption => sort in SORT_LABELS)
      : [];

    const baseSorts = schemaSorts.length > 0 ? schemaSorts : (Object.keys(SORT_LABELS) as MangaSortOption[]);

    return [
      { value: "default" as const, label: "Tri par défaut" },
      ...baseSorts.map((sort) => ({ value: sort, label: SORT_LABELS[sort] })),
    ];
  }, [mangaFilterSchema]);

  const facetCountLookup = useMemo(() => {
    const lookup = new Map<string, Map<string, number>>();
    const groups = Array.isArray(mangaFilterCounts?.groups) ? mangaFilterCounts.groups : [];

    groups.forEach((group) => {
      const key = String(group?.key || "").toLowerCase();
      if (!key) return;

      const valueMap = new Map<string, number>();
      const counts = Array.isArray(group?.counts) ? group.counts : [];

      counts.forEach((entry) => {
        const value = String(entry?.value || "").toLowerCase();
        const count = Number(entry?.count);
        if (!value || !Number.isFinite(count)) return;
        valueMap.set(value, count);
      });

      lookup.set(key, valueMap);
    });

    return lookup;
  }, [mangaFilterCounts]);

  const getFacetCount = (keys: string[], value: string) => {
    const normalizedValue = String(value || "").toLowerCase();
    if (!normalizedValue) return undefined;

    for (const key of keys) {
      const group = facetCountLookup.get(String(key || "").toLowerCase());
      const count = group?.get(normalizedValue);
      if (typeof count === "number") {
        return count;
      }
    }

    return undefined;
  };

  const genreCountMap = useMemo(() => {
    const map = new Map<string, number>();
    ["genre", "genres"].forEach((key) => {
      const group = facetCountLookup.get(key);
      if (!group) return;
      group.forEach((count, value) => {
        map.set(value, count);
      });
    });
    return map;
  }, [facetCountLookup]);

  const hasRouteGenre = Boolean(normalizedRouteGenre);

  const activeFeedLabel = useMemo(() => {
    const matched = FEED_MODE_OPTIONS.find((option) => option.value === feedMode);
    return matched?.label || "Auto (Genre/Découverte)";
  }, [feedMode]);

  const setParamAndNavigate = (updates: Record<string, string | null>, nextGenre?: string) => {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(updates).forEach(([key, value]) => {
      if (!value || value === "all" || value === "default" || value === "auto" || value === "day") nextParams.delete(key);
      else nextParams.set(key, value);
    });

    const targetGenre = typeof nextGenre === "string" ? nextGenre : activeGenre;

    if (targetGenre) {
      nextParams.set("genre", targetGenre);
      const qs = nextParams.toString();
      navigate(`/manga/genre/${encodeURIComponent(targetGenre)}${qs ? `?${qs}` : ""}`);
      return;
    }

    nextParams.delete("genre");
    const qs = nextParams.toString();
    if (hasRouteGenre) {
      navigate(`/manga/discover${qs ? `?${qs}` : ""}`);
    } else {
      setSearchParams(nextParams);
    }
  };

  const discoverQuery = useInfiniteQuery({
    queryKey: [
      "manga-discover-catalog",
      activeGenre,
      provider,
      feedMode,
      feedWindow,
      feedOrigin,
      mangaType,
      mangaStatus,
      sortMode,
      minYear,
      minScore,
      minChapters,
      canShowAdultEverywhere,
    ],
    queryFn: ({ pageParam = 1 }) =>
      fetchGenreCatalogPage(
        pageParam,
        activeGenre,
        provider,
        mangaType,
        mangaStatus,
        sortMode,
        feedMode,
        feedWindow,
        feedOrigin,
        minYear,
        minScore,
        minChapters,
        canShowAdultEverywhere,
      ),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.hasNextPage) return undefined;
      const current = typeof lastPage?.currentPage === "number" ? lastPage.currentPage : allPages.length;
      return current + 1;
    },
    staleTime: 2 * 60 * 1000,
  });

  const cards = useMemo(() => {
    const rows = discoverQuery.data?.pages.flatMap((page) => (Array.isArray(page?.results) ? page.results : [])) || [];
    const minScoreRaw = minScore > 0 ? minScore * 10 : 0;

    const filteredRows = rows.filter((item) => {
      if (!canShowAdultEverywhere && item?.adult) return false;

      if (mangaStatus !== "all" && normalizeStatusValue(item?.status) !== mangaStatus) {
        return false;
      }

      if (minYear > 0) {
        const yearValue = Number(item?.year);
        if (!Number.isFinite(yearValue) || yearValue < minYear) return false;
      }

      if (minScoreRaw > 0) {
        const scoreValue = Number(item?.score);
        if (!Number.isFinite(scoreValue) || scoreValue < minScoreRaw) return false;
      }

      if (minChapters > 0) {
        const chapterValue = Number(item?.chapters);
        if (!Number.isFinite(chapterValue) || chapterValue < minChapters) return false;
      }

      return true;
    });

    const sortedRows = sortMode === "default"
      ? filteredRows
      : [...filteredRows].sort((left, right) => {
          if (sortMode === "rating") {
            return Number(right?.score || 0) - Number(left?.score || 0);
          }
          if (sortMode === "popularity" || sortMode === "trending") {
            return Number(right?.popularity || 0) - Number(left?.popularity || 0);
          }
          if (sortMode === "chapterCount") {
            return Number(right?.chapters || 0) - Number(left?.chapters || 0);
          }
          if (sortMode === "latestUpdate") {
            const rightYear = Number(right?.year || 0);
            const leftYear = Number(left?.year || 0);
            if (rightYear !== leftYear) return rightYear - leftYear;
            return Number(right?.chapters || 0) - Number(left?.chapters || 0);
          }
          return 0;
        });

    const mapped = sortedRows.map(toMangaCard).filter(Boolean) as UnifiedMediaCardProps["item"][];
    return dedupeCards(mapped);
  }, [
    discoverQuery.data,
    canShowAdultEverywhere,
    mangaStatus,
    minYear,
    minScore,
    minChapters,
    sortMode,
  ]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {!isNative && <Background />}
      {!isNative && <Sidebar />}

      <main
        className={cn(
          "relative z-10 pr-6 py-6 max-w-[1800px] mx-auto pb-24 md:pb-6",
          isNative ? "pl-6" : "pl-6 md:pl-32",
        )}
      >
        <Header />

        <div className="mb-6 flex items-center justify-between gap-3 flex-wrap">
          <button
            type="button"
            onClick={() => navigate("/manga")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à l'accueil manga
          </button>

          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-[0.12em] text-muted-foreground">
            <Compass className="w-3.5 h-3.5" />
            Explorateur de genres et fournisseurs
          </div>
        </div>

        <GlassPanel className="p-5 mb-6 border-white/10 bg-white/[0.02]">
          <h1 className="text-2xl md:text-3xl font-display font-black tracking-tight">
            {feedMode !== "auto"
              ? `${activeFeedLabel} - Flux manga`
              : activeGenre
                ? `Catalogue ${formatGenreLabel(activeGenre)}`
                : "Catalogue de découverte manga"}
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Parcourez les genres dynamiques ou passez aux flux des fournisseurs, puis affinez avec des filtres.
          </p>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Flux</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={feedMode}
                onChange={(event) => setParamAndNavigate({ feed: event.target.value })}
              >
                {FEED_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Fournisseur</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={provider}
                onChange={(event) => setParamAndNavigate({ provider: event.target.value })}
              >
                {PROVIDER_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {`${option.label}${formatCount(getFacetCount(["provider", "providers"], option.value))}`}
                  </option>
                ))}
              </select>
            </div>

            {(feedMode === "foryou" || feedMode === "recent" || feedMode === "popular") && (
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Fenêtre de flux</label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={feedWindow}
                  onChange={(event) => setParamAndNavigate({ window: event.target.value })}
                >
                  {FEED_WINDOW_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {feedMode === "origin" && (
              <div>
                <label className="text-xs uppercase tracking-wider text-muted-foreground">Origine</label>
                <select
                  className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                  value={feedOrigin}
                  onChange={(event) => setParamAndNavigate({ origin: event.target.value })}
                >
                  {ORIGIN_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Type</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={mangaType}
                onChange={(event) => setParamAndNavigate({ type: event.target.value })}
              >
                {TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {`${option.label}${
                      option.value === "all" ? "" : formatCount(getFacetCount(["type", "types"], option.value))
                    }`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Statut</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={mangaStatus}
                onChange={(event) => setParamAndNavigate({ status: event.target.value })}
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {`${option.label}${
                      option.value === "all" ? "" : formatCount(getFacetCount(["status", "statuses"], option.value))
                    }`}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Trier</label>
              <select
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={sortMode}
                onChange={(event) => setParamAndNavigate({ sort: event.target.value })}
              >
                {availableSortOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Année min</label>
              <input
                type="number"
                min={1900}
                max={new Date().getFullYear() + 1}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={minYear > 0 ? String(minYear) : ""}
                placeholder="Tout"
                onChange={(event) => {
                  const next = Math.floor(parsePositiveNumberParam(event.target.value));
                  setParamAndNavigate({ minYear: next > 0 ? String(next) : null });
                }}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Note min</label>
              <input
                type="number"
                min={0}
                max={10}
                step={0.5}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={minScore > 0 ? String(minScore) : ""}
                placeholder="Tout"
                onChange={(event) => {
                  const next = parsePositiveNumberParam(event.target.value);
                  setParamAndNavigate({ minScore: next > 0 ? String(next) : null });
                }}
              />
            </div>

            <div>
              <label className="text-xs uppercase tracking-wider text-muted-foreground">Chapitres min</label>
              <input
                type="number"
                min={0}
                step={1}
                className="mt-1 w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
                value={minChapters > 0 ? String(minChapters) : ""}
                placeholder="Tout"
                onChange={(event) => {
                  const next = Math.floor(parsePositiveNumberParam(event.target.value));
                  setParamAndNavigate({ minChapters: next > 0 ? String(next) : null });
                }}
              />
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                className="w-full"
                onClick={() =>
                  setParamAndNavigate(
                    {
                      provider: null,
                      feed: null,
                      window: null,
                      origin: null,
                      type: null,
                      status: null,
                      sort: null,
                      minYear: null,
                      minScore: null,
                      minChapters: null,
                    },
                    "",
                  )
                }
              >
                Réinitialiser les filtres
              </Button>
            </div>
          </div>
        </GlassPanel>

        <div className="mb-7 flex gap-2 overflow-x-auto no-scrollbar pb-2">
          {genrePresets.map((genre) => {
            const isActive = activeGenre === genre;
            return (
              <button
                key={`genre-chip-${genre || "all"}`}
                type="button"
                onClick={() => setParamAndNavigate({ feed: "auto", window: null, origin: null }, genre)}
                className={cn(
                  "px-3 py-1.5 rounded-full border text-xs uppercase tracking-wider whitespace-nowrap transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-white/15 text-muted-foreground hover:text-foreground hover:border-white/30",
                )}
              >
                {`${formatGenreLabel(genre)}${
                  genre ? formatCount(genreCountMap.get(genre.toLowerCase())) : ""
                }`}
              </button>
            );
          })}
        </div>

        {isAdultGenreLocked ? (
          <GlassPanel className="p-6 border border-rose-500/25 bg-rose-500/10">
            <p className="text-sm text-rose-200">
              La navigation hentai est verrouillée. Activez le contenu mature dans les paramètres pour voir ce genre.
            </p>
            <Button
              className="mt-3"
              onClick={() => navigate("/settings?tab=privacy#mature-content-controls")}
            >
              Ouvrir les paramètres de contenu mature
            </Button>
          </GlassPanel>
        ) : discoverQuery.isPending ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, index) => (
              <CardSkeleton key={`discover-loading-${index}`} />
            ))}
          </div>
        ) : discoverQuery.isError ? (
          <GlassPanel className="p-6 border border-red-500/20">
            <p className="text-sm text-red-300">Échec du chargement de ce catalogue. Essayez de changer de fournisseur ou de genre.</p>
          </GlassPanel>
        ) : cards.length > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {cards.map((card) => (
                <UnifiedMediaCard key={`discover-${card.id}`} item={card} />
              ))}
            </div>

            {discoverQuery.hasNextPage ? (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  onClick={() => discoverQuery.fetchNextPage()}
                  disabled={discoverQuery.isFetchingNextPage}
                >
                  {discoverQuery.isFetchingNextPage ? (
                    <span className="inline-flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement...
                    </span>
                  ) : (
                    "Charger plus"
                  )}
                </Button>
              </div>
            ) : null}
          </>
        ) : (
          <GlassPanel className="p-6 border border-dashed border-white/15">
            <p className="text-sm text-muted-foreground">
              Aucun titre trouvé pour cette combinaison de filtres. Essayez tous les fournisseurs ou changez de genre.
            </p>
          </GlassPanel>
        )}
      </main>

      {!isNative && <MobileNav />}
    </div>
  );
}
