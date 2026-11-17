import { describe, expect, it } from 'vitest';
import { createSeedBoard } from './seed';
import { SCHEMA_VERSION, validateStoredData } from './schema';

describe('datos de ejemplo', () => {
  it('traen 4 columnas y una docena de tarjetas', () => {
    const board = createSeedBoard();
    expect(board.columns).toHaveLength(4);
    const total = board.columns.reduce((sum, c) => sum + c.cardIds.length, 0);
    expect(total).toBe(Object.keys(board.cards).length);
    expect(total).toBeGreaterThanOrEqual(10);
    expect(total).toBeLessThanOrEqual(14);
  });

  it('no dejan ninguna columna vacía y usan etiquetas variadas', () => {
    const board = createSeedBoard();
    for (const column of board.columns) expect(column.cardIds.length).toBeGreaterThan(0);
    const used = new Set(Object.values(board.cards).flatMap((c) => c.labelIds));
    expect(used.size).toBeGreaterThanOrEqual(5);
  });

  it('devuelven una copia nueva cada vez', () => {
    const a = createSeedBoard();
    a.columns[0]!.title = 'Cambiado';
    expect(createSeedBoard().columns[0]!.title).not.toBe('Cambiado');
  });
});

describe('datos de ejemplo con el esquema 2', () => {
  it('son válidos y sus tarjetas nacen sin fecha', () => {
    const board = createSeedBoard();
    expect(validateStoredData({ version: SCHEMA_VERSION, board }).ok).toBe(true);
    for (const card of Object.values(board.cards)) expect(card.dueDate).toBeNull();
  });
});
