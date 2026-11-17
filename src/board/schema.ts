import { LABEL_COLORS, type Board, type Workspace } from './types';

/** Versión del esquema guardado. Cambiarla exige migración (docs/memoria.md). */
export const SCHEMA_VERSION = 2;

/** Formato de la versión 1 (clave clonello:v1): un único tablero. Se lee para migrar. */
export interface StoredDataV1 {
  version: 1;
  board: Board;
}

/** Lo que se guarda en localStorage: todos los tableros dentro de un sobre con versión. */
export interface StoredData extends Workspace {
  version: typeof SCHEMA_VERSION;
}

export type ValidationResult<T> = { ok: true; data: T } | { ok: false; errors: string[] };

/**
 * Valida a mano (sin dependencias) que un valor leído de localStorage cumple el
 * esquema v2: la lista de tableros, que no esté vacía, ids únicos, que el
 * tablero abierto exista y que cada tablero sea coherente por dentro.
 * Los mensajes de error están en español porque pueden acabar en pantalla.
 */
export function validateStoredData(data: unknown): ValidationResult<StoredData> {
  if (!isObject(data)) return fail('Los datos guardados no son un objeto.');
  if (data.version !== SCHEMA_VERSION) {
    return fail(`La versión del esquema es ${String(data.version)} y se esperaba ${SCHEMA_VERSION}.`);
  }
  if (!Array.isArray(data.boards)) return fail('Los tableros no son una lista.');
  if (data.boards.length === 0) return fail('Tiene que haber al menos un tablero.');

  const errors: string[] = [];
  const boardIds = new Set<string>();
  data.boards.forEach((board: unknown, i) => {
    if (!isObject(board) || !isNonEmptyString(board.id)) {
      errors.push(`El tablero ${i} no tiene id.`);
      return;
    }
    if (boardIds.has(board.id)) errors.push(`El tablero ${board.id} está repetido.`);
    boardIds.add(board.id);
    for (const error of validateBoard(board)) errors.push(`Tablero ${board.id}: ${error}`);
  });

  if (!isNonEmptyString(data.activeBoardId)) {
    errors.push('No se sabe qué tablero estaba abierto.');
  } else if (!boardIds.has(data.activeBoardId)) {
    errors.push(`El tablero abierto no existe: ${data.activeBoardId}.`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: data as unknown as StoredData };
}

/**
 * Validador de la versión 1. Se conserva para leer clonello:v1 y migrarlo
 * (ver migrate.ts). No lo cambies: describe datos que ya están en navegadores.
 */
export function validateStoredDataV1(data: unknown): ValidationResult<StoredDataV1> {
  if (!isObject(data)) return fail('Los datos guardados no son un objeto.');
  if (data.version !== 1) {
    return fail(`La versión del esquema es ${String(data.version)} y se esperaba 1.`);
  }
  if (!isObject(data.board)) return fail('Falta el tablero.');
  const errors = validateBoard(data.board);
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: data as unknown as StoredDataV1 };
}

/** Coherencia de un tablero por dentro: columnas, tarjetas y etiquetas. Igual en v1 y v2. */
function validateBoard(board: Record<string, unknown>): string[] {
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

  return errors;
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
