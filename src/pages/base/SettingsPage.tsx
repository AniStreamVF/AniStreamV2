import { useState, useEffect, useMemo } from 'react';
import changelogRaw from '../../../CHANGELOG.md?raw';
import { useSearchParams } from 'react-router-dom';
import { Background } from '@/components/layout/Background';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { ThemeSelector } from '@/components/settings/ThemeSelector';
import { VideoSettingsPanel } from '@/components/video/VideoSettingsPanel';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Loader2, List, Sparkles, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/hooks/useTheme';
import { useContentSafetySettings } from '@/hooks/useContentSafetySettings';
import { useUpdateProfilePrivacy } from '@/hooks/useProfileFeatures';
import { useClearAllWatchHistory } from '@/hooks/useWatchHistory';
import {
  getMalAuthUrl,
  fetchMalUserList,
  fetchMalMangaList,
  mapMalStatusToAniStream,
  mapMalMangaStatusToAniStream,
  disconnectMal,
  updateMalAnimeStatus,
  updateMalMangaStatus,
} from '@/lib/mal';
import {
  getAniListAuthUrl,
  disconnectAniList,
  fetchAniListUserList,
  fetchAniListMangaList,
  updateAniListAnimeStatus,
  updateAniListMangaStatus,
  mapAniListMangaStatusToAniStream,
  mapAniStreamMangaStatusToAniList,
} from '@/lib/externalIntegrations';
import { toast } from 'sonner';
import { cn } from "@/lib/utils";
import {
  ArrowLeft, Palette, Film, Monitor, Info, Link2, Eye, EyeOff, Globe, CheckCircle, ExternalLink, Shield, History, Trash2, Search, Bell, MessageCircle, Laptop
} from 'lucide-react';

type PreferredMangaLanguage = 'auto' | 'fr' | 'jp' | 'en' | 'kr' | 'zh';
type ImportMediaType = 'anime' | 'manga';

type ExternalImportItem = {
  malId: number | null;
  anilistId: number | null;
  malTitle: string;
  targetId: string;
  confidence: 'exact' | 'new' | 'guessed';
  poster: string | null;
  status: string;
  progress?: number | null;
  selected: boolean;
};

const toSlugValue = (value: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

const buildFallbackMangaId = (title: string, malId?: number | null, anilistId?: number | null) => {
  if (anilistId) return `anilist:${anilistId}`;
  if (malId) return `mal:${malId}`;

  const slug = toSlugValue(title);
  return slug ? `slug:${slug}` : '';
};

const toPositiveChapterProgress = (value: unknown): number | null => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const normalized = Math.trunc(parsed);
  return normalized > 0 ? normalized : null;
};

const normalizeMangaSyncStatus = (status: unknown, chapterProgress?: number | null): string => {
  const normalizedStatus = String(status || 'plan_to_read').trim().toLowerCase();
  if ((chapterProgress ?? 0) > 0 && normalizedStatus === 'plan_to_read') {
    return 'reading';
  }
  return normalizedStatus || 'plan_to_read';
};

const normalizePreferredMangaLanguage = (value: unknown): PreferredMangaLanguage => {
  const normalized = String(value || '').trim().toLowerCase();
  if (normalized === 'fr' || normalized.startsWith('fr') || normalized.includes('french')) return 'fr';
  if (normalized === 'jp' || normalized.startsWith('ja') || normalized.includes('japanese')) return 'jp';
  if (normalized === 'kr' || normalized.startsWith('ko') || normalized.includes('korean')) return 'kr';
  if (normalized === 'zh' || normalized.startsWith('zh') || normalized.includes('chinese')) return 'zh';
  if (normalized === 'en' || normalized.startsWith('en') || normalized.includes('english')) return 'en';
  return 'auto';
};

