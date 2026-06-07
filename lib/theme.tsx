'use client';

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyClass(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');

  // Restore preference on mount (anti-flash script may have already set the class).
  useEffect(() => {
    const saved =
      typeof window !== 'undefined' ? window.localStorage.getItem('theme') : null;
    if (saved === 'light' || saved === 'dark') {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from persisted user preference on mount
      setThemeState(saved);
      applyClass(saved);
    }
  }, []);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    applyClass(t);
    try {
      window.localStorage.setItem('theme', t);
    } catch {
      // ignore storage errors
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
