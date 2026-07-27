import { useNavigate } from "react-router-dom";
import { Background } from "@/components/layout/Background";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileNav } from "@/components/layout/MobileNav";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText } from "lucide-react";

export default function TermsPage() {
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
            <FileText className="w-8 h-8 text-primary" />
            Conditions générales d'utilisation
          </h1>
          <p>
            Dernière mise à jour : 11 janvier 2026
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Acceptation des conditions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                En accédant et en utilisant AniStream, vous acceptez et reconnaissez être lié par les termes et dispositions de cet accord. Si vous n'acceptez pas de vous conformer à ce qui précède, veuillez ne pas utiliser ce service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Avertissement pédagogique</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-semibold text-amber-600 dark:text-amber-400">
                IMPORTANT : Ce projet est créé strictement à des fins éducatives uniquement.
              </p>
              <p>
                AniStream est une démonstration d'application web frontend qui agrège du contenu animé provenant de diverses sources tierces via le web scraping et des API publiques. Nous n'hébergeons, ne stockons ni ne possédons aucun des contenus animés affichés sur cette plateforme.
              </p>
              <p>
                Cette plateforme démontre :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Les pratiques et technologies modernes de développement web</li>
                <li>L'intégration d'API et les techniques d'agrégation de données</li>
                <li>La conception d'interface et d'expérience utilisateur</li>
                <li>Les fonctionnalités en temps réel et les composants interactifs</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Licence d'utilisation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                L'autorisation est accordée d'accéder temporairement aux ressources d'AniStream pour un visionnage personnel, non commercial et transitoire uniquement. Il s'agit d'une licence, non d'un transfert de titre.
              </p>
              <p>En vertu de cette licence, vous ne pouvez pas :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Modifier ou copier les ressources</li>
                <li>Utiliser les ressources à des fins commerciales ou pour tout affichage public</li>
                <li>Tenter de désosser tout logiciel contenu sur AniStream</li>
                <li>Supprimer toute mention de droit d'auteur ou autre notation propriétaire des ressources</li>
                <li>Transférer les ressources à une autre personne ou « refléter » les ressources sur un autre serveur</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Contenu et droits d'auteur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Tout le contenu animé, y compris mais sans s'y limiter les vidéos, images et descriptions, provient de plateformes tierces et est la propriété de leurs détenteurs de droits d'auteur respectifs.
              </p>
              <p>
                AniStream ne revendique pas la propriété d'un contenu tiers. Toutes les marques commerciales, marques de service, noms commerciaux et logos sont la propriété de leurs propriétaires respectifs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Conduite de l'utilisateur</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>Vous acceptez de ne pas :</p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Utiliser le service à des fins illégales</li>
                <li>Harceler, abuser ou nuire à une autre personne</li>
                <li>Publier ou transmettre tout contenu offensant, obscène ou répréhensible</li>
                <li>Tenter d'obtenir un accès non autorisé à toute partie du service</li>
                <li>Interférer avec ou perturber le service ou les serveurs</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Confidentialité et collecte de données</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Nous collectons le minimum d'informations personnelles nécessaires pour fournir nos services. Cela inclut :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Adresse e-mail et nom d'affichage (si vous créez un compte)</li>
                <li>Historique de visionnage et préférences (stockés localement et éventuellement dans notre base de données)</li>
                <li>Commentaires et évaluations que vous soumettez</li>
              </ul>
              <p>
                Nous ne vendons, n'échangeons ni ne partageons vos informations personnelles avec des tiers sans votre consentement, sauf si la loi l'exige.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Avis de non-responsabilité</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Les ressources sur AniStream sont fournies « en l'état ». AniStream n'offre aucune garantie, expresse ou implicite, et décline et rejette par les présentes toutes autres garanties. En outre, AniStream ne garantit ni ne fait aucune déclaration concernant l'exactitude, les résultats probables ou la fiabilité de l'utilisation des ressources sur son site Web ou autrement liée à ces ressources ou sur les sites liés à ce site.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Limitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                En aucun cas, AniStream ou ses fournisseurs ne sauraient être tenus responsables de tout dommage (y compris, sans limitation, les dommages pour perte de données ou de profit, ou dus à une interruption d'activité) découlant de l'utilisation ou de l'incapacité d'utiliser les ressources sur AniStream, même si AniStream ou un représentant autorisé d'AniStream a été informé oralement ou par écrit de la possibilité d'un tel dommage.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Révisions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                AniStream peut réviser ces conditions d'utilisation à tout moment sans préavis. En utilisant cette plateforme, vous acceptez d'être lié par la version alors en vigueur des présentes conditions générales d'utilisation.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>
                Si vous avez des questions concernant ces conditions générales d'utilisation, veuillez nous contacter via notre page de suggestions ou nos forums communautaires.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
