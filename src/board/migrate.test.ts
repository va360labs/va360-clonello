import { describe, expect, it } from 'vitest';
import { REAL_V1 } from './fixtures';
import { MIGRATED_BOARD_ID, migrateV1ToV2 } from './migrate';
import { validateStoredData } from './schema';

describe('migración de v1 a v2', () => {
  it('migrateV1ToV2 convierte un tablero v1 real en una lista con ese único tablero abierto', () => {
    const v2 = migrateV1ToV2(REAL_V1);
    expect(v2.version).toBe(2);
    expect(v2.boards).toHaveLength(1);
    expect(v2.activeBoardId).toBe(MIGRATED_BOARD_ID);
    const [board] = v2.boards;
    expect(board).toEqual({ id: MIGRATED_BOARD_ID, ...REAL_V1.board });
    // El orden de columnas, tarjetas y etiquetas se conserva tal cual.
    expect(board!.columns.map((c) => c.id)).toEqual(['col-ideas', 'col-9c0d1e2f']);
    expect(board!.columns[0]!.cardIds).toEqual(['card-grupos', 'card-5e6f7a8b']);
    expect(board!.labels.map((l) => l.id)).toEqual(['label-diseno', 'label-a1b2c3d4']);
    expect(board!.cards['card-5e6f7a8b']!.labelIds).toEqual(['label-a1b2c3d4', 'label-diseno']);
    expect(validateStoredData(v2).ok).toBe(true);
  });

  it('migrateV1ToV2 es pura', () => {
    const before = structuredClone(REAL_V1);
    const a = migrateV1ToV2(REAL_V1);
    const b = migrateV1ToV2(REAL_V1);
    expect(REAL_V1).toEqual(before);
    expect(a).toEqual(b);
    // El resultado no comparte objetos con la entrada: cambiarlo no toca los datos v1.
    a.boards[0]!.columns[0]!.cardIds.pop();
    expect(REAL_V1).toEqual(before);
  });
});
