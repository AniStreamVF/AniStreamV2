import { useNavigate } from "react-router-dom";
import { Layers, BookOpen, Building2, Flame, Clock3, Shuffle, Sparkles } from "lucide-react";

const QUICK_FILTERS = [
  {
    key: "manhwa",
    title: "Manhwa uniquement",
    description: "Catalogue coréen prioritaire",
    to: "/manga/discover?type=manhwa",
    icon: Layers,
  },
  {
    key: "comics",
    title: "Comics uniquement",
    description: "Flux de comics occidentaux",
    to: "/manga/discover?type=comics",
    icon: BookOpen,
  },
  {
    key: "atsu",
    title: "Fournisseur Atsu",
    description: "Flux spécifique au fournisseur",
    to: "/manga/discover?provider=atsu",
    icon: Building2,
  },
  {
    key: "mangafire",
    title: "Fournisseur MangaFire",
    description: "Exploration par fournisseur",
    to: "/manga/discover?provider=mangafire",
    icon: Building2,
  },
  {
    key: "mangaball",
    title: "Fournisseur MangaBall",
    description: "Exploration par fournisseur",
    to: "/manga/discover?provider=mangaball",
    icon: Building2,
  },
];

const FEED_SHORTCUTS = [
  {
    key: "feed-popular-daily",
    title: "Populaire du jour",
    description: "Flux de popularité quotidienne",
    to: "/manga/discover?feed=popular&window=day",
    icon: Flame,
  },
  {
    key: "feed-foryou-weekly",
    title: "Pour vous cette semaine",
    description: "Flux personnalisé hebdomadaire",
    to: "/manga/discover?feed=foryou&window=week",
    icon: Sparkles,
  },
  {
    key: "feed-recent-monthly",
    title: "Récent du mois",
    description: "Flux mensuel récent",
    to: "/manga/discover?feed=recent&window=month",
    icon: Clock3,
  },
  {
    key: "feed-origin-kr",
    title: "Origine KR",
    description: "Flux d'origine coréenne",
    to: "/manga/discover?feed=origin&origin=kr&provider=mangaball",
    icon: Building2,
  },
  {
    key: "feed-random",
    title: "Sélections aléatoires",
    description: "Mélange depuis AllManga",
    to: "/manga/discover?feed=random&provider=allmanga",
    icon: Shuffle,
  },
];

export function MangaDiscoveryQuickFilters() {
  const navigate = useNavigate();

  return (
    <section className="mb-12">
      <div className="flex items-center justify-between mb-4 px-2">
        <h2 className="font-display text-xl md:text-2xl font-bold tracking-tight">Filtres de découverte</h2>
        <button
          type="button"
          onClick={() => navigate("/manga/discover")}
          className="text-xs uppercase tracking-wider text-primary hover:underline"
        >
          Ouvrir l'explorateur complet
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {QUICK_FILTERS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.to)}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:bg-white/[0.08] transition-colors"
          >
            <item.icon className="w-4 h-4 text-primary mb-3" />
            <h3 className="text-sm font-black text-foreground">{item.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
          </button>
        ))}
      </div>

      <div className="mt-6 mb-4 px-2">
        <h3 className="font-display text-lg md:text-xl font-bold tracking-tight">Filtres de flux</h3>
        <p className="text-xs text-muted-foreground mt-1">Accédez directement aux modes de flux natifs des fournisseurs.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {FEED_SHORTCUTS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => navigate(item.to)}
            className="group rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left hover:bg-white/[0.08] transition-colors"
          >
            <item.icon className="w-4 h-4 text-primary mb-3" />
            <h3 className="text-sm font-black text-foreground">{item.title}</h3>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{item.description}</p>
          </button>
        ))}
      </div>
    </section>
  );
}
