import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Palette, BookOpen, Film, Users, UserCircle,
  Play, MessageCircle, Star,
  SkipForward, Pause, Heart, Eye,
  Clock, ChevronRight,
  Camera, TrendingUp, Calendar,
  Volume2, Share2
} from "lucide-react";

// ─── Bun77 Girl Senpai data ───────────────────────────────────────────
const ANIME = {
  title: 'Seishun Buta Yarou wa Bunny Girl Senpai no Yume wo Minai',
  titleShort: 'Bunny Girl Senpai',
  rating: 8.3,
  year: 2018,
  episodes: 13,
  status: 'Terminé',
  format: 'TV',
  genres: ['Romance', 'Surnaturel', 'Drame'],
  studio: 'CloverWorks',
  synopsis: 'Sakuta Azusagawa, un lycéen, rencontre une actrice en pleine ascension, Mai Sakurajima, habillée en Bunny Girl dans une bibliothèque.',
};

const THEMES = [
  { name: 'Violet', primary: '#6d28d9', bg: '#0a0a0f', card: '#1a1a2e', sidebar: '#12121d', accent: '#8b5cf6' },
  { name: 'Rubis', primary: '#dc2626', bg: '#0f0a0a', card: '#2e1a1a', sidebar: '#1d1212', accent: '#ef4444' },
  { name: 'Menthe', primary: '#059669', bg: '#0a0f0d', card: '#1a2e24', sidebar: '#121d18', accent: '#10b981' },
  { name: 'Bleu Nuit', primary: '#1d4ed8', bg: '#0a0a14', card: '#1a1e30', sidebar: '#12141f', accent: '#3b82f6' },
  { name: 'Aurore', primary: '#d97706', bg: '#0f0d0a', card: '#2e241a', sidebar: '#1d1812', accent: '#f59e0b' },
  { name: 'Rose', primary: '#db2777', bg: '#0f0a0e', card: '#2e1a24', sidebar: '#1d1218', accent: '#ec4899' },
  { name: 'Cyan', primary: '#0891b2', bg: '#0a0f12', card: '#1a2429', sidebar: '#12181c', accent: '#06b6d4' },
  { name: 'Émeraude', primary: '#059669', bg: '#0a0f0a', card: '#1a2e1a', sidebar: '#121d12', accent: '#34d399' },
];

const PLACEHOLDER_COVER = 'bg-gradient-to-br from-primary/30 to-primary/10';

// ─── Mock App layout ──────────────────────────────────────────────────
function MockLayout({ theme, children }: { theme?: typeof THEMES[0]; children: React.ReactNode }) {
  const style = theme ? {
    '--mock-primary': theme.primary,
    '--mock-bg': theme.bg,
    '--mock-card': theme.card,
    '--mock-sidebar': theme.sidebar,
    '--mock-accent': theme.accent,
  } as React.CSSProperties : {};

  return (
    <div
      className="relative mx-auto w-[340px] md:w-[480px] rounded-2xl overflow-hidden border border-white/20 shadow-2xl"
      style={style}
    >
      {/* Browser top bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-black/60 border-b border-white/10">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
          <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
        </div>
        <div className="flex-1 mx-3 h-5 rounded-md bg-white/5 flex items-center justify-center text-[8px] text-white/30">
          anistream.app/v2
        </div>
      </div>

      {/* App content */}
      <div className="p-3 md:p-4" style={{ backgroundColor: 'var(--mock-bg, #000)' }}>
        {children}
      </div>
    </div>
  );
}

