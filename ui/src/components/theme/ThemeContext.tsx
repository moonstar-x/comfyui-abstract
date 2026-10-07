import type { Nullable } from '@core/utils/types';
import { createContext, use, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Context, FC, ReactNode } from 'react';

// Keep in sync with the inline script in index.html that applies the theme before first paint.
const STORAGE_KEY = 'comfyui-abstract-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export type Theme = 'dark' | 'light' | 'system';
export type ResolvedTheme = Exclude<Theme, 'system'>;

const THEMES: ReadonlySet<unknown> = new Set<Theme>(['dark', 'light', 'system']);

const isTheme = (value: unknown): value is Theme => THEMES.has(value);

const readStoredTheme = (): Theme => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return isTheme(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

const subscribeToSystemTheme = (onChange: () => void): () => void => {
  const query = matchMedia(DARK_QUERY);
  query.addEventListener('change', onChange);
  return () => {
    query.removeEventListener('change', onChange);
  };
};

const getSystemTheme = (): ResolvedTheme => matchMedia(DARK_QUERY).matches ? 'dark' : 'light';

interface ContextValue {
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  theme: Theme;
}

const ThemeContext: Context<Nullable<ContextValue>> = createContext<Nullable<ContextValue>>(null);

interface Props {
  children: ReactNode;
}

export const ThemeProvider: FC<Props> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>(readStoredTheme);
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme);
  const resolvedTheme = theme === 'system' ? systemTheme : theme;

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolvedTheme === 'dark');
    root.style.colorScheme = resolvedTheme;
  }, [resolvedTheme]);

  const updateTheme = useCallback((next: Theme) => {
    setTheme(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies for this session.
    }
  }, []);

  const context = useMemo<ContextValue>(() => ({
    resolvedTheme,
    setTheme: updateTheme,
    theme
  }), [resolvedTheme, theme, updateTheme]);

  return (
    <ThemeContext value={context}>
      {children}
    </ThemeContext>
  );
};

export const useTheme = (): ContextValue => {
  const context = use(ThemeContext);
  if (context === null) {
    throw new Error('You must call useTheme inside of a ThemeProvider.');
  }

  return context;
};
