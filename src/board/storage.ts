import { SCHEMA_VERSION, validateStoredData, type StoredData } from './schema';
import { createSeedBoard } from './seed';
import type { Board } from './types';

/** Clave versionada: un esquema nuevo usará clonello:v2 y migrará desde esta. */
export const STORAGE_KEY = 'clonello:v1';
/** Copia de lo que había si no se pudo leer, para no perderlo al volver a sembrar. */
export const BACKUP_KEY = 'clonello:v1:respaldo';

/**
 * Preferencia de tema (claro u oscuro). Va en su propia clave, separada del
 * tablero: no forma parte de su esquema y leerla o guardarla nunca toca clonello:v1.
 */
export const THEME_KEY = 'clonello:tema';

export type Theme = 'light' | 'dark';

/** Lo mínimo de localStorage que necesitamos (facilita las pruebas). */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface LoadResult {
  board: Board;
  /** stored: datos del usuario. seeded: primera visita. recovered: había datos ilegibles. */
  origin: 'stored' | 'seeded' | 'recovered';
  problems: string[];
}

/**
 * Carga el tablero. La primera vez (o si no hay localStorage) siembra los datos
 * de ejemplo. Si lo guardado no es válido, lo copia en BACKUP_KEY y vuelve a sembrar.
 */
export function loadBoard(storage: StorageLike | null): LoadResult {
  const raw = safeGet(storage, STORAGE_KEY);

  if (raw === null) {
    const board = createSeedBoard();
    saveBoard(storage, board);
    return { board, origin: 'seeded', problems: [] };
  }

  let parsed: unknown;
  let problems: string[];
  try {
    parsed = JSON.parse(raw);
    const result = validateStoredData(parsed);
    if (result.ok) return { board: result.data.board, origin: 'stored', problems: [] };
    problems = result.errors;
  } catch {
    problems = ['Los datos guardados no son JSON válido.'];
  }

  safeSet(storage, BACKUP_KEY, raw);
  const board = createSeedBoard();
  saveBoard(storage, board);
  return { board, origin: 'recovered', problems };
}

/** Guarda el tablero. Devuelve false si no se pudo (sin almacenamiento, cuota llena…). */
export function saveBoard(storage: StorageLike | null, board: Board): boolean {
  const data: StoredData = { version: SCHEMA_VERSION, board };
  return safeSet(storage, STORAGE_KEY, JSON.stringify(data));
}

/**
 * Lee el tema guardado. Si no hay (o es un valor raro, o no hay localStorage),
 * usa el del sistema: oscuro si systemPrefersDark, claro si no.
 */
export function loadTheme(storage: StorageLike | null, systemPrefersDark = false): Theme {
  const raw = safeGet(storage, THEME_KEY);
  if (raw === 'light' || raw === 'dark') return raw;
  return systemPrefersDark ? 'dark' : 'light';
}

/** Guarda el tema elegido. Devuelve false si no se pudo. */
export function saveTheme(storage: StorageLike | null, theme: Theme): boolean {
  return safeSet(storage, THEME_KEY, theme);
}

/** localStorage del navegador, o null si está bloqueado o no existe. */
export function browserStorage(): StorageLike | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

function safeGet(storage: StorageLike | null, key: string): string | null {
  if (!storage) return null;
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(storage: StorageLike | null, key: string, value: string): boolean {
  if (!storage) return false;
  try {
    storage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