// ─── Mock Episode Row ─────────────────────────────────────────────────
function EpisodeRow({ num, title, watched = false, active = false }: { num: number; title: string; watched?: boolean; active?: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors",
      active ? 'bg-white/15' : 'hover:bg-white/5'
    )}>
      <div className={cn(
        "w-14 h-8 rounded bg-white/5 flex-shrink-0 flex items-center justify-center text-[9px] font-mono",
        watched ? 'text-emerald-400' : 'text-white/30'
      )}>
        {num}
      </div>
      <span className={cn("text-[10px] truncate flex-1 text-left", watched ? 'text-white/50' : 'text-white/80')}>
        {title}
      </span>
      {watched && <Eye className="w-3 h-3 text-emerald-400/60" />}
      {active && <div className="w-1.5 h-1.5 rounded-full bg-[var(--mock-primary)]" />}
    </div>
  );
}

// ─── Scene: Anime Page (Bunny Girl Senpai) ──────────────────────────
function AnimePageMock() {
  return (
    <MockLayout showNav={false}>
      <div className="flex gap-3">
        {/* Poster */}
        <div className="w-[90px] md:w-[120px] flex-shrink-0">
          <div className="aspect-[3/4] rounded-xl bg-gradient-to-b from-purple-500/40 to-pink-500/20 border border-white/10 flex items-center justify-center">
            <Camera className="w-6 h-6 text-white/30" />
          </div>
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0 text-left space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="text-xs md:text-sm font-bold text-white leading-tight line-clamp-2">
                {ANIME.titleShort}
              </h3>
              <div className="flex items-center gap-1.5 mt-1">
                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                <span className="text-[9px] text-amber-400 font-bold">{ANIME.rating}</span>
                <span className="text-[8px] text-white/30">•</span>
                <span className="text-[9px] text-white/50">{ANIME.year}</span>
                <span className="text-[8px] text-white/30">•</span>
                <span className="text-[9px] text-white/50">{ANIME.format}</span>
              </div>
            </div>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
              <Heart className="w-3.5 h-3.5 text-emerald-400" />
            </div>
          </div>
          <p className="text-[8px] text-white/40 leading-relaxed line-clamp-2">{ANIME.synopsis}</p>
          <div className="flex flex-wrap gap-1">
            {ANIME.genres.map((g) => (
              <span key={g} className="px-1.5 py-0.5 rounded-md bg-white/5 text-[8px] text-white/50 border border-white/5">{g}</span>
            ))}
          </div>
          <div className="flex items-center gap-3 text-[9px] text-white/40">
            <span>{ANIME.episodes} épisodes</span>
            <span>{ANIME.studio}</span>
            <span className="text-emerald-400">{ANIME.status}</span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[8px] text-white/30">
          <span>Progression</span>
          <span>6/13</span>
        </div>
        <div className="h-1 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full w-[46%] rounded-full" style={{ backgroundColor: 'var(--mock-primary, #6d28d9)' }} />
        </div>
      </div>

      {/* Episode list */}
      <div className="mt-3 space-y-1">
        <div className="flex items-center justify-between text-[9px] text-white/50">
          <span className="font-medium">Épisodes</span>
          <span className="text-white/30">Saison 1</span>
        </div>
        <div className="max-h-[140px] overflow-y-auto space-y-0.5 pr-1 [&::-webkit-scrollbar]:w-0.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded-full">
          {[
            { n: 1, t: 'Mes semestres ne sont que des mensonges', w: true },
            { n: 2, t: 'On ne peut pas revenir en arrière', w: true },
            { n: 3, t: 'Le monde change sans moi', w: true },
            { n: 4, t: 'Il n\'y a pas de lendemain pour une idiote', w: true },
            { n: 5, t: 'Je suis une menteuse', w: true },
            { n: 6, t: 'Ce n\'est pas ma faute si je suis populaire', w: true },
            { n: 7, t: 'Tout est un mensonge', w: true, a: true },
            { n: 8, t: 'Le problème avec les nuits d\'été', w: false },
            { n: 9, t: 'Sister Panic', w: false },
            { n: 10, t: 'L\'avenir complexe', w: false },
          ].map((ep) => (
            <EpisodeRow key={ep.n} num={ep.n} title={ep.t} watched={ep.w} active={'a' in ep} />
          ))}
        </div>
      </div>
    </MockLayout>
  );
}

