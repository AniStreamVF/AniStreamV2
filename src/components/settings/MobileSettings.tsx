import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Download, Smartphone, ExternalLink, RefreshCw, Globe, 
  HardDrive, Wifi, WifiOff, Bell, BellOff, Moon, Sun,
  Volume2, VolumeX, Trash2, FolderOpen, Info, Shield, Zap,
  Vibrate, Eye, Type, RotateCcw, Monitor, Accessibility, Terminal,
  Play, Subtitles, FastForward
} from 'lucide-react';
import { toast } from 'sonner';
import { useMobileUpdate } from '@/hooks/useMobileUpdate';
import { useHaptics } from '@/hooks/useHaptics';
import { useVideoSettings } from '@/hooks/useVideoSettings';
import { mobileCache } from '@/services/mobileCacheService';
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Device } from '@capacitor/device';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { KeepAwake } from '@capacitor-community/keep-awake';
import { LocalNotifications } from '@capacitor/local-notifications';

// Platform-specific icons
const AndroidIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.523 15.341c-.527 0-.954.427-.954.954s.427.954.954.954.954-.427.954-.954-.427-.954-.954-.954zm-11.046 0c-.527 0-.954.427-.954.954s.427.954.954.954.954-.427.954-.954-.427-.954-.954-.954zm11.405-6.634l1.716-2.972c.094-.162.038-.369-.124-.463-.162-.094-.369-.038-.463.124l-1.737 3.008c-1.391-.64-2.952-1.002-4.596-1.002s-3.205.362-4.596 1.002L6.345 6.396c-.094-.162-.301-.218-.463-.124-.162.094-.218.301-.124.463l1.716 2.972C3.645 11.369 1.5 14.762 1.5 18.682h21c0-3.92-2.145-7.313-5.974-8.975z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
  </svg>
);

interface MobileConfig {
  downloadOverWifiOnly: boolean;
  downloadQuality: 'auto' | '360p' | '480p' | '720p' | '1080p';
  autoPlayNext: boolean;
  enableNotifications: boolean;
  keepScreenOn: boolean;
  backgroundPlay: boolean;
  dataSaverMode: boolean;
  cacheSize: number;
  // Accessibility
  hapticFeedback: boolean;
  reduceMotion: boolean;
  largeText: boolean;
  highContrast: boolean;
  // Performance
  animationMode: 'default' | 'fast' | 'quality';
  // Developer
  devMode: boolean;
  showDevConsole: boolean;
  showFloatingDownloadButton: boolean;
}

const defaultConfig: MobileConfig = {
  downloadOverWifiOnly: true,
  downloadQuality: 'auto',
  autoPlayNext: true,
  enableNotifications: true,
  keepScreenOn: true,
  backgroundPlay: false,
  dataSaverMode: false,
  cacheSize: 500,
  // Accessibility defaults
  hapticFeedback: true,
  reduceMotion: false,
  largeText: false,
  highContrast: false,
  // Performance defaults
  animationMode: 'default',
  // Developer defaults
  devMode: false,
  showDevConsole: false,
  showFloatingDownloadButton: true,
};

