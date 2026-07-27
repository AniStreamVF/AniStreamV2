import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { 
  useAdminChangelog, 
  useCreateChangelog, 
  useUpdateChangelog, 
  useDeleteChangelog,
  type Changelog 
} from '@/hooks/useAdminFeatures';
import { toast } from 'sonner';
import { 
  History, Plus, X, Trash2, Loader2, Edit2, Eye, EyeOff, Star
} from 'lucide-react';
import { format } from 'date-fns';

export function ChangelogManager() {
  const [showForm, setShowForm] = useState(false);
  const [editingChangelog, setEditingChangelog] = useState<Changelog | null>(null);
  const [formData, setFormData] = useState({
    version: '',
    release_date: new Date().toISOString().split('T')[0],
    title: '',
    changes: [''],
    is_published: false,
    is_latest: false,
  });

  const { data: changelogs = [], isLoading } = useAdminChangelog();
  const createChangelog = useCreateChangelog();
  const updateChangelog = useUpdateChangelog();
  const deleteChangelog = useDeleteChangelog();

  const resetForm = () => {
    setFormData({
      version: '',
      release_date: new Date().toISOString().split('T')[0],
      title: '',
      changes: [''],
      is_published: false,
      is_latest: false,
    });
    setEditingChangelog(null);
  };

  const handleEdit = (changelog: Changelog) => {
    setFormData({
      version: changelog.version,
      release_date: changelog.release_date,
      title: changelog.title || '',
      changes: changelog.changes.length > 0 ? changelog.changes : [''],
      is_published: changelog.is_published,
      is_latest: changelog.is_latest,
    });
    setEditingChangelog(changelog);
    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formData.version.trim()) {
      toast.error('Veuillez saisir une version');
      return;
    }

    if (formData.changes.filter(c => c.trim()).length === 0) {
      toast.error('Veuillez ajouter au moins un changement');
      return;
    }

    try {
      const data = {
        version: formData.version,
        release_date: formData.release_date,
        title: formData.title || undefined,
        changes: formData.changes.filter(c => c.trim()),
        is_published: formData.is_published,
        is_latest: formData.is_latest,
      };

      if (editingChangelog) {
        await updateChangelog.mutateAsync({ id: editingChangelog.id, updates: data });
        toast.success('Journal mis à jour');
      } else {
        await createChangelog.mutateAsync(data);
        toast.success('Journal créé');
      }
      setShowForm(false);
      resetForm();
    } catch (error) {
      toast.error('Échec de l\'enregistrement du journal');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette entrée du journal ?')) return;
    
    try {
      await deleteChangelog.mutateAsync(id);
      toast.success('Journal supprimé');
    } catch (error) {
      toast.error('Échec de la suppression du journal');
    }
  };

  const handleTogglePublished = async (changelog: Changelog) => {
    try {
      await updateChangelog.mutateAsync({ 
        id: changelog.id, 
        updates: { is_published: !changelog.is_published } 
      });
      toast.success(changelog.is_published ? 'Journal dépublié' : 'Journal publié');
    } catch (error) {
      toast.error('Échec de la mise à jour du journal');
    }
  };

  const addChange = () => {
    setFormData(prev => ({ ...prev, changes: [...prev.changes, ''] }));
  };

  const updateChange = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.map((c, i) => i === index ? value : c),
    }));
  };

  const removeChange = (index: number) => {
    if (formData.changes.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      changes: prev.changes.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <History className="w-5 h-5 text-primary" />
          Gestionnaire du journal
        </h2>
        <Button onClick={() => { resetForm(); setShowForm(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle version
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="p-6 rounded-xl bg-muted/30 border border-muted space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-medium">{editingChangelog ? 'Modifier la version' : 'Créer une nouvelle version'}</h3>
            <button onClick={() => { setShowForm(false); resetForm(); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Version *</label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                placeholder="ex. 2.1.0"
                className="bg-muted/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Date de sortie</label>
              <Input
                type="date"
                value={formData.release_date}
                onChange={(e) => setFormData(prev => ({ ...prev, release_date: e.target.value }))}
                className="bg-muted/50"
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Titre (optionnel)</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="ex. Grande mise à jour estivale"
                className="bg-muted/50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium">Modifications *</label>
              <Button variant="ghost" size="sm" onClick={addChange} className="gap-1">
                <Plus className="w-3 h-3" />
                Add Change
              </Button>
            </div>
            <div className="space-y-2">
              {formData.changes.map((change, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={change}
                    onChange={(e) => updateChange(index, e.target.value)}
                    placeholder="Décrivez un changement..."
                    className="bg-muted/50"
                  />
                  {formData.changes.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeChange(index)}
                      className="text-destructive hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_published}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_published: checked }))}
              />
              <span className="text-sm">Published</span>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_latest}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_latest: checked }))}
              />
              <Star className="w-4 h-4 text-yellow-500" />
              <span className="text-sm">Dernière version</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={handleSave} 
              disabled={createChangelog.isPending || updateChangelog.isPending} 
              className="gap-2"
            >
              {(createChangelog.isPending || updateChangelog.isPending) && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingChangelog ? 'Mettre à jour' : 'Créer'} la version
            </Button>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm(); }}>
              Annuler
            </Button>
          </div>
        </div>
      )}

      {/* Changelogs List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : changelogs.length === 0 ? (
        <div className="text-center py-12">
          <History className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <p className="text-muted-foreground">Aucune entrée de changelog</p>
        </div>
      ) : (
        <div className="space-y-4">
          {changelogs.map((changelog) => (
            <div
              key={changelog.id}
              className={`p-4 rounded-xl border transition-all ${
                changelog.is_latest 
                  ? 'border-primary bg-primary/5' 
                  : changelog.is_published 
                    ? 'border-muted' 
                    : 'border-muted opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                      changelog.is_latest ? 'bg-primary text-primary-foreground' : 'bg-muted'
                    }`}>
                      v{changelog.version}
                    </span>
                    {changelog.is_latest && (
                      <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-500 text-xs font-bold flex items-center gap-1">
                        <Star className="w-3 h-3" />
                        LATEST
                      </span>
                    )}
                    {changelog.is_published ? (
                      <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-500 text-xs">
                        Published
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground text-xs">
                        Draft
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(changelog.release_date), 'MMM dd, yyyy')}
                    </span>
                  </div>
                  
                  {changelog.title && (
                    <h3 className="font-semibold mb-2">{changelog.title}</h3>
                  )}
                  
                  <ul className="space-y-1">
                    {changelog.changes.map((change, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-primary mt-1">•</span>
                        <span>{change}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleTogglePublished(changelog)}
                    title={changelog.is_published ? 'Dépublier' : 'Publier'}
                  >
                    {changelog.is_published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleEdit(changelog)}
                  >
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(changelog.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
