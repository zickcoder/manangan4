import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  enable as enableDarkReader,
  disable as disableDarkReader,
  setFetchMethod
} from 'darkreader';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    try {
      const explicit = localStorage.getItem('govserve_theme_explicit');
      if (explicit === 'true') {
        const saved = localStorage.getItem('theme') as Theme | null;
        if (saved === 'dark' || saved === 'light') return saved;
      }
    } catch {
      // ignore
    }
    return 'light';
  });

  useEffect(() => {
    // Ensure DarkReader uses window.fetch in Vite
    if (typeof window !== 'undefined' && window.fetch) {
      try {
        setFetchMethod(window.fetch);
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      try {
        enableDarkReader({
          brightness: 100,
          contrast: 95,
          sepia: 0,
        });
      } catch (err) {
        console.warn('DarkReader enable error:', err);
      }
    } else {
      root.classList.remove('dark');
      try {
        disableDarkReader();
      } catch (err) {
        console.warn('DarkReader disable error:', err);
      }
    }
    try {
      localStorage.setItem('theme', theme);
      localStorage.setItem('govserve_theme', theme);
    } catch {
      // ignore
    }
  }, [theme]);

  const toggleTheme = () => {
    setThemeState(prev => {
      const next = prev === 'dark' ? 'light' : 'dark';
      try {
        localStorage.setItem('govserve_theme_explicit', 'true');
        localStorage.setItem('theme', next);
        localStorage.setItem('govserve_theme', next);
      } catch {
        // ignore
      }
      return next;
    });
  };

  const setTheme = (newTheme: Theme) => {
    try {
      localStorage.setItem('govserve_theme_explicit', 'true');
    } catch {
      // ignore
    }
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

