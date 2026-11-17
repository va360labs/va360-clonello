import type { StoredData, StoredDataV1 } from './schema';

/**
 * Pasa unos datos v1 (ya validados) a v2: todo queda igual y cada tarjeta
 * recibe `dueDate: null`. Es pura: no muta la entrada ni lee el reloj.
 */
export function migrateV1ToV2(data: StoredDataV1): StoredData {
  const { board } = data;
  return {
    version: 2,
    board: {
      title: board.title,
      labels: board.labels.map((label) => ({ ...label })),
      columns: board.columns.map((column) => ({ ...column, cardIds: [...column.cardIds] })),
      cards: Object.fromEntries(
        Object.entries(board.cards).map(([id, card]) => [
          id,
          { ...card, labelIds: [...card.labelIds], dueDate: null },
        ]),
      ),
    },
  };
}
