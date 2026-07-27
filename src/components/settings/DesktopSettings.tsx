import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { FolderOpen, RefreshCw, Download, ExternalLink, Terminal, FileText, RotateCcw, AlertTriangle, Info, Laptop } from 'lucide-react';
import { toast } from 'sonner';
import { useIsNativeApp } from '@/hooks/useIsNativeApp';

export function DesktopSettings() {
    const isNative = useIsNativeApp();
    const [downloadPath, setDownloadPath] = useState<string>('');
    const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
    const [devMode, setDevMode] = useState(false);
    const [autoLaunch, setAutoLaunch] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState<any>(null);
    const [downloadProgress, setDownloadProgress] = useState<number>(0);
    const [isDownloading, setIsDownloading] = useState(false);
    const [updateReady, setUpdateReady] = useState(false);
    const [systemInfo, setSystemInfo] = useState<any>(null);
    const [showResetDialog, setShowResetDialog] = useState(false);

    const handleExportLogs = async () => {
        if (!isNative) return;
        try {
            const success = await (window as any).electron.exportLogs();
            if (success) {
                toast.success('Logs exportés avec succès');
            } else {
                toast.error('Export annulé ou échoué');
            }
        } catch (error) {
            console.error(error);
            toast.error('Échec de l\'export des logs');
        }
    };

    useEffect(() => {
        if (isNative && (window as any).electron) {
            const savedPath = localStorage.getItem('AniStream_download_path');
            if (savedPath) {
                setDownloadPath(savedPath);
            } else {
                (window as any).electron.getDownloadsDir().then((dir: string) => {
                    setDownloadPath(dir);
                });
            }

            // Load system info
            if ((window as any).electron.getSystemInfo) {
                (window as any).electron.getSystemInfo().then((info: any) => {
                    setSystemInfo(info);
                }).catch((error: any) => {
                    console.error('Failed to load system info:', error);
                });
            } else {
                // Fallback system info if function not available
                setSystemInfo({
                    platform: 'unknown',
                    arch: 'unknown',
                    version: __APP_VERSION__,
                    electronVersion: 'unknown',
                    nodeVersion: 'unknown',
                    totalMemory: 0,
                    freeMemory: 0,
                    cpus: 0
                });
            }

            // Load auto-launch setting
            if ((window as any).electron.getAutoLaunch) {
                (window as any).electron.getAutoLaunch().then((result: any) => {
                    if (result.success) {
                        setAutoLaunch(result.enabled);
                    }
                }).catch((error: any) => {
                    console.error('Failed to load auto-launch setting:', error);
                });
            }

            // Setup updater listeners
            const onUpdaterEvent = (window as any).electron.onUpdaterEvent;
            if (onUpdaterEvent) {
                onUpdaterEvent((data: any) => {
                    console.log('Updater event:', data);
                    switch (data.type) {
                        case 'update-available':
                            setUpdateAvailable(data.info);
                            setIsCheckingUpdate(false);
                            break;
                        case 'update-not-available':
                            setUpdateAvailable(null);
                            setIsCheckingUpdate(false);
                            toast.success('Vous utilisez la dernière version');
                            break;
                        case 'download-progress':
                            setIsDownloading(true);
                            setDownloadProgress(data.progress.percent);
                            break;
                        case 'update-downloaded':
                            setIsDownloading(false);
                            setUpdateReady(true);
                            toast.success('Mise à jour téléchargée. Prête à être installée.');
                            break;
                        case 'error':
                            setIsCheckingUpdate(false);
                            setIsDownloading(false);
                            toast.error(`Erreur du programme de mise à jour : ${data.error}`);
                            break;
                    }
                });
            }
        }
    }, [isNative]);

    const handleSelectDirectory = async () => {
        if (!isNative) return;
        try {
            const path = await (window as any).electron.selectDirectory();
            if (path) {
                setDownloadPath(path);
                localStorage.setItem('AniStream_download_path', path);
                toast.success('Emplacement de téléchargement mis à jour');
            }
        } catch (error) {
            console.error(error);
            toast.error('Échec de la sélection du dossier');
        }
    };

    const handleCheckUpdate = async () => {
        setIsCheckingUpdate(true);
        setUpdateAvailable(null);
        setUpdateReady(false);
        try {
            const result = await (window as any).electron.checkForUpdates();
            if (result.status === 'dev-mode') {
                setIsCheckingUpdate(false);
                toast.info('Vérification ignorée en mode développeur');
            } else if (result.status === 'error') {
                 setIsCheckingUpdate(false);
                 toast.error(`Échec de la vérification : ${result.error}`);
            }
            // 'checked' status will be followed by events if not dev-mode
        } catch (error) {
            console.error(error);
            setIsCheckingUpdate(false);
            toast.error('Échec de la vérification des mises à jour');
        }
    };

    const handleDownloadUpdate = () => {
        (window as any).electron.downloadUpdate();
        setIsDownloading(true);
    };

    const handleQuitAndInstall = () => {
        (window as any).electron.quitAndInstall();
    };

    const handleAutoLaunchToggle = async (enabled: boolean) => {
        if (!(window as any).electron?.setAutoLaunch) {
            toast.error('Fonction de démarrage automatique non disponible');
            return;
        }
        
        try {
            const result = await (window as any).electron.setAutoLaunch(enabled);
            if (result.success) {
                setAutoLaunch(enabled);
                toast.success(enabled ? 'Démarrage automatique activé' : 'Démarrage automatique désactivé');
            } else {
                toast.error('Échec de la mise à jour du démarrage automatique');
            }
        } catch (error) {
            console.error(error);
            toast.error('Échec de la mise à jour du démarrage automatique');
        }
    };

    const handleResetApp = async () => {
        if (!isNative) {
            toast.error('Fonction de réinitialisation non disponible');
            return;
        }

        // Check if function exists
        if (!(window as any).electron?.resetAppData) {
            toast.error('Fonction de réinitialisation non disponible. Veuillez redémarrer l\'application de bureau.');
            return;
        }
        
        try {
            toast.loading('Réinitialisation de l\'application...');
            const result = await (window as any).electron.resetAppData();
            
            if (result.success) {
                // Clear localStorage
                localStorage.clear();
                
                toast.success('Données effacées. Redémarrage de l\'application...');
                
                // Use app.relaunch() to properly restart and clear locked files
                setTimeout(async () => {
                    await (window as any).electron.invoke('app-relaunch');
                }, 1500);
            } else {
                toast.error(result.error || 'Échec de la réinitialisation');
            }
        } catch (error) {
            console.error(error);
            toast.error('Échec de la réinitialisation');
        }
        setShowResetDialog(false);
    };

    if (!isNative) return null;

    return (
        <GlassPanel className="p-6">
            <h2 className="font-display text-xl font-semibold mb-6 flex items-center gap-2">
                <Laptop className="w-5 h-5 text-primary" />
                Desktop Application
            </h2>
            
            <div className="space-y-6">
                {/* Application Settings */}
                {(window as any).electron?.setAutoLaunch && (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-muted/30">
                        <div>
                            <p className="font-medium">Lancer au démarrage</p>
                            <p className="text-sm text-muted-foreground">Lancer AniStream automatiquement à la connexion</p>
                        </div>
                        <Switch checked={autoLaunch} onCheckedChange={handleAutoLaunchToggle} />
                    </div>
                )}

                {/* Download Location */}
                <div className="p-4 rounded-xl bg-muted/30">
                    <label className="text-sm font-medium mb-3 block">Emplacement des téléchargements</label>
                    <div className="flex gap-2">
                        <div className="flex-1 px-3 py-2 rounded-md bg-background/50 border border-border text-sm font-mono truncate">
                            {downloadPath || 'Default'}
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => (window as any).electron.openPath(downloadPath)} title="Ouvrir le dossier">
                            <ExternalLink className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" onClick={handleSelectDirectory}>
                            <FolderOpen className="w-4 h-4 mr-2" />
                            Change
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">
                        Episodes will be saved to this folder organized by anime title.
                    </p>
                </div>

                {/* Updates Section */}
                <div className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between">
                        <div className="flex-1 mr-4">
                            <p className="font-medium">Version actuelle : v{__APP_VERSION__}</p>
                            <p className="text-xs text-muted-foreground">Vous êtes sur le canal stable</p>
                            {updateAvailable && (
                                 <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                                     <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                                     Update available: v{updateAvailable.version}
                                 </p>
                            )}
                            {downloadProgress > 0 && isDownloading && (
                                 <div className="mt-2 w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                     <div className="bg-primary h-full transition-all duration-300" style={{ width: `${downloadProgress}%` }} />
                                 </div>
                            )}
                        </div>
                        <div className="flex gap-2">
                            {updateReady ? (
                                <Button onClick={handleQuitAndInstall} variant="default" className="bg-green-600 hover:bg-green-700">
                                    Restart to Install
                                </Button>
                            ) : updateAvailable && !isDownloading ? (
                                <Button onClick={handleDownloadUpdate} variant="default">
                                    Download v{updateAvailable.version}
                                </Button>
                            ) : (
                                <Button onClick={handleCheckUpdate} disabled={isCheckingUpdate || isDownloading}>
                                    {isCheckingUpdate ? (
                                        <>
                                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                            Checking...
                                        </>
                                    ) : isDownloading ? (
                                         <>
                                            <Download className="w-4 h-4 mr-2 animate-bounce" />
                                            {Math.round(downloadProgress)}%
                                         </>
                                    ) : (
                                        'Vérifier les mises à jour'
                                    )}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>

                {/* System Information */}
                {systemInfo && (
                    <div className="p-4 rounded-xl bg-muted/30">
                        <p className="font-medium mb-3">Informations système</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Version de l'application</span>
                                    <Badge variant="secondary">{systemInfo.version}</Badge>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Plateforme</span>
                                    <span className="font-mono">{systemInfo.platform} ({systemInfo.arch})</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Electron</span>
                                    <span className="font-mono">v{systemInfo.electronVersion}</span>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Cœurs CPU</span>
                                    <span className="font-mono">{systemInfo.cpus}</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">RAM totale</span>
                                    <span className="font-mono">{systemInfo.totalMemory} GB</span>
                                </div>
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">RAM libre</span>
                                    <span className="font-mono">{systemInfo.freeMemory} GB</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Developer Mode */}
                <div className="p-4 rounded-xl bg-muted/30">
                    <div className="flex items-center justify-between">
                    <div>
                            <p className="font-medium">Mode développeur</p>
                            <p className="text-sm text-muted-foreground">Activer les fonctionnalités de débogage avancées</p>
                        </div>
                        <Switch checked={devMode} onCheckedChange={setDevMode} />
                    </div>
                    
                    {devMode && (
                        <div className="mt-4 pt-4 border-t border-border animate-in slide-in-from-top-2 fade-in duration-300">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Journaux d'application</p>
                                    <p className="text-sm text-muted-foreground">Exporter les logs pour le dépannage</p>
                                </div>
                                <Button variant="outline" onClick={handleExportLogs}>
                                    <FileText className="w-4 h-4 mr-2" />
                                    Exporter les logs
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Reset Application - Dangerous */}
                {(window as any).electron?.resetAppData && (
                    <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                <div>
                                    <p className="font-medium text-destructive">Réinitialiser l'application</p>
                                    <p className="text-sm text-muted-foreground">Effacer tous les paramètres, le cache et le contenu téléchargé</p>
                                </div>
                            </div>
                            <Button variant="destructive" onClick={() => setShowResetDialog(true)}>
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Réinitialiser
                            </Button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reset App Dialog */}
            <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="w-5 h-5" />
Réinitialiser l'application
                        </DialogTitle>
                        <DialogDescription className="space-y-3 pt-4">
                            <p>Cette action réinitialisera complètement l'application de bureau AniStream :</p>
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>Effacer tous les paramètres et préférences</li>
                                <li>Supprimer l'historique des téléchargements et la bibliothèque hors ligne</li>
                                <li>Réinitialiser la taille et la position de la fenêtre</li>
                                <li>Vider le cache et les données temporaires</li>
                                <li>Demander la configuration initiale à nouveau</li>
                            </ul>
                            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 mt-4">
                                <p className="text-amber-600 dark:text-amber-400 text-sm flex items-start gap-2">
                                    <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                                    <span>L'application redémarrera automatiquement après la réinitialisation.</span>
                                </p>
                            </div>
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowResetDialog(false)}>
                            Annuler
                        </Button>
                        <Button variant="destructive" onClick={handleResetApp}>
                            <RotateCcw className="w-4 h-4 mr-2" />
                            Réinitialiser
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </GlassPanel>
    );
}
