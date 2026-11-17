import { describe, expect, it } from 'vitest';
import { SCHEMA_VERSION, validateStoredData, validateStoredDataV1 } from './schema';
import { createSeedBoard, createSeedData } from './seed';
import type { Board, BoardEntry } from './types';
import { REAL_V1 } from './fixtures';

function stored(board: unknown, version: unknown = 1) {
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
    cards: { 'k-1': { id: 'k-1', title: 'Uno', description: '', labelIds: ['l-1'] } },
  };
}

function errorsOf(data: unknown): string[] {
  const result = validateStoredDataV1(data);
  return result.ok ? [] : result.errors;
}

describe('validación del esquema v1', () => {
  it('acepta un tablero correcto y los datos de ejemplo', () => {
    expect(validateStoredDataV1(stored(validBoard())).ok).toBe(true);
    expect(validateStoredDataV1(stored(createSeedBoard())).ok).toBe(true);
  });

  it('acepta un tablero sin columnas', () => {
    expect(validateStoredDataV1(stored({ title: 'Vacío', labels: [], columns: [], cards: {} })).ok).toBe(true);
  });

  it('rechaza lo que no es un objeto o no trae tablero', () => {
    expect(errorsOf(null)).not.toEqual([]);
    expect(errorsOf('texto')).not.toEqual([]);
    expect(errorsOf({ version: 1 })).not.toEqual([]);
  });

  it('rechaza otra versión del esquema', () => {
    expect(errorsOf(stored(validBoard(), 2))).toEqual([
      expect.stringContaining('versión'),
    ]);
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
    board.cards['k-2'] = { id: 'k-2', title: 'Sola', description: '', labelIds: [] };
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

describe('el validador v1 se conserva', () => {
  it('el validador v1 sigue aceptando un tablero v1 real', () => {
    expect(validateStoredDataV1(REAL_V1).ok).toBe(true);
    expect(validateStoredData(REAL_V1).ok).toBe(false);
  });
});

describe('validación del esquema v2', () => {
  const entry = (id: string, title = 'Tablero'): BoardEntry => ({ ...validBoard(), id, title });
  const v2 = (boards: unknown, activeBoardId: unknown = 'b-1') => ({ version: 2, activeBoardId, boards });
  const errorsV2 = (data: unknown) => {
    const result = validateStoredData(data);
    return result.ok ? [] : result.errors;
  };

  it('la versión actual del esquema es la 2', () => {
    expect(SCHEMA_VERSION).toBe(2);
  });

  it('valida unos datos v2 con varios tableros', () => {
    const result = validateStoredData(v2([entry('b-1', 'Uno'), entry('b-2', 'Dos')], 'b-2'));
    expect(result.ok).toBe(true);
    expect(validateStoredData(createSeedData()).ok).toBe(true);
  });

  it('rechaza datos v2 incoherentes', () => {
    expect(errorsV2(v2([entry('b-1'), entry('b-1')])).join(' ')).toMatch(/b-1.*repetido/);
    expect(errorsV2(v2([])).join(' ')).toContain('Tiene que haber al menos un tablero');
    expect(errorsV2(v2([entry('b-1'), entry('b-2')], 'b-9')).join(' ')).toContain('El tablero abierto no existe: b-9');
    expect(errorsV2(v2('nada')).join(' ')).toContain('no son una lista');
    expect(errorsV2(v2([{ ...entry('b-1'), id: '' }])).join(' ')).toContain('no tiene id');
    expect(errorsV2({ version: 1, boards: [entry('b-1')], activeBoardId: 'b-1' })).toEqual([
      expect.stringContaining('versión'),
    ]);
  });

  it('revisa el contenido de cada tablero y dice cuál falla', () => {
    const roto = entry('b-2');
    roto.columns[1]!.cardIds.push('fantasma');
    const errors = errorsV2(v2([entry('b-1'), roto])).join(' ');
    expect(errors).toContain('b-2');
    expect(errors).toContain('fantasma');
  });
});
