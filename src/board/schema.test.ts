import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, validateStoredData, validateStoredDataV1 } from './schema';
import { createSeedBoard } from './seed';
import type { Board } from './types';

function stored(board: unknown, version: unknown = SCHEMA_VERSION) {
  return { version, board };
}

function validBoard(): Board {
  return {
    title: 'Tablero',
    labels: [{ id: 'l-1', name: 'Diseño', color: 'morado' }],
    columns: [
      { id: 'c-a', title: 'Por hacer', cardIds: ['k-1'] },
      { id: 'c-b', title: 'Hecho', cardIds: [] },
    ],
    cards: { 'k-1': { id: 'k-1', title: 'Uno', description: '', labelIds: ['l-1'], dueDate: null } },
  };
}

function errorsOf(data: unknown): string[] {
  const result = validateStoredData(data);
  return result.ok ? [] : result.errors;
}

describe('validación del esquema', () => {
  it('acepta un tablero correcto y los datos de ejemplo', () => {
    expect(validateStoredData(stored(validBoard())).ok).toBe(true);
    expect(validateStoredData(stored(createSeedBoard())).ok).toBe(true);
  });

  it('acepta un tablero sin columnas', () => {
    expect(validateStoredData(stored({ title: 'Vacío', labels: [], columns: [], cards: {} })).ok).toBe(true);
  });

  it('rechaza lo que no es un objeto o no trae tablero', () => {
    expect(errorsOf(null)).not.toEqual([]);
    expect(errorsOf('texto')).not.toEqual([]);
    expect(errorsOf({ version: SCHEMA_VERSION })).not.toEqual([]);
  });

  it('rechaza la versión 1 en el validador v2', () => {
    expect(SCHEMA_VERSION).toBe(2);
    expect(errorsOf(stored(validBoard(), 1))).toEqual([expect.stringContaining('versión')]);
    expect(errorsOf(stored(validBoard(), 3))).toEqual([expect.stringContaining('versión')]);
  });

  it('acepta un tablero v2 con fechas válidas y con tarjetas sin fecha', () => {
    const board = validBoard();
    board.cards['k-1']!.dueDate = '2026-12-01';
    board.cards['k-2'] = { id: 'k-2', title: 'Dos', description: '', labelIds: [], dueDate: null };
    board.columns[1]!.cardIds.push('k-2');
    expect(validateStoredData(stored(board)).ok).toBe(true);
  });

  it('rechaza una fecha con formato inválido, con un mensaje en español', () => {
    for (const dueDate of ['2026-13-45', 'mañana', '01/12/2026', '', 20261201]) {
      const board = validBoard() as unknown as { cards: Record<string, { dueDate: unknown }> };
      board.cards['k-1']!.dueDate = dueDate;
      expect(errorsOf(stored(board))).toEqual([expect.stringMatching(/La tarjeta k-1 tiene una fecha límite no válida/)]);
    }
  });

  it('rechaza una tarjeta v2 sin el campo de fecha', () => {
    const board = validBoard() as unknown as { cards: Record<string, { dueDate?: unknown }> };
    delete board.cards['k-1']!.dueDate;
    expect(errorsOf(stored(board)).join(' ')).toContain('fecha límite');
  });

  it('detecta campos con el tipo equivocado', () => {
    const board = validBoard() as unknown as { columns: { title: unknown }[] };
    board.columns[0]!.title = 42;
    expect(errorsOf(stored(board)).join(' ')).toContain('título');
  });

  it('detecta una tarjeta que no existe en una columna', () => {
    const board = validBoard();
    board.columns[1]!.cardIds.push('fantasma');
    expect(errorsOf(stored(board)).join(' ')).toContain('fantasma');
  });

  it('detecta una tarjeta repetida en dos columnas', () => {
    const board = validBoard();
    board.columns[1]!.cardIds.push('k-1');
    expect(errorsOf(stored(board)).join(' ')).toContain('k-1');
  });

  it('detecta tarjetas huérfanas que no están en ninguna columna', () => {
    const board = validBoard();
    board.cards['k-2'] = { id: 'k-2', title: 'Sola', description: '', labelIds: [], dueDate: null };
    expect(errorsOf(stored(board)).join(' ')).toContain('k-2');
  });

  it('detecta etiquetas que no existen y colores desconocidos', () => {
    const board = validBoard();
    board.cards['k-1']!.labelIds.push('l-x');
    (board.labels[0] as { color: string }).color = 'fucsia';
    const errors = errorsOf(stored(board)).join(' ');
    expect(errors).toContain('l-x');
    expect(errors).toContain('fucsia');
  });

  it('detecta ids de columna repetidos y claves de tarjeta que no coinciden con su id', () => {
    const board = validBoard();
    board.columns[1]!.id = 'c-a';
    board.cards['k-1']!.id = 'otro';
    const errors = errorsOf(stored(board)).join(' ');
    expect(errors).toContain('c-a');
    expect(errors).toContain('otro');
  });
});

describe('validación del esquema v1 (para migrar)', () => {
  function v1Board() {
    return {
      title: 'Tablero',
      labels: [{ id: 'l-1', name: 'Diseño', color: 'morado' }],
      columns: [{ id: 'c-a', title: 'Por hacer', cardIds: ['k-1'] }],
      cards: { 'k-1': { id: 'k-1', title: 'Uno', description: '', labelIds: ['l-1'] } },
    };
  }

  it('acepta un tablero v1 sin fechas', () => {
    expect(validateStoredDataV1({ version: 1, board: v1Board() }).ok).toBe(true);
  });

  it('rechaza la versión 2 y los tableros v1 incoherentes', () => {
    expect(validateStoredDataV1({ version: 2, board: v1Board() }).ok).toBe(false);
    const broken = v1Board();
    broken.columns[0]!.cardIds.push('fantasma');
    expect(validateStoredDataV1({ version: 1, board: broken }).ok).toBe(false);
  });
});
