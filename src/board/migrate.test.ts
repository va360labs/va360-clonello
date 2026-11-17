import { describe, expect, it } from 'vitest';
import { migrateV1ToV2 } from './migrate';
import { SCHEMA_VERSION, validateStoredData, validateStoredDataV1 } from './schema';

/** Un tablero tal y como lo guardaba la versión 1 en el navegador de alguien. */
const REAL_V1 = {
  version: 1,
  board: {
    title: 'Mudanza de la oficina',
    labels: [
      { id: 'label-a', name: 'Compras', color: 'naranja' },
      { id: 'label-b', name: 'Urgente', color: 'rojo' },
    ],
    columns: [
      { id: 'col-1', title: 'Pendiente', cardIds: ['card-3', 'card-1'] },
      { id: 'col-2', title: 'Haciendo', cardIds: [] },
      { id: 'col-3', title: 'Hecho', cardIds: ['card-2'] },
    ],
    cards: {
      'card-1': { id: 'card-1', title: 'Pedir cajas', description: 'Unas 40.\nGrandes.', labelIds: ['label-b', 'label-a'] },
      'card-2': { id: 'card-2', title: 'Avisar al casero', description: '', labelIds: [] },
      'card-3': { id: 'card-3', title: 'Contratar «Mudanzas Ñu»', description: 'Tres presupuestos', labelIds: ['label-a'] },
    },
  },
};

describe('migración del formato 1 al 2', () => {
  it('migrateV1ToV2 con un tablero v1 real', () => {
    const v1 = validateStoredDataV1(structuredClone(REAL_V1));
    expect(v1.ok).toBe(true);
    if (!v1.ok) return;

    const v2 = migrateV1ToV2(v1.data);
    expect(v2.version).toBe(SCHEMA_VERSION);
    expect(SCHEMA_VERSION).toBe(2);

    // No se pierde nada: título, etiquetas, columnas y su orden, textos.
    expect(v2.board.title).toBe(REAL_V1.board.title);
    expect(v2.board.labels).toEqual(REAL_V1.board.labels);
    expect(v2.board.columns).toEqual(REAL_V1.board.columns);
    expect(Object.keys(v2.board.cards).sort()).toEqual(['card-1', 'card-2', 'card-3']);
    for (const [id, card] of Object.entries(REAL_V1.board.cards)) {
      expect(v2.board.cards[id]).toEqual({ ...card, dueDate: null });
    }

    expect(validateStoredData(v2).ok).toBe(true);
  });

  it('no modifica los datos v1 que recibe', () => {
    const input = structuredClone(REAL_V1);
    const v1 = validateStoredDataV1(input);
    if (!v1.ok) throw new Error('v1 inválido');
    migrateV1ToV2(v1.data);
    expect(input).toEqual(REAL_V1);
  });

  it('migra un tablero v1 sin columnas', () => {
    const v1 = validateStoredDataV1({ version: 1, board: { title: 'Vacío', labels: [], columns: [], cards: {} } });
    if (!v1.ok) throw new Error('v1 inválido');
    expect(validateStoredData(migrateV1ToV2(v1.data)).ok).toBe(true);
  });
});
