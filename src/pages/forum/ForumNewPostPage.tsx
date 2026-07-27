import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sidebar } from '@/components/layout/Sidebar';
import { MobileNav } from '@/components/layout/MobileNav';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useCreateForumPost } from '@/hooks/useForum';
import { useAuth } from '@/contexts/AuthContext';
import { ArrowLeft, Send, AlertTriangle, MessageCircle, HelpCircle, Star, FileText, Newspaper, Laugh, Palette, Lightbulb, Tv, Image as ImageIcon, X, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ForumNewPostPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const createPost = useCreateForumPost();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [flair, setFlair] = useState<string>('');
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Redirect if not logged in
  if (!user) {
    navigate('/auth');
    return null;
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Veuillez sélectionner un fichier image', variant: 'destructive' });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'L\'image doit faire moins de 5 Mo', variant: 'destructive' });
      return;
    }

    setImageFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  const uploadImage = async (file: File): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${user!.id}-${Date.now()}.${fileExt}`;
    const filePath = `forum_images/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('forum')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
      .from('forum')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim() || !content.trim()) {
      toast({ title: 'Veuillez remplir tous les champs requis', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);

    try {
      let imageUrl: string | undefined;

      // Upload image if present
      if (imageFile) {
        setUploadingImage(true);
        imageUrl = await uploadImage(imageFile);
      }

      const post = await createPost.mutateAsync({
        title: title.trim(),
        content: content.trim(),
        flair: flair || undefined,
        is_spoiler: isSpoiler,
        content_type: imageUrl ? 'image' : 'text',
        image_url: imageUrl,
      });

      if (imageUrl) {
        toast({
          title: 'Publication soumise pour approbation',
          description: 'Les publications avec images nécessitent l\'approbation d\'un administrateur avant d\'apparaître publiquement.'
        });
        navigate('/community');
      } else {
        toast({ title: 'Publication créée avec succès !' });
        navigate(`/community/forum/${post.id}`);
      }
    } catch (error) {
      console.error('Failed to create post:', error);
      toast({
        title: 'Échec de la création de la publication',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive'
      });
    } finally {
      setIsSubmitting(false);
      setUploadingImage(false);
    }
  };

  const flairOptions = [
    { value: 'Discussion', label: 'Discussion', icon: MessageCircle },
    { value: 'Question', label: 'Question', icon: HelpCircle },
    { value: 'Recommendation', label: 'Recommandation', icon: Star },
    { value: 'Review', label: 'Critique', icon: FileText },
    { value: 'News', label: 'Actualité', icon: Newspaper },
    { value: 'Meme', label: 'Mème', icon: Laugh },
    { value: 'Fanart', label: 'Fanart', icon: Palette },
    { value: 'Theory', label: 'Théorie', icon: Lightbulb },
    { value: 'Episode Discussion', label: 'Discussion d\'épisode', icon: Tv },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar />

      <main className="relative z-10 pl-0 md:pl-20 lg:pl-24 w-full">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
          {/* Back button */}
          <Button variant="ghost" onClick={() => navigate('/community')} className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour à la communauté
          </Button>

          {/* Form */}
          <GlassPanel className="p-6 md:p-8">
            <h1 className="text-3xl font-bold mb-6">Créer une publication</h1>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Flair */}
              <div className="space-y-2">
                <Label htmlFor="flair">Flair (Optional)</Label>
                <Select value={flair} onValueChange={setFlair}>
                  <SelectTrigger id="flair" className="bg-muted/30">
                    <SelectValue placeholder="Sélectionnez un flair (optionnel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {flairOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <Icon className="w-4 h-4" />
                            {option.label}
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">
                  Titre <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="De quoi parle votre publication ?"
                  className="bg-muted/30"
                  maxLength={300}
                  required
                />
                <p className="text-xs text-muted-foreground">{title.length}/300 caractères</p>
              </div>

              {/* Content */}
              <div className="space-y-2">
                <Label htmlFor="content">
                  Contenu <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Partagez votre avis, posez une question, ou lancez une discussion..."
                  className="min-h-[300px] bg-muted/30"
                  maxLength={10000}
                  required
                />
                <p className="text-xs text-muted-foreground">{content.length}/10,000 caractères</p>
              </div>

              {/* Image Upload */}
              <div className="space-y-2">
                <Label htmlFor="image">Image (Optionnelle)</Label>
                {imagePreview ? (
                  <div className="relative group">
                    <img
                      src={imagePreview}
                      alt="Aperçu"
                      className="w-full max-h-96 object-contain rounded-lg border border-white/10"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={removeImage}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <label
                    htmlFor="image-upload"
                    className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-white/20 rounded-lg cursor-pointer hover:bg-white/5 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-10 h-10 mb-3 text-muted-foreground" />
                      <p className="mb-2 text-sm text-muted-foreground">
                        <span className="font-semibold">Cliquez pour télécharger</span> ou glissez-déposez
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, GIF jusqu'à 5 Mo</p>
                      <p className="text-xs text-orange-500 mt-2">⚠ Les publications avec images nécessitent une approbation admin</p>
                    </div>
                    <input
                      id="image-upload"
                      type="file"
                      className="hidden"
                      accept="image/*"
                      onChange={handleImageSelect}
                    />
                  </label>
                )}
              </div>

              {/* Spoiler toggle */}
              <div className="flex items-center justify-between p-4 bg-muted/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  <div>
                    <Label htmlFor="spoiler" className="cursor-pointer">
                      Marquer comme spolier
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      Cachez le contenu qui pourrait gâcher l'expérience des autres
                    </p>
                  </div>
                </div>
                <Switch id="spoiler" checked={isSpoiler} onCheckedChange={setIsSpoiler} />
              </div>

              {/* Actions */}
              <div className="flex gap-4 pt-4">
                <Button
                  type="submit"
                  disabled={isSubmitting || uploadingImage || !title.trim() || !content.trim()}
                  className="gap-2"
                >
                  <Send className="w-4 h-4" />
                  {uploadingImage ? 'Téléchargement de l\'image...' : isSubmitting ? 'Publication...' : 'Publier'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => navigate('/community')}>
                  Annuler
                </Button>
              </div>
            </form>
          </GlassPanel>

          {/* Guidelines */}
          <GlassPanel className="mt-6 p-6">
            <h3 className="font-bold mb-3">Règles communautaires</h3>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li>• Soyez respectueux et aimable envers les autres</li>
              <li>• Pas de spam, d'autopromotion ou de publicités</li>
              <li>• Marquez les spoliers correctement</li>
              <li>• Restez dans le sujet et contribuez de manière constructive</li>
              <li>• Pas de contenu illégal ni de liens pirates</li>
              <li>• Les publications avec images nécessitent l'approbation d'un administrateur</li>
            </ul>
          </GlassPanel>
        </div>
      </main>

      <MobileNav />
    </div>
  );
}