// ─── Scene: Themes showcase ──────────────────────────────────────────
function ThemesShowcase() {
  const [themeIndex, setThemeIndex] = useState(0);
  const theme = THEMES[themeIndex];

  useEffect(() => {
    const timer = setInterval(() => {
      setThemeIndex((prev) => (prev + 1) % THEMES.length);
    }, 1800);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-3">
      {/* Theme name badge */}
      <div className="flex items-center justify-center gap-2">
        <AnimatePresence mode="wait">
          <motion.div
            key={theme.name}
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className="px-3 py-1 rounded-full text-[10px] font-bold"
            style={{ backgroundColor: theme.primary + '20', color: theme.accent }}
          >
            {theme.name}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Mock app with theme */}
      <AnimatePresence mode="wait">
        <motion.div
          key={theme.name}
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4 }}
        >
          <MockLayout theme={theme}>
            {/* Cards grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { icon: TrendingUp, label: 'Tendances', h: 16 },
                { icon: Calendar, label: 'Nouveautés', h: 12 },
                { icon: Star, label: 'Populaire', h: 14 },
                { icon: Clock, label: 'Reprendre', h: 14 },
              ].map((item, i) => (
                <div
                  key={i}
                  className="rounded-xl p-3 flex flex-col items-center justify-center gap-1.5"
                  style={{ backgroundColor: 'var(--mock-card)' }}
                >
                  <item.icon className="w-4 h-4" style={{ color: 'var(--mock-accent)' }} />
                  <span className="text-[9px] text-white/60">{item.label}</span>
                </div>
              ))}
            </div>
            {/* Row of recent */}
            <div className="mt-3">
              <div className="flex items-center justify-between text-[9px] mb-2">
                <span className="text-white/60 font-medium">Populaires</span>
                <span className="text-white/20">Voir tout</span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex-1">
                    <div className="aspect-[3/4] rounded-lg" style={{ backgroundColor: 'var(--mock-card)' }} />
                    <div className="h-2 mt-1 rounded" style={{ backgroundColor: 'var(--mock-card)', width: `${60 + i * 10}%` }} />
                  </div>
                ))}
              </div>
            </div>
          </MockLayout>
        </motion.div>
      </AnimatePresence>

      {/* Color dots */}
      <div className="flex items-center justify-center gap-1.5">
        {THEMES.map((t, i) => (
          <button
            key={t.name}
            onClick={() => setThemeIndex(i)}
            className={cn(
              "rounded-full transition-all duration-300",
              i === themeIndex ? "w-5 h-2" : "w-2 h-2 opacity-40 hover:opacity-70"
            )}
            style={{ backgroundColor: t.primary }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Scene: Manga Reader ────────────────────────────────────────────
function MangaReaderMock() {
  return (
    <div className="relative mx-auto w-[300px] md:w-[400px]">
      {/* Reader frame */}
      <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl bg-zinc-900">
        {/* Top bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-black/50 border-b border-white/10">
          <div className="flex items-center gap-2 text-[9px] text-white/50">
            <BookOpen className="w-3 h-3" />
            <span>Ch. 45 · Le serment</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-1.5 py-0.5 rounded bg-white/10 text-[8px] text-white/60">Vertical</div>
            <div className="px-1.5 py-0.5 rounded bg-emerald-500/30 text-[8px] text-emerald-300 font-bold">HD</div>
          </div>
        </div>
        {/* Page */}
        <div className="aspect-[3/4] bg-zinc-800 p-4 md:p-6 relative overflow-hidden">
          {/* Manga panel mockup */}
          <div className="space-y-3">
            <div className="flex gap-3">
              <div className="flex-1 space-y-1.5">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-2 bg-white/[0.06] rounded" style={{ width: `${70 + Math.random() * 30}%` }} />
                ))}
              </div>
              <div className="w-16 md:w-20 bg-white/[0.04] rounded-lg flex-shrink-0 aspect-[3/4]" />
            </div>
            <div className="h-32 md:h-44 bg-white/[0.04] rounded-xl flex items-center justify-center relative overflow-hidden">
              {/* Speech bubbles */}
              <div className="absolute top-3 right-3 w-14 h-10 rounded-lg bg-white/[0.08] border border-white/10 flex items-center justify-center text-[7px] text-white/50 px-1.5">
                Je te protégerai...
              </div>
              <div className="absolute bottom-4 left-4 w-16 h-8 rounded-lg bg-white/[0.08] border border-white/10 flex items-center justify-center text-[7px] text-white/50 px-1.5">
                Toujours.
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-1.5 bg-white/[0.06] rounded" style={{ width: `${30 + Math.random() * 50}%` }} />
              ))}
            </div>
            <div className="text-center text-[7px] text-white/20 font-mono">— Page 12/24 —</div>
          </div>
        </div>
        {/* Bottom bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-black/50 border-t border-white/10">
          <div className="flex items-center gap-2 text-[9px] text-white/40">
            <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center">
              <ChevronRight className="w-2.5 h-2.5 rotate-180" />
            </div>
            <span>Page 12</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[8px] text-white/30">Zoom</span>
            <div className="w-12 h-1 rounded bg-white/10">
              <div className="h-full w-3/4 rounded bg-white/30" />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[9px] text-white/40">
            <span>Page 13</span>
            <div className="w-4 h-4 rounded bg-white/5 flex items-center justify-center">
              <ChevronRight className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Scene: Watch Party ────────────────────────────────────────────
function WatchPartyMock() {
  return (
    <MockLayout>
      {/* Player mockup */}
      <div className="aspect-video rounded-xl bg-zinc-900 relative flex items-center justify-center overflow-hidden border border-white/10 mb-3">
        <div className="text-center">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center mx-auto mb-1"
          >
            <Play className="w-4 h-4 text-white ml-0.5" />
          </motion.div>
          <p className="text-[9px] text-white/40">Lecture synchronisée</p>
        </div>
        {/* Top overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="px-1.5 py-0.5 rounded bg-primary/40 text-[8px] text-primary font-bold">EN DIRECT</div>
            <div className="flex items-center gap-1 text-white/50 text-[8px]">
              <Users className="w-2.5 h-2.5" />
              <span>4</span>
            </div>
          </div>
          <div className="flex -space-x-1">
            {['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500'].map((c, i) => (
              <div key={i} className={cn("w-5 h-5 rounded-full border-2 border-black flex items-center justify-center text-[6px] text-white font-bold", c)}>
                {String.fromCharCode(65 + i)}
              </div>
            ))}
          </div>
        </div>
        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/5">
          <motion.div
            className="h-full bg-red-500"
            animate={{ width: ['30%', '45%', '35%'] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
        </div>
      </div>

      {/* Controls + Chat preview */}
      <div className="flex gap-2">
        <div className="flex-1 space-y-1.5">
          <div className="text-[9px] text-white/60 font-medium text-left">Salle: Regard entre amis</div>
          <div className="flex items-center gap-1.5">
            <div className="px-2 py-1 rounded-lg bg-zinc-800 text-white/40 text-[9px] flex items-center gap-1">
              <Volume2 className="w-2.5 h-2.5" />
              HD-1
            </div>
            <div className="px-2 py-1 rounded-lg bg-zinc-800 text-white/40 text-[9px]">Ép. 1</div>
            <div className="ml-auto flex gap-1">
              <MessageCircle className="w-3 h-3 text-white/30" />
              <Share2 className="w-3 h-3 text-white/30" />
            </div>
          </div>
        </div>
        <div className="w-24 md:w-28 rounded-xl bg-zinc-900 p-2 border border-white/5">
          <p className="text-[8px] text-white/30 font-medium text-left mb-1">Chat</p>
          {[
            { name: 'A', text: 'trop bien cet épisode !', color: 'text-blue-400' },
            { name: 'B', text: 'oui !', color: 'text-green-400' },
          ].map((msg, i) => (
            <div key={i} className="text-left text-[8px] leading-tight">
              <span className={cn("font-bold", msg.color)}>{msg.name} </span>
              <span className="text-white/50">{msg.text}</span>
            </div>
          ))}
          <div className="mt-1 h-4 rounded bg-white/5 flex items-center px-1.5">
            <span className="text-[7px] text-white/20">Message...</span>
          </div>
        </div>
      </div>
    </MockLayout>
  );
}

