import { migrateV1ToV2 } from './migrate';
import { SCHEMA_VERSION, validateStoredData, validateStoredDataV1, type StoredData } from './schema';
import { createSeedBoard } from './seed';
import type { Board } from './types';

/** Clave versionada del esquema actual (v2). Un esquema nuevo usará clonello:v3 y migrará desde esta. */
export const STORAGE_KEY = 'clonello:v2';
/** Copia de lo que había si no se pudo leer, para no perderlo al volver a sembrar. */
export const BACKUP_KEY = 'clonello:v2:respaldo';
/** Clave de la versión 1. Solo se lee para migrar y nunca se borra: queda de respaldo. */
export const STORAGE_KEY_V1 = 'clonello:v1';
/** Copia de unos datos v1 que no se pudieron leer. */
export const BACKUP_KEY_V1 = 'clonello:v1:respaldo';

/** Lo mínimo de localStorage que necesitamos (facilita las pruebas). */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface LoadResult {
  board: Board;
  /**
   * stored: datos del usuario. migrated: datos del usuario traídos de clonello:v1.
   * seeded: primera visita. recovered: había datos ilegibles.
   */
  origin: 'stored' | 'migrated' | 'seeded' | 'recovered';
  problems: string[];
}

/**
 * Carga el tablero. Lee primero clonello:v2. Si no existe, busca clonello:v1, la
 * valida, la migra a v2 y la guarda en clonello:v2 sin borrar la v1. La primera vez
 * (o si no hay localStorage) siembra los datos de ejemplo. Si lo guardado no es
 * válido, lo copia en su clave de respaldo y vuelve a sembrar.
 */
export function loadBoard(storage: StorageLike | null): LoadResult {
  const raw = safeGet(storage, STORAGE_KEY);
  if (raw !== null) {
    const result = parseAndValidate(raw, validateStoredData);
    if (result.ok) return { board: result.data.board, origin: 'stored', problems: [] };
    return recover(storage, BACKUP_KEY, raw, result.errors);
  }

  const rawV1 = safeGet(storage, STORAGE_KEY_V1);
  if (rawV1 !== null) {
    const v1 = parseAndValidate(rawV1, validateStoredDataV1);
    if (!v1.ok) return recover(storage, BACKUP_KEY_V1, rawV1, v1.errors);
    // Se vuelve a validar con el validador v2: si la migración dejara algo mal, mejor respaldar que guardar.
    const v2 = validateStoredData(migrateV1ToV2(v1.data));
    if (!v2.ok) return recover(storage, BACKUP_KEY_V1, rawV1, v2.errors);
    saveBoard(storage, v2.data.board);
    return { board: v2.data.board, origin: 'migrated', problems: [] };
  }

  const board = createSeedBoard();
  saveBoard(storage, board);
  return { board, origin: 'seeded', problems: [] };
}

function parseAndValidate<T>(
  raw: string,
  validate: (data: unknown) => { ok: true; data: T } | { ok: false; errors: string[] },
): { ok: true; data: T } | { ok: false; errors: string[] } {
  try {
    return validate(JSON.parse(raw));
  } catch {
    return { ok: false, errors: ['Los datos guardados no son JSON válido.'] };
  }
}

/** Guarda una copia de lo ilegible y vuelve a sembrar los datos de ejemplo. */
function recover(storage: StorageLike | null, backupKey: string, raw: string, problems: string[]): LoadResult {
  safeSet(storage, backupKey, raw);
  const board = createSeedBoard();
  saveBoard(storage, board);
  return { board, origin: 'recovered', problems };
}

/** Guarda el tablero. Devuelve false si no se pudo (sin almacenamiento, cuota llena…). */
export function saveBoard(storage: StorageLike | null, board: Board): boolean {
  const data: StoredData = { version: SCHEMA_VERSION, board };
  return safeSet(storage, STORAGE_KEY, JSON.stringify(data));
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
