import { Link } from 'react-router-dom';
import { Heart, Github, Twitter, MessageCircle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

const SOCIAL_LINKS = [
  { icon: MessageCircle, label: 'Discord', url: 'https://discord.gg/Mt2jG5QuGP', color: 'hover:text-[#5865F2]' },
  { icon: Github, label: 'GitHub', url: 'https://github.com/snozxyx/AniStream', color: 'hover:text-[#fff]' },
];

const FOOTER_LINKS = {
  Produit: [
    { label: 'Accueil', path: '/' },
    { label: 'Collections', path: '/collections' },
    { label: 'Tendances', path: '/trending' },
    { label: 'Suggestions', path: '/suggestions' },
  ],
  Support: [
    { label: 'Communauté', path: '/community' },
    { label: "Conditions d'utilisation", path: '/terms' },
    { label: 'Politique de confidentialité', path: '/privacy' },
    { label: 'DMCA', path: '/dmca' },
  ],
  Réseaux: [
    { label: 'Discord', path: 'https://discord.gg/Mt2jG5QuGP', isExternal: true },
    { label: 'Github', path: 'https://github.com/snozxyx/AniStream', isExternal: true },
  ]
};

export function Footer() {
  return (
    <footer className="relative pt-20 pb-10 overflow-hidden border-t border-border/10 bg-card/40 backdrop-blur-xl">
      {/* Background Gradients */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] transform translate-y-1/2 -translate-x-1/2" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[120px] transform translate-y-1/2 translate-x-1/2" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
      </div>

      <div className="max-w-7xl mx-auto px-6 relative">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          {/* Brand Column */}
          <div className="lg:col-span-5 space-y-6">
            <Link to="/" className="block w-fit group">
              <h2 className="text-4xl font-black tracking-tighter text-foreground font-display group-hover:opacity-80 transition-opacity">
                AniStream
              </h2>
            </Link>
            <p className="text-muted-foreground leading-relaxed max-w-md text-lg font-medium">
              La plateforme de streaming anime de nouvelle génération. Élégante, rapide et communautaire.
            </p>
            <div className="flex items-center gap-4">
              {SOCIAL_LINKS.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(
                    "w-10 h-10 rounded-full bg-foreground/5 border border-border/10 flex items-center justify-center transition-all hover:scale-110 hover:bg-foreground/10",
                    social.color
                  )}
                  aria-label={social.label}
                >
                  <social.icon className="w-5 h-5" />
                </a>
              ))}
            </div>
          </div>

          {/* Links Columns */}
          <div className="lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-8">
            {Object.entries(FOOTER_LINKS).map(([category, links]) => (
              <div key={category} className="space-y-4">
                <h3 className="font-bold text-lg text-foreground">{category}</h3>
                <ul className="space-y-3">
                  {links.map((link) => (
                    <li key={link.label}>
                      {link.isExternal ? (
                        <a 
                          href={link.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2 group w-fit"
                        >
                          {link.label}
                          <ExternalLink className="w-3 h-3 opacity-0 -translate-y-1 translate-x-1 group-hover:opacity-100 group-hover:translate-y-0 group-hover:translate-x-0 transition-all" />
                        </a>
                      ) : (
                        <Link 
                          to={link.path}
                          className="text-muted-foreground hover:text-primary transition-colors block w-fit"
                        >
                          {link.label}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Section */}
        <div className="pt-8 border-t border-border/10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} AniStream. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 hover:text-red-500 transition-colors cursor-default select-none group">
              Fait avec <Heart className="w-4 h-4 fill-current group-hover:animate-pulse" /> par AniStream Team
            </span>
          </div>
        </div>
        
        {/* Simplified Educational Disclaimer for clean look */}
         <div className="mt-8 text-center opacity-40 hover:opacity-100 transition-opacity">
          <p className="text-[10px] text-muted-foreground">
            Cette plateforme est à but éducatif uniquement. Nous n'hébergeons aucun contenu.
          </p>
        </div>
      </div>
    </footer>
  );
}
