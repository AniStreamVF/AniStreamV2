import { ArrowRight, BookOpen } from 'lucide-react';
import { Link } from 'react-router-dom';

export function ReleaseV5Banner() {
  return (
    <section className="mb-8 md:mb-12">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black/30">
        <img
          src="/AniStreambanner.png"
          alt="AniStream V5"
          className="absolute inset-0 h-full w-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/55 to-black/20" />

        <div className="relative z-10 p-5 md:p-8 lg:p-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/20 px-3 py-1 text-[11px] font-black uppercase tracking-[0.14em] text-primary">
            <BookOpen className="h-3.5 w-3.5" />
            AniStream V5 Manga
          </div>

          <h2 className="mt-4 max-w-2xl text-2xl md:text-4xl font-black leading-tight">
            Le Hub Manga V5 est en ligne
          </h2>

          <p className="mt-3 max-w-2xl text-sm md:text-base text-white/80">
            Découvrez les sélections hebdomadaires, choisissez vos sources de chapitres en toute confiance, et profitez d'un lecteur premium avec raccourcis et contrôles intelligents.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/manga"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition hover:brightness-110"
            >
              Ouvrir le Hub Manga
              <ArrowRight className="h-4 w-4" />
            </Link>

          </div>
        </div>
      </div>
    </section>
  );
}
