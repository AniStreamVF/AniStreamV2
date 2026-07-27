import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  readGuestSettingsFromCookie,
  readProfileAppSettings,
  saveAccountSettingsPatch,
  writeGuestSettingsCookie,
} from '@/lib/appSettingsPersistence';

export type Theme =
  | 'dark'
  | 'light'
  | 'amoled'
  | 'violet'
  | 'bleu-nuit'
  | 'aurora'
  | 'rubis'
  | 'rose'
  | 'bleu-ciel'
  | 'menthe'
  | 'peche';

interface ThemeColors {
  primary: string;
  primaryForeground?: string;
  secondary: string;
  secondaryForeground?: string;
  accent: string;
  background: string;
  foreground: string;
  card: string;
  cardForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  glass: string;
  glowPrimary: string;
  glowSecondary: string;
  surface: string;
  surfaceHover: string;
  sidebarBackground: string;
  sidebarBorder: string;
  isLight?: boolean;
  isBrutalism?: boolean;
  reduceMotion?: boolean;
  highContrast?: boolean;
}

export const THEME_COLORS: Record<Theme, ThemeColors> = {
  'dark': {
    primary: '0 0% 100%',
    primaryForeground: '0 0% 0%',
    secondary: '0 0% 80%',
    secondaryForeground: '0 0% 0%',
    accent: '0 0% 85%',
    background: '0 0% 6%',
    foreground: '0 0% 93%',
    card: '0 0% 10%',
    cardForeground: '0 0% 93%',
    muted: '0 0% 15%',
    mutedForeground: '0 0% 55%',
    border: '0 0% 20%',
    glass: '0 0% 12%',
    glowPrimary: '0 0% 100%',
    glowSecondary: '0 0% 70%',
    surface: '0 0% 8%',
    surfaceHover: '0 0% 14%',
    sidebarBackground: '0 0% 4%',
    sidebarBorder: '0 0% 18%',
  },
  'light': {
    primary: '0 0% 0%',
    primaryForeground: '0 0% 100%',
    secondary: '0 0% 30%',
    secondaryForeground: '0 0% 100%',
    accent: '0 0% 15%',
    background: '0 0% 96%',
    foreground: '0 0% 8%',
    card: '0 0% 100%',
    cardForeground: '0 0% 8%',
    muted: '0 0% 90%',
    mutedForeground: '0 0% 40%',
    border: '0 0% 85%',
    glass: '0 0% 100%',
    glowPrimary: '0 0% 10%',
    glowSecondary: '0 0% 50%',
    surface: '0 0% 94%',
    surfaceHover: '0 0% 90%',
    sidebarBackground: '0 0% 98%',
    sidebarBorder: '0 0% 88%',
    isLight: true,
  },
  'amoled': {
    primary: '0 0% 100%',
    primaryForeground: '0 0% 0%',
    secondary: '0 0% 50%',
    secondaryForeground: '0 0% 100%',
    accent: '0 0% 70%',
    background: '0 0% 0%',
    foreground: '0 0% 98%',
    card: '0 0% 3%',
    cardForeground: '0 0% 98%',
    muted: '0 0% 6%',
    mutedForeground: '0 0% 55%',
    border: '0 0% 10%',
    glass: '0 0% 4%',
    glowPrimary: '0 0% 100%',
    glowSecondary: '0 0% 50%',
    surface: '0 0% 2%',
    surfaceHover: '0 0% 7%',
    sidebarBackground: '0 0% 0%',
    sidebarBorder: '0 0% 8%',
  },
  'violet': {
    primary: '270 70% 65%',
    primaryForeground: '270 70% 5%',
    secondary: '270 40% 50%',
    secondaryForeground: '270 10% 90%',
    accent: '270 50% 55%',
    background: '270 50% 5%',
    foreground: '270 15% 90%',
    card: '270 40% 8%',
    cardForeground: '270 15% 90%',
    muted: '270 30% 12%',
    mutedForeground: '270 10% 50%',
    border: '270 25% 18%',
    glass: '270 30% 8%',
    glowPrimary: '270 70% 65%',
    glowSecondary: '270 40% 40%',
    surface: '270 40% 6%',
    surfaceHover: '270 35% 12%',
    sidebarBackground: '270 50% 3%',
    sidebarBorder: '270 30% 14%',
  },
  'bleu-nuit': {
    primary: '220 60% 55%',
    primaryForeground: '220 60% 5%',
    secondary: '220 40% 40%',
    secondaryForeground: '220 10% 90%',
    accent: '220 50% 50%',
    background: '220 50% 5%',
    foreground: '220 15% 90%',
    card: '220 40% 8%',
    cardForeground: '220 15% 90%',
    muted: '220 30% 12%',
    mutedForeground: '220 10% 50%',
    border: '220 25% 18%',
    glass: '220 30% 8%',
    glowPrimary: '220 60% 55%',
    glowSecondary: '220 40% 40%',
    surface: '220 40% 6%',
    surfaceHover: '220 35% 12%',
    sidebarBackground: '220 50% 3%',
    sidebarBorder: '220 30% 14%',
  },
  'aurora': {
    primary: '160 60% 50%',
    primaryForeground: '160 70% 5%',
    secondary: '160 40% 40%',
    secondaryForeground: '160 10% 90%',
    accent: '160 50% 45%',
    background: '160 40% 5%',
    foreground: '160 15% 90%',
    card: '160 30% 8%',
    cardForeground: '160 15% 90%',
    muted: '160 25% 12%',
    mutedForeground: '160 10% 50%',
    border: '160 20% 18%',
    glass: '160 25% 8%',
    glowPrimary: '160 60% 50%',
    glowSecondary: '160 40% 35%',
    surface: '160 30% 6%',
    surfaceHover: '160 25% 12%',
    sidebarBackground: '160 40% 3%',
    sidebarBorder: '160 25% 14%',
  },
  'rubis': {
    primary: '350 70% 55%',
    primaryForeground: '350 80% 5%',
    secondary: '350 40% 40%',
    secondaryForeground: '350 10% 90%',
    accent: '350 50% 48%',
    background: '350 50% 5%',
    foreground: '350 15% 90%',
    card: '350 40% 8%',
    cardForeground: '350 15% 90%',
    muted: '350 30% 12%',
    mutedForeground: '350 10% 50%',
    border: '350 25% 18%',
    glass: '350 30% 8%',
    glowPrimary: '350 70% 55%',
    glowSecondary: '350 40% 35%',
    surface: '350 40% 6%',
    surfaceHover: '350 35% 12%',
    sidebarBackground: '350 50% 3%',
    sidebarBorder: '350 30% 14%',
  },
  'rose': {
    primary: '340 70% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '340 40% 60%',
    secondaryForeground: '0 0% 100%',
    accent: '340 50% 45%',
    background: '340 35% 92%',
    foreground: '340 25% 12%',
    card: '340 25% 96%',
    cardForeground: '340 25% 12%',
    muted: '340 20% 86%',
    mutedForeground: '340 10% 45%',
    border: '340 25% 78%',
    glass: '340 20% 97%',
    glowPrimary: '340 70% 50%',
    glowSecondary: '340 30% 65%',
    surface: '340 25% 90%',
    surfaceHover: '340 20% 85%',
    sidebarBackground: '340 20% 97%',
    sidebarBorder: '340 25% 82%',
    isLight: true,
  },
  'bleu-ciel': {
    primary: '210 65% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '210 40% 60%',
    secondaryForeground: '0 0% 100%',
    accent: '210 50% 45%',
    background: '210 35% 92%',
    foreground: '210 25% 12%',
    card: '210 25% 96%',
    cardForeground: '210 25% 12%',
    muted: '210 20% 86%',
    mutedForeground: '210 10% 45%',
    border: '210 25% 76%',
    glass: '210 20% 97%',
    glowPrimary: '210 65% 50%',
    glowSecondary: '210 30% 65%',
    surface: '210 25% 90%',
    surfaceHover: '210 20% 85%',
    sidebarBackground: '210 20% 97%',
    sidebarBorder: '210 25% 80%',
    isLight: true,
  },
  'menthe': {
    primary: '160 55% 38%',
    primaryForeground: '0 0% 100%',
    secondary: '160 35% 60%',
    secondaryForeground: '0 0% 100%',
    accent: '160 45% 45%',
    background: '160 30% 92%',
    foreground: '160 25% 12%',
    card: '160 20% 96%',
    cardForeground: '160 25% 12%',
    muted: '160 18% 86%',
    mutedForeground: '160 10% 45%',
    border: '160 20% 78%',
    glass: '160 15% 97%',
    glowPrimary: '160 55% 38%',
    glowSecondary: '160 25% 65%',
    surface: '160 20% 90%',
    surfaceHover: '160 15% 85%',
    sidebarBackground: '160 15% 97%',
    sidebarBorder: '160 20% 82%',
    isLight: true,
  },
  'peche': {
    primary: '25 65% 50%',
    primaryForeground: '0 0% 100%',
    secondary: '25 35% 60%',
    secondaryForeground: '0 0% 100%',
    accent: '25 45% 45%',
    background: '25 35% 92%',
    foreground: '25 25% 12%',
    card: '25 25% 96%',
    cardForeground: '25 25% 12%',
    muted: '25 20% 86%',
    mutedForeground: '25 10% 45%',
    border: '25 25% 78%',
    glass: '25 20% 97%',
    glowPrimary: '25 65% 50%',
    glowSecondary: '25 30% 65%',
    surface: '25 25% 90%',
    surfaceHover: '25 20% 85%',
    sidebarBackground: '25 20% 97%',
    sidebarBorder: '25 25% 82%',
    isLight: true,
  },
};