function parseChangelog(raw: string): { version: string; date: string; changes: string[] }[] {
  const releases: { version: string; date: string; changes: string[] }[] = [];
  const lines = raw.split('\n');
  let current: { version: string; date: string; changes: string[] } | null = null;
  for (const line of lines) {
    const versionMatch = line.match(/^##\s*\[([^\]]+)\]\s*-\s*(.+)$/);
    if (versionMatch) {
      if (current) releases.push(current);
      current = { version: versionMatch[1], date: versionMatch[2].trim(), changes: [] };
    } else if (current && line.startsWith('- ')) {
      current.changes.push(line.slice(2));
    }
  }
  if (current) releases.push(current);
  return releases;
}

import { DesktopSettings } from '@/components/settings/DesktopSettings';
import { MobileSettings } from '@/components/settings/MobileSettings';
import { useIsNativeApp } from '@/hooks/useIsNativeApp';
import { Capacitor } from '@capacitor/core';

export default function SettingsPage() {
  const [searchParams] = useSearchParams();
  const isNative = useIsNativeApp();
  const isMobile = Capacitor.isNativePlatform();
  const requestedTab = searchParams.get('tab');

  const { user, profile, refreshProfile } = useAuth();
  const { themes, theme, setTheme, reduceMotion, setReduceMotion, highContrast, setHighContrast } = useTheme();
  const { settings: contentSafetySettings, updateSettings: updateContentSafetySettings } = useContentSafetySettings();
  const updatePrivacy = useUpdateProfilePrivacy();
  const clearHistory = useClearAllWatchHistory();
  const [isPublic, setIsPublic] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState(requestedTab || 'appearance');

  useEffect(() => {
    if (requestedTab) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);


  const CHANGELOG = useMemo(() => parseChangelog(changelogRaw), []);

  const [isImporting, setIsImporting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [malImportList, setMalImportList] = useState<ExternalImportItem[]>([]);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [searchingIdx, setSearchingIdx] = useState<number | null>(null);
  const [manualSearchQuery, setManualSearchQuery] = useState('');
  const [manualSearchResults, setManualSearchResults] = useState<any[]>([]);
  const [isManualSearching, setIsManualSearching] = useState(false);
  const [malAutoDelete, setMalAutoDelete] = useState(false);
  const [malSyncTarget, setMalSyncTarget] = useState<ImportMediaType>('anime');

  // AniList State
  const [isAniListImporting, setIsAniListImporting] = useState(false);
  const [isAniListExporting, setIsAniListExporting] = useState(false);
  const [aniListSyncTarget, setAniListSyncTarget] = useState<ImportMediaType>('anime');
  const [importSource, setImportSource] = useState<'mal' | 'anilist'>('mal');
  const [importMediaType, setImportMediaType] = useState<ImportMediaType>('anime');
  const [preferredTitleLanguage, setPreferredTitleLanguage] = useState<'romaji' | 'english' | 'native'>('romaji');
  const [preferredMangaLanguage, setPreferredMangaLanguage] = useState<PreferredMangaLanguage>('auto');
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (profile) {
      setIsPublic(profile.is_public ?? true);
      setMalAutoDelete(profile.mal_auto_delete ?? false);
      setPreferredTitleLanguage(profile.preferred_title_language || 'romaji');
      setPreferredMangaLanguage(normalizePreferredMangaLanguage((profile as any).preferred_manga_language));
    }
  }, [profile]);

  const handleTitleLanguageChange = async (value: 'romaji' | 'english' | 'native') => {
    if (!user?.id) {
      toast.error('Veuillez vous connecter pour enregistrer les préférences de langue des titres');
      return;
    }

    const previousValue = preferredTitleLanguage;
    setPreferredTitleLanguage(value);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_title_language: value })
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success(`Préférence de langue des titres mise à jour vers ${value}`);
    } catch (err) {
      setPreferredTitleLanguage(previousValue);
      toast.error('Échec de la mise à jour de la préférence de langue des titres');
    }
  };

  const handleMangaLanguageChange = async (value: PreferredMangaLanguage) => {
    if (!user?.id) {
      toast.error('Veuillez vous connecter pour enregistrer les préférences de langue manga');
      return;
    }

    const previousValue = preferredMangaLanguage;
    setPreferredMangaLanguage(value);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ preferred_manga_language: value })
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success('Langue manga préférée mise à jour');
    } catch (err) {
      setPreferredMangaLanguage(previousValue);
      toast.error('Échec de la mise à jour de la préférence de langue manga');
    }
  };

  const handleMalAutoDeleteChange = async (enabled: boolean) => {
    if (!user?.id) {
      toast.error('Veuillez vous connecter pour modifier les paramètres de synchronisation MAL');
      return;
    }

    setMalAutoDelete(enabled);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ mal_auto_delete: enabled })
        .eq('user_id', user.id);

      if (error) throw error;
      await refreshProfile();
      toast.success(enabled ? 'Suppressions automatiques MAL activées' : 'Suppressions automatiques MAL désactivées');
    } catch (err) {
      setMalAutoDelete(!enabled);
      toast.error('Échec de la mise à jour du paramètre de suppression automatique MAL');
    }
  };

  const handlePrivacyChange = async (value: boolean) => {
    setIsPublic(value);
    try {
      await updatePrivacy.mutateAsync(value);
      toast.success(value ? 'Le profil est maintenant public' : 'Le profil est maintenant privé');
    } catch (error) {
      setIsPublic(!value);
      toast.error('Échec de la mise à jour des paramètres de confidentialité');
    }
  };

  const handleImportFromMal = async () => {
    if (isImporting) return;
    setIsImporting(true);
    setImportSource('mal');
    setImportMediaType('anime');
    const toastId = toast.loading('Récupération de votre liste MyAnimeList...');

    try {
      if (!profile?.mal_access_token) {
        throw new Error('MAL is not connected');
      }

      const malList = await fetchMalUserList();
      console.log(`[Settings] Received ${malList?.length || 0} items from MAL`);

      if (!malList || malList.length === 0) {
        toast.dismiss(toastId);
        toast.info('Votre liste MyAnimeList est vide.');
        setIsImporting(false);
        return;
      }

      toast.loading(`Préparation de ${malList.length} éléments MAL par correspondance d'ID...`, { id: toastId });

      // Fetch existing watchlist to prevent duplicates
      const { data: existingWatchlist } = await supabase
        .from('watchlist')
        .select('anime_id, mal_id, anilist_id')
        .eq('user_id', user!.id);

      const existingMalIds = new Map<number, string>();
      existingWatchlist?.forEach(item => {
        if (item.mal_id) existingMalIds.set(Number(item.mal_id), item.anime_id);
      });

      // Prepare processed list using stable MAL IDs (no title-based auto matching)
      const processedItems: ExternalImportItem[] = [];

      for (let i = 0; i < malList.length; i++) {
        const item = malList[i];
        const malId = item.node.id;
        const malTitle = item.node.title;

        const mappedId = existingMalIds.get(malId);
        const targetId = mappedId || `mal-${malId}`;
        const confidence: 'exact' | 'new' = mappedId ? 'exact' : 'new';

        processedItems.push({
          malId,
          anilistId: null,
          malTitle,
          targetId,
          confidence,
          poster: item.node.main_picture?.large || item.node.main_picture?.medium || null,
          status: mapMalStatusToAniStream(item.list_status.status),
          selected: true
        });
      }

      setMalImportList(processedItems);
      setIsImportModalOpen(true);
      toast.dismiss(toastId);
    } catch (err: any) {
      console.error('[Settings] Preparation failed:', err);
      toast.error(`Échec de la préparation : ${err.message}`, { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportMangaFromMal = async () => {
    if (isImporting) return;
    setIsImporting(true);
    setImportSource('mal');
    setImportMediaType('manga');
    const toastId = toast.loading('Récupération de votre liste de mangas MyAnimeList...');

    try {
      if (!profile?.mal_access_token) {
        throw new Error('MAL is not connected');
      }

      const malList = await fetchMalMangaList();
      if (!malList || malList.length === 0) {
        toast.dismiss(toastId);
        toast.info('Votre liste de mangas MyAnimeList est vide.');
        return;
      }

      toast.loading(`Préparation de ${malList.length} entrées manga MAL...`, { id: toastId });

      const { data: existingReadlist } = await supabase
        .from('manga_readlist')
        .select('manga_id, mal_id, anilist_id')
        .eq('user_id', user!.id);

      const existingMalIds = new Map<number, string>();
      existingReadlist?.forEach((entry: any) => {
        if (entry.mal_id) existingMalIds.set(Number(entry.mal_id), entry.manga_id);
      });

      const processedItems: ExternalImportItem[] = malList.map((item: any) => {
        const malId = Number(item?.node?.id);
        const malTitle = String(item?.node?.title || '').trim() || 'Unknown title';
        const mappedId = existingMalIds.get(malId);
        const targetId = mappedId || buildFallbackMangaId(malTitle, malId, null);
        const progress = Number(item?.list_status?.num_chapters_read || 0);

        return {
          malId: Number.isFinite(malId) ? malId : null,
          anilistId: null,
          malTitle,
          targetId,
          confidence: mappedId ? 'exact' : 'new',
          poster: item?.node?.main_picture?.large || item?.node?.main_picture?.medium || null,
          status: mapMalMangaStatusToAniStream(item?.list_status?.status),
          progress: Number.isFinite(progress) && progress > 0 ? progress : null,
          selected: Boolean(targetId),
        };
      }).filter((entry) => Boolean(entry.targetId));

      setMalImportList(processedItems);
      setIsImportModalOpen(true);
      toast.dismiss(toastId);
    } catch (err: any) {
      console.error('[Settings] Manga MAL import failed:', err);
      toast.error(`Échec de l'importation du manga : ${err.message}`, { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportMangaToMal = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading('Synchronisation de la liste de lecture manga vers MAL...');

    try {
      if (!profile?.mal_access_token) throw new Error('MAL is not connected');

      const { data: readlist, error } = await supabase
        .from('manga_readlist')
        .select('*')
        .eq('user_id', user!.id);

      if (error) throw error;

      const itemsToSync = (readlist || []).filter((item: any) => Boolean(item.mal_id));
      if (itemsToSync.length === 0) {
        toast.info('Aucun manga avec ID MAL trouvé dans votre liste de lecture.', { id: toastId });
        return;
      }

      let successCount = 0;
      let failCount = 0;

      for (const item of itemsToSync) {
        try {
          const chapterProgress = toPositiveChapterProgress(item.last_chapter_number);
          const statusForSync = normalizeMangaSyncStatus(item.status, chapterProgress);
          await updateMalMangaStatus(
            String(item.mal_id),
            statusForSync,
            undefined,
            chapterProgress ?? undefined,
          );
          successCount++;
        } catch (err) {
          console.warn(`[Settings] Failed to sync manga ${item.manga_title} to MAL`, err);
          failCount++;
        }
      }

      toast.success(
        failCount === 0
          ? `${successCount} entrées manga exportées avec succès vers MyAnimeList !`
          : `Exportation manga terminée : ${successCount} synchronisé(s), ${failCount} échec(s).`,
        { id: toastId }
      );
    } catch (err: any) {
      toast.error(`Échec de l'exportation du manga : ${err.message}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleManualSearch = async (query: string) => {
    setManualSearchQuery(query);
    if (query.length < 2) {
      setManualSearchResults([]);
      return;
    }

    setIsManualSearching(true);
    try {
      if (importMediaType === 'manga') {
        const { searchManga } = await import('@/services/manga.service');
        const results = await searchManga(query, 1, 10, { mode: 'search', provider: 'all' });
        const mappedResults = (results?.results || [])
          .map((row: any) => {
            const fallbackId = buildFallbackMangaId(
              row?.canonicalTitle || row?.title?.english || row?.title?.romaji || row?.title?.native || '',
              Number.isFinite(Number(row?.malId)) ? Number(row.malId) : null,
              Number.isFinite(Number(row?.anilistId)) ? Number(row.anilistId) : null,
            );

            const id = String(row?.id || '').trim() || fallbackId;
            if (!id) return null;

            return {
              id,
              name: row?.canonicalTitle || row?.title?.english || row?.title?.romaji || row?.title?.native || 'Unknown title',
              poster: row?.poster || '/placeholder.svg',
              type: row?.mediaType || 'manga',
            };
          })
          .filter(Boolean);

        setManualSearchResults(mappedResults);
      } else {
        const { searchAnime } = await import('@/lib/api');
        const results = await searchAnime(query);
        setManualSearchResults(results?.animes || []);
      }
    } catch (e) {
      console.warn('Manual search failed:', e);
    } finally {
      setIsManualSearching(false);
    }
  };

  const handleSelectManualMatch = (idx: number, entry: any) => {
    const newList = [...malImportList];
    newList[idx] = {
      ...newList[idx],
      targetId: entry.id,
      malTitle: entry.name,
      poster: entry.poster,
      confidence: 'exact', // Selection marks it as verified/exact
      selected: true
    };
    setMalImportList(newList);
    setSearchingIdx(null);
    setManualSearchQuery('');
    setManualSearchResults([]);
  };

  const handleConfirmImport = async (items: any[]) => {
    const selectedItems = items.filter(i => i.selected);
    if (selectedItems.length === 0) {
      setIsImportModalOpen(false);
      return;
    }

    const toastId = toast.loading(`Importation de ${selectedItems.length} élément(s)...`);
    try {
      if (importMediaType === 'manga') {
        const seen = new Set<string>();
        const readlistItems = selectedItems
          .map((item) => {
            const chapterProgress = toPositiveChapterProgress(item.progress);
            return {
              user_id: user!.id,
              manga_id: item.targetId,
              manga_title: item.malTitle,
              manga_poster: item.poster || null,
              status: normalizeMangaSyncStatus(item.status, chapterProgress),
              mal_id: item.malId,
              anilist_id: item.anilistId || null,
              last_chapter_number: chapterProgress,
              updated_at: new Date().toISOString(),
            };
          })
          .filter((item) => {
            const key = `${item.user_id}:${item.manga_id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        const { error } = await supabase
          .from('manga_readlist')
          .upsert(readlistItems, { onConflict: 'user_id,manga_id' });

        if (error) throw error;
        toast.success(`${readlistItems.length} entrées manga importées avec succès !`, { id: toastId });
      } else {
        // Deduplicate items by (user_id, anime_id) to prevent conflicts
        const seen = new Set<string>();
        const watchlistItems = selectedItems
          .map((item) => ({
            user_id: user!.id,
            anime_id: item.targetId,
            anime_name: item.malTitle,
            anime_poster: item.poster,
            status: item.status,
            mal_id: item.malId,
            anilist_id: item.anilistId || null,
            updated_at: new Date().toISOString()
          }))
          .filter((item) => {
            const key = `${item.user_id}:${item.anime_id}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });

        const { error } = await supabase
          .from('watchlist')
          .upsert(watchlistItems, { onConflict: 'user_id,anime_id' });

        if (error) throw error;
        toast.success(`${watchlistItems.length} éléments importés avec succès !`, { id: toastId });
      }

      setIsImportModalOpen(false);
      refreshProfile();
    } catch (err: any) {
      console.error('[Settings] Confirm Import failed:', err);
      toast.error(`Échec de l'importation : ${err.message}`, { id: toastId });
    }
  };

  const handleExportToMal = async () => {
    if (isExporting) return;
    setIsExporting(true);
    const toastId = toast.loading('Préparation de l\'exportation de la bibliothèque...');

    try {
      if (!profile?.mal_access_token) {
        throw new Error('MAL is not connected');
      }

      // Fetch AniStream watchlist
      const { data: watchlist, error: fetchError } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user!.id);

      if (fetchError) throw fetchError;

      const itemsToSync = watchlist?.filter(item => !!item.mal_id) || [];

      if (itemsToSync.length === 0) {
        toast.dismiss(toastId);
        toast.info('Aucun élément avec ID MyAnimeList trouvé dans votre liste de suivi.');
        setIsExporting(false);
        return;
      }

      toast.loading(`Synchronisation de ${itemsToSync.length} éléments vers MAL...`, { id: toastId });

      let successCount = 0;
      let failCount = 0;

      // Fetch all watch history for the user in one go to optimize
      const { data: historyData } = await supabase
        .from('watch_history')
        .select('anime_id, episode_number')
        .eq('user_id', user!.id);

      // Map progress to anime
      const progressMap = new Map();
      historyData?.forEach(h => {
        const current = progressMap.get(h.anime_id) || 0;
        if (h.episode_number > current) progressMap.set(h.anime_id, h.episode_number);
      });

      // Sync items in smaller batches or sequence
      for (const item of itemsToSync) {
        try {
          const progress = progressMap.get(item.anime_id);
          await updateMalAnimeStatus(
            String(item.mal_id),
            item.status,
            undefined,
            progress
          );
          successCount++;
        } catch (err) {
          console.warn(`[Settings] Failed to sync ${item.anime_name}:`, err);
          failCount++;
        }
      }

      if (failCount === 0) {
        toast.success(`${successCount} éléments exportés avec succès vers MyAnimeList !`, { id: toastId });
      } else {
        toast.info(`Exportation terminée : ${successCount} synchronisé(s), ${failCount} échec(s).`, { id: toastId });
      }
    } catch (err: any) {
      console.error('[Settings] Export failed:', err);
      toast.error(`Échec de l'exportation : ${err.message}`, { id: toastId });
    } finally {
      setIsExporting(false);
    }
  };

  const handleMALConnect = async () => {
    try {
      const url = await getMalAuthUrl();
      window.location.href = url;
    } catch (err) {
      toast.error('Échec de la génération de l\'URL d\'authentification MAL');
    }
  };

  const handleAniListConnect = () => {
    window.location.href = getAniListAuthUrl();
  };

  const handleMALDisconnect = async () => {
    if (!user) return;
    try {
      await disconnectMal(user.id);
      await refreshProfile();
      toast.success('MyAnimeList déconnecté');
    } catch {
      toast.error('Échec de la déconnexion');
    }
  };

  const handleAniListDisconnect = async () => {
    if (!user) return;
    try {
      await disconnectAniList(user.id);
      await refreshProfile();
      toast.success('AniList déconnecté');
    } catch {
      toast.error('Échec de la déconnexion');
    }
  };

  const handleImportFromAniList = async () => {
    if (isAniListImporting) return;
    setIsAniListImporting(true);
    setImportSource('anilist');
    setImportMediaType('anime');
    const toastId = toast.loading('Récupération de votre bibliothèque AniList...');

    try {
      if (!profile?.anilist_access_token) {
        throw new Error('AniList is not connected');
      }

      // We use the AniList user ID from profile if available, otherwise we might need to fetch it first
      let userId = profile.anilist_user_id;
      if (!userId) {
        // Quick fetch of user
        const { fetchAniListUser } = await import('@/lib/externalIntegrations');
        const aniUser = await fetchAniListUser(profile.anilist_access_token);
        userId = aniUser.id;
      }

      const aniList = await fetchAniListUserList(profile.anilist_access_token, Number(userId));
      console.log(`[Settings] Received ${aniList?.length || 0} items from AniList`);

      if (!aniList || aniList.length === 0) {
        toast.dismiss(toastId);
        toast.info('Votre bibliothèque AniList est vide.');
        setIsAniListImporting(false);
        return;
      }

      toast.loading(`Préparation de ${aniList.length} éléments AniList par correspondance d'ID...`, { id: toastId });

      // Reuse the same logic as MAL for matching
      // Fetch existing watchlist
      const { data: existingWatchlist } = await supabase
        .from('watchlist')
        .select('anime_id, mal_id, anilist_id')
        .eq('user_id', user!.id);

      const existingMalIds = new Map<number, string>();
      const existingAniListIds = new Map<number, string>();
      existingWatchlist?.forEach((entry: any) => {
        if (entry.mal_id) existingMalIds.set(Number(entry.mal_id), entry.anime_id);
        if (entry.anilist_id) existingAniListIds.set(Number(entry.anilist_id), entry.anime_id);
      });

      const processedItems = [];

      for (const item of aniList) {
        // item is an entry with .media
        const media = item.media;
        const anilistId = Number(media.id);
        const malId = media.idMal ? Number(media.idMal) : null;
        const title = media.title.english || media.title.romaji || media.title.native;

        const mappedByAniList = existingAniListIds.get(anilistId);
        const mappedByMal = malId ? existingMalIds.get(malId) : undefined;
        let targetId: string | undefined = mappedByAniList || mappedByMal;
        let confidence: 'exact' | 'new' = targetId ? 'exact' : 'new';

        if (!targetId) {
          targetId = malId ? `mal-${malId}` : `anilist-${anilistId}`;
          confidence = 'new';
        }

        if (targetId) {
          processedItems.push({
            malId,
            anilistId,
            malTitle: title,
            targetId,
            confidence,
            poster: media.coverImage.large || media.coverImage.medium,
            status: mapAniListStatusToAniStream(item.status),
            selected: true
          });
        }
      }

      setMalImportList(processedItems); // We reuse the same modal state/list
      setIsImportModalOpen(true);
      toast.dismiss(toastId);

    } catch (err: any) {
      console.error('[Settings] AniList Import failed:', err);
      toast.error(`Échec de l'importation : ${err.message}`, { id: toastId });
    } finally {
      setIsAniListImporting(false);
    }
  };

  const handleImportMangaFromAniList = async () => {
    if (isAniListImporting) return;
    setIsAniListImporting(true);
    setImportSource('anilist');
    setImportMediaType('manga');
    const toastId = toast.loading('Récupération de votre bibliothèque de mangas AniList...');

    try {
      if (!profile?.anilist_access_token) {
        throw new Error('AniList is not connected');
      }

      let userId = profile.anilist_user_id;
      if (!userId) {
        const { fetchAniListUser } = await import('@/lib/externalIntegrations');
        const aniUser = await fetchAniListUser(profile.anilist_access_token);
        userId = aniUser.id;
      }

      const aniList = await fetchAniListMangaList(profile.anilist_access_token, Number(userId));
      if (!aniList || aniList.length === 0) {
        toast.dismiss(toastId);
        toast.info('Votre bibliothèque de mangas AniList est vide.');
        return;
      }

      toast.loading(`Préparation de ${aniList.length} entrées manga AniList...`, { id: toastId });

      const { data: existingReadlist } = await supabase
        .from('manga_readlist')
        .select('manga_id, mal_id, anilist_id')
        .eq('user_id', user!.id);

      const existingMalIds = new Map<number, string>();
      const existingAniListIds = new Map<number, string>();
      existingReadlist?.forEach((entry: any) => {
        if (entry.mal_id) existingMalIds.set(Number(entry.mal_id), entry.manga_id);
        if (entry.anilist_id) existingAniListIds.set(Number(entry.anilist_id), entry.manga_id);
      });

      const processedItems: ExternalImportItem[] = [];

      for (const item of aniList) {
        const media = item.media;
        const anilistId = Number(media?.id);
        const malId = media?.idMal ? Number(media.idMal) : null;
        const title = media?.title?.english || media?.title?.romaji || media?.title?.native || 'Unknown title';

        const mappedByAniList = Number.isFinite(anilistId) ? existingAniListIds.get(anilistId) : undefined;
        const mappedByMal = malId ? existingMalIds.get(malId) : undefined;
        const targetId = mappedByAniList || mappedByMal || buildFallbackMangaId(title, malId, anilistId);

        if (!targetId) continue;

        processedItems.push({
          malId,
          anilistId: Number.isFinite(anilistId) ? anilistId : null,
          malTitle: title,
          targetId,
          confidence: (mappedByAniList || mappedByMal) ? 'exact' : 'new',
          poster: media?.coverImage?.large || media?.coverImage?.medium || null,
          status: mapAniListMangaStatusToAniStream(item.status),
          progress: Number.isFinite(Number(item.progress)) && Number(item.progress) > 0 ? Number(item.progress) : null,
          selected: true,
        });
      }

      setMalImportList(processedItems);
      setIsImportModalOpen(true);
      toast.dismiss(toastId);
    } catch (err: any) {
      console.error('[Settings] AniList Manga Import failed:', err);
      toast.error(`Échec de l'importation du manga : ${err.message}`, { id: toastId });
    } finally {
      setIsAniListImporting(false);
    }
  };

  const handleExportToAniList = async () => {
    if (isAniListExporting) return;
    setIsAniListExporting(true);
    const toastId = toast.loading('Synchronisation de la bibliothèque vers AniList...');

    try {
      if (!profile?.anilist_access_token) throw new Error('AniList not connected');

      // Fetch AniStream watchlist
      const { data: watchlist } = await supabase
        .from('watchlist')
        .select('*')
        .eq('user_id', user!.id);

      if (!watchlist || watchlist.length === 0) {
        toast.info('La liste de suivi est vide', { id: toastId });
        return;
      }

      let successCount = 0;
      let failCount = 0;

      const { searchAniListAnime } = await import('@/lib/externalIntegrations');

      for (const item of watchlist) {
        try {
          // We need the AniList Media ID.
          let mediaId = item.anilist_id || null;

          if (!mediaId && item.mal_id) {
            const results = await searchAniListAnime(item.anime_name);
            const match = results.find(r => r.idMal == item.mal_id) || results[0];
            if (match) mediaId = match.id;
          } else if (!mediaId) {
            const results = await searchAniListAnime(item.anime_name);
            if (results.length > 0) mediaId = results[0].id;
          }

          if (mediaId) {
            await updateAniListAnimeStatus(
              profile.anilist_access_token,
              mediaId,
              mapAniStreamStatusToAniList(item.status),
            );
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          console.warn(`Failed to sync ${item.anime_name} to AniList`, e);
          failCount++;
        }

        // Respect AniList API rate limits (90 req/min)
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      toast.success(`${successCount} éléments synchronisés vers AniList (${failCount} échec(s)/ignoré(s))`, { id: toastId });

    } catch (err: any) {
      toast.error(`Échec de l'exportation : ${err.message}`, { id: toastId });
    } finally {
      setIsAniListExporting(false);
    }
  };

  const handleExportMangaToAniList = async () => {
    if (isAniListExporting) return;
    setIsAniListExporting(true);
    const toastId = toast.loading('Synchronisation de la liste de lecture manga vers AniList...');

    try {
      if (!profile?.anilist_access_token) throw new Error('AniList not connected');

      const { data: readlist } = await supabase
        .from('manga_readlist')
        .select('*')
        .eq('user_id', user!.id);

      if (!readlist || readlist.length === 0) {
        toast.info('La liste de lecture manga est vide', { id: toastId });
        return;
      }

      let successCount = 0;
      let failCount = 0;

      const { searchAniListManga } = await import('@/lib/externalIntegrations');

      for (const item of readlist) {
        try {
          let mediaId = item.anilist_id || null;

          if (!mediaId && item.mal_id) {
            const results = await searchAniListManga(item.manga_title);
            const match = results.find((result) => Number(result.idMal) === Number(item.mal_id)) || results[0];
            if (match) mediaId = match.id;
          } else if (!mediaId) {
            const results = await searchAniListManga(item.manga_title);
            if (results.length > 0) mediaId = results[0].id;
          }

          if (mediaId) {
            const chapterProgress = toPositiveChapterProgress(item.last_chapter_number);
            const statusForSync = normalizeMangaSyncStatus(item.status, chapterProgress);
            await updateAniListMangaStatus(
              profile.anilist_access_token,
              Number(mediaId),
              mapAniStreamMangaStatusToAniList(statusForSync),
              chapterProgress ?? undefined,
            );
            successCount++;
          } else {
            failCount++;
          }
        } catch (e) {
          console.warn(`Failed to sync manga ${item.manga_title} to AniList`, e);
          failCount++;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      toast.success(`Synchronisation manga terminée : ${successCount} synchronisé(s) (${failCount} échec(s)/ignoré(s))`, { id: toastId });
    } catch (err: any) {
      toast.error(`Échec de l'exportation du manga : ${err.message}`, { id: toastId });
    } finally {
      setIsAniListExporting(false);
    }
  };

  const handleImportFromMalByMediaType = async () => {
    if (malSyncTarget === 'manga') {
      await handleImportMangaFromMal();
      return;
    }
    await handleImportFromMal();
  };

  const handleExportToMalByMediaType = async () => {
    if (malSyncTarget === 'manga') {
      await handleExportMangaToMal();
      return;
    }
    await handleExportToMal();
  };

  const handleImportFromAniListByMediaType = async () => {
    if (aniListSyncTarget === 'manga') {
      await handleImportMangaFromAniList();
      return;
    }
    await handleImportFromAniList();
  };

  const handleExportToAniListByMediaType = async () => {
    if (aniListSyncTarget === 'manga') {
      await handleExportMangaToAniList();
      return;
    }
    await handleExportToAniList();
  };

  function mapAniListStatusToAniStream(status: string) {
    const map: Record<string, string> = {
      'CURRENT': 'watching',
      'COMPLETED': 'completed',
      'PLANNING': 'plan_to_watch',
      'DROPPED': 'dropped',
      'PAUSED': 'on_hold',
      'REPEATING': 'watching'
    };
    return map[status] || 'plan_to_watch';
  }

  function mapAniStreamStatusToAniList(status: string) {
    const map: Record<string, any> = {
      'watching': 'CURRENT',
      'completed': 'COMPLETED',
      'plan_to_watch': 'PLANNING',
      'dropped': 'DROPPED',
      'on_hold': 'PAUSED'
    };
    return map[status] || 'PLANNING';
  }

  const handleClearHistory = async () => {
    try {
      await clearHistory.mutateAsync();
      toast.success('Tout l\'historique de visionnage effacé');
      setShowClearConfirm(false);
    } catch {
      toast.error('Échec de l\'effacement de l\'historique');
    }
  };

  const hasMAL = !!profile?.mal_access_token;
  const hasAniList = !!profile?.anilist_access_token;




  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Background />
      <Sidebar />

      <main className={cn(
        "relative z-10 pr-6 py-6 max-w-[1400px] mx-auto pb-24 md:pb-6",
        isNative ? "pl-6" : "pl-6 md:pl-32"
      )}>
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour</span>
          </button>
        </div>

        <div className="mb-8">
          <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Paramètres</h1>
          <p className="text-muted-foreground">Personnalisez votre expérience</p>
        </div>

        {/* Settings Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-muted/50 p-1 flex-wrap h-auto gap-1">
            <TabsTrigger value="appearance" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Palette className="w-4 h-4" />
              Apparence
            </TabsTrigger>
            {isNative && (
              <TabsTrigger value="desktop" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Laptop className="w-4 h-4" />
                App
              </TabsTrigger>
            )}
            <TabsTrigger value="player" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Film className="w-4 h-4" />
              Lecteur vidéo
            </TabsTrigger>
            <TabsTrigger value="display" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Monitor className="w-4 h-4" />
              Affichage
            </TabsTrigger>
            <TabsTrigger value="privacy" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4" />
              Confidentialité
            </TabsTrigger>
            <TabsTrigger value="about" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Info className="w-4 h-4" />
              À propos
            </TabsTrigger>
            <TabsTrigger value="changelog" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <History className="w-4 h-4" />
              Notes de version
            </TabsTrigger>
          </TabsList>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <ThemeSelector />
          </TabsContent>

          {/* Desktop Tab */}
          {!isMobile && (
            <TabsContent value="desktop">
              <DesktopSettings />
            </TabsContent>
          )}

          {/* Mobile Tab */}
          {isMobile && (
            <TabsContent value="desktop">
              <MobileSettings />
            </TabsContent>
          )}

          {/* Video Player Tab */}
          <TabsContent value="player">
            <GlassPanel className="p-6">
              <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
                <Film className="w-5 h-5 text-primary" />
                Paramètres du lecteur vidéo
              </h2>
              <VideoSettingsPanel isOpen={true} onClose={() => { }} embedded />
            </GlassPanel>
          </TabsContent>

          {/* Display Tab */}
          <TabsContent value="display">
            <GlassPanel className="p-6">
              <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
                <Monitor className="w-5 h-5 text-primary" />
                Paramètres d'affichage
              </h2>
              <div className="space-y-6">
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                    <p className="font-medium">Langue des titres préférée</p>
                    <p className="text-sm text-muted-foreground">Sélectionnez comment les titres d'anime doivent être affichés</p>
                    </div>
                    <Select
                      value={preferredTitleLanguage}
                      onValueChange={(value: any) => handleTitleLanguageChange(value)}
                    >
                      <SelectTrigger className="w-[140px] bg-background/50 border-white/10">
                        <SelectValue placeholder="Sélectionnez la langue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="romaji">Rōmaji</SelectItem>
                        <SelectItem value="english">Anglais</SelectItem>
                        <SelectItem value="native">Natif</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex flex-col gap-3 p-4 rounded-xl bg-muted/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">Langue manga préférée</p>
                      <p className="text-sm text-muted-foreground">Choisissez votre langue de traduction par défaut pour les mangas</p>
                    </div>
                    <Select
                      value={preferredMangaLanguage}
                      onValueChange={(value: PreferredMangaLanguage) => handleMangaLanguageChange(value)}
                    >
                      <SelectTrigger className="w-[180px] bg-background/50 border-white/10">
                        <SelectValue placeholder="Sélectionner une langue" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="auto">Auto</SelectItem>
                        <SelectItem value="fr">Français</SelectItem>
                        <SelectItem value="en">Anglais</SelectItem>
                        <SelectItem value="jp">Japonais</SelectItem>
                        <SelectItem value="kr">Coréen</SelectItem>
                        <SelectItem value="zh">Chinois</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-medium">Réduire les animations</p>
                    <p className="text-sm text-muted-foreground">Minimiser les animations pour de meilleures performances</p>
                  </div>
                  <Switch
                    checked={reduceMotion}
                    onCheckedChange={setReduceMotion}
                  />
                </div>
                <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                  <div>
                    <p className="font-medium">Mode haut contraste</p>
                    <p className="text-sm text-muted-foreground">Augmenter le contraste visuel pour l'accessibilité</p>
                  </div>
                  <Switch
                    checked={highContrast}
                    onCheckedChange={setHighContrast}
                  />
                </div>
              </div>
            </GlassPanel>
          </TabsContent>

          {/* Privacy Tab */}
          <TabsContent value="privacy">
            <GlassPanel className="p-6">
              <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Paramètres de confidentialité
              </h2>
              {user ? (
                <div className="space-y-6">
                  <div id="mature-content-controls" className="p-4 rounded-xl bg-muted/30 border border-white/10">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                    <p className="font-medium">Contrôle du contenu mature</p>
                    <p className="text-sm text-muted-foreground">
                          Masquer les titres 18+ par défaut, flouter les résultats explicites et décider si des avertissements apparaissent avant l'ouverture.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                        <div>
                          <p className="font-medium text-sm">Afficher le contenu mature partout</p>
                          <p className="text-xs text-muted-foreground">
                            Inclut les titres matures dans les sections d'accueil et les listes de découverte non explicites.
                          </p>
                        </div>
                        <Switch
                          checked={contentSafetySettings.showAdultEverywhere}
                          onCheckedChange={(checked) => {
                            updateContentSafetySettings({ showAdultEverywhere: checked });
                            toast.success(
                              checked
                                ? 'Le contenu mature est maintenant visible dans les découvertes.'
                                : 'Le contenu mature restera masqué sauf recherche explicite.'
                            );
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                        <div>
                          <p className="font-medium text-sm">Flouter les résultats matures</p>
                          <p className="text-xs text-muted-foreground">
                            Lorsque des requêtes explicites sont utilisées en mode sécurisé, les couvertures matures restent floutées dans les résultats.
                          </p>
                        </div>
                        <Switch
                          checked={contentSafetySettings.blurAdultInSearch}
                          onCheckedChange={(checked) => {
                            updateContentSafetySettings({ blurAdultInSearch: checked });
                            toast.success(                            checked ? 'Les résultats matures seront floutés.' : 'Les résultats matures seront affichés clairement.');
                          }}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                        <div>
                          <p className="font-medium text-sm">Avertir avant d'ouvrir</p>
                          <p className="text-xs text-muted-foreground">
                            Affiche un écran d'avertissement avant de charger les détails ou chapitres d'un manga mature.
                          </p>
                        </div>
                        <Switch
                          checked={contentSafetySettings.warnBeforeAdultOpen}
                          onCheckedChange={(checked) => {
                            updateContentSafetySettings({ warnBeforeAdultOpen: checked });
                            toast.success(                            checked ? 'Avertissements de contenu mature activés.' : 'Avertissements de contenu mature désactivés.');
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center gap-4">
                      {isPublic ? (
                        <Globe className="w-6 h-6 text-green-500" />
                      ) : (
                        <EyeOff className="w-6 h-6 text-muted-foreground" />
                      )}
                      <div>
                        <p className="font-medium">Profil public</p>
                        <p className="text-sm text-muted-foreground">
                          {isPublic
                            ? 'Votre profil, votre liste de suivi et votre historique sont visibles par tout le monde'
                            : 'Seul vous pouvez voir votre profil, votre liste de suivi et votre historique'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={isPublic}
                      onCheckedChange={handlePrivacyChange}
                      disabled={updatePrivacy.isPending}
                    />
                  </div>

                  <div className="p-4 rounded-xl bg-muted/20 border border-muted">
                    <p className="text-sm text-muted-foreground">
                      Lorsque votre profil est public, les autres utilisateurs peuvent voir :
                    </p>
                    <ul className="mt-2 text-sm text-muted-foreground list-disc list-inside space-y-1">
                      <li>Vos informations de profil et votre avatar</li>
                      <li>Votre liste de suivi (anime favoris)</li>
                      <li>Votre historique et progression</li>
                      <li>Vos listes de classement créées</li>
                    </ul>
                  </div>

                  {/* Clear Watch History */}
                  <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                    <div className="flex items-start gap-4">
                      <Trash2 className="w-5 h-5 text-destructive mt-1" />
                      <div className="flex-1">
                        <p className="font-medium mb-1">Effacer l'historique</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Supprimer définitivement tout votre historique de visionnage. Cette action est irréversible.
                        </p>
                        {showClearConfirm ? (
                          <div className="space-y-3">
                            <div className="p-3 rounded-lg bg-destructive/20 border border-destructive">
                                <p className="text-sm font-medium text-destructive">
                                  Êtes-vous sûr ? Cela supprimera définitivement tout votre historique et votre progression.
                                </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                onClick={handleClearHistory}
                                disabled={clearHistory.isPending}
                                className="gap-2"
                              >
                                <Trash2 className="w-4 h-4" />
                                {clearHistory.isPending ? 'Suppression...' : 'Oui, tout supprimer'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowClearConfirm(false)}
                                disabled={clearHistory.isPending}
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setShowClearConfirm(true)}
                            className="gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Tout effacer
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Clear Search History */}
                    <div className="flex items-start gap-4 pt-6 border-t border-border/50">
                      <Search className="w-5 h-5 text-destructive mt-1" />
                      <div className="flex-1">
                        <p className="font-medium mb-1">Effacer l'historique de recherche</p>
                        <p className="text-sm text-muted-foreground mb-4">
                          Supprimer tout votre historique de recherche stocké localement sur cet appareil.
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            try {
                              localStorage.removeItem('AniStream_search_history');
                              toast.success('Historique de recherche effacé');
                            } catch {
                              toast.error('Échec de l\'effacement de l\'historique de recherche');
                            }
                          }}
                          className="gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Effacer l'historique
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <div id="mature-content-controls" className="p-4 rounded-xl bg-muted/30 border border-white/10">
                    <div className="flex items-start gap-3 mb-4">
                      <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                      <div>
                        <p className="font-medium">Contrôle du contenu mature</p>
                        <p className="text-sm text-muted-foreground">
                          Ces paramètres sont locaux à cet appareil et s'appliquent même lorsque vous n'êtes pas connecté.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                        <div>
                          <p className="font-medium text-sm">Afficher le contenu mature partout</p>
                          <p className="text-xs text-muted-foreground">Afficher les mangas matures dans toutes les sections de découverte.</p>
                        </div>
                        <Switch
                          checked={contentSafetySettings.showAdultEverywhere}
                          onCheckedChange={(checked) => updateContentSafetySettings({ showAdultEverywhere: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                        <div>
                          <p className="font-medium text-sm">Flouter les résultats matures</p>
                          <p className="text-xs text-muted-foreground">Garder les couvertures de résultats explicites floutées lors de la navigation.</p>
                        </div>
                        <Switch
                          checked={contentSafetySettings.blurAdultInSearch}
                          onCheckedChange={(checked) => updateContentSafetySettings({ blurAdultInSearch: checked })}
                        />
                      </div>

                      <div className="flex items-center justify-between p-3 rounded-lg bg-background/40 border border-white/5">
                        <div>
                          <p className="font-medium text-sm">Avertir avant d'ouvrir</p>
                          <p className="text-xs text-muted-foreground">Exiger une confirmation avant d'accéder aux pages de mangas matures.</p>
                        </div>
                        <Switch
                          checked={contentSafetySettings.warnBeforeAdultOpen}
                          onCheckedChange={(checked) => updateContentSafetySettings({ warnBeforeAdultOpen: checked })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-center py-4">
                    <Shield className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Connectez-vous pour gérer les paramètres de confidentialité</p>
                    <Button onClick={() => window.location.href = '/auth'} className="mt-4">
                      Connexion
                    </Button>
                  </div>
                </div>
              )}
            </GlassPanel>
          </TabsContent>



          {/* About Tab */}
          <TabsContent value="about">
            <GlassPanel className="p-6">
                <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
                  <Info className="w-5 h-5 text-primary" />
                  À propos
                </h2>
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/30 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium mb-1">AniStream</p>
                    <p className="text-sm text-muted-foreground">Version {__APP_VERSION__}</p>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                    Une plateforme de streaming d'anime moderne avec support Smart TV,
                    de beaux thèmes et des fonctionnalités puissantes de lecteur vidéo.
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-primary/10 text-center">
                    <p className="text-2xl font-bold text-primary">{themes.length}</p>
                    <p className="text-sm text-muted-foreground">Thèmes</p>
                  </div>
                  <div className="p-4 rounded-xl bg-secondary/10 text-center">
                    <p className="text-2xl font-bold text-secondary">∞</p>
                    <p className="text-sm text-muted-foreground">Animes</p>
                  </div>
                </div>

                {/* Legal Links */}
                <div className="p-4 rounded-xl bg-muted/30">
                  <p className="font-medium mb-3">Mentions légales</p>
                  <div className="flex flex-col gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = '/terms'}
                      className="justify-start"
                    >
                      Conditions d'utilisation
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = '/dmca'}
                      className="justify-start"
                    >
                      Politique DMCA
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => window.location.href = '/suggestions'}
                      className="justify-start"
                    >
                      Envoyer un avis
                    </Button>
                  </div>
                </div>
              </div>
            </GlassPanel>
          </TabsContent>

          {/* Changelog Tab */}
          <TabsContent value="changelog">
            <GlassPanel className="p-6">
                <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
                  <History className="w-5 h-5 text-primary" />
                  Journal des modifications
                </h2>
              <div className="space-y-6">
                {CHANGELOG.map((release, index) => (
                  <div key={release.version} className={`p-4 rounded-xl ${index === 0 ? 'bg-primary/10 border border-primary/20' : 'bg-muted/30'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded-md text-xs font-bold ${index === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                          v{release.version}
                        </span>
                        {index === 0 && (
                          <span className="px-2 py-1 rounded-md bg-green-500/20 text-green-500 text-xs font-bold">
                            Dernière
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-muted-foreground">{release.date}</span>
                    </div>
                    <ul className="space-y-2">
                      {release.changes.map((change, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <span className="text-primary mt-1">•</span>
                          <span className="text-foreground/80">{change}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </GlassPanel>
          </TabsContent>

        </Tabs>
      </main>
      <MobileNav />


      {/* MAL Import Selection Modal */}
      <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-background/95 backdrop-blur-xl border-border/50">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {importSource === 'mal' ? (
                <>
                  <List className="w-6 h-6 text-[#2E51A2]" />
                  {importMediaType === 'manga' ? 'Importer le manga depuis MyAnimeList' : 'Importer l\'anime depuis MyAnimeList'}
                </>
              ) : (
                <>
                  <List className="w-6 h-6 text-[#02A9FF]" />
                  {importMediaType === 'manga' ? 'Importer le manga depuis AniList' : 'Importer l\'anime depuis AniList'}
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground pt-1">
              Sélectionnez le/les {importMediaType === 'manga' ? 'mangas' : 'animes'} que vous souhaitez importer. La correspondance est basée sur l'ID, et vous pouvez choisir manuellement une correspondance AniStream différente pour chaque ligne.
            </DialogDescription>
          </DialogHeader>

          {/* <div className="px-6 py-2">
            <div className={cn(
              "border rounded-lg p-3 flex items-start gap-3 text-sm",
              importSource === 'mal' ? "bg-amber-500/10 border-amber-500/20 text-amber-500" : "bg-[#02A9FF]/10 border-[#02A9FF]/20 text-[#02A9FF]"
            )}>
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>
                <strong>ID Identification Notice</strong>: Imports are ID-first only. We use <code>{importSource === 'mal' ? 'mal_id' : 'anilist_id'}</code> / <code>mal_id</code> mappings directly and avoid automatic title guesses. Use <strong>Manual Match</strong> to override any {importMediaType === 'manga' ? 'entry' : 'item'}.
              </p>
            </div> */}

          <ScrollArea className="h-[60vh] px-6 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-6">
              {malImportList.map((item, idx) => (
                <div
                  key={`${item.targetId || item.anilistId || item.malId || idx}-${idx}`}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer",
                    item.selected ? "bg-primary/5 border-primary/30" : "bg-muted/30 border-transparent hover:bg-muted/50"
                  )}
                  onClick={() => {
                    const newList = [...malImportList];
                    newList[idx].selected = !newList[idx].selected;
                    setMalImportList(newList);
                  }}
                >
                  <Checkbox
                    checked={item.selected}
                    className="data-[state=checked]:bg-[#2E51A2] data-[state=checked]:border-[#2E51A2]"
                  />

                  <div className="relative w-12 h-16 rounded overflow-hidden flex-shrink-0 bg-muted">
                    {item.poster && (
                      <img src={item.poster} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium text-sm truncate">{item.malTitle}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (searchingIdx === idx) {
                            setSearchingIdx(null);
                          } else {
                            setSearchingIdx(idx);
                            setManualSearchQuery(item.malTitle);
                            handleManualSearch(item.malTitle);
                          }
                        }}
                      >
                        <Search className="w-3 h-3" />
                        <span>Correspondance manuelle</span>
                      </Button>
                    </div>

                    {searchingIdx === idx ? (
                      <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
                        <div className="relative">
                          <input
                            autoFocus
                            className="w-full bg-background border border-border/50 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Rechercher sur AniStream..."
                            value={manualSearchQuery}
                            onChange={(e) => handleManualSearch(e.target.value)}
                          />
                          {isManualSearching && (
                            <Loader2 className="absolute right-2 top-2 w-3 h-3 animate-spin opacity-50" />
                          )}
                        </div>

                        {manualSearchResults.length > 0 && (
                          <div className="max-h-32 overflow-y-auto rounded-lg border border-border/30 bg-muted/50 p-1 space-y-1">
                            {manualSearchResults.slice(0, 5).map((result) => (
                              <div
                                key={result.id}
                                className="flex items-center gap-2 p-1.5 hover:bg-primary/10 rounded cursor-pointer transition-colors"
                                onClick={() => handleSelectManualMatch(idx, result)}
                              >
                                <img src={result.poster} className="w-6 h-8 object-cover rounded shadow-sm" alt="" />
                                <div className="min-w-0">
                                  <p className="text-[10px] font-medium truncate">{result.name}</p>
                                  <p className="text-[8px] text-muted-foreground">{result.type || (importMediaType === 'manga' ? 'Manga' : 'Anime')}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] py-0 px-1 uppercase opacity-70">
                          {item.status.replace('_', ' ')}
                        </Badge>

                        {item.confidence === 'exact' && (
                          <Badge className="bg-green-500/10 text-green-500 border-green-500/20 text-[10px] py-0 px-1">Correspondance exacte</Badge>
                        )}
                        {item.confidence === 'guessed' && (
                          <Badge className="bg-blue-500/10 text-blue-500 border-blue-500/20 text-[10px] py-0 px-1">Meilleure correspondance</Badge>
                        )}
                        {item.confidence === 'new' && (
                          <Badge className="bg-muted text-muted-foreground border-transparent text-[10px] py-0 px-1">Nouveau sur AniStream</Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          <DialogFooter className="p-6 pt-2 bg-muted/30 border-t border-border/50">
            <div className="flex items-center justify-between w-full">
              <p className="text-xs text-muted-foreground">
                {malImportList.filter(i => i.selected).length} {importMediaType === 'manga' ? 'manga' : 'anime'} sélectionné(s)
              </p>
              <div className="flex items-center gap-3">
                <Button variant="ghost" onClick={() => setIsImportModalOpen(false)}>
                  Annuler
                </Button>
                <Button
                  className={cn(
                    importSource === 'mal'
                      ? 'bg-[#2E51A2] hover:bg-[#2E51A2]/90'
                      : 'bg-[#02A9FF] hover:bg-[#02A9FF]/90 text-white'
                  )}
                  onClick={() => handleConfirmImport(malImportList)}
                >
                  Confirmer l'importation
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
