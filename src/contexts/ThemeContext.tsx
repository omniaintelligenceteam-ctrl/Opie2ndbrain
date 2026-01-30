'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Theme, themes, getCSSVariables, darkTheme, lightTheme } from '../styles/themes';

interface ThemeContextType {
  theme: Theme;
  themeName: 'dark' | 'light';
  toggleTheme: () => void;
  setTheme: (name: 'dark' | 'light') => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_KEY = 'opie-theme';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeName, setThemeName] = useState<'dark' | 'light'>('dark');
  const [mounted, setMounted] = useState(false);

  // Load theme from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(THEME_KEY) as 'dark' | 'light' | null;
    if (saved && (saved === 'dark' || saved === 'light')) {
      setThemeName(saved);
    } else {
      // Check system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setThemeName(prefersDark ? 'dark' : 'dark'); // Default to dark
    }
    setMounted(true);
  }, []);

  // Persist theme changes
  useEffect(() => {
    if (mounted) {
      localStorage.setItem(THEME_KEY, themeName);
      // Update color-scheme for native elements
      document.documentElement.style.colorScheme = themeName;
    }
  }, [themeName, mounted]);

  const theme = themeName === 'dark' ? darkTheme : lightTheme;

  const toggleTheme = () => {
    setThemeName((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const setTheme = (name: 'dark' | 'light') => {
    setThemeName(name);
  };

  // Prevent flash by not rendering until mounted
  if (!mounted) {
    return (
      <>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${getCSSVariables(darkTheme)} }` }} />
        {children}
      </>
    );
  }

  return (
    <ThemeContext.Provider value={{ theme, themeName, toggleTheme, setTheme }}>
      <style dangerouslySetInnerHTML={{ __html: `:root { ${getCSSVariables(theme)} }` }} />
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  // Return a default theme during SSR or when provider is missing
  if (!context) {
    return {
      theme: darkTheme,
      themeName: 'dark' as const,
      toggleTheme: () => {},
      setTheme: () => {},
    };
  }
  return context;
}