export function MobileSettings() {
  const { isNative, isChecking, checkForUpdates } = useMobileUpdate();
  const { impact, notification } = useHaptics();
  const { settings: videoSettings, updateSetting: updateVideoSetting } = useVideoSettings();
  const [appVersion, setAppVersion] = useState('4.1.0');
  const [cacheInfo, setCacheInfo] = useState<{ used: number; limit: number } | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<any>(null);
  const [storageInfo, setStorageInfo] = useState<{ used: string; available: string } | null>(null);
  const [config, setConfig] = useState<MobileConfig>(() => {
    const saved = localStorage.getItem('AniStream_mobile_config');
    return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
  });

  useEffect(() => {
    // Get app and device info
    const loadInfo = async () => {
      try {
        const info = await App.getInfo();
        setAppVersion(info.version);
        
        const device = await Device.getInfo();
        setDeviceInfo(device);
        
        // Initialize mobile cache and get size
        await mobileCache.init();
        const size = await mobileCache.getCacheSize();
        setCacheInfo(size);
        
        // Estimate storage (Capacitor doesn't have direct storage API)
        // This is a placeholder - real implementation would need native plugin
        setStorageInfo({ used: '~', available: '~' });
      } catch (e) {
        console.error('Error getting app info:', e);
      }
    };
    
    if (isNative) {
      loadInfo();
    }
  }, [isNative]);

  // Apply Keep Screen On setting
  const applyKeepScreenOn = useCallback(async (enabled: boolean) => {
    try {
      if (enabled) {
        await KeepAwake.keepAwake();
      } else {
        await KeepAwake.allowSleep();
      }
    } catch (e) {
      console.error('Failed to toggle keep screen on:', e);
    }
  }, []);

  // Apply Notifications permission
  const applyNotifications = useCallback(async (enabled: boolean) => {
    try {
      if (enabled) {
        const permission = await LocalNotifications.requestPermissions();
        if (permission.display !== 'granted') {
          toast.error('Permission de notification refusée');
          return false;
        }
      }
      return true;
    } catch (e) {
      console.error('Failed to toggle notifications:', e);
      return false;
    }
  }, []);

  // Apply Reduce Motion setting
  const applyReduceMotion = useCallback((enabled: boolean) => {
    if (enabled) {
      document.documentElement.classList.add('reduce-motion');
    } else {
      document.documentElement.classList.remove('reduce-motion');
    }
  }, []);

  // Apply Large Text setting
  const applyLargeText = useCallback((enabled: boolean) => {
    if (enabled) {
      document.documentElement.classList.add('large-text');
      document.documentElement.style.fontSize = '18px';
    } else {
      document.documentElement.classList.remove('large-text');
      document.documentElement.style.fontSize = '';
    }
  }, []);

  // Apply High Contrast setting
  const applyHighContrast = useCallback((enabled: boolean) => {
    if (enabled) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }, []);

  // Apply Animation Mode setting
  const applyAnimationMode = useCallback((mode: 'default' | 'fast' | 'quality') => {
    document.documentElement.classList.remove('fast-animations', 'quality-animations');
    if (mode === 'fast') {
      document.documentElement.classList.add('fast-animations');
    } else if (mode === 'quality') {
      document.documentElement.classList.add('quality-animations');
    }
  }, []);

  // Apply settings on mount
  useEffect(() => {
    if (config.keepScreenOn) {
      applyKeepScreenOn(true);
    }
    applyReduceMotion(config.reduceMotion);
    applyLargeText(config.largeText);
    applyHighContrast(config.highContrast);
    applyAnimationMode(config.animationMode);
  }, []);

  const saveConfig = async (newConfig: Partial<MobileConfig>) => {
    const updated = { ...config, ...newConfig };
    
    // Apply settings immediately
    if ('keepScreenOn' in newConfig) {
      await applyKeepScreenOn(newConfig.keepScreenOn!);
    }
    if ('enableNotifications' in newConfig) {
      const success = await applyNotifications(newConfig.enableNotifications!);
      if (!success && newConfig.enableNotifications) {
        return; // Don't save if permission denied
      }
    }
    if ('reduceMotion' in newConfig) {
      applyReduceMotion(newConfig.reduceMotion!);
      // keep global/theme key in sync so the ReduceMotionPrompt and web UI
      // respect the user's mobile preference
      try {
        localStorage.setItem('AniStream_reduce_motion', String(newConfig.reduceMotion));
      } catch (e) {
        /* ignore */
      }
    }
    if ('largeText' in newConfig) {
      applyLargeText(newConfig.largeText!);
    }
    if ('highContrast' in newConfig) {
      applyHighContrast(newConfig.highContrast!);
    }
    if ('animationMode' in newConfig) {
      applyAnimationMode(newConfig.animationMode!);
    }
    
    setConfig(updated);
    localStorage.setItem('AniStream_mobile_config', JSON.stringify(updated));
    
    // Haptic feedback when toggling settings
    if (updated.hapticFeedback) {
      impact('light');
    }
    
    toast.success('Paramètre enregistré', { duration: 1000 });
  };

  const handleCheckUpdate = async () => {
    if (config.hapticFeedback) {
      impact('medium');
    }
    const hasUpdate = await checkForUpdates();
    
    if (!hasUpdate) {
      if (config.hapticFeedback) {
        notification('success');
      }
      toast.success('Vous utilisez la dernière version !');
    }
  };

  const handleClearCache = async () => {
    if (config.hapticFeedback) {
      impact('medium');
    }
    try {
      // Use the mobile cache service to clear everything
      await mobileCache.clearAll();
      
      // Update cache info display
      const size = await mobileCache.getCacheSize();
      setCacheInfo(size);
      
      if (config.hapticFeedback) {
        notification('success');
      }
      toast.success('Cache vidé avec succès !');
    } catch (e) {
      if (config.hapticFeedback) {
        notification('error');
      }
      toast.error('Échec du vidage du cache');
    }
  };

  const platform = Capacitor.getPlatform();
  const isAndroid = platform === 'android';
  const isIOS = platform === 'ios';
  const isMobileNative = Capacitor.isNativePlatform(); // Only true for Android/iOS

  // Only show for actual mobile platforms (Android/iOS), not Electron desktop
  if (!isMobileNative) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-foreground mb-2 flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          Mobile App Settings
        </h2>
        <p className="text-sm text-muted-foreground">
          Configure your mobile app experience
        </p>
      </div>

      {/* App Info Card */}
      <GlassPanel className="p-4 rounded-xl bg-muted/30">
        <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Info className="w-4 h-4" />
          App Information
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Platform</span>
            <Badge variant="secondary" className="gap-1.5">
              {isAndroid && (
                <>
                  <AndroidIcon />
                  <span>Android</span>
                </>
              )}
              {isIOS && (
                <>
                  <AppleIcon />
                  <span>iOS</span>
                </>
              )}
            </Badge>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-border/50">
            <span className="text-sm text-muted-foreground">Version</span>
            <span className="text-sm font-medium">{appVersion}</span>
          </div>
          {deviceInfo && (
            <>
              <div className="flex items-center justify-between py-2 border-b border-border/50">
                <span className="text-sm text-muted-foreground">Device</span>
                <span className="text-sm font-medium">{deviceInfo.model}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-muted-foreground">OS Version</span>
                <span className="text-sm font-medium">{deviceInfo.osVersion}</span>
              </div>
            </>
          )}
        </div>
      </GlassPanel>

      {/* Download Settings */}
      <GlassPanel className="p-4 rounded-xl bg-muted/30">
        <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Download className="w-4 h-4" />
          Download Settings
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wifi className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="wifi-only" className="text-sm">Wi-Fi Only Downloads</Label>
            </div>
            <Switch
              id="wifi-only"
              checked={config.downloadOverWifiOnly}
              onCheckedChange={(checked) => saveConfig({ downloadOverWifiOnly: checked })}
            />
          </div>
          
          <div className="space-y-2">
            <Label className="text-sm flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              Download Quality
            </Label>
            <Select 
              value={config.downloadQuality} 
              onValueChange={(value: any) => saveConfig({ downloadQuality: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Recommandé)</SelectItem>
                <SelectItem value="360p">360p (Faible)</SelectItem>
                <SelectItem value="480p">480p (Moyen)</SelectItem>
                <SelectItem value="720p">720p (HD)</SelectItem>
                <SelectItem value="1080p">1080p (Full HD)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassPanel>

      {/* Video Quality Settings */}
      <GlassPanel className="p-4 rounded-xl bg-muted/30">
          <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Play className="w-4 h-4" />
          Qualité vidéo
        </h3>
        <div className="space-y-4">
          <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
              <Monitor className="w-4 h-4 text-muted-foreground" />
              Qualité du streaming
            </Label>
            <Select 
              value={videoSettings.defaultQuality} 
              onValueChange={(value: any) => {
                updateVideoSetting('defaultQuality', value);
                if (config.hapticFeedback) impact('light');
                toast.success('Qualité vidéo mise à jour', { duration: 1000 });
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto (Recommandé)</SelectItem>
                <SelectItem value="360p">360p (Peu de données)</SelectItem>
                <SelectItem value="480p">480p (Moyen)</SelectItem>
                <SelectItem value="720p">720p (HD)</SelectItem>
                <SelectItem value="1080p">1080p (Full HD)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {config.dataSaverMode ? "L'économiseur de données est activé - qualité réduite" : 'Une qualité supérieure utilise plus de données'}
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FastForward className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="auto-skip" className="text-sm">Sauter les intro auto</Label>
                <p className="text-xs text-muted-foreground">Passer les génériques automatiquement</p>
              </div>
            </div>
            <Switch
              id="auto-skip"
              checked={videoSettings.autoSkipIntro}
              onCheckedChange={(checked) => {
                updateVideoSetting('autoSkipIntro', checked);
                if (config.hapticFeedback) impact('light');
              }}
            />
          </div>

          <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
              <Subtitles className="w-4 h-4 text-muted-foreground" />
              Sous-titres par défaut
            </Label>
            <Select 
              value={videoSettings.subtitleLanguage} 
              onValueChange={(value: any) => {
                updateVideoSetting('subtitleLanguage', value);
                if (config.hapticFeedback) impact('light');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Détection auto</SelectItem>
                <SelectItem value="english">Anglais</SelectItem>
                <SelectItem value="spanish">Espagnol</SelectItem>
                <SelectItem value="french">Français</SelectItem>
                <SelectItem value="german">Allemand</SelectItem>
                <SelectItem value="off">Désactivé</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              Taille des sous-titres
            </Label>
            <Select 
              value={videoSettings.subtitleSize} 
              onValueChange={(value: any) => {
                updateVideoSetting('subtitleSize', value);
                if (config.hapticFeedback) impact('light');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Petite</SelectItem>
                <SelectItem value="medium">Moyenne</SelectItem>
                <SelectItem value="large">Grande</SelectItem>
                <SelectItem value="xlarge">Extra large</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </GlassPanel>

      {/* Playback Settings */}
      <GlassPanel className="p-4 rounded-xl bg-muted/30">
          <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Volume2 className="w-4 h-4" />
          Paramètres de lecture
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="auto-play" className="text-sm">Lecture auto du prochain épisode</Label>
            </div>
            <Switch
              id="auto-play"
              checked={videoSettings.autoNextEpisode}
              onCheckedChange={(checked) => {
                updateVideoSetting('autoNextEpisode', checked);
                saveConfig({ autoPlayNext: checked });
              }}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sun className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="screen-on" className="text-sm">Maintenir l'écran allumé</Label>
            </div>
            <Switch
              id="screen-on"
              checked={config.keepScreenOn}
              onCheckedChange={(checked) => saveConfig({ keepScreenOn: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="bg-play" className="text-sm">Audio en arrière-plan</Label>
            </div>
            <Switch
              id="bg-play"
              checked={config.backgroundPlay}
              onCheckedChange={(checked) => saveConfig({ backgroundPlay: checked })}
            />
          </div>
        </div>
      </GlassPanel>

      {/* Data & Storage */}
      <GlassPanel className="p-4 rounded-xl bg-muted/30">
        <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <HardDrive className="w-4 h-4" />
          Data & Storage
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <WifiOff className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="data-saver" className="text-sm">Mode économiseur de données</Label>
            </div>
            <Switch
              id="data-saver"
              checked={config.dataSaverMode}
              onCheckedChange={(checked) => saveConfig({ dataSaverMode: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label className="text-sm">Mode animation</Label>
                <p className="text-xs text-muted-foreground">Ajuster le style d'animation de l'UI</p>
              </div>
            </div>
            <Select
              value={config.animationMode}
              onValueChange={(value: 'default' | 'fast' | 'quality') => saveConfig({ animationMode: value })}
            >
              <SelectTrigger className="w-28 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Par défaut</SelectItem>
                <SelectItem value="fast">Rapide</SelectItem>
                <SelectItem value="quality">Qualité</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm">Limite du cache</Label>
              <span className="text-sm text-muted-foreground">{config.cacheSize} MB</span>
            </div>
            <Slider
              value={[config.cacheSize]}
              onValueChange={([value]) => {
                saveConfig({ cacheSize: value });
                mobileCache.updateConfig({ maxSize: value });
              }}
              min={100}
              max={2000}
              step={100}
              className="w-full"
            />
            {cacheInfo && (
              <p className="text-xs text-muted-foreground">
                Utilisation : {cacheInfo.used} Mo sur {cacheInfo.limit} Mo
              </p>
            )}
          </div>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={handleClearCache}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Vider le cache {cacheInfo && cacheInfo.used > 0 && `(${cacheInfo.used} Mo)`}
          </Button>
        </div>
      </GlassPanel>

      {/* Notifications */}
      <GlassPanel className="p-4 rounded-xl bg-muted/30">
        <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Notifications
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {config.enableNotifications ? (
                <Bell className="w-4 h-4 text-muted-foreground" />
              ) : (
                <BellOff className="w-4 h-4 text-muted-foreground" />
              )}
              <Label htmlFor="notifications" className="text-sm">Activer les notifications</Label>
            </div>
            <Switch
              id="notifications"
              checked={config.enableNotifications}
              onCheckedChange={(checked) => saveConfig({ enableNotifications: checked })}
            />
          </div>
        </div>
      </GlassPanel>

      {/* Accessibility Section */}
      <GlassPanel className="p-4 rounded-xl bg-muted/30">
        <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Accessibility className="w-4 h-4" />
          Accessibilité
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Vibrate className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="haptic" className="text-sm">Retour haptique</Label>
                <p className="text-xs text-muted-foreground">Vibrer lors des interactions</p>
              </div>
            </div>
            <Switch
              id="haptic"
              checked={config.hapticFeedback}
              onCheckedChange={(checked) => saveConfig({ hapticFeedback: checked })}
              aria-label="Activer/désactiver le retour haptique"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Type className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="large-text" className="text-sm">Texte agrandi</Label>
                <p className="text-xs text-muted-foreground">Augmenter la taille du texte</p>
              </div>
            </div>
            <Switch
              id="large-text"
              checked={config.largeText}
              onCheckedChange={(checked) => saveConfig({ largeText: checked })}
              aria-label="Activer/désactiver le texte agrandi"
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-muted-foreground" />
              <div>
                <Label htmlFor="high-contrast" className="text-sm">Contraste élevé</Label>
                <p className="text-xs text-muted-foreground">Améliorer la visibilité</p>
              </div>
            </div>
            <Switch
              id="high-contrast"
              checked={config.highContrast}
              onCheckedChange={(checked) => saveConfig({ highContrast: checked })}
              aria-label="Activer/désactiver le mode contraste élevé"
            />
          </div>
        </div>
      </GlassPanel>

      {/* Update Section */}
      <GlassPanel className="p-4 rounded-xl bg-muted/30">
          <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4" />
          Mises à jour
        </h3>
        <div className="space-y-3">
          {isAndroid && (
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-start gap-2">
                <Download className="w-4 h-4 text-primary mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Mises à jour directes</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les mises à jour sont téléchargées depuis GitHub et installées automatiquement
                  </p>
                </div>
              </div>
            </div>
          )}

          {isIOS && (
            <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
              <div className="flex items-start gap-2">
                <Globe className="w-4 h-4 text-blue-500 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Mises à jour web</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Les mises à jour iOS redirigent vers la version web (installable en PWA)
                  </p>
                </div>
              </div>
            </div>
          )}

          <Button
            onClick={handleCheckUpdate}
            disabled={isChecking}
            className="w-full"
            variant="outline"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Vérification des mises à jour...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Vérifier les mises à jour
              </>
            )}
          </Button>
        </div>
      </GlassPanel>

      {/* Web Fallback */}
      <Button
        variant="ghost"
        className="w-full justify-start gap-2"
        onClick={() => window.open('https://AniStream.me', '_blank')}
      >
        <ExternalLink className="w-4 h-4" />
        Ouvrir la version web
      </Button>

      {/* Developer Options */}
      <GlassPanel className="p-4 rounded-xl bg-muted/30">
          <h3 className="font-medium text-sm text-muted-foreground mb-3 flex items-center gap-2">
          <Terminal className="w-4 h-4" />
          Options développeur
        </h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="dev-mode" className="text-sm">Mode développeur</Label>
            </div>
            <Switch
              id="dev-mode"
              checked={config.devMode}
              onCheckedChange={(checked) => saveConfig({ devMode: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="show-console" className="text-sm">Afficher la console dev</Label>
            </div>
            <Switch
              id="show-console"
              checked={config.showDevConsole}
              onCheckedChange={(checked) => saveConfig({ showDevConsole: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="floating-download" className="text-sm">Bouton de téléchargement flottant</Label>
            </div>
            <Switch
              id="floating-download"
              checked={config.showFloatingDownloadButton}
              onCheckedChange={(checked) => saveConfig({ showFloatingDownloadButton: checked })}
            />
          </div>
          
          {config.showDevConsole && (
            <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
              <p className="text-xs text-blue-600 dark:text-blue-400">
                💡 Appuyez sur le bouton console violet (en bas à droite) pour voir les logs en direct.
              </p>
            </div>
          )}
        </div>
      </GlassPanel>
    </div>
  );
}

// Export config for use in other components
export const getMobileConfig = (): MobileConfig => {
  const saved = localStorage.getItem('AniStream_mobile_config');
  return saved ? { ...defaultConfig, ...JSON.parse(saved) } : defaultConfig;
};
