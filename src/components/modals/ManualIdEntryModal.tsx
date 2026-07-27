import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, ExternalLink, Search } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ManualIdEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  animeName: string;
  animeId: string;
  onSubmit: (malId: number | null, anilistId: number | null) => void;
  failureReason?: string;
}

export function ManualIdEntryModal({
  isOpen,
  onClose,
  animeName,
  animeId,
  onSubmit,
  failureReason
}: ManualIdEntryModalProps) {
  const [malId, setMalId] = useState<string>('');
  const [anilistId, setAnilistId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const parsedMalId = malId ? parseInt(malId, 10) : null;
      const parsedAnilistId = anilistId ? parseInt(anilistId, 10) : null;
      
      if (parsedMalId && isNaN(parsedMalId)) {
        return;
      }
      if (parsedAnilistId && isNaN(parsedAnilistId)) {
        return;
      }
      
      await onSubmit(parsedMalId, parsedAnilistId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const openMalSearch = () => {
    window.open(`https://myanimelist.net/anime.php?q=${encodeURIComponent(animeName)}&cat=anime`, '_blank');
  };

  const openAniListSearch = () => {
    window.open(`https://anilist.co/search/anime?search=${encodeURIComponent(animeName)}`, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Saisie manuelle de l'ID
          </DialogTitle>
          <DialogDescription>
            Nous n'avons pas pu trouver automatiquement les IDs MAL/AniList pour cet anime. Veuillez les saisir manuellement.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {failureReason && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{failureReason}</AlertDescription>
            </Alert>
          )}

          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium">{animeName}</p>
            <p className="text-xs text-muted-foreground">ID de l'anime : {animeId}</p>
          </div>

          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="malId" className="flex items-center justify-between">
                ID MyAnimeList
                <Button variant="ghost" size="sm" onClick={openMalSearch} className="h-6 px-2 text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Rechercher sur MAL
                </Button>
              </Label>
              <Input
                id="malId"
                type="number"
                placeholder="ex. 16498"
                value={malId}
                onChange={(e) => setMalId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Trouvez-le dans l'URL : myanimelist.net/anime/<span className="text-primary font-bold">16498</span>/
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="anilistId" className="flex items-center justify-between">
                ID AniList
                <Button variant="ghost" size="sm" onClick={openAniListSearch} className="h-6 px-2 text-xs">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Rechercher sur AniList
                </Button>
              </Label>
              <Input
                id="anilistId"
                type="number"
                placeholder="ex. 16498"
                value={anilistId}
                onChange={(e) => setAnilistId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Find it in the URL: anilist.co/anime/<span className="text-primary font-bold">16498</span>/
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={isSubmitting || (!malId && !anilistId)}
          >
            {isSubmitting ? 'Saving...' : 'Save IDs'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
