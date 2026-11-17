import type { StoredData, StoredDataV1 } from './schema';

/** Id fijo del tablero que llega de v1: la migración es pura y no genera ids al azar. */
export const MIGRATED_BOARD_ID = 'board-1';

/**
 * Pasa los datos de la versión 1 (un único tablero) a la versión 2 (lista de
 * tableros): el tablero de siempre pasa a ser el único de la lista y queda
 * abierto. Es pura: no toca la entrada y devuelve una copia que no comparte
 * objetos con ella.
 */
export function migrateV1ToV2(data: StoredDataV1): StoredData {
  const board = structuredClone(data.board);
  return {
    version: 2,
    activeBoardId: MIGRATED_BOARD_ID,
    boards: [{ id: MIGRATED_BOARD_ID, ...board }],
  };
}
