import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Mood {
  emoji: string;
  label: string;
  description: string;
  genres: string[];
  gradient: string;
  glow: string;
}

const MOODS: Mood[] = [
  {
    emoji: '🔥',
    label: 'Plein d\'action',
    description: 'Combats intenses et épopées',
    genres: ['action', 'fighting', 'martial-arts'],
    gradient: 'from-orange-500/20 to-red-500/20',
    glow: 'hover:border-orange-500/40 hover:shadow-orange-500/20',
  },
  {
    emoji: '😂',
    label: 'Léger',
    description: 'Rire aux larmes',
    genres: ['comedy', 'slice-of-life'],
    gradient: 'from-yellow-400/20 to-amber-400/20',
    glow: 'hover:border-yellow-400/40 hover:shadow-yellow-400/20',
  },
  {
    emoji: '🥺',
    label: 'Émouvant',
    description: 'Ressentez chaque instant profondément',
    genres: ['drama', 'romance'],
    gradient: 'from-pink-500/20 to-rose-500/20',
    glow: 'hover:border-pink-400/40 hover:shadow-pink-400/20',
  },
  {
    emoji: '💀',
    label: 'Sombre et brutal',
    description: 'Frissons psychologiques et horreur',
    genres: ['horror', 'psychological', 'thriller'],
    gradient: 'from-zinc-700/30 to-slate-800/30',
    glow: 'hover:border-zinc-500/40 hover:shadow-zinc-500/20',
  },
  {
    emoji: '🤯',
    label: 'Vertigineux',
    description: 'Remettez tout en question',
    genres: ['mystery', 'psychological', 'sci-fi'],
    gradient: 'from-violet-500/20 to-purple-600/20',
    glow: 'hover:border-violet-500/40 hover:shadow-violet-500/20',
  },
  {
    emoji: '✨',
    label: 'Magique',
    description: 'Des mondes au-delà de l\'imagination',
    genres: ['fantasy', 'magic', 'supernatural'],
    gradient: 'from-blue-400/20 to-cyan-500/20',
    glow: 'hover:border-blue-400/40 hover:shadow-blue-400/20',
  },
  {
    emoji: '🏃',
    label: 'Adrénaline',
    description: 'Sports, courses et rivalités',
    genres: ['sports', 'racing'],
    gradient: 'from-green-500/20 to-emerald-500/20',
    glow: 'hover:border-green-500/40 hover:shadow-green-500/20',
  },
  {
    emoji: '🌸',
    label: 'Réconfortant',
    description: 'Ambiance chaleureuse, douce et réparatrice',
    genres: ['slice-of-life', 'iyashikei'],
    gradient: 'from-pink-300/20 to-fuchsia-400/20',
    glow: 'hover:border-pink-300/40 hover:shadow-pink-300/20',
  },
  {
    emoji: '⚔️',
    label: 'Fantasy épique',
    description: 'Isekai et grandes aventures',
    genres: ['isekai', 'adventure', 'fantasy'],
    gradient: 'from-amber-500/20 to-yellow-600/20',
    glow: 'hover:border-amber-500/40 hover:shadow-amber-500/20',
  },
];

interface MoodAnimePickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MoodAnimePicker({ open, onOpenChange }: MoodAnimePickerProps) {
  const navigate = useNavigate();
  const [selected, setSelected] = useState<Mood | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleSelect = (mood: Mood) => {
    setSelected(mood);
  };

  const handleGo = () => {
    if (!selected) return;
    setIsNavigating(true);
    const genre = selected.genres[Math.floor(Math.random() * selected.genres.length)];
    setTimeout(() => {
      onOpenChange(false);
      setSelected(null);
      setIsNavigating(false);
      navigate(`/genre/${genre}`);
    }, 400);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl w-full p-0 overflow-hidden border-border/50 bg-card/95 backdrop-blur-2xl">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-display font-black">
              <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-primary" />
              </div>
              Quelle est votre humeur ?
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Choisissez une ambiance et nous trouverons l'anime parfait pour vous.
            </p>
          </DialogHeader>
        </div>

        {/* Mood Grid */}
        <div className="p-6">
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
            {MOODS.map((mood, i) => (
              <motion.button
                key={mood.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.04, duration: 0.2 }}
                onClick={() => handleSelect(mood)}
                className={cn(
                  'relative flex flex-col items-center gap-2 p-4 rounded-2xl border text-center',
                  'transition-all duration-200 cursor-pointer group',
                  `bg-gradient-to-br ${mood.gradient}`,
                  `border-border/30 ${mood.glow} hover:shadow-lg`,
                  selected?.label === mood.label
                    ? 'border-primary ring-2 ring-primary/30 scale-[1.02] shadow-lg shadow-primary/20'
                    : 'hover:scale-[1.01]'
                )}
              >
                <span className="text-3xl leading-none">{mood.emoji}</span>
                <div>
                  <div className="text-sm font-bold leading-tight">{mood.label}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5 leading-tight hidden sm:block">
                    {mood.description}
                  </div>
                </div>
                {selected?.label === mood.label && (
                  <motion.div
                    layoutId="mood-check"
                    className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  >
                    <span className="text-[10px] text-primary-foreground font-bold">✓</span>
                  </motion.div>
                )}
              </motion.button>
            ))}
          </div>

          {/* Action */}
          <AnimatePresence>
            {selected && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="mt-4 flex items-center gap-3"
              >
                <div className="flex-1 px-4 py-3 rounded-xl bg-muted/40 border border-border/50 text-sm text-muted-foreground">
                  Anime <span className="font-semibold text-foreground">{selected.label}</span> affiché
                  <span className="ml-1">{selected.emoji}</span>
                </div>
                <Button
                  onClick={handleGo}
                  disabled={isNavigating}
                  className="gap-2 shrink-0"
                >
                  <Sparkles className="w-4 h-4" />
                  C\'est parti !
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface MoodPickerButtonProps {
  className?: string;
}

export function MoodPickerButton({ className }: MoodPickerButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'group flex items-center gap-2.5 px-4 py-2.5 rounded-xl',
          'bg-gradient-to-r from-primary/10 to-secondary/10',
          'border border-primary/20 hover:border-primary/40',
          'text-sm font-semibold transition-all duration-200',
          'hover:shadow-lg hover:shadow-primary/10 hover:scale-[1.02]',
          className
        )}
      >
        <span className="text-base">🎭</span>
          <span>Quelle est votre humeur ?</span>
        <Sparkles className="w-3.5 h-3.5 text-primary opacity-60 group-hover:opacity-100 transition-opacity" />
      </button>
      <MoodAnimePicker open={open} onOpenChange={setOpen} />
    </>
  );
}
