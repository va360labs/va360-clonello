import { migrateV1ToV2 } from './migrate';
import { SCHEMA_VERSION, validateStoredData, validateStoredDataV1, type StoredData, type ValidationResult } from './schema';
import { createSeedBoard } from './seed';
import type { Board } from './types';

/** Clave del esquema actual (2). Ver la migración en docs/memoria.md. */
export const STORAGE_KEY = 'clonello:v2';
/** Copia de lo que había si no se pudo leer, para no perderlo al volver a sembrar. */
export const BACKUP_KEY = 'clonello:v2:respaldo';
/** Clave del esquema 1. Se lee para migrar y no se borra: queda como respaldo. */
export const LEGACY_STORAGE_KEY = 'clonello:v1';
/** Copia de un tablero v1 que no se pudo leer ni migrar. */
export const LEGACY_BACKUP_KEY = 'clonello:v1:respaldo';

/** Lo mínimo de localStorage que necesitamos (facilita las pruebas). */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface LoadResult {
  board: Board;
  /** stored: datos del usuario. seeded: primera visita. recovered: había datos ilegibles. */
  origin: 'stored' | 'seeded' | 'recovered';
  problems: string[];
}

/**
 * Carga el tablero. Lee primero clonello:v2; si no existe, lee clonello:v1, lo
 * migra al formato 2 y lo guarda en clonello:v2 (sin borrar la v1). Si no hay
 * nada (o no hay localStorage) siembra los datos de ejemplo. Si lo guardado no
 * es válido, lo copia en su clave de respaldo y vuelve a sembrar.
 */
export function loadBoard(storage: StorageLike | null): LoadResult {
  const raw = safeGet(storage, STORAGE_KEY);
  if (raw !== null) return readOrRecover(storage, raw, BACKUP_KEY, validateStoredData);

  const rawV1 = safeGet(storage, LEGACY_STORAGE_KEY);
  if (rawV1 !== null) {
    const result = readOrRecover(storage, rawV1, LEGACY_BACKUP_KEY, migrateFromV1);
    if (result.origin === 'stored') saveBoard(storage, result.board);
    return result;
  }

  const board = createSeedBoard();
  saveBoard(storage, board);
  return { board, origin: 'seeded', problems: [] };
}

/** Valida con el esquema 1, migra y vuelve a validar con el esquema 2. */
function migrateFromV1(data: unknown): ValidationResult {
  const v1 = validateStoredDataV1(data);
  if (!v1.ok) return v1;
  return validateStoredData(migrateV1ToV2(v1.data));
}

function readOrRecover(
  storage: StorageLike | null,
  raw: string,
  backupKey: string,
  read: (data: unknown) => ValidationResult,
): LoadResult {
  let problems: string[];
  try {
    const result = read(JSON.parse(raw));
    if (result.ok) return { board: result.data.board, origin: 'stored', problems: [] };
    problems = result.errors;
  } catch {
    problems = ['Los datos guardados no son JSON válido.'];
  }

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
