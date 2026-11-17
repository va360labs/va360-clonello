import { describe, expect, it } from 'vitest';
import { TABLERO_V1_JSON } from './fixtures/tableroV1';
import { migrateV1ToV2 } from './migrate';
import { validateStoredData, validateStoredDataV1, type StoredDataV1 } from './schema';

function tableroV1(): StoredDataV1 {
  const result = validateStoredDataV1(JSON.parse(TABLERO_V1_JSON));
  if (!result.ok) throw new Error(result.errors.join(' '));
  return result.data;
}

describe('migración de v1 a v2', () => {
  it('migrateV1ToV2 convierte un tablero v1 real', () => {
    const v1 = tableroV1();
    const v2 = migrateV1ToV2(v1);

    expect(v2.version).toBe(2);
    expect(validateStoredData(v2)).toEqual({ ok: true, data: v2 });

    // Todas las tarjetas quedan sin fecha.
    expect(Object.values(v2.board.cards).every((c) => c.dueDate === null)).toBe(true);

    // Nada más cambia: título, etiquetas, columnas, orden, títulos, descripciones y etiquetas de tarjetas.
    expect(v2.board.title).toBe(v1.board.title);
    expect(v2.board.labels).toEqual(v1.board.labels);
    expect(v2.board.columns).toEqual(v1.board.columns);
    expect(Object.keys(v2.board.cards)).toEqual(Object.keys(v1.board.cards));
    for (const [id, card] of Object.entries(v1.board.cards)) {
      expect(v2.board.cards[id]).toEqual({ ...card, dueDate: null });
    }
  });

  it('no muta los datos v1 de entrada', () => {
    const v1 = tableroV1();
    const copy = structuredClone(v1);
    migrateV1ToV2(v1);
    expect(v1).toEqual(copy);
  });

  it('migra un tablero vacío', () => {
    const v2 = migrateV1ToV2({ version: 1, board: { title: 'Vacío', labels: [], columns: [], cards: {} } });
    expect(validateStoredData(v2).ok).toBe(true);
  });
});
