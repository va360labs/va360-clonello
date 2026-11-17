import type { StorageLike } from '../board/storage';

/**
 * Preferencias de la interfaz. No son datos del tablero: van en su propia clave
 * y nunca pasan por src/board/storage.ts (ver docs/memoria.md).
 * El script de index.html lee esta misma clave antes del primer pintado:
 * si cambia el formato, hay que cambiarlo también allí.
 */
export const PREFERENCES_KEY = 'clonello:preferencias';

export const THEMES = ['claro', 'oscuro'] as const;
export type Theme = (typeof THEMES)[number];

/** La primera vez se empieza siempre en claro, el aspecto de marca de VA360. */
export const DEFAULT_THEME: Theme = 'claro';

/** Atributo de <html> que activa los tokens del tema oscuro en tokens.css. */
export const THEME_ATTRIBUTE = 'data-tema';

interface StoredPreferences {
  tema: Theme;
}

/** Lee el tema guardado. Cualquier cosa rara (o sin almacenamiento) da el tema por defecto. */
export function loadTheme(storage: StorageLike | null): Theme {
  if (!storage) return DEFAULT_THEME;
  try {
    const raw = storage.getItem(PREFERENCES_KEY);
    if (raw === null) return DEFAULT_THEME;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed === 'object' && parsed !== null && 'tema' in parsed && isTheme(parsed.tema)) {
      return parsed.tema;
    }
  } catch {
    // JSON roto o almacenamiento bloqueado: se usa el tema por defecto.
  }
  return DEFAULT_THEME;
}

/** Guarda el tema. Devuelve false si no se pudo (sin almacenamiento, cuota llena…). */
export function saveTheme(storage: StorageLike | null, theme: Theme): boolean {
  if (!storage) return false;
  const data: StoredPreferences = { tema: theme };
  try {
    storage.setItem(PREFERENCES_KEY, JSON.stringify(data));
    return true;
  } catch {
    return false;
  }
}

/** Pone el tema en <html> para que se apliquen sus tokens. */
export function applyTheme(theme: Theme, root: HTMLElement = document.documentElement): void {
  root.setAttribute(THEME_ATTRIBUTE, theme);
}

function isTheme(value: unknown): value is Theme {
  return (THEMES as readonly unknown[]).includes(value);
}
