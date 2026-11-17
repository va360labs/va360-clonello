import { describe, expect, it } from 'vitest';
import { boardReducer, findColumnOfCard, type ImportedCard } from './reducer';
import { SCHEMA_VERSION, validateStoredData } from './schema';
import type { Board } from './types';

/** Tablero pequeño y predecible para las pruebas. */
function makeBoard(): Board {
  return {
    title: 'Pruebas',
    labels: [
      { id: 'l-1', name: 'Diseño', color: 'morado' },
      { id: 'l-2', name: 'Urgente', color: 'rojo' },
    ],
    columns: [
      { id: 'c-a', title: 'Por hacer', cardIds: ['k-1', 'k-2', 'k-3'] },
      { id: 'c-b', title: 'En curso', cardIds: ['k-4'] },
      { id: 'c-c', title: 'Hecho', cardIds: [] },
    ],
    cards: {
      'k-1': { id: 'k-1', title: 'Uno', description: '', labelIds: ['l-1'] },
      'k-2': { id: 'k-2', title: 'Dos', description: 'Detalle', labelIds: [] },
      'k-3': { id: 'k-3', title: 'Tres', description: '', labelIds: [] },
      'k-4': { id: 'k-4', title: 'Cuatro', description: '', labelIds: ['l-2'] },
    },
  };
}

const ids = (board: Board) => board.columns.map((c) => c.id);
const cardIdsOf = (board: Board, columnId: string) =>
  board.columns.find((c) => c.id === columnId)?.cardIds;

describe('columnas', () => {
  it('crea una columna al final con el título recortado', () => {
    const next = boardReducer(makeBoard(), { type: 'column/add', id: 'c-n', title: '  Ideas  ' });
    expect(ids(next)).toEqual(['c-a', 'c-b', 'c-c', 'c-n']);
    expect(next.columns[3]).toEqual({ id: 'c-n', title: 'Ideas', cardIds: [] });
  });

  it('no crea columnas sin título ni con un id repetido', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'column/add', id: 'c-n', title: '   ' })).toBe(board);
    expect(boardReducer(board, { type: 'column/add', id: 'c-a', title: 'Otra' })).toBe(board);
  });

  it('renombra una columna', () => {
    const next = boardReducer(makeBoard(), { type: 'column/rename', columnId: 'c-b', title: 'Haciendo' });
    expect(next.columns[1]?.title).toBe('Haciendo');
  });

  it('ignora un renombrado vacío o de una columna que no existe', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'column/rename', columnId: 'c-b', title: ' ' })).toBe(board);
    expect(boardReducer(board, { type: 'column/rename', columnId: 'nada', title: 'X' })).toBe(board);
  });

  it('borra una columna junto con sus tarjetas', () => {
    const next = boardReducer(makeBoard(), { type: 'column/delete', columnId: 'c-a' });
    expect(ids(next)).toEqual(['c-b', 'c-c']);
    expect(Object.keys(next.cards)).toEqual(['k-4']);
  });

  it('reordena columnas', () => {
    const next = boardReducer(makeBoard(), { type: 'column/move', columnId: 'c-c', toIndex: 0 });
    expect(ids(next)).toEqual(['c-c', 'c-a', 'c-b']);
  });

  it('limita el índice de destino al rango válido', () => {
    const next = boardReducer(makeBoard(), { type: 'column/move', columnId: 'c-a', toIndex: 99 });
    expect(ids(next)).toEqual(['c-b', 'c-c', 'c-a']);
  });

  it('no cambia nada si la columna ya está en su sitio', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'column/move', columnId: 'c-b', toIndex: 1 })).toBe(board);
  });
});

