import { useNavigate } from "react-router-dom";
import { Background } from "@/components/layout/Background";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Shield, AlertTriangle, Mail } from "lucide-react";

export default function DMCAPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background overflow-x-hidden legal-page">
      <style>{`.light-theme .legal-page,.light-theme .legal-page p,.light-theme .legal-page li,.light-theme .legal-page span,.light-theme .legal-page strong,.light-theme .legal-page h1,.light-theme .legal-page h2,.light-theme .legal-page h3{color:#000}.dark-theme .legal-page,.dark-theme .legal-page p,.dark-theme .legal-page li,.dark-theme .legal-page span,.dark-theme .legal-page strong,.dark-theme .legal-page h1,.dark-theme .legal-page h2,.dark-theme .legal-page h3{color:#fff}`}</style>
      <Background />
      <Sidebar />

      <main className="relative z-10 pl-6 md:pl-32 pr-6 py-6 max-w-[1000px] mx-auto pb-24 md:pb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 transition-colors mb-6"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Retour</span>
        </button>

        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Avis DMCA et droits d'auteur
          </h1>
          <p>
            Politique DMCA
          </p>
        </div>

        <div className="space-y-6">
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                Avertissement éducatif important
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-semibold">
                Ce projet est créé strictement à des fins éducatives uniquement.
              </p>
              <p>
                AniStream est un projet de démonstration frontend présentant des pratiques modernes de développement web, d'intégration d'API et de conception d'interface utilisateur. Nous NE sommes PAS un service de streaming d'anime commercial.
              </p>
              <div className="p-4 rounded-lg bg-background/50 border border-border">
                <p className="font-medium mb-2">Points clés :</p>
                <ul className="list-disc list-inside space-y-2 ml-4 text-sm">
                  <li>Nous n'hébergeons AUCUN contenu d'anime sur nos serveurs</li>
                  <li>Nous ne possédons AUCUN des contenus d'anime affichés</li>
                  <li>Tout le contenu provient de plateformes tierces via le web scraping et des API publiques</li>
                  <li>Nous ne sommes qu'une interface frontend démontrant des capacités techniques</li>
                  <li>Ceci est un projet éducatif non commercial</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Politique de respect des droits d'auteur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                AniStream respecte les droits de propriété intellectuelle des autres et attend de ses utilisateurs qu'ils fassent de même. Nous nous conformons aux dispositions du DMCA et aux autres lois applicables sur les droits d'auteur.
              </p>
              <p>
                Tout le contenu d'anime, vidéos, images et matériels connexes affichés sur cette plateforme sont :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Provenant de plateformes et API tierces</li>
                <li>La propriété de leurs détenteurs de droits respectifs</li>
                <li>Non hébergés ou stockés sur nos serveurs</li>
                <li>Affichés uniquement à des fins éducatives et de démonstration</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comment nous agrégeons le contenu</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                AniStream fonctionne comme un agrégateur frontend qui :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Utilise des API publiques de services comme HiAnime, Jikan (API MyAnimeList) et autres</li>
              <li>Récupère des données publiquement disponibles depuis diverses plateformes d'anime</li>
              <li>Intègre des lecteurs vidéo provenant de sources externes</li>
              <li>Sert d'interface de recherche et de découverte</li>
              </ul>
              <p className="mt-4">
                Nous NE :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Téléchargeons PAS d'épisodes ou de films d'anime sur nos serveurs</li>
                <li>Stockons PAS de fichiers vidéo ou de contenu protégé</li>
                <li>Revendiquons PAS la propriété d'un contenu d'anime</li>
                <li>Ne monétisons PAS de contenu protégé</li>
                <li>Contournons PAS les DRM ou systèmes de protection de contenu</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Demandes de retrait</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Si vous êtes un titulaire de droits d'auteur ou son agent et que vous pensez qu'un contenu sur AniStream viole vos droits d'auteur, vous pouvez soumettre une notification de retrait.
              </p>
              <p className="font-medium">
                Veuillez noter :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nous ne pouvons que supprimer les liens vers du contenu externe, car nous n'hébergeons pas le contenu lui-même</li>
                <li>Pour la suppression de contenu, veuillez contacter la plateforme d'hébergement d'origine</li>
                <li>Nous coopérerons pleinement avec les demandes DMCA valides</li>
              </ul>
              
              <div className="mt-6 p-4 rounded-lg bg-muted/50 border border-border">
                <h3 className="font-semibold mb-3">Exigences de l'avis DMCA</h3>
                <p className="text-sm mb-2">Votre avis doit inclure :</p>
                <ol className="list-decimal list-inside space-y-2 ml-4 text-sm">
                  <li>Une signature physique ou électronique du titulaire des droits d'auteur ou du représentant autorisé</li>
                  <li>L'identification de l'œuvre protégée qui aurait été violée</li>
                  <li>L'identification du matériel qui est présumé violer les droits (URL sur notre site)</li>
                  <li>Les coordonnées (adresse, numéro de téléphone, adresse e-mail)</li>
                  <li>Une déclaration de bonne foi croyant que l'utilisation n'est pas autorisée</li>
                  <li>Une déclaration attestant que les informations sont exactes et que vous êtes autorisé à agir</li>
                </ol>
              </div>

              <div className="mt-6 flex items-center gap-4 p-4 rounded-lg bg-primary/5 border border-primary/20">
                <Mail className="w-6 h-6 text-primary shrink-0" />
                <div>
                  <p className="font-medium">Contact pour les avis DMCA :</p>
                  <p className="text-sm mt-1">
                    Veuillez soumettre les avis DMCA via notre page de suggestions/contact ou les forums communautaires. Nous répondrons aux demandes légitimes dans un délai raisonnable.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Contre-notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Si vous croyez que du contenu a été supprimé ou l'accès désactivé à la suite d'une erreur ou d'une mauvaise identification, vous pouvez déposer une contre-notification contenant :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Votre signature physique ou électronique</li>
              <li>L'identification du contenu supprimé et son emplacement avant la suppression</li>
              <li>Une déclaration sous peine de parjure attestant de votre bonne foi que le contenu a été supprimé par erreur</li>
              <li>Votre nom, adresse et numéro de téléphone</li>
              <li>Une déclaration consentant à la juridiction de votre région</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Politique en cas de récidive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                AniStream résiliera les comptes des récidivistes en matière de droits d'auteur dans les circonstances appropriées. Les utilisateurs qui téléchargent à plusieurs reprises du matériel protégé ou publient des liens contrefaisants peuvent voir leurs comptes suspendus ou bannis définitivement.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Déclaration de bonne foi</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Nous opérons de bonne foi en tant que projet éducatif. Si un titulaire de droits d'auteur trouve son contenu incorrectement lié ou affiché :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Nous enquêterons rapidement sur la réclamation</li>
              <li>Nous supprimerons les liens vers le contenu contrefaisant sur demande valide</li>
              <li>Nous encourageons les détenteurs de droits à contacter les plateformes d'hébergement d'origine</li>
              <li>Nous ne conservons aucune copie de contenu vidéo protégé</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle>Soutenez le streaming légal d'anime</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Nous encourageons tous les utilisateurs à soutenir l'industrie de l'anime en utilisant des services de streaming officiels et sous licence tels que :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Crunchyroll</li>
                <li>Funimation</li>
                <li>Netflix</li>
                <li>Hulu</li>
                <li>Amazon Prime Video</li>
                <li>HIDIVE</li>
              </ul>
              <p className="mt-4">
                Ces services soutiennent directement les créateurs d'anime, les studios et l'industrie dans son ensemble.
              </p>
            </CardContent>
          </Card>

          <div className="flex justify-center mt-8">
            <Button
              onClick={() => navigate('/suggestions')}
              className="gap-2"
            >
              <Mail className="w-4 h-4" />
              Soumettre un avis DMCA
            </Button>
          </div>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
