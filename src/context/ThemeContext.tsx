import React, { createContext, useContext, useState, useEffect } from 'react';

export type ThemeType = 'premium-navy' | 'hot-volcano' | 'warm-amber' | 'cold-arctic' | 'forest-emerald' | 'midnight-indigo';

interface ThemeColors {
  primary: string;
  primaryLight: string;
  accent: string;
  accentDark: string;
  accentLight: string;
  bg: string;
  gradientGold: string[];
}

export const THEMES: Record<ThemeType, ThemeColors> = {
  'premium-navy': {
    primary: '#0f172a',
    primaryLight: '#1e293b',
    accent: '#D4AF37',
    accentDark: '#AA7C11',
    accentLight: '#FBF8F1',
    bg: '#FAFAFA',
    gradientGold: ['#E5C158', '#D4AF37', '#AA7C11']
  },
  'hot-volcano': {
    primary: '#450a0a',
    primaryLight: '#7f1d1d',
    accent: '#ef4444',
    accentDark: '#991b1b',
    accentLight: '#fef2f2',
    bg: '#fffafb',
    gradientGold: ['#f87171', '#ef4444', '#b91c1c']
  },
  'warm-amber': {
    primary: '#451a03',
    primaryLight: '#78350f',
    accent: '#f59e0b',
    accentDark: '#b45309',
    accentLight: '#fffbeb',
    bg: '#fffdf5',
    gradientGold: ['#fbbf24', '#f59e0b', '#d97706']
  },
  'cold-arctic': {
    primary: '#082f49',
    primaryLight: '#0c4a6e',
    accent: '#0ea5e9',
    accentDark: '#0369a1',
    accentLight: '#f0f9ff',
    bg: '#f8fcff',
    gradientGold: ['#38bdf8', '#0ea5e9', '#0284c7']
  },
  'forest-emerald': {
    primary: '#064e3b',
    primaryLight: '#065f46',
    accent: '#10b981',
    accentDark: '#047857',
    accentLight: '#ecfdf5',
    bg: '#f7fdfa',
    gradientGold: ['#34d399', '#10b981', '#059669']
  },
  'midnight-indigo': {
    primary: '#1e1b4b',
    primaryLight: '#312e81',
    accent: '#6366f1',
    accentDark: '#4338ca',
    accentLight: '#eef2ff',
    bg: '#fafaff',
    gradientGold: ['#818cf8', '#6366f1', '#4f46e5']
  }
};

interface ThemeContextType {
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>(() => {
    return (localStorage.getItem('app_theme') as ThemeType) || 'warm-amber';
  });

  useEffect(() => {
    const theme = THEMES[currentTheme];
    const root = document.documentElement;
    
    root.style.setProperty('--color-primary', theme.primary);
    root.style.setProperty('--color-primary-light', theme.primaryLight);
    root.style.setProperty('--color-accent', theme.accent);
    root.style.setProperty('--color-accent-dark', theme.accentDark);
    root.style.setProperty('--color-accent-light', theme.accentLight);
    root.style.setProperty('--bg-app', theme.bg);
    
    // Update gradients
    root.style.setProperty('--gradient-gold-start', theme.gradientGold[0]);
    root.style.setProperty('--gradient-gold-mid', theme.gradientGold[1]);
    root.style.setProperty('--gradient-gold-end', theme.gradientGold[2]);
    
    localStorage.setItem('app_theme', currentTheme);
  }, [currentTheme]);

  return (
    <ThemeContext.Provider value={{ currentTheme, setTheme: setCurrentTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
