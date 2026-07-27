import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { getRankImageUrl, getRankNameStyle } from '@/lib/rankUtils';
import { cn } from '@/lib/utils';
import { Search, Trophy, CheckCircle, Lock, UserCircle, Loader2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// ── Achievement definitions ──────────────────────────────────────────────
const ACHIEVEMENTS = [
  { id: 'filler-watcher', title: 'Filler Watcher',  description: 'Regardez votre tout premier épisode',            rank: 1  },
  { id: 'genin',          title: 'Genin',            description: 'Regardez 5 épisodes — le voyage commence',    rank: 2  },
  { id: 'chunin',         title: 'Chunin',           description: 'Atteignez 10 épisodes regardés',               rank: 3  },
  { id: 'week-warrior',   title: 'Jonin',            description: 'Maintenez une série de 7 jours',            rank: 4  },
  { id: 'plus-ultra',     title: 'Plus Ultra',       description: 'Regardez 35 épisodes — allez plus loin !',           rank: 5  },
  { id: 'pro-hero',       title: 'Pro Hero',         description: 'Regardez 50 épisodes — vous êtes un héros',        rank: 6  },
  { id: 'soul-reaper',    title: 'Soul Reaper',      description: 'Explorez 25 séries d\'anime différentes',        rank: 7  },
  { id: 'bankai',         title: 'Bankai',           description: 'Atteignez 100 épisodes regardés au total',         rank: 8  },
  { id: 'survey-corps',   title: 'Survey Corps',     description: 'Explorez 50 séries d\'anime différentes',        rank: 9  },
  { id: 'month-legend',   title: 'Titan Shifter',    description: 'Maintenez une série de 30 jours',           rank: 10 },
  { id: 'demon-slayer',   title: 'Demon Slayer',     description: 'Accumulez 5000+ minutes de visionnage',           rank: 11 },
  { id: 'hashira',        title: 'Hashira',          description: 'Regardez 600 épisodes — un vrai Pilier', rank: 12 },
];

const RANK_EPISODES = [0, 0, 5, 10, 20, 35, 50, 75, 100, 150, 250, 400, 600];

// ── Helpers ──────────────────────────────────────────────────────────────
function computeAutoUnlocked(
  totalEpisodes: number,
  uniqueAnime: number,
  totalMinutes: number,
  longestStreak: number,
): Set<string> {
  const s = new Set<string>();
  if (totalEpisodes >= 1)   s.add('filler-watcher');
  if (totalEpisodes >= 5)   s.add('genin');
  if (totalEpisodes >= 10)  s.add('chunin');
  if (longestStreak >= 7)   s.add('week-warrior');
  if (totalEpisodes >= 35)  s.add('plus-ultra');
  if (totalEpisodes >= 50)  s.add('pro-hero');
  if (uniqueAnime >= 25)    s.add('soul-reaper');
  if (totalEpisodes >= 100) s.add('bankai');
  if (uniqueAnime >= 50)    s.add('survey-corps');
  if (longestStreak >= 30)  s.add('month-legend');
  if (totalMinutes >= 5000) s.add('demon-slayer');
  if (totalEpisodes >= 600) s.add('hashira');
  return s;
}

// ── Component ─────────────────────────────────────────────────────────────
export function AchievementManager() {
  const { profile: adminProfile } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedUser, setSelectedUser] = useState<{ user_id: string; display_name: string; username: string; avatar_url: string | null } | null>(null);
  const [note, setNote] = useState('');
  const [revokeNote, setRevokeNote] = useState('');

  // ── User search ──────────────────────────────────────────────────────
  const { data: users = [], isFetching: searchFetching } = useQuery({
    queryKey: ['admin_achievement_user_search', search],
    enabled: search.trim().length >= 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, avatar_url')
        .or(`display_name.ilike.%${search}%,username.ilike.%${search}%`)
        .limit(10);
      if (error) throw error;
      return data ?? [];
    },
  });

  // ── Selected user's watch stats ──────────────────────────────────────
  const { data: watchStats } = useQuery({
    queryKey: ['admin_watch_stats', selectedUser?.user_id],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('watch_history')
        .select('anime_id, duration_seconds, watched_at')
        .eq('user_id', selectedUser!.user_id);
      if (error) throw error;
      const history = data ?? [];
      const totalEpisodes = history.length;
      const uniqueAnime = new Set(history.map((h) => h.anime_id)).size;
      const totalMinutes = history.reduce((s, h) => s + Math.floor((h.duration_seconds || 0) / 60), 0);

      // Calculate longest streak from watch dates
      const days = Array.from(
        new Set(history.map((h) => new Date(h.watched_at).toISOString().slice(0, 10)))
      ).sort();
      let longest = 0, cur = 0;
      for (let i = 0; i < days.length; i++) {
        if (i === 0) { cur = 1; }
        else {
          const prev = new Date(days[i - 1]);
          const curr = new Date(days[i]);
          const diff = (curr.getTime() - prev.getTime()) / 86400000;
          cur = diff === 1 ? cur + 1 : 1;
        }
        if (cur > longest) longest = cur;
      }
      return { totalEpisodes, uniqueAnime, totalMinutes, longestStreak: longest };
    },
  });

  // ── Manual grants for the user ────────────────────────────────────────
  const { data: grants = [] } = useQuery({
    queryKey: ['admin_user_achievements', selectedUser?.user_id],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data, error } = await (supabase
        .from('user_achievements' as any)
        .select('achievement_id, granted_at, note')
        .eq('user_id', selectedUser!.user_id)) as any;
      if (error) throw error;
      return data ?? [];
    },
  });

  const grantedSet = new Set(grants.map((g) => g.achievement_id));

  const autoSet = watchStats
    ? computeAutoUnlocked(
        watchStats.totalEpisodes,
        watchStats.uniqueAnime,
        watchStats.totalMinutes,
        watchStats.longestStreak,
      )
    : new Set<string>();

  // ── Grant mutation ────────────────────────────────────────────────────
  const grantMutation = useMutation({
    mutationFn: async ({ achievementId }: { achievementId: string }) => {
      const { error } = await supabase.from('user_achievements' as any).upsert({
        user_id: selectedUser!.user_id,
        achievement_id: achievementId,
        granted_by: adminProfile?.user_id,
        note: note.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_user_achievements', selectedUser?.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user_achievements', selectedUser?.user_id] });
      toast.success('Succès accordé');
      setNote('');
    },
    onError: (e: any) => toast.error('Échec de l\'attribution : ' + e.message),
  });

  // ── Revoke mutation ───────────────────────────────────────────────────
  const revokeMutation = useMutation({
    mutationFn: async ({ achievementId }: { achievementId: string }) => {
      const { error } = await (supabase
        .from('user_achievements' as any)
        .delete()
        .eq('user_id', selectedUser!.user_id)
        .eq('achievement_id', achievementId)) as any;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin_user_achievements', selectedUser?.user_id] });
      queryClient.invalidateQueries({ queryKey: ['user_achievements', selectedUser?.user_id] });
      toast.success('Succès révoqué');
    },
    onError: (e: any) => toast.error('Échec de la révocation : ' + e.message),
  });

  const isPending = grantMutation.isPending || revokeMutation.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Trophy className="w-5 h-5 text-amber-400" />
        <h2 className="text-lg font-bold font-display">Gestionnaire de succès</h2>
      </div>

      {/* User search */}
      <GlassPanel className="p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Rechercher un utilisateur par nom ou @pseudo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {searchFetching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>

        {users.length > 0 && !selectedUser && (
          <div className="rounded-md border border-border divide-y divide-border">
            {users.map((u) => (
              <button
                key={u.user_id}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted/40 transition-colors"
                onClick={() => { setSelectedUser(u); setSearch(''); }}
              >
                {u.avatar_url ? (
                  <img src={u.avatar_url} className="w-7 h-7 rounded-full object-cover" alt="" />
                ) : (
                  <UserCircle className="w-7 h-7 text-muted-foreground" />
                )}
                <span className="text-sm font-medium">{u.display_name}</span>
                <span className="text-xs text-muted-foreground">@{u.username}</span>
              </button>
            ))}
          </div>
        )}
      </GlassPanel>

      {/* Selected user panel */}
      {selectedUser && (
        <>
          <GlassPanel className="p-4 flex items-center gap-4">
            {selectedUser.avatar_url ? (
              <img src={selectedUser.avatar_url} className="w-10 h-10 rounded-full object-cover" alt="" />
            ) : (
              <UserCircle className="w-10 h-10 text-muted-foreground" />
            )}
            <div className="flex-1 min-w-0">
              <div className="font-bold">{selectedUser.display_name}</div>
              <div className="text-xs text-muted-foreground">@{selectedUser.username}</div>
              {watchStats && (
                <div className="flex flex-wrap gap-2 mt-1">
                  <Badge variant="secondary">{watchStats.totalEpisodes} ép.</Badge>
                  <Badge variant="secondary">{watchStats.uniqueAnime} animes</Badge>
                  <Badge variant="secondary">{watchStats.totalMinutes} min</Badge>
                  <Badge variant="secondary">{watchStats.longestStreak} j. série</Badge>
                </div>
              )}
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelectedUser(null)}>
              <X className="w-4 h-4" />
            </Button>
          </GlassPanel>

          {/* Note field */}
          <GlassPanel className="p-4">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">
              Note d\'attribution (facultative, jointe à la prochaine attribution)
            </label>
            <Textarea
              rows={2}
              placeholder="ex. Attribué dans le cadre de l'événement saison 1"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </GlassPanel>

          {/* Achievement grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ACHIEVEMENTS.map((a) => {
              const isAuto = autoSet.has(a.id);
              const isManual = grantedSet.has(a.id);
              const unlocked = isAuto || isManual;
              const ns = getRankNameStyle(RANK_EPISODES[a.rank] ?? 0);

              return (
                <GlassPanel
                  key={a.id}
                  className={cn(
                    'p-3 flex flex-col items-center gap-2 text-center relative overflow-hidden',
                    !unlocked && 'opacity-50 grayscale',
                  )}
                >
                  {/* Status badge */}
                  <div className="absolute top-2 left-2">
                    {isAuto && (
                      <Badge variant="secondary" className="text-[9px] px-1 py-0">auto</Badge>
                    )}
                    {isManual && !isAuto && (
                      <Badge variant="default" className="text-[9px] px-1 py-0 bg-amber-500/80">admin</Badge>
                    )}
                  </div>

                  <img
                    src={getRankImageUrl(a.rank)}
                    alt={a.title}
                    className="w-10 h-10 object-contain mt-2"
                  />

                  <div>
                    <div
                      className={cn('text-xs font-bold leading-tight', unlocked ? ns.className : '')}
                      style={unlocked ? ns.style : {}}
                    >
                      {a.title}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
                      {a.description}
                    </div>
                  </div>

                  {/* Action buttons — only admin-granted can be revoked; auto can be force-added */}
                  <div className="w-full mt-auto pt-1 flex gap-1">
                    {!isManual && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-6 text-[10px]"
                        disabled={isPending}
                        onClick={() => grantMutation.mutate({ achievementId: a.id })}
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Attribuer
                      </Button>
                    )}
                    {isManual && (
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1 h-6 text-[10px]"
                        disabled={isPending}
                        onClick={() => revokeMutation.mutate({ achievementId: a.id })}
                      >
                        <Lock className="w-3 h-3 mr-1" />
                        Révoquer
                      </Button>
                    )}
                  </div>
                </GlassPanel>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
