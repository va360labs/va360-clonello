import { createId } from './ids';
import type { CsvCardRow } from './csv';
import type { BoardAction } from './reducer';
import type { LabelColor } from './types';

/**
 * Creadores de acciones que necesitan un id nuevo. La UI los usa para no
 * generar ids a mano; las pruebas del reducer pasan ids fijos directamente.
 */
export const addColumn = (title: string): BoardAction => ({
  type: 'column/add',
  id: createId('col'),
  title,
});

export const addCard = (columnId: string, title: string): BoardAction => ({
  type: 'card/add',
  id: createId('card'),
  columnId,
  title,
});

export const addLabel = (name: string, color: LabelColor): BoardAction => ({
  type: 'label/add',
  id: createId('label'),
  name,
  color,
});

/** Tarjetas leídas de un CSV, cada una con su id nuevo. Ver `cards/import`. */
export const importCards = (
  rows: readonly Pick<CsvCardRow, 'title' | 'description' | 'column'>[],
  defaultColumnId: string,
): BoardAction => ({
  type: 'cards/import',
  defaultColumnId,
  cards: rows.map(({ title, description, column }) => ({ id: createId('card'), title, description, column })),
});
