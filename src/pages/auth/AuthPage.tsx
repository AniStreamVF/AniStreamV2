import { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Lock, User, Play, ArrowLeft } from 'lucide-react';
import { z } from 'zod';
import { useIsNativeApp, useIsDesktopApp, useIsMobileApp } from '@/hooks/useIsNativeApp';
import { cn } from '@/lib/utils';

const emailSchema = z.string().email('Veuillez entrer un e-mail valide');
const passwordSchema = z.string().min(6, 'Le mot de passe doit comporter au moins 6 caractères');

// Random video backgrounds
const VIDEO_SOURCES = [
  'https://AniStream.jiobase.com/storage/v1/object/public/Public/bg/3.mp4',
  'https://AniStream.jiobase.com/storage/v1/object/public/Public/bg/2.webm',
  'https://AniStream.jiobase.com/storage/v1/object/public/Public/bg/1.mp4',
  `${window.location.origin}/videos/5.mp4`,
  `${window.location.origin}/videos/6.mp4`,
];

// Random text variations
const TEXT_VARIATIONS = [
  {
    title: "Votre portail vers l'anime",
    desc: "Regardez des milliers d'animes en streaming, suivez votre progression et rejoignez une communauté de fans passionnés."
  },
  {
    title: "Découvrez le paradis de l'anime",
    desc: "Explorez des univers d'anime infinis, suivez vos favoris et connectez-vous avec d'autres passionnés."
  },
  {
    title: "Lancez votre aventure anime",
    desc: "Plongez dans une vaste bibliothèque d'anime, suivez vos habitudes de visionnage et engagez-vous avec une communauté dynamique."
  },
  {
    title: "Les aventures anime vous attendent",
    desc: "Accédez à d'innombrables séries d'anime, suivez votre liste de visionnage et partagez vos expériences."
  },
  {
    title: "Entrez dans le royaume de l'anime",
    desc: "Parcourez une vaste collection d'anime, suivez les épisodes et faites partie d'une communauté active."
  }
];

