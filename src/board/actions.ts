import { createId } from './ids';
import { STARTER_COLUMN_TITLES, type BoardAction, type WorkspaceAction } from './reducer';
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

/** Tablero nuevo con sus columnas iniciales (ver STARTER_COLUMN_TITLES). */
export const createBoard = (title: string): WorkspaceAction => ({
  type: 'board/create',
  id: createId('board'),
  title,
  columnIds: STARTER_COLUMN_TITLES.map(() => createId('col')),
});
