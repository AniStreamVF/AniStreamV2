import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Background } from '@/components/layout/Background';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Mail, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { z } from 'zod';

const emailSchema = z.string().email('Veuillez entrer un e-mail valide');

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      emailSchema.parse(email);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/update-password`,
      });

      if (error) throw error;

      setEmailSent(true);
      toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte de réception.');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Échec de l\'envoi de l\'email de réinitialisation');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Background />
      <main className="min-h-screen relative z-10 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Back Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/auth')}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour à la connexion
          </Button>

          {/* Logo */}
            <div className="text-center mb-6">
            <img src="/AniStream-logo.png" alt="Logo AniStream" className="mx-auto h-52 w-282 transition-transform duration-300 hover:scale-105 hover:drop-shadow-lg" />
            </div>

          {/* Reset Form */}
          <GlassPanel className="p-6 md:p-8">
            {!emailSent ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-semibold">Mot de passe oublié ?</h2>
                  <p className="text-sm text-muted-foreground">
                    Entrez votre adresse e-mail et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Adresse e-mail</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="vous@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !email}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Envoyer le lien de réinitialisation
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <div className="space-y-2">
                  <h2 className="text-2xl font-display font-semibold">Vérifiez vos e-mails</h2>
                  <p className="text-sm text-muted-foreground">
                    Nous avons envoyé un lien de réinitialisation à <strong>{email}</strong>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur le lien dans l'e-mail pour réinitialiser votre mot de passe. Le lien expire dans 1 heure.
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEmailSent(false)}
                    className="w-full"
                  >
                    Essayer un autre e-mail
                  </Button>
                  <Button
                    onClick={() => navigate('/auth')}
                    className="w-full"
                  >
                    Retour à la connexion
                  </Button>
                </div>
              </div>
            )}
          </GlassPanel>

          {/* Additional Help */}
          <div className="text-center text-sm text-muted-foreground space-y-2">
            <p>Vous n'avez pas reçu l'e-mail ? Vérifiez vos spams.</p>
            <p>
              Besoin d'aide ?{' '}
              <button
                onClick={() => window.open('https://discord.gg/Vr5GZFJszp', '_blank')}
                className="text-primary hover:underline"
              >
                Contacter le support
              </button> 
              &nbsp;ou soumettez un
               <button
                onClick={() => window.open('/suggestions', '_blank')}
                className="text-primary hover:underline"
              >
                 &nbsp;Ticket
              </button> 
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