// ─── Scene: Profile ────────────────────────────────────────────────
function ProfileMock() {
  return (
    <MockLayout>
      {/* Avatar + Name */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/40 to-primary/10 flex-shrink-0 flex items-center justify-center ring-2 ring-white/10">
          <UserCircle className="w-5 h-5 text-white/60" />
        </div>
        <div className="text-left">
          <p className="text-xs font-bold text-white">WeebMaster42</p>
          <p className="text-[8px] text-white/30">Membre depuis 2023</p>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[
          { icon: Film, value: '127', label: 'Animés' },
          { icon: BookOpen, value: '43', label: 'Mangas' },
          { icon: Clock, value: '342h', label: 'Temps' },
          { icon: Star, value: '89', label: 'Favoris' },
        ].map((s, i) => (
          <div key={i} className="rounded-xl p-2 text-center bg-zinc-900 border border-white/5">
            <s.icon className="w-3 h-3 mx-auto mb-0.5 opacity-40" />
            <p className="text-xs font-black text-white">{s.value}</p>
            <p className="text-[7px] text-white/30">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Favorites row */}
      <div className="text-left">
        <div className="flex items-center justify-between text-[9px] text-white/50 mb-2">
          <span className="font-medium">En cours</span>
          <span className="text-white/20">Tout voir</span>
        </div>
        <div className="flex gap-2">
          {[
            { label: 'Solo Leveling', prog: '08/12' },
            { label: 'One Piece', prog: '1072' },
            { label: 'Frieren', prog: '22/28' },
          ].map((item) => (
            <div key={item.label} className="flex-1 rounded-xl bg-zinc-900 border border-white/5 p-2">
              <div className="aspect-[16/9] rounded-lg bg-zinc-800 mb-1" />
              <p className="text-[8px] text-white/60 truncate">{item.label}</p>
              <p className="text-[7px] text-white/30">{item.prog}</p>
            </div>
          ))}
        </div>
      </div>
    </MockLayout>
  );
}

// ─── Scene: Community ──────────────────────────────────────────────
function CommunityMock() {
  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="rounded-2xl overflow-hidden border border-white/20 shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 bg-black/60 border-b border-white/10">
          <MessageCircle className="w-3 h-3 text-white/50" />
          <span className="text-[9px] text-white/60 font-medium">Discussion — Épisode 7</span>
          <span className="ml-auto text-[8px] text-white/30">142 messages</span>
        </div>
        {/* Messages */}
        <div className="bg-zinc-900/80 p-3 space-y-2 max-h-[180px] overflow-y-auto">
          {[
            { name: 'Sakura', msg: 'Ce plot twist à la fin... 😱', color: 'text-pink-400', delay: 0 },
            { name: 'Naruto', msg: 'J avais pas vu venir !', color: 'text-orange-400', delay: 0.05 },
            { name: 'Luffy', msg: 'Le seiyuu a déchiré sur cette scène', color: 'text-red-400', delay: 0.1 },
            { name: 'Mikasa', msg: 'Quelqu un a lu le chapitre 46 ?', color: 'text-blue-400', delay: 0.15 },
            { name: 'Gojo', msg: 'Attendez la suite c est fou', color: 'text-cyan-400', delay: 0.2 },
          ].map((c, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: c.delay, duration: 0.3 }}
              className="flex items-start gap-2"
            >
              <div className={cn("w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[7px] text-white font-bold", c.color.replace('text-', 'bg-').replace('-400', '-500/40'))}>
                {c.name[0]}
              </div>
              <div className="text-left">
                <span className={cn("text-[8px] font-bold", c.color)}>{c.name}</span>
                <span className="text-[9px] text-white/70 ml-1">{c.msg}</span>
              </div>
            </motion.div>
          ))}
        </div>
        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2 bg-black/40 border-t border-white/10">
          <div className="flex-1 h-6 rounded-md bg-white/5 flex items-center px-2">
            <span className="text-[8px] text-white/20">Votre message...</span>
          </div>
          <div className="w-6 h-6 rounded-md bg-primary/40 flex items-center justify-center">
            <ChevronRight className="w-3 h-3 text-primary" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SCENES config ──────────────────────────────────────────────────
const SCENES = [
  {
    id: 'intro',
    title: 'AniStream V2',
    subtitle: 'Une nouvelle ère pour l\'animé et le manga',
    gradient: 'from-violet-600 via-purple-600 to-pink-600',
    duration: 3,
    Component: null,
  },
  {
    id: 'themes',
    icon: Palette,
    title: 'Personnalisation Totale',
    subtitle: '8 thèmes uniques qui transforment l\'interface',
    desc: 'Du violet profond au vert menthe, chaque thème redessine l\'intégralité de l\'application.',
    gradient: 'from-purple-500 to-pink-500',
    duration: 8,
    Component: ThemesShowcase,
  },
  {
    id: 'anime',
    icon: Film,
    title: 'Fiches Animés Complètes',
    subtitle: 'Bunny Girl Senpai — Saison 1',
    desc: 'Épisodes, progression, recommandations, tout est organisé pour vous.',
    gradient: 'from-blue-400 to-cyan-500',
    duration: 5,
    Component: AnimePageMock,
  },
  {
    id: 'manga',
    icon: BookOpen,
    title: 'Lecteur Manga',
    subtitle: 'Strip, paginé, zoom, hors-ligne',
    desc: 'La lecture la plus fluide, avec ou sans connexion.',
    gradient: 'from-emerald-400 to-teal-500',
    duration: 5,
    Component: MangaReaderMock,
  },
  {
    id: 'watchparty',
    icon: Users,
    title: 'Watch Parties',
    subtitle: 'Regardez ensemble, en temps réel',
    desc: 'Chat, vote, file d\'attente — la meilleure façon de partager vos épisodes.',
    gradient: 'from-orange-400 to-red-500',
    duration: 5,
    Component: WatchPartyMock,
  },
  {
    id: 'profile',
    icon: UserCircle,
    title: 'Profils & Collections',
    subtitle: 'Suivez votre parcours',
    desc: 'Statistiques, watchlist, mangas lus — tout votre historique au même endroit.',
    gradient: 'from-amber-400 to-yellow-500',
    duration: 5,
    Component: ProfileMock,
  },
  {
    id: 'community',
    icon: MessageCircle,
    title: 'Communauté Active',
    subtitle: 'Commentez, partagez, découvrez',
    desc: 'Des discussions sur chaque épisode, une vraie communauté passionnée.',
    gradient: 'from-rose-400 to-pink-500',
    duration: 4.5,
    Component: CommunityMock,
  },
  {
    id: 'release',
    icon: null,
    title: 'AniStream V2',
    subtitle: 'Disponible le 29/07/26',
    desc: '',
    gradient: 'from-violet-600 via-purple-600 to-pink-600',
    duration: 4,
    Component: null,
  },
];

export default function TrailerPage() {
  const [sceneIndex, setSceneIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const navigate = useNavigate();
  const scene = SCENES[sceneIndex];

  const nextScene = useCallback(() => {
    setSceneIndex((prev) => (prev + 1) % SCENES.length);
  }, []);

  const prevScene = useCallback(() => {
    setSceneIndex((prev) => (prev - 1 + SCENES.length) % SCENES.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setTimeout(nextScene, scene.duration * 1000);
    return () => clearTimeout(timer);
  }, [sceneIndex, isPaused, nextScene, scene.duration]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') { e.preventDefault(); nextScene(); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); prevScene(); }
      if (e.key === 'Escape') navigate('/');
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [nextScene, prevScene, navigate]);

  const progress = (sceneIndex + 1) / SCENES.length;

  return (
    <div
      className="fixed inset-0 bg-black text-white overflow-hidden z-50 select-none"
      onClick={() => setIsPaused(!isPaused)}
    >
      {/* Background gradient */}
      <motion.div
        key={scene.id + '-bg'}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.25 }}
        transition={{ duration: 1 }}
        className={cn("absolute inset-0 bg-gradient-to-br", scene.gradient)}
      />

      {/* Grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)`,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 p-4 md:p-6">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <div className="flex-1 h-0.5 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-white/80"
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); nextScene(); }}
            className="flex items-center gap-1 text-white/40 hover:text-white text-xs transition-colors"
          >
            <SkipForward className="w-3 h-3" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate('/'); }}
            className="text-white/40 hover:text-white text-xs transition-colors"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="absolute top-14 left-4 md:left-8 z-20">
        <span className="text-[10px] text-white/20 font-mono tracking-widest">
          {String(sceneIndex + 1).padStart(2, '0')} / {String(SCENES.length).padStart(2, '0')}
        </span>
      </div>

      {/* Pause */}
      <AnimatePresence>
        {isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
              <Pause className="w-6 h-6 text-white" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Scene content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={scene.id}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -30 }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="max-w-5xl mx-auto w-full text-center">
            {/* Icon for non-intro */}
            {scene.id !== 'intro' && scene.icon && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5, rotate: -8 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 150 }}
                className={cn(
                  "inline-flex items-center justify-center w-14 h-14 md:w-16 md:h-16 rounded-2xl shadow-2xl mb-4",
                  `bg-gradient-to-br ${scene.gradient}`
                )}
              >
                <scene.icon className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </motion.div>
            )}

            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.5 }}
              className="text-3xl md:text-5xl lg:text-6xl font-black tracking-tight"
            >
              {scene.id === 'intro' || scene.id === 'release' ? (
                <span className={cn("bg-gradient-to-r bg-clip-text text-transparent", scene.gradient)}>
                  AniStream V2
                </span>
              ) : (
                scene.title
              )}
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="text-sm md:text-base text-white/60 mt-1 font-medium"
            >
              {scene.subtitle}
            </motion.p>

            {scene.desc && (
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                className="text-[10px] md:text-xs text-white/40 mt-1 max-w-md mx-auto"
              >
                {scene.desc}
              </motion.p>
            )}

            {scene.Component && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.45, duration: 0.5 }}
                className="mt-6 md:mt-8"
              >
                <scene.Component />
              </motion.div>
            )}

            {/* Intro subtitle */}
            {scene.id === 'intro' && (
              <motion.p
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="mt-4 text-base md:text-lg text-white/50 font-medium"
              >
                {scene.subtitle}
              </motion.p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Dots */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
        {SCENES.map((s, i) => (
          <button
            key={s.id}
            onClick={(e) => { e.stopPropagation(); setSceneIndex(i); }}
            className={cn(
              "rounded-full transition-all duration-300",
              i === sceneIndex
                ? "w-8 h-1.5 bg-white"
                : "w-1.5 h-1.5 bg-white/20 hover:bg-white/40"
            )}
          />
        ))}
      </div>


    </div>
  );
}
