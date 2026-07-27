import { useHomeData } from "@/hooks/useAnimeData";
import { Background } from "@/components/layout/Background";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Header } from "@/components/layout/Header";
import { useIsNativeApp, useIsDesktopApp } from "@/hooks/useIsNativeApp";
import { useIsMobile } from "@/hooks/use-mobile";
import { Capacitor } from '@capacitor/core';
import { cn } from "@/lib/utils";
import { getProxiedImageUrl } from "@/lib/api";
import { ContinueWatching } from "@/components/anime/ContinueWatching";
import { LocalContinueWatching } from "@/components/anime/LocalContinueWatching";
import { PlaylistSection } from "@/components/anime/PlaylistSection";
import { HeroSkeleton } from "@/components/ui/skeleton-custom";
import { ReviewPopup } from "@/components/ui/ReviewPopup";
import { LastReadMangaSection } from "@/components/manga/LastReadMangaSection";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { InfiniteHomeSections } from "@/components/anime/InfiniteHomeSections";
import { MobileInfiniteHomeSections } from "@/components/anime/MobileInfiniteHomeSections";
import { Star, Flame, TrendingUp, Clock, Sparkles, Heart, Play } from "lucide-react";

type AnimeCard = {
  id: string; name: string; jname?: string; poster: string;
  type?: string; duration?: string; rating?: string;
  episodes?: { sub: number; dub: number };
  malId?: number; anilistId?: number;
};

const TYPE_LABELS: Record<string, string> = {
  TV: 'TV', Movie: 'Film', OVA: 'OVA', Special: 'Spécial',
  ON: 'ON', Music: 'Musique', ONA: 'ONA'
};

