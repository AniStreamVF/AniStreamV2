import { Link } from "react-router-dom";
import { ArrowRight, BellRing, Clock3, Download, ShieldCheck, Smartphone, Sparkles } from "lucide-react";
import { Background } from "@/components/layout/Background";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/button";

export default function MobileAppSoonPage() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden">
      <Background />
      <Sidebar />

      <main className="relative z-10 pl-4 md:pl-32 pr-4 md:pr-6 py-6 max-w-7xl mx-auto pb-24 md:pb-8">
        <section className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/15 text-primary text-xs font-semibold tracking-wide">
            <Clock3 className="w-3.5 h-3.5" />
            Application mobile bientôt disponible
          </div>

          <h1 className="mt-4 font-display text-3xl md:text-5xl font-bold leading-tight">
            AniStream Mobile est en cours de développement
          </h1>
          <p className="mt-3 text-muted-foreground max-w-2xl">
            Nous peaufinons les performances, les téléchargements hors ligne et la synchronisation pour que la version mobile soit aussi fluide que le web et le bureau.
            La page de l'application s'ouvrira ici dès que la version sera prête.
          </p>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl">
            En parallèle, nous développons activement les versions desktop pour Windows, Linux et macOS avec des fonctionnalités avancées comme le streaming assisté par P2P, un basculement plus robuste et une synchronisation unifiée.
          </p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          <GlassPanel className="lg:col-span-2 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
                <Smartphone className="w-6 h-6" />
              </div>
              <div>
                <h2 className="font-display text-xl md:text-2xl font-semibold">Ce qui est en cours de développement</h2>
                <p className="text-sm md:text-base text-muted-foreground mt-2">
                  Une expérience d'application ciblée avec un démarrage rapide, une meilleure stabilité du lecteur et un support hors ligne renforcé.
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Download className="w-4 h-4 text-primary" />
                  Packs hors ligne
                </div>
                <p className="text-xs text-muted-foreground mt-2">Mettez en file d'attente des épisodes et continuez à regarder sans perte de réseau.</p>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <ShieldCheck className="w-4 h-4 text-primary" />
                  P2P + Lecture stable
                </div>
                <p className="text-xs text-muted-foreground mt-2">Livraison assistée par P2P, basculement de fournisseur et vérifications de santé du flux optimisées pour les réseaux instables.</p>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <BellRing className="w-4 h-4 text-primary" />
                  Alertes intelligentes
                </div>
                <p className="text-xs text-muted-foreground mt-2">Notifications d'épisodes sans spam ni notifications en double.</p>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/50 p-4">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Synchronisation multi-appareils
                </div>
                <p className="text-xs text-muted-foreground mt-2">Reprenez exactement là où vous vous êtes arrêté entre le web, le bureau et le mobile.</p>
              </div>

              <div className="rounded-xl border border-border/40 bg-card/50 p-4 sm:col-span-2">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 text-primary" />
                  Volet desktop
                </div>
                <p className="text-xs text-muted-foreground mt-2">Le déploiement des fonctionnalités Windows, Linux et macOS reste actif en parallèle du mobile.</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="p-6 md:p-7 flex flex-col justify-between">
            <div>
              <h3 className="font-display text-lg font-semibold">Fenêtre de sortie</h3>
              <p className="text-sm text-muted-foreground mt-2">Déploiement progressif prévu après les vérifications de stabilité et de validation sur les stores.</p>

              <div className="mt-5 space-y-3">
                <div className="rounded-lg border border-border/40 bg-card/60 p-3">
                  <p className="text-xs text-muted-foreground">Phase 1</p>
                  <p className="text-sm font-medium">Bêta fermée Android</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card/60 p-3">
                  <p className="text-xs text-muted-foreground">Phase 2</p>
                  <p className="text-sm font-medium">Sortie publique Android</p>
                </div>
                <div className="rounded-lg border border-border/40 bg-card/60 p-3">
                  <p className="text-xs text-muted-foreground">Phase 3</p>
                  <p className="text-sm font-medium">TestFlight iOS</p>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button asChild className="gap-2">
                <a href="https://dsc.gg/AniStream" target="_blank" rel="noreferrer">
                  Rejoindre Discord pour les mises à jour
                  <ArrowRight className="w-4 h-4" />
                </a>
              </Button>
              <Button asChild variant="outline" className="gap-2">
                <Link to="/">
                  Retour à l'accueil
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>
          </GlassPanel>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
