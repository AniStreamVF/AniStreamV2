import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import { Background } from "@/components/layout/Background";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { useIsNativeApp } from "@/hooks/useIsNativeApp";
import { cn } from "@/lib/utils";
import { CardSkeleton } from "@/components/ui/skeleton-custom";
import { Input } from "@/components/ui/input";
import { Search, X, Loader2, Film, Play, Camera, SlidersHorizontal, Sparkles, BookOpen } from "lucide-react";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { searchAniListAnime, ALL_GENRES } from "@/lib/externalIntegrations";
import { useInfiniteSearch as useInfSearch } from "@/hooks/useAnimeData";
import { useInfiniteMangaSearch } from "@/hooks/useMangaData";
import { useRef, useCallback, useState, useEffect, useMemo } from "react";
import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { searchCharacters } from "@/services/character.service";
import { fetchProducerAnimes } from "@/services/home.service";
import { getAtsuFilters, parseMangaSearchProvider, type MangaSearchOptions } from "@/services/manga.service";
import { getProxiedImageUrl } from "@/lib/api";
import { UnifiedMediaCard } from "@/components/UnifiedMediaCard";
import { useContentSafetySettings } from "@/hooks/useContentSafetySettings";
import { inferMangaAdultFlag, isExplicitMangaSearchQuery } from "@/lib/contentSafety";

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const { producerName } = useParams<{ producerName?: string }>();
  const navigate = useNavigate();
  const isNative = useIsNativeApp();
  const decodedProducerName = useMemo(() => {
    if (!producerName) return "";

    try {
      return decodeURIComponent(producerName).trim();
    } catch {
      return producerName.trim();
    }
  }, [producerName]);
  const isProducerRoute = decodedProducerName.length > 0;

  const producerRequestCandidates = useMemo(() => {
    if (!decodedProducerName) return [];

    const slug = decodedProducerName
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');

    return Array.from(new Set([decodedProducerName, slug].map((value) => value.trim()).filter(Boolean)));
  }, [decodedProducerName]);

  const queryParam = searchParams.get("q") || decodedProducerName || "";
  const [query, setQuery] = useState(queryParam);
  const [searchInput, setSearchInput] = useState(queryParam);
  const [page, setPage] = useState(1);
  const [resultType, setResultType] = useState<'all' | 'anime' | 'manga' | 'character'>('all');
  const [animeTypeFilter, setAnimeTypeFilter] = useState<string>('all');
  const [animeStatusFilter, setAnimeStatusFilter] = useState<string>('all');
  const [animeGenreFilter, setAnimeGenreFilter] = useState<string>('all');
  const [animeLanguageFilter, setAnimeLanguageFilter] = useState<string>('all');
  const [animeRatedFilter, setAnimeRatedFilter] = useState<string>('all');
  const [animeScoreFilter, setAnimeScoreFilter] = useState<string>('all');
  const [animeSeasonFilter, setAnimeSeasonFilter] = useState<string>('all');
  const [animeStartDateFilter, setAnimeStartDateFilter] = useState<string>('');
  const [animeEndDateFilter, setAnimeEndDateFilter] = useState<string>('');
  const [animeSortFilter, setAnimeSortFilter] = useState<string>('default');
  const [mangaTypeFilter, setMangaTypeFilter] = useState<string>('all');
  const [mangaStatusFilter, setMangaStatusFilter] = useState<string>('all');
  const [mangaFeedMode, setMangaFeedMode] = useState<
    'search' | 'latest' | 'added' | 'new-chap' | 'recent' | 'popular' | 'foryou' | 'recommendation' | 'origin' | 'random'
  >('search');
  const [mangaFeedWindow, setMangaFeedWindow] = useState<'day' | 'week' | 'month' | 'all'>('day');
  const [mangaOriginFilter, setMangaOriginFilter] = useState<'all' | 'jp' | 'kr' | 'zh'>('all');
  const [mangaCategoryFilter, setMangaCategoryFilter] = useState<string>('all');
  const [mangaGenreFilter, setMangaGenreFilter] = useState<string>('all');
  const [mangaLanguageFilter, setMangaLanguageFilter] = useState<string>('all');
  const [mangaAuthorFilter, setMangaAuthorFilter] = useState<string>('');
  const [mangaAdultFilter, setMangaAdultFilter] = useState(false);
  const [mangaVolumesOnly, setMangaVolumesOnly] = useState(false);
  const [mangaAtsuTypeFilter, setMangaAtsuTypeFilter] = useState<string>('all');
  const [mangaAtsuStatusFilter, setMangaAtsuStatusFilter] = useState<string>('all');
  const [mangaProviderFilter, setMangaProviderFilter] = useState<string>('all');
  const [minRating, setMinRating] = useState<number>(0);
  const [minReleaseYear, setMinReleaseYear] = useState<number>(0);
  const [sortMode, setSortMode] = useState<'relevance' | 'rating' | 'title' | 'popularity'>('relevance');
  const [onlyDub, setOnlyDub] = useState(false);
  const [imageConfidenceThreshold, setImageConfidenceThreshold] = useState<number>(0.85);
  const [useAniListAssist, setUseAniListAssist] = useState(false);
  const [aniListFormat, setAniListFormat] = useState<string>('all');
  const [aniListStatus, setAniListStatus] = useState<string>('all');
  const [aniListSeason, setAniListSeason] = useState<string>('all');
  const [aniListSeasonYear, setAniListSeasonYear] = useState<string>('');
  const [aniListCountry, setAniListCountry] = useState<string>('all');
  const [aniListSort, setAniListSort] = useState<string>('POPULARITY_DESC');
  const [aniListGenresText, setAniListGenresText] = useState<string>('');
  const [showAdvancedAssist, setShowAdvancedAssist] = useState(false);
  const [enableSecondaryResultStreams, setEnableSecondaryResultStreams] = useState(false);
  const shouldSearchAnime = resultType === 'all' || resultType === 'anime';
  const shouldSearchManga = (resultType === 'all' || resultType === 'manga') && !isProducerRoute;
  const shouldSearchCharacters = (resultType === 'all' || resultType === 'character') && !isProducerRoute;
  const shouldDelaySecondaryStreams = resultType === 'all' && query.length > 0 && !isProducerRoute;
  const shouldEnableMangaSearch =
    shouldSearchManga && (!shouldDelaySecondaryStreams || enableSecondaryResultStreams);
  const shouldEnableCharacterSearch =
    shouldSearchCharacters && (!shouldDelaySecondaryStreams || enableSecondaryResultStreams);
  const { settings: contentSafetySettings } = useContentSafetySettings();
  const explicitMangaQuery = useMemo(() => isExplicitMangaSearchQuery(query), [query]);

  const animeGenreOptions = useMemo(() => {
    const normalizeGenreValue = (value: string) => {
      const normalized = String(value || '').toLowerCase().trim();
      if (!normalized) return '';
      if (normalized === 'mahou shoujo') return 'magic';

      return normalized
        .replace(/&/g, '-and-')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    };

    return ALL_GENRES.map((genre) => ({
      label: genre,
      value: normalizeGenreValue(genre),
    })).filter((option, index, rows) => {
      if (!option.value) return false;
      return rows.findIndex((row) => row.value === option.value) === index;
    });
  }, []);

  const normalizeAnimeStatus = useCallback((value: string | undefined) => {
    const normalized = String(value || '').toLowerCase().replace(/[_\s]+/g, '-');

    if (normalized.includes('finished') || normalized.includes('completed')) return 'finished-airing';
    if (normalized.includes('currently') || normalized === 'airing' || normalized.includes('releasing')) return 'currently-airing';
    if (normalized.includes('not-yet') || normalized.includes('upcoming')) return 'not-yet-aired';

    return normalized;
  }, []);

  const normalizeAnimeGenre = useCallback((value: string | undefined) => {
    const normalized = String(value || '').toLowerCase().trim();
    if (!normalized) return '';
    if (normalized === 'mahou shoujo') return 'magic';

    return normalized
      .replace(/&/g, '-and-')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }, []);

  const normalizeAnimeSearchDate = useCallback((value: string): string | undefined => {
    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!match) return undefined;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
    if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;

    // HiAnime's date parser expects non-zero-padded month/day values.
    return `${year}-${month}-${day}`;
  }, []);

  const normalizedMangaTypeFilter = useMemo(() => {
    const normalized = String(mangaTypeFilter || '').toLowerCase();
    if (normalized === 'manwha' || normalized === 'manwah') return 'manhwa';
    return normalized;
  }, [mangaTypeFilter]);

  const normalizedMangaCategory = useMemo(() => {
    const normalized = String(mangaCategoryFilter || '').toLowerCase();
    if (normalized === 'manwha' || normalized === 'manwah') return 'manhwa';
    return normalized;
  }, [mangaCategoryFilter]);

  const remoteProviderFilter = useMemo(() => {
    return parseMangaSearchProvider(mangaProviderFilter, 'mapped');
  }, [mangaProviderFilter]);

  const localProviderFacetFilter = useMemo(() => {
    const normalized = String(mangaProviderFilter || '').toLowerCase();
    if (['all', 'mapped', 'atsu', 'mangafire', 'mangaball', 'allmanga'].includes(normalized)) {
      return 'all';
    }
    return normalized;
  }, [mangaProviderFilter]);

  const mangaFeedModeLabel = useMemo(() => {
    const labels: Record<string, string> = {
      search: 'recherche par requête',
      latest: 'dernières mises à jour',
      added: 'ajouté récemment',
      'new-chap': 'nouveaux chapitres',
      recent: 'lecture récente',
      popular: 'populaire',
      foryou: 'pour vous',
      recommendation: 'recommandation',
      origin: 'origine',
      random: 'sélections aléatoires',
    };

    return labels[mangaFeedMode] || mangaFeedMode;
  }, [mangaFeedMode]);

  const mangaSearchMode = useMemo<MangaSearchOptions['mode']>(() => {
    if (mangaAuthorFilter.trim()) return 'author';
    if (query.trim()) return 'search';
    if (mangaFeedMode !== 'search') return mangaFeedMode;
    if (mangaGenreFilter !== 'all') return 'genre';
    if (mangaCategoryFilter !== 'all') return 'category';
    if (normalizedMangaTypeFilter !== 'all' && !query.trim()) return 'category';
    if (mangaAdultFilter || mangaAtsuTypeFilter !== 'all' || mangaAtsuStatusFilter !== 'all') {
      return 'explore';
    }
    return 'search';
  }, [
    mangaAuthorFilter,
    mangaFeedMode,
    mangaGenreFilter,
    mangaCategoryFilter,
    normalizedMangaTypeFilter,
    query,
    mangaAdultFilter,
    mangaAtsuTypeFilter,
    mangaAtsuStatusFilter,
  ]);

  const animeBackendFilters = useMemo(() => {
    const filters: Record<string, string> = {};
    if (animeTypeFilter !== 'all') filters.type = animeTypeFilter;
    if (animeStatusFilter !== 'all') filters.status = animeStatusFilter;
    if (animeGenreFilter !== 'all') filters.genres = animeGenreFilter;
    if (animeLanguageFilter !== 'all') filters.language = animeLanguageFilter;
    if (animeRatedFilter !== 'all') filters.rated = animeRatedFilter;
    if (animeScoreFilter !== 'all') filters.score = animeScoreFilter;
    if (animeSeasonFilter !== 'all') filters.season = animeSeasonFilter;
    const startDate = normalizeAnimeSearchDate(animeStartDateFilter);
    const endDate = normalizeAnimeSearchDate(animeEndDateFilter);
    if (startDate) filters.start_date = startDate;
    if (endDate) filters.end_date = endDate;
    if (animeSortFilter !== 'default') filters.sort = animeSortFilter;
    return filters;
  }, [
    animeTypeFilter,
    animeStatusFilter,
    animeGenreFilter,
    animeLanguageFilter,
    animeRatedFilter,
    animeScoreFilter,
    animeSeasonFilter,
    animeStartDateFilter,
    animeEndDateFilter,
    animeSortFilter,
    normalizeAnimeSearchDate,
  ]);

  const mangaSearchOptions = useMemo<MangaSearchOptions>(() => {
    const types: string[] = [];
    if (mangaAtsuTypeFilter !== 'all') {
      types.push(mangaAtsuTypeFilter);
    }

    if (normalizedMangaTypeFilter !== 'all') {
      if (normalizedMangaTypeFilter === 'manga') types.push('Manga');
      if (normalizedMangaTypeFilter === 'manhwa') types.push('Manwha');
      if (normalizedMangaTypeFilter === 'manhua') types.push('Manhua');
      if (normalizedMangaTypeFilter === 'comics') types.push('OEL');
    }

    return {
      mode: mangaSearchMode,
      provider: remoteProviderFilter,
      category: normalizedMangaCategory !== 'all' ? normalizedMangaCategory : undefined,
      genre: mangaGenreFilter !== 'all' ? mangaGenreFilter : undefined,
      origin: mangaFeedMode === 'origin' && mangaOriginFilter !== 'all' ? mangaOriginFilter : undefined,
      language: mangaLanguageFilter !== 'all' ? mangaLanguageFilter : undefined,
      author: mangaAuthorFilter.trim() || undefined,
      adult: mangaAdultFilter,
      timeWindow:
        mangaFeedMode === 'foryou' || mangaFeedMode === 'recent' || mangaFeedMode === 'popular'
          ? mangaFeedWindow
          : undefined,
      types: types.length > 0 ? Array.from(new Set(types)) : undefined,
      statuses: mangaAtsuStatusFilter !== 'all' ? [mangaAtsuStatusFilter] : undefined,
      mangaType: normalizedMangaTypeFilter !== 'all' ? (normalizedMangaTypeFilter as any) : undefined,
      requiresQuery: mangaSearchMode === 'search',
    };
  }, [
    mangaSearchMode,
    remoteProviderFilter,
    normalizedMangaCategory,
    mangaGenreFilter,
    mangaFeedMode,
    mangaFeedWindow,
    mangaOriginFilter,
    mangaLanguageFilter,
    mangaAuthorFilter,
    mangaAdultFilter,
    mangaAtsuTypeFilter,
    mangaAtsuStatusFilter,
    normalizedMangaTypeFilter,
  ]);

  const { data: atsuFilterSchema } = useQuery({
    queryKey: ['atsu-filter-schema'],
    queryFn: getAtsuFilters,
    staleTime: 30 * 60 * 1000,
  });

  const atsuGenreOptions = useMemo(() => {
    const rows = Array.isArray(atsuFilterSchema?.genres) ? atsuFilterSchema.genres : [];
    return rows
      .map((row) => ({ label: row.name, value: row.slug }))
      .filter((row) => row.label && row.value)
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [atsuFilterSchema]);

  const atsuTypeOptions = useMemo(() => {
    const rows = Array.isArray(atsuFilterSchema?.types) ? atsuFilterSchema.types : [];
    return rows
      .map((row) => ({ label: row.name, value: row.name }))
      .filter((row) => row.label && row.value)
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [atsuFilterSchema]);

  const atsuStatusOptions = useMemo(() => {
    const rows = Array.isArray(atsuFilterSchema?.statuses) ? atsuFilterSchema.statuses : [];
    return rows
      .map((row) => ({ label: row.name, value: row.name }))
      .filter((row) => row.label && row.value)
      .sort((left, right) => left.label.localeCompare(right.label));
  }, [atsuFilterSchema]);

  const { 
    data: infiniteData, 
    fetchNextPage: fetchNextSearchPage,
    hasNextPage: hasNextSearchPage,
    isFetchingNextPage: isFetchingNextSearchPage,
    isLoading: isLoadingSearch,
  } = useInfSearch(query, animeBackendFilters, shouldSearchAnime && !isProducerRoute);

  const {
    data: producerInfiniteData,
    fetchNextPage: fetchNextProducerPage,
    hasNextPage: hasNextProducerPage,
    isFetchingNextPage: isFetchingNextProducerPage,
    isLoading: isLoadingProducer,
  } = useInfiniteQuery({
    queryKey: ['producer-search-infinite', producerRequestCandidates],
    queryFn: async ({ pageParam = 1 }) => {
      for (const candidate of producerRequestCandidates) {
        try {
          const response = await fetchProducerAnimes(candidate, Number(pageParam));
          if (Array.isArray(response?.animes) && response.animes.length > 0) {
            return response;
          }
        } catch {
          // Try next producer variant.
        }
      }

      return {
        producerName: decodedProducerName,
        animes: [],
        top10Animes: { today: [], week: [], month: [] },
        topAiringAnimes: [],
        currentPage: Number(pageParam),
        totalPages: Number(pageParam),
        hasNextPage: false,
      };
    },
    getNextPageParam: (lastPage) => {
      if (!lastPage || !lastPage.hasNextPage) return undefined;
      return lastPage.currentPage + 1;
    },
    initialPageParam: 1,
    enabled: shouldSearchAnime && isProducerRoute && producerRequestCandidates.length > 0,
    staleTime: 2 * 60 * 1000,
  });

  const hasNextAnimePage = isProducerRoute ? hasNextProducerPage : hasNextSearchPage;
  const isFetchingNextAnimePage = isProducerRoute ? isFetchingNextProducerPage : isFetchingNextSearchPage;
  const isLoadingAnime = isProducerRoute ? isLoadingProducer : isLoadingSearch;

  const {
    data: infiniteMangaData,
    fetchNextPage: fetchNextMangaPage,
    hasNextPage: hasNextMangaPage,
    isFetchingNextPage: isFetchingNextMangaPage,
    isLoading: isLoadingManga
  } = useInfiniteMangaSearch(query, 20, shouldEnableMangaSearch, mangaSearchOptions);

  const observer = useRef<IntersectionObserver>();
  const loadMoreLockRef = useRef(false);
  const scrollRef = useCallback((node: HTMLDivElement) => {
    if (isLoadingAnime || isLoadingManga) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      const entry = entries[0];
      if (!entry) return;

      if (!entry.isIntersecting) {
        loadMoreLockRef.current = false;
        return;
      }

      if (loadMoreLockRef.current) {
        return;
      }

      let didRequestNextPage = false;

      if (resultType === 'anime') {
        if (hasNextAnimePage && !isFetchingNextAnimePage) {
          if (isProducerRoute) {
            fetchNextProducerPage();
          } else {
            fetchNextSearchPage();
          }
          didRequestNextPage = true;
        }
      } else if (resultType === 'manga') {
        if (hasNextMangaPage && !isFetchingNextMangaPage) {
          fetchNextMangaPage();
          didRequestNextPage = true;
        }
      } else {
        if (hasNextAnimePage && !isFetchingNextAnimePage) {
          if (isProducerRoute) {
            fetchNextProducerPage();
          } else {
            fetchNextSearchPage();
          }
          didRequestNextPage = true;
        } else if (hasNextMangaPage && !isFetchingNextMangaPage) {
          fetchNextMangaPage();
          didRequestNextPage = true;
        }
      }

      if (didRequestNextPage) {
        loadMoreLockRef.current = true;
      }
    }, { rootMargin: '120px 0px' });
    if (node) observer.current.observe(node);
  }, [isLoadingAnime, hasNextAnimePage, isFetchingNextAnimePage, isProducerRoute, fetchNextProducerPage, fetchNextSearchPage, isLoadingManga, hasNextMangaPage, isFetchingNextMangaPage, fetchNextMangaPage, resultType]);

  const allAnimeResults = useMemo(() => {
    if (isProducerRoute) {
      return producerInfiniteData?.pages.flatMap(page => page.animes) || [];
    }

    return infiniteData?.pages.flatMap(page => page.animes) || [];
  }, [infiniteData, isProducerRoute, producerInfiniteData]);

  const allMangaResults = useMemo(() => {
    return (infiniteMangaData?.pages || []).flatMap((page: any) => {
      const results = Array.isArray(page?.results) ? page.results : [];

      return results
        .map((manga: any) => {
          const fallbackTitle =
            manga?.canonicalTitle ||
            manga?.title?.english ||
            manga?.title?.romaji ||
            manga?.title?.native;

          const normalizedId = manga?.id || manga?.anilistId || manga?.malId;
          if (!normalizedId || !fallbackTitle) return null;

          return {
            id: String(normalizedId),
            name: fallbackTitle,
            poster: manga?.poster || "",
            type: manga?.mediaType || manga?.type || "manga",
            status: manga?.status || undefined,
            year:
              typeof manga?.year === "number" ? manga.year : undefined,
            popularity:
              typeof manga?.popularity === "number" ? manga.popularity : undefined,
            providersAvailable: Array.isArray(manga?.providersAvailable)
              ? manga.providersAvailable
              : [],
            rating:
              typeof manga?.score === "number"
                ? (manga.score / 10).toFixed(1)
                : undefined,
            chapters:
              typeof manga?.chapters === "number" && manga.chapters > 0
                ? manga.chapters
                : undefined,
            volumes:
              typeof manga?.volumes === "number" && manga.volumes > 0
                ? manga.volumes
                : undefined,
            genres: Array.isArray(manga?.genres) ? manga.genres : [],
            providerSource:
              typeof manga?.providerSource === 'string' ? manga.providerSource : undefined,
            originLanguage:
              typeof manga?.originLanguage === 'string' ? manga.originLanguage.toLowerCase() : undefined,
            malId:
              typeof manga?.malId === "number" ? manga.malId : undefined,
            anilistId:
              typeof manga?.anilistId === "number" ? manga.anilistId : undefined,
            isAdult: inferMangaAdultFlag(manga),
          };
        })
        .filter(Boolean);
    });
  }, [infiniteMangaData]);
  const { data: characterSearch, isLoading: loadingCharacters } = useQuery({
    queryKey: ['character-search', query, page],
    queryFn: () => searchCharacters(query, page, 12),
    enabled: shouldEnableCharacterSearch && query.length > 1,
    staleTime: 2 * 60 * 1000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  const aniListGenres = useMemo(
    () => aniListGenresText.split(',').map((genre) => genre.trim()).filter(Boolean),
    [aniListGenresText]
  );

  const { data: aniListAssistResults = [], isLoading: loadingAniListAssist } = useQuery({
    queryKey: [
      'anilist-assist-search',
      query,
      useAniListAssist,
      aniListFormat,
      aniListStatus,
      aniListSeason,
      aniListSeasonYear,
      aniListCountry,
      aniListSort,
      aniListGenres.join('|'),
    ],
    queryFn: () => searchAniListAnime(query, {
      perPage: 12,
      format: aniListFormat === 'all' ? undefined : aniListFormat as any,
      status: aniListStatus === 'all' ? undefined : aniListStatus as any,
      season: aniListSeason === 'all' ? undefined : aniListSeason as any,
      seasonYear: aniListSeasonYear ? Number(aniListSeasonYear) : undefined,
      countryOfOrigin: aniListCountry === 'all' ? undefined : aniListCountry as any,
      genres: aniListGenres.length > 0 ? aniListGenres : undefined,
      sort: aniListSort as any,
    }),
    enabled: useAniListAssist && query.length > 1,
    staleTime: 2 * 60 * 1000,
  });

  // Image search states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imageResults, setImageResults] = useState<any[] | null>(null);
  const [isSearchingImage, setIsSearchingImage] = useState(false);

  const filteredAnimeResults = (allAnimeResults || []).filter((anime) => {
    const animeType = (anime.type || '').toLowerCase();
    const animeRating = Number.parseFloat(anime.rating || '0');
    const animeStatus = normalizeAnimeStatus((anime as any).status);
    const animeGenres = Array.isArray((anime as any).genres)
      ? (anime as any).genres.map((genre: string) => normalizeAnimeGenre(genre)).filter(Boolean)
      : [];

    if (animeTypeFilter !== 'all' && animeType !== animeTypeFilter) return false;
    if (animeStatusFilter !== 'all' && animeStatus && animeStatus !== animeStatusFilter) return false;
    if (animeGenreFilter !== 'all' && animeGenres.length > 0 && !animeGenres.includes(animeGenreFilter)) {
      return false;
    }
    if (animeRating > 0 && animeRating < minRating) return false;
    if (onlyDub && !(Number(anime.episodes?.dub || 0) > 0)) return false;
    return true;
  });

  const mangaProviderOptions = useMemo(() => {
    const providers = new Set<string>(['mapped', 'atsu', 'mangafire', 'mangaball', 'allmanga']);
    (allMangaResults || []).forEach((manga: any) => {
      (manga.providersAvailable || []).forEach((provider: string) => {
        if (provider) providers.add(provider.toLowerCase());
      });
    });
    return Array.from(providers).sort((a, b) => a.localeCompare(b));
  }, [allMangaResults]);

  const normalizeMangaStatus = (status: string | undefined) => {
    const normalized = String(status || '').toLowerCase();
    if (normalized.includes('ongoing') || normalized.includes('releasing')) return 'ongoing';
    if (normalized.includes('completed') || normalized.includes('finished')) return 'completed';
    if (normalized.includes('hiatus')) return 'hiatus';
    if (normalized.includes('cancel')) return 'cancelled';
    if (normalized.includes('unreleased') || normalized.includes('not_yet')) return 'unreleased';
    return 'unknown';
  };

  const inferMangaLanguage = (manga: any): string => {
    const directLanguage = String(manga?.originLanguage || '').trim().toLowerCase();
    if (directLanguage) return directLanguage;

    const mangaType = String(manga?.type || '').trim().toLowerCase();
    if (mangaType === 'manhwa') return 'kr';
    if (mangaType === 'manhua') return 'zh';
    if (mangaType === 'comics') return 'en';
    return 'jp';
  };

  const normalizeSearchText = (value: unknown) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

  const mangaSearchTokens = useMemo(
    () => normalizeSearchText(query).split(' ').filter((token) => token.length >= 3),
    [query]
  );

  const isAdultTitleSearchIntent = useCallback(
    (manga: any) => {
      if (mangaSearchTokens.length === 0) return false;
      const title = normalizeSearchText(manga?.name || manga?.canonicalTitle || manga?.title?.english || '');
      if (!title) return false;
      return mangaSearchTokens.every((token) => title.includes(token));
    },
    [mangaSearchTokens]
  );

  const filteredMangaResults = (allMangaResults || []).filter((manga) => {
    const mangaType = (manga.type || '').toLowerCase();
    const mangaRating = Number.parseFloat(manga.rating || '0');
    const isAdult = Boolean(manga.isAdult);
    const statusValue = normalizeMangaStatus(manga.status);
    const genres = Array.isArray((manga as any).genres)
      ? (manga as any).genres.map((genre: string) => String(genre || '').toLowerCase())
      : [];
    const allowAdultByIntent =
      mangaAdultFilter ||
      explicitMangaQuery ||
      isAdultTitleSearchIntent(manga) ||
      query.trim().length > 0;

    if (isAdult && !contentSafetySettings.showAdultEverywhere && !allowAdultByIntent) return false;

    if (normalizedMangaTypeFilter !== 'all' && mangaType !== normalizedMangaTypeFilter) return false;
    if (mangaStatusFilter !== 'all' && statusValue !== mangaStatusFilter) return false;
    if (mangaLanguageFilter !== 'all' && inferMangaLanguage(manga) !== mangaLanguageFilter) return false;
    if (mangaGenreFilter !== 'all' && genres.length > 0 && !genres.includes(mangaGenreFilter.toLowerCase())) {
      return false;
    }
    if (
      localProviderFacetFilter !== 'all' &&
      !(manga.providersAvailable || []).some(
        (provider: string) => provider.toLowerCase() === localProviderFacetFilter
      )
    ) {
      return false;
    }
    if (mangaRating > 0 && mangaRating < minRating) return false;
    if (mangaVolumesOnly && !(Number((manga as any).volumes || 0) > 0)) return false;
    if (minReleaseYear > 0 && Number(manga.year || 0) > 0 && Number(manga.year) < minReleaseYear) {
      return false;
    }
    return true;
  });

  useEffect(() => {
    if (mangaProviderFilter === 'all') return;
    if (!mangaProviderOptions.includes(mangaProviderFilter.toLowerCase())) {
      setMangaProviderFilter('all');
    }
  }, [mangaProviderFilter, mangaProviderOptions]);

  const unifiedResults = useMemo(() => {
    const arr: any[] = [];
    if (resultType === 'all' || resultType === 'anime') {
      arr.push(...filteredAnimeResults.map(a => ({ ...a, mediaType: 'anime' as const })));
    }
    if (resultType === 'all' || resultType === 'manga') {
      arr.push(
        ...filteredMangaResults.map((m) => ({
          ...m,
          mediaType: 'manga' as const,
          blurAdult:
            Boolean(m.isAdult) &&
            !contentSafetySettings.showAdultEverywhere &&
            (explicitMangaQuery || mangaAdultFilter || isAdultTitleSearchIntent(m) || query.trim().length > 0) &&
            contentSafetySettings.blurAdultInSearch,
        }))
      );
    }
    
    if (sortMode === 'relevance') return arr;

    const sorted = [...arr].sort((a, b) => {
      if (sortMode === 'rating') {
        return Number(b.rating || 0) - Number(a.rating || 0);
      }
      if (sortMode === 'title') {
        return String(a.name || '').localeCompare(String(b.name || ''));
      }
      if (sortMode === 'popularity') {
        return Number((b as any).popularity || 0) - Number((a as any).popularity || 0);
      }
      return 0;
    });

    return sorted;
  }, [
    filteredAnimeResults,
    filteredMangaResults,
    resultType,
    sortMode,
    contentSafetySettings.showAdultEverywhere,
    contentSafetySettings.blurAdultInSearch,
    explicitMangaQuery,
    mangaAdultFilter,
    isAdultTitleSearchIntent,
    query,
  ]);

  const activeFilterCount = useMemo(() => {
    return [
      animeTypeFilter !== 'all',
      animeStatusFilter !== 'all',
      animeGenreFilter !== 'all',
      animeLanguageFilter !== 'all',
      animeRatedFilter !== 'all',
      animeScoreFilter !== 'all',
      animeSeasonFilter !== 'all',
      animeStartDateFilter.trim().length > 0,
      animeEndDateFilter.trim().length > 0,
      animeSortFilter !== 'default',
      mangaTypeFilter !== 'all',
      mangaStatusFilter !== 'all',
      mangaFeedMode !== 'search',
      (mangaFeedMode === 'foryou' || mangaFeedMode === 'recent' || mangaFeedMode === 'popular') && mangaFeedWindow !== 'day',
      mangaFeedMode === 'origin' && mangaOriginFilter !== 'all',
      mangaCategoryFilter !== 'all',
      mangaGenreFilter !== 'all',
      mangaLanguageFilter !== 'all',
      mangaAuthorFilter.trim().length > 0,
      mangaAtsuTypeFilter !== 'all',
      mangaAtsuStatusFilter !== 'all',
      mangaAdultFilter,
      mangaVolumesOnly,
      mangaProviderFilter !== 'all',
      minRating > 0,
      minReleaseYear > 0,
      onlyDub,
      sortMode !== 'relevance',
      useAniListAssist,
    ].filter(Boolean).length;
  }, [
    animeTypeFilter,
    animeStatusFilter,
    animeGenreFilter,
    animeLanguageFilter,
    animeRatedFilter,
    animeScoreFilter,
    animeSeasonFilter,
    animeStartDateFilter,
    animeEndDateFilter,
    animeSortFilter,
    mangaTypeFilter,
    mangaStatusFilter,
    mangaFeedMode,
    mangaFeedWindow,
    mangaOriginFilter,
    mangaCategoryFilter,
    mangaGenreFilter,
    mangaLanguageFilter,
    mangaAuthorFilter,
    mangaAtsuTypeFilter,
    mangaAtsuStatusFilter,
    mangaAdultFilter,
    mangaVolumesOnly,
    mangaProviderFilter,
    minRating,
    minReleaseYear,
    onlyDub,
    sortMode,
    useAniListAssist,
  ]);

  const filteredImageResults = (imageResults || []).filter((result) => {
    return Number(result?.similarity || 0) >= imageConfidenceThreshold;
  });

  const characterResults = characterSearch?.data || [];

  const handleMapAniListToAniStream = (result: any) => {
    if (result?.idMal) {
      navigate(`/anime/mal-${result.idMal}`);
      return;
    }
    if (result?.id) {
      navigate(`/anime/anilist-${result.id}`);
      return;
    }
    const fallbackTitle = result?.title?.english || result?.title?.romaji || result?.title?.native;
    if (fallbackTitle) {
      navigate(`/search?q=${encodeURIComponent(fallbackTitle)}`);
    }
  };

  const handleUseAniListTitle = (result: any) => {
    const title = result?.title?.english || result?.title?.romaji || result?.title?.native;
    if (!title) return;
    setSearchInput(title);
    navigate(`/search?q=${encodeURIComponent(title)}`);
  };

  const handleImageSearch = async () => {
    if (!selectedFile) return;

    setIsSearchingImage(true);
    setImageResults(null);
    try {
      const formData = new FormData();
      formData.append("image", selectedFile);

      const response = await fetch("https://api.trace.moe/search", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Recherche échouée");
      const data = await response.json();
      setImageResults(data.result || []);
    } catch (error) {
      console.error("Image search error:", error);
    } finally {
      setIsSearchingImage(false);
    }
  };

  useEffect(() => {
    setQuery(queryParam);
    setSearchInput(queryParam);
  }, [queryParam]);

  useEffect(() => {
    if (!shouldDelaySecondaryStreams) {
      setEnableSecondaryResultStreams(true);
      return;
    }

    setEnableSecondaryResultStreams(false);
    const timer = window.setTimeout(() => {
      setEnableSecondaryResultStreams(true);
    }, 300);

    return () => window.clearTimeout(timer);
  }, [query, resultType, shouldDelaySecondaryStreams]);

  useEffect(() => {
    if (decodedProducerName) {
      setResultType('anime');
    }
  }, [decodedProducerName]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      const term = searchInput.trim();
      try {
        const history = localStorage.getItem('AniStream_search_history');
        let searches: string[] = history ? JSON.parse(history) : [];
        searches = [term, ...searches.filter(s => s !== term)].slice(0, 20); // keep 20 max
        localStorage.setItem('AniStream_search_history', JSON.stringify(searches));
      } catch { }
      navigate(`/search?q=${encodeURIComponent(term)}`);
    }
  };

  // show all recent searches
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  useEffect(() => {
    try {
      const searches = localStorage.getItem('AniStream_search_history');
      if (searches) {
        const parsed = JSON.parse(searches) as string[];
        setRecentSearches(parsed.slice(0, 10)); // show last 10
      }
    } catch {
      setRecentSearches([]);
    }
  }, []);

  const runRecentSearch = (term: string) => {
    setSearchInput(term);
    navigate(`/search?q=${encodeURIComponent(term)}`);
  };

  const deleteSearchItem = (term: string) => {
    try {
      const updated = recentSearches.filter(s => s !== term);
      setRecentSearches(updated);
      localStorage.setItem('AniStream_search_history', JSON.stringify(updated));
    } catch { }
  };

  const showAnimeResults = (resultType === 'all' || resultType === 'anime') && query.length > 0;
  const showMangaResults = shouldSearchManga;
  const showCharacterResults = shouldEnableCharacterSearch && query.length > 1;
  const isQuerylessMangaMode = showMangaResults && mangaSearchMode !== 'search';
  const hasSearchContext = query.length > 0 || isQuerylessMangaMode;
  const hasMoreResults =
    (showAnimeResults && !!hasNextAnimePage) ||
    (showMangaResults && !!hasNextMangaPage);
  const isFetchingMoreResults =
    (showAnimeResults && !!isFetchingNextAnimePage) ||
    (showMangaResults && !!isFetchingNextMangaPage);
  const hasMixedResults = unifiedResults.length > 0;
  const hasCharacterResults = characterResults.length > 0;
  const hasAnyResult = hasMixedResults || (showCharacterResults && hasCharacterResults);

  // Keep search responsive even if one provider is slow/unavailable.
  const isAnimeInitialLoading = showAnimeResults && isLoadingAnime && allAnimeResults.length === 0;
  const isMangaInitialLoading = showMangaResults && isLoadingManga && allMangaResults.length === 0;
  const isCharacterInitialLoading = showCharacterResults && loadingCharacters && characterResults.length === 0;
  const hybridLoading = isAnimeInitialLoading || isMangaInitialLoading || isCharacterInitialLoading;

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {!isNative && <Background />}
      {!isNative && <Sidebar />}

      <main className={cn(
        "relative z-10 pr-6 py-6 max-w-[1800px] mx-auto pb-24 md:pb-6",
        isNative ? "p-6" : "pl-6 md:pl-32"
      )}>
        <Header />

        {/* Mobile Search Bar */}
        <form onSubmit={handleSearch} className="mb-6 md:hidden">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              id="AniStream-global-search"
              type="text"
               placeholder="Rechercher un anime ou manga..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 pr-20 h-12 bg-muted/50 border-border/50 rounded-xl text-base"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput('')}
                  className="p-1 rounded-full hover:bg-muted"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
              <label className="p-1 rounded-full hover:bg-muted cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                <Camera className="w-5 h-5" />
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setSelectedFile(file);
                      // Optional: auto-scroll to image search section or trigger search
                    }
                  }}
                />
              </label>
            </div>
          </div>
        </form>

        <div className="mb-8 md:mb-12">
          <h1 className="font-display text-2xl md:text-4xl font-bold mb-4 md:mb-6 flex items-center gap-3">
            <Search className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            {hasSearchContext ? 'Résultats de recherche' : 'Recherche'}
          </h1>

          <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-6">
            <div className="flex-1">
              {(query || isQuerylessMangaMode) && (
                <p className="text-muted-foreground text-sm md:text-base mb-2">
                  {query ? (
                    <>
                      Résultats pour "<span className="text-foreground font-medium">{query}</span>"
                    </>
                  ) : (
                    <>
                      Affichage des résultats du flux manga <span className="text-foreground font-medium">{mangaFeedModeLabel}</span>
                      {(mangaFeedMode === 'foryou' || mangaFeedMode === 'recent' || mangaFeedMode === 'popular') && (
                        <>
                          {' '}
                          <span className="text-foreground/80">({mangaFeedWindow})</span>
                        </>
                      )}
                      {mangaFeedMode === 'origin' && mangaOriginFilter !== 'all' && (
                        <>
                          {' '}
                          <span className="text-foreground/80">({mangaOriginFilter.toUpperCase()})</span>
                        </>
                      )}
                    </>
                  )}
                  {` • ${filteredAnimeResults.length} anime`}
                  {` • ${filteredMangaResults.length} manga`}
                  {showCharacterResults && ` • ${characterResults.length} personnages`}
                  {activeFilterCount > 0 && ` • ${activeFilterCount} filtres actifs`}
                  {!contentSafetySettings.showAdultEverywhere &&
                    ` • résultats adultes ${(explicitMangaQuery || mangaAdultFilter || query.trim().length > 0) ? 'floutés' : 'cachés'}`}
                </p>
              )}
            </div>

            {/* Type Filters */}
            <div className="flex bg-muted/50 p-1 rounded-xl w-full md:w-auto overflow-x-auto hide-scrollbar">
              {[
                { id: 'all', label: 'Tous les résultats' },
                { id: 'anime', label: 'Anime', icon: <Film className="w-4 h-4" /> },
                { id: 'manga', label: 'Manga', icon: <BookOpen className="w-4 h-4" /> },
                { id: 'character', label: 'Personnages' }
              ].map(type => (
                <button
                  key={type.id}
                  onClick={() => setResultType(type.id as any)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all whitespace-nowrap",
                    resultType === type.id
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                  )}
                >
                  {type.icon}
                  {type.label}
                </button>
              ))}
            </div>

            {/* Image Search Integration */}
            <div className="w-full md:w-auto p-4 rounded-2xl bg-muted/30 border border-white/5 backdrop-blur-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 px-1">Recherche par image (trace.moe)</p>
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer group">
                  <div className="flex items-center gap-2 px-4 h-10 rounded-xl bg-white/5 border border-white/10 group-hover:border-primary/50 transition-colors">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors overflow-hidden truncate">
                      {selectedFile ? selectedFile.name : 'Choisir une image...'}
                    </span>
                    <input
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    />
                  </div>
                </label>
                <button
                  onClick={handleImageSearch}
                  disabled={!selectedFile || isSearchingImage}
                  className="px-4 h-10 rounded-xl bg-primary text-primary-foreground font-medium hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[100px]"
                >
                  {isSearchingImage ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    'Identifier'
                  )}
                </button>
              </div>
            </div>
          </div>

          <GlassPanel className="mt-5 p-4 md:p-5 space-y-4 border border-white/10">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAdvancedAssist((value) => !value)}
                className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wide bg-background/70 border border-white/10 text-muted-foreground hover:text-foreground flex items-center gap-2"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {showAdvancedAssist ? 'Masquer les filtres' : 'Filtres avancés'}
                {activeFilterCount > 0 && <span className="text-primary">({activeFilterCount})</span>}
              </button>

              {/* <label className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wide bg-background/70 border border-white/10 text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyDub}
                  onChange={(e) => setOnlyDub(e.target.checked)}
                  className="accent-primary"
                />
                VF uniquement (anime)
              </label>

              <label className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wide bg-background/70 border border-white/10 text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useAniListAssist}
                  onChange={(e) => setUseAniListAssist(e.target.checked)}
                  className="accent-primary"
                />
                AniList metadata assist
              </label> */}

              <button
                type="button"
                onClick={() => {
                  setAnimeTypeFilter('all');
                  setAnimeStatusFilter('all');
                  setAnimeGenreFilter('all');
                  setAnimeLanguageFilter('all');
                  setAnimeRatedFilter('all');
                  setAnimeScoreFilter('all');
                  setAnimeSeasonFilter('all');
                  setAnimeStartDateFilter('');
                  setAnimeEndDateFilter('');
                  setAnimeSortFilter('default');
                  setMangaTypeFilter('all');
                  setMangaStatusFilter('all');
                  setMangaFeedMode('search');
                  setMangaFeedWindow('day');
                  setMangaOriginFilter('all');
                  setMangaCategoryFilter('all');
                  setMangaGenreFilter('all');
                  setMangaLanguageFilter('all');
                  setMangaAuthorFilter('');
                  setMangaAdultFilter(false);
                  setMangaVolumesOnly(false);
                  setMangaAtsuTypeFilter('all');
                  setMangaAtsuStatusFilter('all');
                  setMangaProviderFilter('all');
                  setMinRating(0);
                  setMinReleaseYear(0);
                  setSortMode('relevance');
                  setOnlyDub(false);
                  setUseAniListAssist(false);
                }}
                className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wide bg-background/70 border border-white/10 text-muted-foreground hover:text-foreground"
              >
                Réinitialiser les filtres
              </button>
            </div>

            {showAdvancedAssist && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Type d'anime</p>
                  <select
                    value={animeTypeFilter}
                    onChange={(e) => setAnimeTypeFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tous les types</option>
                    <option value="tv">TV</option>
                    <option value="movie">Film</option>
                    <option value="ova">OVA</option>
                    <option value="ona">ONA</option>
                    <option value="special">Spécial</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Statut de l'anime</p>
                  <select
                    value={animeStatusFilter}
                    onChange={(e) => setAnimeStatusFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="currently-airing">En cours de diffusion</option>
                    <option value="finished-airing">Diffusion terminée</option>
                    <option value="not-yet-aired">Pas encore diffusé</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Genre d'anime</p>
                  <select
                    value={animeGenreFilter}
                    onChange={(e) => setAnimeGenreFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tous les genres</option>
                    {animeGenreOptions.map((genre) => (
                      <option key={genre.value} value={genre.value}>
                        {genre.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Langue de l'anime</p>
                  <select
                    value={animeLanguageFilter}
                    onChange={(e) => setAnimeLanguageFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">VOSTFR + VF</option>
                    <option value="sub">Sous-titré</option>
                    <option value="dub">VF</option>
                    <option value="sub-&-dub">Sous-titré & VF</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Classification</p>
                  <select
                    value={animeRatedFilter}
                    onChange={(e) => setAnimeRatedFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Toutes les classifications</option>
                    <option value="g">G</option>
                    <option value="pg">PG</option>
                    <option value="pg-13">PG-13</option>
                    <option value="r">R</option>
                    <option value="r+">R+</option>
                    <option value="rx">Rx</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Score de l'anime</p>
                  <select
                    value={animeScoreFilter}
                    onChange={(e) => setAnimeScoreFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tout score</option>
                    <option value="appalling">Horrible</option>
                    <option value="horrible">Affreux</option>
                    <option value="very-bad">Très mauvais</option>
                    <option value="bad">Mauvais</option>
                    <option value="average">Moyen</option>
                    <option value="fine">Correct</option>
                    <option value="good">Bon</option>
                    <option value="very-good">Très bon</option>
                    <option value="great">Excellent</option>
                    <option value="masterpiece">Chef-d'œuvre</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Saison de l'anime</p>
                  <select
                    value={animeSeasonFilter}
                    onChange={(e) => setAnimeSeasonFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Toute saison</option>
                    <option value="spring">Printemps</option>
                    <option value="summer">Été</option>
                    <option value="fall">Automne</option>
                    <option value="winter">Hiver</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Tri de l'anime</p>
                  <select
                    value={animeSortFilter}
                    onChange={(e) => setAnimeSortFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="default">Meilleure correspondance</option>
                    <option value="recently-added">Ajouté récemment</option>
                    <option value="recently-updated">Mis à jour récemment</option>
                    <option value="score">Score</option>
                    <option value="name-a-z">Nom A-Z</option>
                    <option value="released-date">Date de sortie</option>
                    <option value="most-watched">Les plus regardés</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Date de début</p>
                  <input
                    type="date"
                    value={animeStartDateFilter}
                    onChange={(e) => setAnimeStartDateFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Date de fin</p>
                  <input
                    type="date"
                    value={animeEndDateFilter}
                    onChange={(e) => setAnimeEndDateFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  />
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Flux manga</p>
                  <select
                    value={mangaFeedMode}
                    onChange={(e) => setMangaFeedMode(e.target.value as any)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="search">Recherche par requête</option>
                    <option value="latest">Dernières mises à jour</option>
                    <option value="added">Ajouté récemment</option>
                    <option value="new-chap">Nouveaux chapitres</option>
                    <option value="recent">Lecture récente</option>
                    <option value="foryou">Pour vous</option>
                    <option value="popular">Populaire</option>
                    <option value="recommendation">Recommandation</option>
                    <option value="origin">Par origine</option>
                    <option value="random">Sélections aléatoires</option>
                  </select>
                </div>

                {(mangaFeedMode === 'foryou' || mangaFeedMode === 'recent' || mangaFeedMode === 'popular') && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Fenêtre du flux</p>
                    <select
                      value={mangaFeedWindow}
                      onChange={(e) => setMangaFeedWindow(e.target.value as any)}
                      className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                    >
                      <option value="day">Quotidien</option>
                      <option value="week">Hebdomadaire</option>
                      <option value="month">Mensuel</option>
                      <option value="all">Tout le temps</option>
                    </select>
                  </div>
                )}

                {mangaFeedMode === 'origin' && (
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Origine du manga</p>
                    <select
                      value={mangaOriginFilter}
                      onChange={(e) => setMangaOriginFilter(e.target.value as any)}
                      className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                    >
                      <option value="all">Toutes les origines</option>
                      <option value="jp">Japon (Manga)</option>
                      <option value="kr">Corée (Manhwa)</option>
                      <option value="zh">Chine (Manhua)</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Format manga</p>
                  <select
                    value={mangaTypeFilter}
                    onChange={(e) => setMangaTypeFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tous les formats</option>
                    <option value="manga">Manga</option>
                    <option value="manhwa">Manhwa</option>
                    <option value="manhua">Manhua</option>
                    <option value="comics">Comics</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Catégorie manga</p>
                  <select
                    value={mangaCategoryFilter}
                    onChange={(e) => setMangaCategoryFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Toute catégorie</option>
                    <option value="manga">Manga</option>
                    <option value="manhwa">Manhwa</option>
                    <option value="manhua">Manhua</option>
                    <option value="comics">Comics</option>
                    <option value="action">Action</option>
                    <option value="romance">Romance</option>
                    <option value="fantasy">Fantasy</option>
                    <option value="comedy">Comedy</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Statut du manga</p>
                  <select
                    value={mangaStatusFilter}
                    onChange={(e) => setMangaStatusFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tous les statuts</option>
                    <option value="ongoing">En cours</option>
                    <option value="completed">Terminé</option>
                    <option value="hiatus">En pause</option>
                    <option value="cancelled">Annulé</option>
                    <option value="unreleased">Non publié</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Genre manga</p>
                  <select
                    value={mangaGenreFilter}
                    onChange={(e) => setMangaGenreFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tous les genres</option>
                    {atsuGenreOptions.map((genre) => (
                      <option key={genre.value} value={genre.value}>
                        {genre.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Langue du manga</p>
                  <select
                    value={mangaLanguageFilter}
                    onChange={(e) => setMangaLanguageFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Toutes les langues</option>
                    <option value="jp">Japonais</option>
                    <option value="kr">Coréen</option>
                    <option value="zh">Chinois</option>
                    <option value="en">Anglais</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Type Atsu</p>
                  <select
                    value={mangaAtsuTypeFilter}
                    onChange={(e) => setMangaAtsuTypeFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tout type</option>
                    {atsuTypeOptions.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Statut Atsu</p>
                  <select
                    value={mangaAtsuStatusFilter}
                    onChange={(e) => setMangaAtsuStatusFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tout statut</option>
                    {atsuStatusOptions.map((status) => (
                      <option key={status.value} value={status.value}>
                        {status.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Auteur du manga (slug Atsu)</p>
                  <input
                    type="text"
                    value={mangaAuthorFilter}
                    onChange={(e) => setMangaAuthorFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                    placeholder="ex. gege-akutami"
                  />
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Fournisseur manga</p>
                  <select
                    value={mangaProviderFilter}
                    onChange={(e) => setMangaProviderFilter(e.target.value)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="all">Tous les fournisseurs</option>
                    {mangaProviderOptions.map((provider) => (
                      <option key={provider} value={provider}>
                        {provider}
                      </option>
                    ))}
                  </select>
                </div>

                <label className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wide bg-background/70 border border-white/10 text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mangaAdultFilter}
                    onChange={(e) => setMangaAdultFilter(e.target.checked)}
                    className="accent-primary"
                  />
                  Filtre adulte
                </label>

                <label className="h-9 px-3 rounded-lg text-xs font-bold uppercase tracking-wide bg-background/70 border border-white/10 text-muted-foreground hover:text-foreground flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mangaVolumesOnly}
                    onChange={(e) => setMangaVolumesOnly(e.target.checked)}
                    className="accent-primary"
                  />
                  Volumes disponibles
                </label>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Trier les résultats</p>
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as any)}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                  >
                    <option value="relevance">Pertinence</option>
                    <option value="rating">Meilleure note</option>
                    <option value="popularity">Popularité</option>
                    <option value="title">Titre A-Z</option>
                  </select>
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Année de sortie min</p>
                  <input
                    type="number"
                    min={1900}
                    max={new Date().getFullYear() + 1}
                    value={minReleaseYear || ''}
                    onChange={(e) => setMinReleaseYear(Math.max(0, Number(e.target.value) || 0))}
                    className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                    placeholder="Toute"
                  />
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Note min : {minRating.toFixed(1)}</p>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={minRating}
                    onChange={(e) => setMinRating(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>

                <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Confiance image : {Math.round(imageConfidenceThreshold * 100)}%+</p>
                  <input
                    type="range"
                    min={0.5}
                    max={1}
                    step={0.01}
                    value={imageConfidenceThreshold}
                    onChange={(e) => setImageConfidenceThreshold(Number(e.target.value))}
                    className="w-full accent-primary"
                  />
                </div>
              </div>
            )}

            {showAdvancedAssist && useAniListAssist && (
              <div className="p-3 rounded-xl border border-primary/20 bg-primary/5">
                <div className="flex items-start gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide text-primary">Métadonnées AniList</p>
                    <p className="text-xs text-muted-foreground">Filtres supplémentaires pour affiner par saison, format, statut et genres.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Format</p>
                    <select value={aniListFormat} onChange={(e) => setAniListFormat(e.target.value)} className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm">
                      <option value="all">Tous les formats</option>
                      <option value="TV">TV</option>
                      <option value="MOVIE">Film</option>
                      <option value="OVA">OVA</option>
                      <option value="ONA">ONA</option>
                      <option value="SPECIAL">Spécial</option>
                      <option value="TV_SHORT">Court métrage TV</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Statut de sortie</p>
                    <select value={aniListStatus} onChange={(e) => setAniListStatus(e.target.value)} className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm">
                      <option value="all">Tout statut</option>
                      <option value="RELEASING">En cours</option>
                      <option value="FINISHED">Terminé</option>
                      <option value="NOT_YET_RELEASED">Pas encore sorti</option>
                      <option value="HIATUS">En pause</option>
                      <option value="CANCELLED">Annulé</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Saison</p>
                    <select value={aniListSeason} onChange={(e) => setAniListSeason(e.target.value)} className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm">
                      <option value="all">Toute saison</option>
                      <option value="WINTER">Hiver</option>
                      <option value="SPRING">Printemps</option>
                      <option value="SUMMER">Été</option>
                      <option value="FALL">Automne</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Année de saison</p>
                    <input
                      type="number"
                      min={1950}
                      max={2100}
                      placeholder="ex. 2026"
                      value={aniListSeasonYear}
                      onChange={(e) => setAniListSeasonYear(e.target.value)}
                      className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Pays</p>
                    <select value={aniListCountry} onChange={(e) => setAniListCountry(e.target.value)} className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm">
                      <option value="all">Tout pays</option>
                      <option value="JP">Japon</option>
                      <option value="KR">Corée</option>
                      <option value="CN">Chine</option>
                      <option value="TW">Taïwan</option>
                      <option value="US">États-Unis</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Tri AniList</p>
                    <select value={aniListSort} onChange={(e) => setAniListSort(e.target.value)} className="w-full h-9 rounded-lg bg-background/80 border border-white/10 px-3 text-sm">
                      <option value="POPULARITY_DESC">Popularité</option>
                      <option value="SCORE_DESC">Score</option>
                      <option value="TRENDING_DESC">Tendance</option>
                      <option value="START_DATE_DESC">Date de début</option>
                      <option value="FAVOURITES_DESC">Favoris</option>
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-bold">Genres des métadonnées</p>
                    <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-background/50 border border-white/5 max-h-32 overflow-y-auto">
                      {ALL_GENRES.map((genre) => {
                        const isSelected = aniListGenres.includes(genre);
                        return (
                          <button
                            key={genre}
                            type="button"
                            onClick={() => {
                              const newGenres = isSelected
                                ? aniListGenres.filter((g) => g !== genre)
                                : [...aniListGenres, genre];
                              setAniListGenresText(newGenres.join(', '));
                            }}
                            className={cn(
                              "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                              isSelected ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {genre}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </GlassPanel>

        {/* Image Search Results Overlay/Section */}
        </div>
        {imageResults && (
          <div className="mb-12 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" />
                Résultats d'identification ({filteredImageResults.length})
              </h2>
              <button
                onClick={() => setImageResults(null)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Effacer les résultats
              </button>
            </div>
            {filteredImageResults.length === 0 ? (
              <GlassPanel className="p-6 text-sm text-muted-foreground">
                Aucune correspondance d'image au-dessus de {Math.round(imageConfidenceThreshold * 100)}% de confiance. Abaissez le filtre de confiance pour voir plus de candidats.
              </GlassPanel>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredImageResults.map((result, idx) => (
                <GlassPanel key={idx} className="p-4 flex gap-4 items-start group hover:border-primary/50 transition-colors">
                  <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0 bg-muted ring-1 ring-white/10">
                    <img
                      src={result.image}
                      alt="Résultat de recherche"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                      <Play className="w-8 h-8 text-white fill-white" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm line-clamp-1 mb-1" title={result.filename}>
                      {result.filename}
                    </h3>
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider font-bold">
                        <span className="text-primary">{(result.similarity * 100).toFixed(1)}% Correspondance</span>
                        <span className="text-muted-foreground/60">EP {result.episode || '?'}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground/60">
                        At {new Date(result.at * 1000).toISOString().substr(11, 8)}
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(`/search?q=${encodeURIComponent(result.filename.split('] ')[1]?.split(' - ')[0] || result.filename)}`)}
                      className="mt-3 w-full py-1.5 rounded-lg bg-white/5 hover:bg-primary/20 text-[10px] font-bold text-primary transition-all border border-white/5 hover:border-primary/30"
                    >
                      Rechercher sur AniStream
                    </button>
                  </div>
                </GlassPanel>
                ))}
              </div>
            )}
          </div>
        )}

        {query && useAniListAssist && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" />
                Correspondances AniList ({aniListAssistResults.length})
              </h2>
              {loadingAniListAssist && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            {loadingAniListAssist ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <CardSkeleton key={`anilist-assist-skeleton-${idx}`} />
                ))}
              </div>
            ) : aniListAssistResults.length === 0 ? (
              <GlassPanel className="p-4 text-sm text-muted-foreground">
                AniList n'a trouvé aucune correspondance avec les filtres actuels. Essayez d'assouplir les filtres de saison/statut/genre.
              </GlassPanel>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {aniListAssistResults.map((result: any) => {
                  const displayTitle = result?.title?.english || result?.title?.romaji || result?.title?.native || 'Unknown title';
                  return (
                    <GlassPanel key={`anilist-assist-${result.id}`} className="p-3 flex gap-3 items-start">
                      <img
                        src={getProxiedImageUrl(result?.coverImage?.large || result?.coverImage?.medium || '/placeholder.svg')}
                        alt={displayTitle}
                        className="w-16 h-20 rounded-lg object-cover flex-shrink-0"
                        loading="lazy"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{displayTitle}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result?.format || 'ANIME'} • {result?.status || 'UNKNOWN'}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {result?.season || 'Season ?'} {result?.seasonYear || result?.startDate?.year || ''}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate mt-1">
                          Score: {result?.averageScore ? `${result.averageScore}%` : 'N/A'} • Pop: {result?.popularity || 'N/A'}
                        </p>
                        <p className="text-[11px] text-muted-foreground truncate">
                          MAL: {result?.idMal || 'None'} • AniList: {result?.id}
                        </p>

                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => handleMapAniListToAniStream(result)}
                            className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-primary/20 text-primary hover:bg-primary/30"
                          >
                            Associer à AniStream
                          </button>
                          <button
                            onClick={() => handleUseAniListTitle(result)}
                            className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-white/10 text-muted-foreground hover:text-foreground"
                          >
                            Utiliser le titre
                          </button>
                        </div>
                      </div>
                    </GlassPanel>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {hasSearchContext ? (
          hybridLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
          ) : (
          <>
            {showCharacterResults && hasCharacterResults && (
              <div className="mb-10">
                <h2 className="text-lg md:text-xl font-bold mb-4">Personnages correspondants</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {characterResults.map((character: any) => (
                    <GlassPanel key={character._id} className="p-3 flex items-center gap-3">
                      <img
                        src={getProxiedImageUrl(character.image)}
                        alt={character.name}
                        className="w-16 h-16 rounded-lg object-cover"
                        loading="lazy"
                        onError={(event) => {
                          const image = event.currentTarget;
                          const directImage = String(character?.image || '').trim();
                          const stage = image.dataset.fallbackStage || 'proxy';

                          if (stage === 'proxy' && directImage && image.currentSrc !== directImage) {
                            image.dataset.fallbackStage = 'direct';
                            image.src = directImage;
                            return;
                          }

                          if (stage !== 'placeholder') {
                            image.dataset.fallbackStage = 'placeholder';
                            image.src = '/placeholder.svg';
                          }
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate">{character.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{character.anime}</p>
                        <div className="mt-2 flex items-center gap-2">
                          <button
                            onClick={() => runRecentSearch(character.anime)}
                            className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-primary/20 text-primary"
                          >
                            Trouver l'anime
                          </button>
                          <button
                            onClick={() => {
                              const routeId =
                                character?.malId != null && Number.isFinite(Number(character.malId))
                                  ? String(character.malId)
                                  : String(character?._id || character?.name || '');

                              navigate(`/char/${encodeURIComponent(routeId)}?name=${encodeURIComponent(character.name || '')}`);
                            }}
                            className="text-[10px] font-bold uppercase px-2 py-1 rounded bg-white/10 text-muted-foreground hover:text-foreground"
                          >
                            Ouvrir
                          </button>
                        </div>
                      </div>
                    </GlassPanel>
                  ))}
                </div>
              </div>
            )}

            {(showAnimeResults || showMangaResults) && hasMixedResults && (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                  {unifiedResults.map((item) => (
                    <UnifiedMediaCard key={item.id} item={item} />
                  ))}
                </div>

                {/* Infinite Scroll Trigger */}
                <div ref={scrollRef} className="h-20 mt-8 flex flex-col items-center justify-center gap-3">
                  {isFetchingMoreResults ? (
                    <div className="flex items-center gap-3 text-primary animate-pulse bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span className="text-sm font-bold uppercase tracking-wider">Chargement...</span>
                    </div>
                  ) : hasMoreResults ? (
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/20 animate-bounce" />
                  ) : (
                    <div className="flex flex-col items-center gap-2 opacity-40">
                      <div className="h-px w-24 bg-border" />
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Fin des résultats</span>
                    </div>
                  )}
                </div>
              </>
            )}

            {!hasAnyResult && (
              <div className="text-center py-20">
                <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Aucun résultat trouvé</h2>
                <p className="text-muted-foreground">Essayez d'élargir les filtres ou d'utiliser une requête différente</p>
              </div>
            )}
          </>
          )
        ) : (
          <div className="text-center py-20">
            <Search className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Rechercher des animes, mangas et personnages</h2>
            <p className="text-muted-foreground">Utilisez la barre de recherche ci-dessus ou les filtres du flux manga pour une découverte sans requête.</p>

            {recentSearches.length > 0 && (
              <div className="mt-6">
                <p className="text-sm text-muted-foreground mb-3">Recherches récentes</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {recentSearches.map((term, idx) => (
                    <div key={idx} className="group inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-sm">
                      <button
                        onClick={() => runRecentSearch(term)}
                        className="font-medium"
                      >
                        {term}
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteSearchItem(term); }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-destructive hover:text-destructive/80"
                        title="Supprimer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <MobileNav />
    </div>
  );
}
