import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Background } from '@/components/layout/Background';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';

export default function PrivacyPage() {
  const navigate = useNavigate();

  return (
    <div className="legal-page">
      <style>{`.light-theme .legal-page,.light-theme .legal-page p,.light-theme .legal-page li,.light-theme .legal-page span,.light-theme .legal-page strong,.light-theme .legal-page h1,.light-theme .legal-page h2,.light-theme .legal-page h3{color:#000}.dark-theme .legal-page,.dark-theme .legal-page p,.dark-theme .legal-page li,.dark-theme .legal-page span,.dark-theme .legal-page strong,.dark-theme .legal-page h1,.dark-theme .legal-page h2,.dark-theme .legal-page h3{color:#fff}`}</style>
      <Background />
      <main className="min-h-screen relative z-10 py-8 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour
            </Button>
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h1 className="text-4xl md:text-5xl font-display font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Politique de confidentialité
            </h1>
            <p>Dernière mise à jour : 11 janvier 2026</p>
          </div>

          {/* Content */}
          <GlassPanel className="p-6 md:p-8 space-y-6">
            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">1. Informations que nous collectons</h2>
              <p className="leading-relaxed">
                Nous collectons les informations que vous nous fournissez directement lorsque vous créez un compte, mettez à jour votre profil,
                utilisez nos services ou communiquez avec nous. Cela peut inclure :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Adresse e-mail et nom d'utilisateur</li>
                <li>Informations de profil (nom d'affichage, avatar, bio)</li>
                <li>Liste de surveillance et historique de visionnage</li>
                <li>Commentaires, messages sur le forum et listes de classement que vous créez</li>
                <li>Communications avec le support ou d'autres utilisateurs</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">2. Comment nous utilisons vos informations</h2>
              <p className="leading-relaxed">
                Nous utilisons les informations que nous collectons pour :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Fournir, maintenir et améliorer nos services</li>
                <li>Personnaliser votre expérience et les recommandations de contenu</li>
                <li>Vous envoyer des avis techniques et des messages d'assistance</li>
                <li>Répondre à vos commentaires et questions</li>
                <li>Surveiller et analyser les tendances, l'utilisation et les activités</li>
                <li>Détecter, prévenir et résoudre les problèmes techniques et les abus</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">3. Partage d'informations</h2>
              <p className="leading-relaxed">
                Nous ne vendons pas vos informations personnelles. Nous pouvons partager vos informations dans les circonstances suivantes :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Informations publiques :</strong> Informations de profil, commentaires et publications que vous choisissez de rendre publics</li>
                <li><strong>Prestataires de services :</strong> Services tiers qui nous aident à fonctionner (authentification, hébergement, analyses)</li>
                <li><strong>Obligations légales :</strong> Lorsque la loi l'exige ou pour protéger les droits et la sécurité</li>
                <li><strong>Transferts d'entreprise :</strong> Dans le cadre de fusions, d'acquisitions ou de ventes d'actifs</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">4. Sécurité des données</h2>
              <p className="leading-relaxed">
                Nous mettons en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos informations personnelles.
                Cependant, aucune méthode de transmission sur Internet ou de stockage électronique n'est sécurisée à 100 %.
                Nous utilisons des pratiques de cryptage et de sécurité conformes aux normes de l'industrie, notamment :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Transmission de données cryptée (HTTPS/TLS)</li>
                <li>Authentification sécurisée via Supabase</li>
                <li>Audits et mises à jour de sécurité réguliers</li>
                <li>Contrôles d'accès et surveillance</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">5. Vos droits et choix</h2>
              <p className="leading-relaxed">
                Vous disposez des droits suivants concernant vos informations personnelles :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Accès :</strong> Demander une copie de vos données personnelles</li>
                <li><strong>Correction :</strong> Mettre à jour ou corriger vos informations via les paramètres du profil</li>
                <li><strong>Suppression :</strong> Demander la suppression de votre compte et des données associées</li>
                <li><strong>Désinscription :</strong> Vous désabonner des communications marketing</li>
                <li><strong>Export :</strong> Télécharger vos données dans un format portable</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">6. Cookies et suivi</h2>
              <p className="leading-relaxed">
                Nous utilisons des cookies et des technologies de suivi similaires pour :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li>Maintenir votre session et mémoriser vos préférences</li>
                <li>Comprendre comment vous utilisez nos services</li>
                <li>Améliorer les performances de notre site Web et l'expérience utilisateur</li>
                <li>Fournir un contenu et des recommandations personnalisés</li>
              </ul>
              <p className=" leading-relaxed mt-3">
                Vous pouvez contrôler les cookies via les paramètres de votre navigateur, mais leur désactivation peut affecter les fonctionnalités.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">7. Services tiers</h2>
              <p className="leading-relaxed">
                Notre service s'intègre avec des fournisseurs tiers :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-4">
                <li><strong>Supabase :</strong> Authentification et hébergement de base de données</li>
                <li><strong>Vercel :</strong> Hébergement et déploiement du site Web</li>
                <li><strong>API externes :</strong> Données et images d'anime</li>
              </ul>
              <p className=" leading-relaxed mt-3">
                Ces services ont leurs propres politiques de confidentialité. Nous vous recommandons de les consulter.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">8. Confidentialité des enfants</h2>
              <p className="leading-relaxed">
                Notre service n'est pas destiné aux enfants de moins de 13 ans. Nous ne collectons pas sciemment d'informations personnelles
                auprès d'enfants de moins de 13 ans. Si vous pensez que nous avons collecté de telles informations, veuillez nous contacter
                immédiatement afin que nous puissions les supprimer.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">9. Modifications de cette politique</h2>
              <p className="leading-relaxed">
                Nous pouvons mettre à jour cette politique de confidentialité de temps à autre. Nous vous informerons de tout changement en
                publiant la nouvelle politique sur cette page et en mettant à jour la date de « Dernière mise à jour ». Votre utilisation continue
                de nos services après les modifications constitue une acceptation de la politique mise à jour.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-2xl font-display font-semibold text-primary">10. Nous contacter</h2>
              <p className="leading-relaxed">
                Si vous avez des questions concernant cette politique de confidentialité ou nos pratiques en matière de données, veuillez nous contacter :
              </p>
              <div className="bg-muted/30 rounded-lg p-4 mt-3 space-y-2">
                <p className="text-sm ">
                  <strong>Email :</strong> privacy@AniStream.me
                </p>
                <p className="text-sm ">
                  <strong>Discord :</strong> Rejoignez notre serveur communautaire
                </p>
                <p className="text-sm ">
                  <strong>Délai de réponse :</strong> Nous visons à répondre sous 48 heures
                </p>
              </div>
            </section>

            <div className="border-t border-border pt-6 mt-8">
              <p className="text-sm  text-center">
                En utilisant AniStream, vous acceptez cette politique de confidentialité et nos conditions d'utilisation.
              </p>
            </div>
          </GlassPanel>
        </div>
      </main>
    </div>
  );
}
