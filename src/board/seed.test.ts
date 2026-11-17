import { describe, expect, it } from 'vitest';
import { isValidDueDate } from './dueDate';
import { validateStoredData } from './schema';
import { createSeedBoard } from './seed';

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

  it('los datos de ejemplo pasan el validador v2', () => {
    expect(validateStoredData({ version: 2, board: createSeedBoard() })).toMatchObject({ ok: true });
  });

  it('todas las tarjetas tienen fecha vacía o una fecha válida', () => {
    for (const card of Object.values(createSeedBoard().cards)) {
      expect(card.dueDate === null || isValidDueDate(card.dueDate)).toBe(true);
    }
  });

  it('devuelven una copia nueva cada vez', () => {
    const a = createSeedBoard();
    a.columns[0]!.title = 'Cambiado';
    expect(createSeedBoard().columns[0]!.title).not.toBe('Cambiado');
  });
});