describe('tarjetas', () => {
  it('crea una tarjeta al final de su columna', () => {
    const next = boardReducer(makeBoard(), {
      type: 'card/add',
      id: 'k-n',
      columnId: 'c-c',
      title: ' Publicar ',
    });
    expect(cardIdsOf(next, 'c-c')).toEqual(['k-n']);
    expect(next.cards['k-n']).toEqual({ id: 'k-n', title: 'Publicar', description: '', labelIds: [] });
  });

  it('no crea tarjetas sin título, en columnas que no existen ni con id repetido', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'card/add', id: 'k-n', columnId: 'c-a', title: '' })).toBe(board);
    expect(boardReducer(board, { type: 'card/add', id: 'k-n', columnId: 'nada', title: 'X' })).toBe(board);
    expect(boardReducer(board, { type: 'card/add', id: 'k-1', columnId: 'c-a', title: 'X' })).toBe(board);
  });

  it('actualiza título y descripción', () => {
    const next = boardReducer(makeBoard(), {
      type: 'card/update',
      cardId: 'k-2',
      changes: { title: 'Dos bis', description: 'Nuevo detalle' },
    });
    expect(next.cards['k-2']).toMatchObject({ title: 'Dos bis', description: 'Nuevo detalle' });
  });

  it('mantiene el título anterior si llega vacío', () => {
    const next = boardReducer(makeBoard(), {
      type: 'card/update',
      cardId: 'k-2',
      changes: { title: '  ', description: 'Solo cambia esto' },
    });
    expect(next.cards['k-2']).toMatchObject({ title: 'Dos', description: 'Solo cambia esto' });
  });

  it('borra una tarjeta y la quita de su columna', () => {
    const next = boardReducer(makeBoard(), { type: 'card/delete', cardId: 'k-2' });
    expect(next.cards['k-2']).toBeUndefined();
    expect(cardIdsOf(next, 'c-a')).toEqual(['k-1', 'k-3']);
  });

  it('reordena dentro de la misma columna', () => {
    const next = boardReducer(makeBoard(), { type: 'card/move', cardId: 'k-1', toColumnId: 'c-a', toIndex: 2 });
    expect(cardIdsOf(next, 'c-a')).toEqual(['k-2', 'k-3', 'k-1']);
  });

  it('mueve una tarjeta a otra columna en la posición pedida', () => {
    const next = boardReducer(makeBoard(), { type: 'card/move', cardId: 'k-2', toColumnId: 'c-b', toIndex: 0 });
    expect(cardIdsOf(next, 'c-a')).toEqual(['k-1', 'k-3']);
    expect(cardIdsOf(next, 'c-b')).toEqual(['k-2', 'k-4']);
  });

  it('mueve una tarjeta a una columna vacía', () => {
    const next = boardReducer(makeBoard(), { type: 'card/move', cardId: 'k-4', toColumnId: 'c-c', toIndex: 5 });
    expect(cardIdsOf(next, 'c-b')).toEqual([]);
    expect(cardIdsOf(next, 'c-c')).toEqual(['k-4']);
  });

  it('ignora movimientos de tarjetas o hacia columnas que no existen', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'card/move', cardId: 'nada', toColumnId: 'c-b', toIndex: 0 })).toBe(board);
    expect(boardReducer(board, { type: 'card/move', cardId: 'k-1', toColumnId: 'nada', toIndex: 0 })).toBe(board);
    expect(boardReducer(board, { type: 'card/move', cardId: 'k-1', toColumnId: 'c-a', toIndex: 0 })).toBe(board);
  });

  it('localiza la columna de una tarjeta', () => {
    expect(findColumnOfCard(makeBoard(), 'k-4')?.id).toBe('c-b');
    expect(findColumnOfCard(makeBoard(), 'nada')).toBeUndefined();
  });
});

describe('etiquetas', () => {
  it('pone y quita una etiqueta de una tarjeta', () => {
    const on = boardReducer(makeBoard(), { type: 'card/toggleLabel', cardId: 'k-2', labelId: 'l-2' });
    expect(on.cards['k-2']?.labelIds).toEqual(['l-2']);
    const off = boardReducer(on, { type: 'card/toggleLabel', cardId: 'k-2', labelId: 'l-2' });
    expect(off.cards['k-2']?.labelIds).toEqual([]);
  });

  it('no pone etiquetas que no existen', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'card/toggleLabel', cardId: 'k-2', labelId: 'nada' })).toBe(board);
  });

  it('crea una etiqueta nueva en el tablero', () => {
    const next = boardReducer(makeBoard(), { type: 'label/add', id: 'l-n', name: ' Legal ', color: 'gris' });
    expect(next.labels.at(-1)).toEqual({ id: 'l-n', name: 'Legal', color: 'gris' });
  });

  it('no crea etiquetas sin nombre o con un nombre que ya existe', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'label/add', id: 'l-n', name: ' ', color: 'gris' })).toBe(board);
    expect(boardReducer(board, { type: 'label/add', id: 'l-n', name: 'diseño', color: 'gris' })).toBe(board);
  });
});

