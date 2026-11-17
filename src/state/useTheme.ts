import { useEffect, useState } from 'react';
import { browserStorage, loadTheme, saveTheme, type StorageLike, type Theme } from '../board/storage';

/** true si el sistema pide colores oscuros. Sin matchMedia (jsdom, navegadores viejos), false. */
function systemPrefersDark(): boolean {
  try {
    return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false;
  } catch {
    return false;
  }
}

/**
 * Tema de la app. Arranca con lo guardado o, si no hay nada, con el ajuste del
 * sistema. Solo se guarda cuando la persona lo cambia a mano. Lo aplica como
 * data-theme en <html>, que es donde tokens.css cambia la paleta.
 */
export function useTheme(storage?: StorageLike | null) {
  const [store] = useState(() => (storage === undefined ? browserStorage() : storage));
  const [theme, setTheme] = useState<Theme>(() => loadTheme(store, systemPrefersDark()));

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const toggleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(store, next);
  };

  return { theme, toggleTheme };
}