function AnimeCard16x9({ anime, rank }: { anime: AnimeCard; rank?: number }) {
  const nav = useNavigate();
  return (
    <button
      onClick={() => nav(`/anime/${anime.id}`)}
      className="group relative flex-shrink-0 w-[200px] md:w-[260px] text-left"
    >
      <div className="aspect-video rounded-xl overflow-hidden bg-muted/30 shadow-lg shadow-black/20 group-hover:shadow-xl group-hover:shadow-primary/20 transition-all duration-300 group-hover:-translate-y-1">
        <img
          src={getProxiedImageUrl(anime.poster)}
          alt={anime.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        {rank && (
          <div className="absolute top-2 left-2 w-7 h-7 rounded-full bg-primary/90 text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
            {rank}
          </div>
        )}
        {anime.rating && (
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[11px] font-bold text-white flex items-center gap-1">
            <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
            {anime.rating}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow-lg">
            {anime.name}
          </p>
          <div className="flex items-center gap-2 mt-1">
            {anime.type && (
              <span className="text-[10px] text-white/70 font-medium uppercase">{TYPE_LABELS[anime.type] || anime.type}</span>
            )}
            {anime.duration && (
              <>
                <span className="text-[10px] text-white/40">•</span>
                <span className="text-[10px] text-white/70">{anime.duration}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}

function SectionRow({ title, icon, animes }: { title: string; icon?: React.ReactNode; animes: AnimeCard[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        {icon && <span className="text-primary">{icon}</span>}
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
      </div>
      <div
        ref={scrollRef}
        className="flex gap-3 overflow-x-auto pb-2 scrollbar-none -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollbarWidth: 'none' }}
      >
        {animes.map((a, i) => (
          <AnimeCard16x9 key={a.id} anime={a} rank={title === 'Tendances' ? i + 1 : undefined} />
        ))}
      </div>
    </section>
  );
}

function SpotlightHero({ animes }: { animes: any[] }) {
  const nav = useNavigate();
  const [index, setIndex] = useState(0);
  const anime = animes[index];

  useEffect(() => {
    if (animes.length <= 1) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % animes.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [animes.length]);

  if (!anime) return null;

  const bg = anime.banner || anime.poster;
  return (
    <div className="relative w-full aspect-[21/9] md:aspect-[21/8] rounded-2xl overflow-hidden shadow-2xl shadow-black/40 group">
      <button
        onClick={() => nav(`/anime/${anime.id}`)}
        className="absolute inset-0 w-full h-full text-left"
      >
        <img
          src={getProxiedImageUrl(bg)}
          alt={anime.name}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold uppercase tracking-wider">
              À la une
            </span>
            {anime.rank && (
              <span className="px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-sm text-white text-[10px] font-bold">
                #{anime.rank}
              </span>
            )}
          </div>
          <h1 className="text-2xl md:text-4xl lg:text-5xl font-black text-white drop-shadow-xl mb-2 line-clamp-2">
            {anime.name}
          </h1>
          {anime.description && (
            <p className="text-sm md:text-base text-white/80 line-clamp-2 max-w-2xl drop-shadow-lg mb-3">
              {anime.description.replace(/<[^>]*>/g, '').slice(0, 200)}
            </p>
          )}
          <div className="flex items-center gap-3 text-sm text-white/70">
            {anime.otherInfo?.slice(0, 3).map((info: string, i: number) => (
              <span key={i} className="flex items-center gap-1">
                {i === 0 && <Play className="w-3.5 h-3.5" />}
                {info}
              </span>
            ))}
          </div>
        </div>
      </button>
      {animes.length > 1 && (
        <div className="absolute bottom-3 right-4 flex items-center gap-1.5 z-10">
          {animes.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.stopPropagation(); setIndex(i); }}
              className={`w-2 h-2 rounded-full transition-all ${
                i === index ? 'bg-white w-5' : 'bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

const Index = () => {
  const { data, isLoading, error } = useHomeData();
  const isNative = useIsNativeApp();
  const isDesktopApp = useIsDesktopApp();
  const isMobile = useIsMobile();
  const isMobileApp = Capacitor.isNativePlatform();
  const showInfiniteEarly = isMobile || isMobileApp;
  const showSidebar = !isMobile && !isMobileApp;

  useEffect(() => {
    if (typeof window !== 'undefined' && (window as any).electron) {
      (window as any).electron.updateRPC({
        details: 'Navigue sur la page d\'accueil',
        state: 'Menu principal'
      });
    }
  }, []);

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Échec du chargement</h1>
          <p className="text-muted-foreground">Veuillez réessayer plus tard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      {!showSidebar && <Background />}
      {showSidebar && <Sidebar />}

      <main className={cn(
        "relative z-10 px-4 md:px-6 py-4 max-w-[1600px] mx-auto pb-24",
        isDesktopApp ? "pl-4" : "pl-4 md:pl-28"
      )}>
        <Header />

        {isLoading ? (
          <div className="mt-4 space-y-6">
            <div className="aspect-[21/9] md:aspect-[21/8] rounded-2xl bg-white/5 animate-pulse" />
            <div className="space-y-3">
              <div className="h-6 w-48 rounded-lg bg-white/5 animate-pulse" />
              <div className="flex gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="w-[200px] md:w-[260px] aspect-video rounded-xl bg-white/5 animate-pulse flex-shrink-0" />
                ))}
              </div>
            </div>
          </div>
        ) : data ? (
          <div className="mt-4 space-y-10">
            {/* À la une */}
            {data.spotlightAnimes.length > 0 && (
              <SpotlightHero animes={data.spotlightAnimes} />
            )}

            <ContinueWatching />
            <LocalContinueWatching />
            <LastReadMangaSection />
            <PlaylistSection />

            {/* Derniers épisodes */}
            <SectionRow
              title="Derniers épisodes"
              icon={<Clock className="w-5 h-5" />}
              animes={data.latestEpisodeAnimes}
            />

            {/* Tendances */}
            <SectionRow
              title="Tendances"
              icon={<Flame className="w-5 h-5 text-orange-500" />}
              animes={data.trendingAnimes}
            />

            {/* Les plus populaires */}
            <SectionRow
              title="Les plus populaires"
              icon={<TrendingUp className="w-5 h-5" />}
              animes={data.mostPopularAnimes}
            />

            {/* Les plus appréciés */}
            <SectionRow
              title="Les plus appréciés"
              icon={<Heart className="w-5 h-5 text-red-500" />}
              animes={data.mostFavoriteAnimes}
            />

            {/* Top saison */}
            {data.topAiringAnimes?.length > 0 && (
              <SectionRow
                title="Top de la saison"
                icon={<Star className="w-5 h-5 text-yellow-500" />}
                animes={data.topAiringAnimes}
              />
            )}

            {/* Prochainement */}
            {data.topUpcomingAnimes?.length > 0 && (
              <SectionRow
                title="Prochainement"
                icon={<Sparkles className="w-5 h-5" />}
                animes={data.topUpcomingAnimes}
              />
            )}

            {showInfiniteEarly && <MobileInfiniteHomeSections />}
            {!showInfiniteEarly && <InfiniteHomeSections />}
            <ReviewPopup />
          </div>
        ) : null}
      </main>

      {!showSidebar && <MobileNav />}
    </div>
  );
};

export default Index;