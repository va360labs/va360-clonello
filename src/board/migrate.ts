import { SCHEMA_VERSION, type StoredData, type StoredDataV1 } from './schema';
import type { Card } from './types';

/**
 * Pasa un tablero del formato 1 al 2. Pura: no muta la entrada.
 * Todo se conserva tal cual y cada tarjeta pasa a tener `dueDate: null`.
 * Recibe datos ya validados con validateStoredDataV1.
 */
export function migrateV1ToV2(data: StoredDataV1): StoredData {
  const { board } = data;
  const cards: Record<string, Card> = {};
  for (const [id, card] of Object.entries(board.cards)) {
    cards[id] = { ...card, labelIds: [...card.labelIds], dueDate: null };
  }
  return {
    version: SCHEMA_VERSION,
    board: {
      ...board,
      labels: board.labels.map((label) => ({ ...label })),
      columns: board.columns.map((column) => ({ ...column, cardIds: [...column.cardIds] })),
      cards,
    },
  };
}
