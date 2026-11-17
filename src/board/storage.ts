import { migrateV1ToV2 } from './migrate';
import {
  SCHEMA_VERSION,
  validateStoredData,
  validateStoredDataV1,
  type StoredData,
  type ValidationResult,
} from './schema';
import { createSeedData } from './seed';
import type { Workspace } from './types';

/** Clave versionada actual: todos los tableros y cuál está abierto. */
export const STORAGE_KEY = 'clonello:v2';
/** Copia de lo que había en STORAGE_KEY si no se pudo leer, para no perderlo al volver a sembrar. */
export const BACKUP_KEY = 'clonello:v2:respaldo';
/** Clave de la versión 1. Solo se lee para migrar; nunca se escribe ni se borra (es el respaldo). */
export const V1_STORAGE_KEY = 'clonello:v1';
/** Copia de lo que había en V1_STORAGE_KEY si no se pudo leer al migrar. */
export const V1_BACKUP_KEY = 'clonello:v1:respaldo';

/** Lo mínimo de localStorage que necesitamos (facilita las pruebas). */
export type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

export interface LoadResult {
  workspace: Workspace;
  /**
   * stored: datos v2 del usuario. migrated: datos v1 pasados a v2. seeded: primera
   * visita. recovered: había datos ilegibles y se cargaron los de ejemplo.
   */
  origin: 'stored' | 'migrated' | 'seeded' | 'recovered';
  problems: string[];
}

/**
 * Carga los tableros. Lee primero clonello:v2; si no existe, migra clonello:v1
 * (sin borrarla); si tampoco existe, siembra los datos de ejemplo. Si lo guardado
 * no es válido, lo copia en su clave de respaldo y vuelve a sembrar.
 */
export function loadWorkspace(storage: StorageLike | null): LoadResult {
  const raw = safeGet(storage, STORAGE_KEY);
  if (raw !== null) {
    const result = parse(raw, validateStoredData);
    if (result.ok) return { workspace: toWorkspace(result.data), origin: 'stored', problems: [] };
    return recover(storage, BACKUP_KEY, raw, result.errors);
  }

  const rawV1 = safeGet(storage, V1_STORAGE_KEY);
  if (rawV1 === null) {
    const workspace = toWorkspace(createSeedData());
    saveWorkspace(storage, workspace);
    return { workspace, origin: 'seeded', problems: [] };
  }

  const v1 = parse(rawV1, validateStoredDataV1);
  if (!v1.ok) return recover(storage, V1_BACKUP_KEY, rawV1, v1.errors);
  const migrated = validateStoredData(migrateV1ToV2(v1.data));
  if (!migrated.ok) return recover(storage, V1_BACKUP_KEY, rawV1, migrated.errors);
  const workspace = toWorkspace(migrated.data);
  saveWorkspace(storage, workspace);
  return { workspace, origin: 'migrated', problems: [] };
}

/** Guarda los tableros. Devuelve false si no se pudo (sin almacenamiento, cuota llena…). */
export function saveWorkspace(storage: StorageLike | null, workspace: Workspace): boolean {
  const data: StoredData = { version: SCHEMA_VERSION, activeBoardId: workspace.activeBoardId, boards: workspace.boards };
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

function parse<T>(raw: string, validate: (data: unknown) => ValidationResult<T>): ValidationResult<T> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { ok: false, errors: ['Los datos guardados no son JSON válido.'] };
  }
  return validate(parsed);
}

/** Copia lo ilegible aparte, siembra los datos de ejemplo y lo guarda en v2. */
function recover(storage: StorageLike | null, backupKey: string, raw: string, problems: string[]): LoadResult {
  safeSet(storage, backupKey, raw);
  const workspace = toWorkspace(createSeedData());
  saveWorkspace(storage, workspace);
  return { workspace, origin: 'recovered', problems };
}

function toWorkspace({ activeBoardId, boards }: StoredData): Workspace {
  return { activeBoardId, boards };
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