export default function AuthPage() {
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  // Pick a random video on mount
  const randomVideoSrc = useMemo(() => {
    return VIDEO_SOURCES[Math.floor(Math.random() * VIDEO_SOURCES.length)];
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  if (user) {
    return null;
  }

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};
    
    const emailResult = emailSchema.safeParse(email);
    if (!emailResult.success) {
      newErrors.email = emailResult.error.errors[0].message;
    }
    
    const passwordResult = passwordSchema.safeParse(password);
    if (!passwordResult.success) {
      newErrors.password = passwordResult.error.errors[0].message;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsLoading(true);
    
    try {
      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          if (error.message.includes('Invalid login credentials')) {
            toast.error('E-mail ou mot de passe invalide');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Bon retour !');
          navigate('/');
        }
      } else {
        const { error } = await signUp(email, password, displayName);
        if (error) {
          if (error.message.includes('already registered')) {
            toast.error('Cet e-mail est déjà inscrit');
          } else {
            toast.error(error.message);
          }
        } else {
          toast.success('Compte créé ! Vous pouvez maintenant vous connecter.');
          navigate('/');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isNative = useIsNativeApp();
  const isDesktopApp = useIsDesktopApp();
  const isMobileApp = useIsMobileApp();

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Form with opaque background */}
      <div className={cn(
        "w-full lg:w-1/2 min-h-screen bg-background flex flex-col justify-center items-center p-6 lg:p-12 relative",
        // Only hide right panel on mobile apps, keep 50/50 on desktop apps
        isMobileApp && "lg:w-full"
      )}>
        {/* Back button */}
        <button 
          onClick={() => navigate('/')} 
          className={cn(
            "absolute top-6 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group",
            isNative ? "left-4" : "left-6"
          )}
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span className="text-sm font-medium">Retour à l'accueil</span>
        </button>

        <div className="w-full max-w-md">
          {/* Logo/Brand */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg overflow-hidden">
                <img src="/AniStream-logo-square.png" alt="Logo AniStream" className="w-full h-full object-cover" />
              </div>
              <h1 className="font-display text-3xl font-bold gradient-text">AniStream</h1>
            </div>
            <h2 className="text-2xl lg:text-3xl font-bold text-foreground mb-2">
              {isLogin ? 'Bon retour !' : 'Créer votre compte'}
            </h2>
            <p className="text-muted-foreground">
              {isLogin 
                ? 'Entrez vos identifiants pour accéder à votre compte.' 
                : 'Rejoignez des milliers d\'amoureux d\'anime dès aujourd\'hui.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="displayName" className="text-foreground font-medium">
                  Nom d'affichage
                </Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Votre nom d'affichage"
                    className="h-12 pl-12 bg-muted/30 border-border hover:border-primary/50 focus:border-primary transition-colors"
                  />
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground font-medium">
                E-mail
              </Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  placeholder="vous@exemple.com"
                  className={`h-12 pl-12 bg-muted/30 border-border hover:border-primary/50 focus:border-primary transition-colors ${errors.email ? 'border-destructive' : ''}`}
                />
              </div>
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground font-medium">
                Mot de passe
              </Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  placeholder="••••••••"
                  className={`h-12 pl-12 pr-12 bg-muted/30 border-border hover:border-primary/50 focus:border-primary transition-colors ${errors.password ? 'border-destructive' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
              {isLogin && (
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => navigate('/reset-password')}
                    className="text-sm text-primary hover:underline"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
              )}
            </div>
            
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 bg-gradient-to-r from-primary to-secondary hover:opacity-90 font-semibold text-lg shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              ) : isLogin ? (
                'Connexion'
              ) : (
                'Créer un compte'
              )}
            </Button>
          </form>
          
          <div className="mt-8 text-center">
            <p className="text-muted-foreground">
              {isLogin ? "Vous n'avez pas de compte ?" : 'Vous avez déjà un compte ?'}
              <button
                onClick={() => {
                  setIsLogin(!isLogin);
                  setErrors({});
                }}
                className="ml-2 text-primary hover:underline font-semibold"
              >
                {isLogin ? "S'inscrire" : 'Connexion'}
              </button>
            </p>
          </div>

          {/* Decorative element */}
          <div className="mt-12 pt-8 border-t border-border/50">
            <p className="text-xs text-muted-foreground text-center">
              En continuant, vous acceptez nos{' '}
              <button
                onClick={() => navigate('/terms')}
                className="text-primary hover:underline"
              >
                Conditions d'utilisation
              </button>
              ,{' '}
              <button
                onClick={() => navigate('/privacy')}
                className="text-primary hover:underline"
              >
                Politique de confidentialité
              </button>
              , et notre{' '}
              <button
                onClick={() => navigate('/dmca')}
                className="text-primary hover:underline"
              >
                Politique DMCA
              </button>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Video with overlay - show on web and desktop apps, hide only on mobile apps */}
      <div className={cn(
        "hidden lg:block w-1/2 h-screen relative overflow-hidden",
        isMobileApp && "lg:hidden"
      )}>
        {/* Video Background */}
        <video
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        >
          <source src={randomVideoSrc} type={randomVideoSrc.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
        </video>
        
        {/* 30% Dark Overlay */}
        <div className="absolute inset-0 bg-black/30" />
        
        {/* Content over video */}
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <div className="max-w-md">
            <h3 className="text-3xl font-bold text-white mb-4 drop-shadow-lg">
              Votre portail vers l'anime
            </h3>
            <p className="text-white/80 text-lg drop-shadow-md">
              Regardez des milliers d'animes en streaming, suivez votre progression et rejoignez une communauté de fans passionnés.
            </p>
          </div>
        </div>

        {/* Gradient fade at bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
    </div>
  );
}