export const THEME_INFO: Record<Theme, { name: string; gradient: string; description: string; icon: string; category: 'dark' | 'light' }> = {
  'dark': {
    name: 'Sombre',
    gradient: 'from-gray-800 via-gray-900 to-black',
    description: 'Thème sombre en niveaux de gris',
    icon: '⬛',
    category: 'dark',
  },
  'light': {
    name: 'Clair',
    gradient: 'from-gray-100 via-gray-200 to-white',
    description: 'Thème clair en niveaux de gris',
    icon: '⬜',
    category: 'light',
  },
  'amoled': {
    name: 'AMOLED',
    gradient: 'from-black via-gray-950 to-black',
    description: 'Fond noir pur — économise la batterie sur les écrans OLED/AMOLED',
    icon: '⬛',
    category: 'dark',
  },
  'violet': {
    name: 'Violet',
    gradient: 'from-purple-900 via-purple-950 to-black',
    description: 'Ambiance violette profonde avec accents saturés',
    icon: '🟣',
    category: 'dark',
  },
  'bleu-nuit': {
    name: 'Bleu Nuit',
    gradient: 'from-blue-900 via-blue-950 to-black',
    description: 'Bleu sombre élégant pour une expérience calme',
    icon: '🔵',
    category: 'dark',
  },
  'aurora': {
    name: 'Aurore',
    gradient: 'from-emerald-900 via-teal-950 to-black',
    description: 'Vert émeraude et teal — inspiré des aurores boréales',
    icon: '🟢',
    category: 'dark',
  },
  'rubis': {
    name: 'Rubis',
    gradient: 'from-red-900 via-rose-950 to-black',
    description: 'Rouge profond et passionné aux reflets de gemme',
    icon: '🔴',
    category: 'dark',
  },
  'rose': {
    name: 'Rose',
    gradient: 'from-pink-200 via-pink-100 to-white',
    description: 'Rose doux et romantique pour un rendu lumineux',
    icon: '🩷',
    category: 'light',
  },
  'bleu-ciel': {
    name: 'Bleu Ciel',
    gradient: 'from-sky-200 via-sky-100 to-white',
    description: 'Bleu ciel aéré, frais et apaisant',
    icon: '💙',
    category: 'light',
  },
  'menthe': {
    name: 'Menthe',
    gradient: 'from-emerald-200 via-green-100 to-white',
    description: 'Vert menthe naturel et rafraîchissant',
    icon: '💚',
    category: 'light',
  },
  'peche': {
    name: 'Pêche',
    gradient: 'from-orange-200 via-amber-100 to-white',
    description: 'Orange pêche chaleureux et accueillant',
    icon: '🧡',
    category: 'light',
  },
};
const THEME_KEY = 'anime-theme';
export function useTheme() {
  const { user, profile } = useAuth();
  const seededAccountRef = useRef<string | null>(null);

  const isLowEndDevice = useCallback(() => {
    if (typeof window === 'undefined') return false;

    return (
      ((navigator as any).deviceMemory !== undefined &&
        (navigator as any).deviceMemory < 4) ||
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      )
    );
  }, []);

  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(THEME_KEY) as Theme | null;
      if (stored && THEME_COLORS[stored]) return stored;

      const cookieTheme = readGuestSettingsFromCookie().theme?.theme;
      if (cookieTheme && THEME_COLORS[cookieTheme as Theme]) {
        return cookieTheme as Theme;
      }
    }
    return 'dark';
  });

  const [reduceMotion, setReduceMotionState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('AniStream_reduce_motion');
      if (stored !== null) return stored === 'true';

      const cookieValue = readGuestSettingsFromCookie().theme?.reduceMotion;
      if (typeof cookieValue === 'boolean') return cookieValue;
      return false;
    }
    return false;
  });

  const [highContrast, setHighContrastState] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('AniStream_high_contrast');
      if (stored !== null) return stored === 'true';

      const cookieValue = readGuestSettingsFromCookie().theme?.highContrast;
      if (typeof cookieValue === 'boolean') return cookieValue;

      return false;
    }
    return false;
  });

  const accountThemeSettings = useMemo(
    () => readProfileAppSettings(profile).theme,
    [profile?.app_settings],
  );

  useEffect(() => {
    if (!user?.id) return;
    if (!accountThemeSettings || typeof accountThemeSettings !== 'object') return;

    const nextTheme = String(accountThemeSettings.theme || '').trim();
    if (nextTheme && THEME_COLORS[nextTheme as Theme] && nextTheme !== theme) {
      setThemeState(nextTheme as Theme);
      localStorage.setItem(THEME_KEY, nextTheme);
    }

    if (
      typeof accountThemeSettings.reduceMotion === 'boolean' &&
      accountThemeSettings.reduceMotion !== reduceMotion
    ) {
      setReduceMotionState(accountThemeSettings.reduceMotion);
      localStorage.setItem('AniStream_reduce_motion', String(accountThemeSettings.reduceMotion));
    }

    if (
      typeof accountThemeSettings.highContrast === 'boolean' &&
      accountThemeSettings.highContrast !== highContrast
    ) {
      setHighContrastState(accountThemeSettings.highContrast);
      localStorage.setItem('AniStream_high_contrast', String(accountThemeSettings.highContrast));
    }

    writeGuestSettingsCookie({
      theme: {
        theme: nextTheme && THEME_COLORS[nextTheme as Theme] ? nextTheme : theme,
        reduceMotion:
          typeof accountThemeSettings.reduceMotion === 'boolean'
            ? accountThemeSettings.reduceMotion
            : reduceMotion,
        highContrast:
          typeof accountThemeSettings.highContrast === 'boolean'
            ? accountThemeSettings.highContrast
            : highContrast,
      },
    });
  }, [user?.id, accountThemeSettings, theme, reduceMotion, highContrast]);

  useEffect(() => {
    if (!user?.id) {
      seededAccountRef.current = null;
      return;
    }

    if (accountThemeSettings && typeof accountThemeSettings === 'object') {
      seededAccountRef.current = user.id;
      return;
    }

    if (seededAccountRef.current === user.id) return;
    seededAccountRef.current = user.id;

    void saveAccountSettingsPatch(user.id, {
      theme: {
        theme,
        reduceMotion,
        highContrast,
      },
    }).catch(() => {
      seededAccountRef.current = null;
    });
  }, [user?.id, accountThemeSettings, theme, reduceMotion, highContrast]);

  const applyTheme = useCallback(
    (themeName: Theme) => {
      const colors = THEME_COLORS[themeName];
      if (!colors) return;

      const root = document.documentElement;

      Object.entries(colors).forEach(([key, value]) => {
        if (typeof value === 'string') {
          const cssKey = key.replace(/([A-Z])/g, '-$1').toLowerCase();
          root.style.setProperty(`--${cssKey}`, value);
        }
      });

      document.body.classList.toggle('light-theme', colors.isLight);
      document.body.classList.toggle('dark-theme', !colors.isLight);
      document.body.classList.toggle('brutalism-theme', !!colors.isBrutalism);
      document.body.classList.toggle('reduce-motion', reduceMotion);
      document.body.classList.toggle('high-contrast', highContrast);

      document.body.setAttribute('data-theme', themeName);
    },
    [reduceMotion, highContrast]
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme, applyTheme]);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
    writeGuestSettingsCookie({
      theme: {
        theme: newTheme,
        reduceMotion,
        highContrast,
      },
    });

    if (user?.id) {
      void saveAccountSettingsPatch(user.id, {
        theme: {
          theme: newTheme,
          reduceMotion,
          highContrast,
        },
      }).catch(() => undefined);
    }
  }, [user?.id, reduceMotion, highContrast]);

  const setReduceMotion = useCallback((value: boolean) => {
    setReduceMotionState(value);
    localStorage.setItem('AniStream_reduce_motion', String(value));
    writeGuestSettingsCookie({
      theme: {
        theme,
        reduceMotion: value,
        highContrast,
      },
    });

    if (user?.id) {
      void saveAccountSettingsPatch(user.id, {
        theme: {
          theme,
          reduceMotion: value,
          highContrast,
        },
      }).catch(() => undefined);
    }
  }, [user?.id, theme, highContrast]);

  const setHighContrast = useCallback((value: boolean) => {
    setHighContrastState(value);
    localStorage.setItem('AniStream_high_contrast', String(value));
    writeGuestSettingsCookie({
      theme: {
        theme,
        reduceMotion,
        highContrast: value,
      },
    });

    if (user?.id) {
      void saveAccountSettingsPatch(user.id, {
        theme: {
          theme,
          reduceMotion,
          highContrast: value,
        },
      }).catch(() => undefined);
    }
  }, [user?.id, theme, reduceMotion]);

  const isLightTheme = THEME_COLORS[theme]?.isLight ?? false;

  return {
    theme,
    setTheme,
    reduceMotion,
    setReduceMotion,
    highContrast,
    setHighContrast,
    themes: Object.keys(THEME_COLORS) as Theme[],
    themeInfo: THEME_INFO,
    isLightTheme,
  };
}
