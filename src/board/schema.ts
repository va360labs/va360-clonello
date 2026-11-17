import { isValidDueDate } from './dueDate';
import { LABEL_COLORS, type Board, type BoardV1 } from './types';

/** Versión del esquema guardado. Cambiarla exige migración (docs/memoria.md). */
export const SCHEMA_VERSION = 2;

/** Lo que se guarda en localStorage: el tablero dentro de un sobre con versión. */
export interface StoredData {
  version: typeof SCHEMA_VERSION;
  board: Board;
}

/** Lo que guardaba la versión 1 (clave clonello:v1). Solo se lee para migrarlo. */
export interface StoredDataV1 {
  version: 1;
  board: BoardV1;
}

type Result<T> = { ok: true; data: T } | { ok: false; errors: string[] };
export type ValidationResult = Result<StoredData>;
export type ValidationResultV1 = Result<StoredDataV1>;

/**
 * Valida a mano (sin dependencias) que un valor leído de localStorage cumple el
 * esquema, incluida la coherencia entre columnas, tarjetas y etiquetas.
 * Los mensajes de error están en español porque pueden acabar en pantalla.
 */
export function validateStoredData(data: unknown): ValidationResult {
  return validate<StoredData>(data, SCHEMA_VERSION);
}

/** Validador del esquema 1, sin fecha límite. Solo para leer clonello:v1 antes de migrar. */
export function validateStoredDataV1(data: unknown): ValidationResultV1 {
  return validate<StoredDataV1>(data, 1);
}

function validate<T>(data: unknown, version: 1 | 2): Result<T> {
  if (!isObject(data)) return fail('Los datos guardados no son un objeto.');
  if (data.version !== version) {
    return fail(`La versión del esquema es ${String(data.version)} y se esperaba ${version}.`);
  }
  if (!isObject(data.board)) return fail('Falta el tablero.');

  const board = data.board;
  const errors: string[] = [];

  if (typeof board.title !== 'string') errors.push('El tablero no tiene un título de texto.');

  // Etiquetas
  const labelIds = new Set<string>();
  if (!Array.isArray(board.labels)) {
    errors.push('Las etiquetas no son una lista.');
  } else {
    board.labels.forEach((label, i) => {
      if (!isObject(label) || !isNonEmptyString(label.id)) {
        errors.push(`La etiqueta ${i} no tiene id.`);
        return;
      }
      if (labelIds.has(label.id)) errors.push(`La etiqueta ${label.id} está repetida.`);
      labelIds.add(label.id);
      if (typeof label.name !== 'string') errors.push(`La etiqueta ${label.id} no tiene nombre.`);
      if (!(LABEL_COLORS as readonly unknown[]).includes(label.color)) {
        errors.push(`La etiqueta ${label.id} tiene un color desconocido: ${String(label.color)}.`);
      }
    });
  }

  // Tarjetas
  const cardIds = new Set<string>();
  if (!isObject(board.cards) || Array.isArray(board.cards)) {
    errors.push('Las tarjetas no son un objeto indexado por id.');
  } else {
    for (const [key, card] of Object.entries(board.cards)) {
      if (!isObject(card)) {
        errors.push(`La tarjeta ${key} no es un objeto.`);
        continue;
      }
      if (card.id !== key) errors.push(`La tarjeta guardada en ${key} dice llamarse ${String(card.id)}.`);
      cardIds.add(key);
      if (typeof card.title !== 'string') errors.push(`La tarjeta ${key} no tiene un título de texto.`);
      if (typeof card.description !== 'string') errors.push(`La tarjeta ${key} no tiene una descripción de texto.`);
      if (version >= 2 && card.dueDate !== null && !isValidDueDate(card.dueDate)) {
        errors.push(`La tarjeta ${key} tiene una fecha límite no válida: ${String(card.dueDate)}. Debe ser AAAA-MM-DD.`);
      }
      if (!isStringArray(card.labelIds)) {
        errors.push(`Las etiquetas de la tarjeta ${key} no son una lista de ids.`);
      } else {
        for (const labelId of card.labelIds) {
          if (!labelIds.has(labelId)) errors.push(`La tarjeta ${key} usa una etiqueta que no existe: ${labelId}.`);
        }
      }
    }
  }

  // Columnas
  const columnIds = new Set<string>();
  const placed = new Map<string, string>();
  if (!Array.isArray(board.columns)) {
    errors.push('Las columnas no son una lista.');
  } else {
    board.columns.forEach((column, i) => {
      if (!isObject(column) || !isNonEmptyString(column.id)) {
        errors.push(`La columna ${i} no tiene id.`);
        return;
      }
      if (columnIds.has(column.id)) errors.push(`La columna ${column.id} está repetida.`);
      columnIds.add(column.id);
      if (typeof column.title !== 'string') errors.push(`La columna ${column.id} no tiene un título de texto.`);
      if (!isStringArray(column.cardIds)) {
        errors.push(`Las tarjetas de la columna ${column.id} no son una lista de ids.`);
        return;
      }
      for (const cardId of column.cardIds) {
        if (!cardIds.has(cardId)) errors.push(`La columna ${column.id} apunta a una tarjeta que no existe: ${cardId}.`);
        const previous = placed.get(cardId);
        if (previous) errors.push(`La tarjeta ${cardId} está en dos columnas: ${previous} y ${column.id}.`);
        placed.set(cardId, column.id);
      }
    });
    for (const cardId of cardIds) {
      if (!placed.has(cardId)) errors.push(`La tarjeta ${cardId} no está en ninguna columna.`);
    }
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: data as unknown as T };
}

function fail(message: string): { ok: false; errors: string[] } {
  return { ok: false, errors: [message] };
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}
