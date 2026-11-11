'use client';

import React, { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
});

const THEME_STORAGE_KEY = 'ice_theme_preference';

const themeListeners = new Set<() => void>();

function subscribeTheme(callback: () => void) {
  themeListeners.add(callback);
  const handleStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) {
      callback();
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => {
    themeListeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}

function getThemeSnapshot(): ThemeMode {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode | null;
    if (saved === 'light' || saved === 'dark' || saved === 'system') {
      return saved;
    }
  } catch {
    // LocalStorage access may fail in restricted iframes
  }
  return 'system';
}

function getThemeServerSnapshot(): ThemeMode {
  return 'system';
}

function notifyThemeChange() {
  themeListeners.forEach((fn) => fn());
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useSyncExternalStore(subscribeTheme, getThemeSnapshot, getThemeServerSnapshot);
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light');

  // Effect to apply classes and listen to system preference
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const updateResolved = () => {
      let active: ResolvedTheme = 'light';
      if (theme === 'system') {
        active = mediaQuery.matches ? 'dark' : 'light';
      } else {
        active = theme === 'dark' ? 'dark' : 'light';
      }

      setResolvedTheme(active);

      if (active === 'dark') {
        root.classList.add('dark');
        root.classList.remove('light');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
      }
    };

    updateResolved();

    const handler = () => {
      if (theme === 'system') {
        updateResolved();
      }
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
      notifyThemeChange();
    } catch {
      // Ignore storage errors
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

interface ThemeSwitchProps {
  className?: string;
  compact?: boolean;
}

export function ThemeSwitch({ className = '', compact = false }: ThemeSwitchProps) {
  const { theme, setTheme } = useTheme();

  if (compact) {
    return (
      <div className={`inline-flex items-center p-0.5 rounded bg-slate-200/60 dark:bg-[#1B2F4A] border border-slate-300 dark:border-[#203652] text-xs ${className}`}>
        <button
          onClick={() => setTheme('light')}
          className={`p-1 rounded transition-colors ${
            theme === 'light'
              ? 'bg-white text-amber-500 shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Light theme"
          aria-label="Switch to light theme"
        >
          <Sun className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setTheme('system')}
          className={`p-1 rounded transition-colors ${
            theme === 'system'
              ? 'bg-white dark:bg-[#2676D2] text-[#2676D2] dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="System theme"
          aria-label="Switch to system theme"
        >
          <Monitor className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => setTheme('dark')}
          className={`p-1 rounded transition-colors ${
            theme === 'dark'
              ? 'bg-[#101C2C] text-[#26B8C7] shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
          }`}
          title="Dark theme"
          aria-label="Switch to dark theme"
        >
          <Moon className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className={`inline-flex items-center gap-1 p-1 rounded-lg bg-slate-100 dark:bg-[#172B43] border border-slate-200 dark:border-[#203652] text-xs ${className}`}>
      <button
        onClick={() => setTheme('light')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
          theme === 'light'
            ? 'bg-white text-slate-900 font-semibold shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        aria-label="Light appearance"
      >
        <Sun className="w-3.5 h-3.5 text-amber-500" />
        <span>Light</span>
      </button>

      <button
        onClick={() => setTheme('system')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
          theme === 'system'
            ? 'bg-white dark:bg-[#2676D2] text-slate-900 dark:text-white font-semibold shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        aria-label="System appearance"
      >
        <Monitor className="w-3.5 h-3.5 text-[#2676D2] dark:text-cyan-300" />
        <span>System</span>
      </button>

      <button
        onClick={() => setTheme('dark')}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
          theme === 'dark'
            ? 'bg-[#101C2C] text-white font-semibold shadow-xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
        }`}
        aria-label="Dark appearance"
      >
        <Moon className="w-3.5 h-3.5 text-[#26B8C7]" />
        <span>Dark</span>
      </button>
    </div>
  );
}

