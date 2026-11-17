import { useCallback, useLayoutEffect, useState } from 'react';
import type { StorageLike } from '../board/storage';
import { applyTheme, loadTheme, saveTheme, type Theme } from './tema';

/** Tema actual y una función para alternarlo. Lo aplica en <html> y lo recuerda. */
export function useTheme(storage: StorageLike | null) {
  const [theme, setTheme] = useState<Theme>(() => loadTheme(storage));

  // Antes del pintado, por si el script de index.html no llegó a aplicarlo.
  useLayoutEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    const next: Theme = theme === 'oscuro' ? 'claro' : 'oscuro';
    setTheme(next);
    saveTheme(storage, next);
  }, [storage, theme]);

  return { theme, toggleTheme };
}