describe('importar tarjetas', () => {
  const imported = (id: string, title: string, column = '', description = ''): ImportedCard => ({
    id,
    title,
    description,
    column,
  });

  it('cards/import añade las tarjetas al final de su columna en el orden del archivo', () => {
    const next = boardReducer(makeBoard(), {
      type: 'cards/import',
      cards: [
        imported('n-1', '  Primera  ', 'En curso', 'Con detalle'),
        imported('n-2', 'Segunda', 'hecho'),
        imported('n-3', 'Tercera', ' EN CURSO '),
      ],
    });
    expect(cardIdsOf(next, 'c-a')).toEqual(['k-1', 'k-2', 'k-3']);
    expect(cardIdsOf(next, 'c-b')).toEqual(['k-4', 'n-1', 'n-3']);
    expect(cardIdsOf(next, 'c-c')).toEqual(['n-2']);
    expect(next.cards['n-1']).toEqual({ id: 'n-1', title: 'Primera', description: 'Con detalle', labelIds: [] });
    expect(next.cards['k-4']).toEqual(makeBoard().cards['k-4']);
    expect(validateStoredData({ version: SCHEMA_VERSION, board: next })).toMatchObject({ ok: true });
  });

  it('cards/import reconoce la columna sin tildes', () => {
    const board = { ...makeBoard(), columns: [...makeBoard().columns, { id: 'c-d', title: 'Revisión', cardIds: [] }] };
    const next = boardReducer(board, { type: 'cards/import', cards: [imported('n-1', 'Uno', 'revision')] });
    expect(cardIdsOf(next, 'c-d')).toEqual(['n-1']);
  });

  it('cards/import pone en la primera columna las filas sin columna o con una columna que no existe', () => {
    const next = boardReducer(makeBoard(), {
      type: 'cards/import',
      cards: [imported('n-1', 'Sin columna'), imported('n-2', 'Columna rara', 'Archivado')],
    });
    expect(next.columns.map((c) => c.title)).toEqual(['Por hacer', 'En curso', 'Hecho']);
    expect(cardIdsOf(next, 'c-a')).toEqual(['k-1', 'k-2', 'k-3', 'n-1', 'n-2']);
    expect(validateStoredData({ version: SCHEMA_VERSION, board: next })).toMatchObject({ ok: true });
  });

  it('cards/import sin tarjetas válidas devuelve el mismo tablero', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'cards/import', cards: [] })).toBe(board);
    expect(boardReducer(board, { type: 'cards/import', cards: [imported('n-1', '   ')] })).toBe(board);
    const sinColumnas: Board = { ...board, columns: [], cards: {} };
    expect(boardReducer(sinColumnas, { type: 'cards/import', cards: [imported('n-1', 'Uno')] })).toBe(sinColumnas);
  });

  it('cards/import salta las filas sin título y crea las demás', () => {
    const next = boardReducer(makeBoard(), {
      type: 'cards/import',
      cards: [imported('n-1', ' '), imported('n-2', 'Buena')],
    });
    expect(cardIdsOf(next, 'c-a')).toEqual(['k-1', 'k-2', 'k-3', 'n-2']);
    expect(next.cards['n-1']).toBeUndefined();
  });

  it('cards/import no pisa tarjetas existentes si un id ya existe', () => {
    const board = makeBoard();
    expect(boardReducer(board, { type: 'cards/import', cards: [imported('n-1', 'Nueva'), imported('k-2', 'Pisa')] })).toBe(
      board,
    );
    expect(
      boardReducer(board, { type: 'cards/import', cards: [imported('n-1', 'Una'), imported('n-1', 'Repetida')] }),
    ).toBe(board);
  });

  it('cards/import no muta el tablero de entrada', () => {
    const board = makeBoard();
    const copy = structuredClone(board);
    boardReducer(board, { type: 'cards/import', cards: [imported('n-1', 'Uno', 'Hecho'), imported('n-2', 'Dos')] });
    expect(board).toEqual(copy);
  });
});

describe('pureza', () => {
  it('nunca muta el tablero de entrada', () => {
    const board = makeBoard();
    const copy = structuredClone(board);
    boardReducer(board, { type: 'card/move', cardId: 'k-1', toColumnId: 'c-b', toIndex: 0 });
    boardReducer(board, { type: 'column/delete', columnId: 'c-a' });
    boardReducer(board, { type: 'card/toggleLabel', cardId: 'k-1', labelId: 'l-2' });
    boardReducer(board, { type: 'card/update', cardId: 'k-1', changes: { title: 'Otro' } });
    expect(board).toEqual(copy);
  });

  it('sustituye el tablero entero con board/replace', () => {
    const other = { ...makeBoard(), title: 'Otro' };
    expect(boardReducer(makeBoard(), { type: 'board/replace', board: other })).toBe(other);
  });
});
