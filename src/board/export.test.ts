import { describe, expect, it } from 'vitest';
import { CSV_BOM, CSV_SEPARATOR, boardCsvFile, boardToCsv } from './export';
import { createSeedBoard } from './seed';
import type { Board } from './types';

const HEADERS = ['Columna', 'Posición', 'Título', 'Descripción', 'Etiquetas'];

/** Lector de CSV mínimo (RFC 4180 con punto y coma) para comprobar lo generado. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === CSV_SEPARATOR) {
      row.push(field);
      field = '';
    } else if (ch === '\r' && text[i + 1] === '\n') {
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
      i++;
    } else {
      field += ch;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

function smallBoard(): Board {
  return {
    title: 'Pruebas',
    labels: [
      { id: 'l-urg', name: 'Urgente', color: 'rojo' },
      { id: 'l-dis', name: 'Diseño', color: 'morado' },
    ],
    columns: [
      { id: 'c1', title: 'Por hacer', cardIds: ['a', 'b', 'c'] },
      { id: 'c2', title: 'Vacía', cardIds: [] },
      { id: 'c3', title: 'Hecho', cardIds: ['d'] },
    ],
    cards: {
      a: { id: 'a', title: 'Hola, mundo', description: '', labelIds: ['l-urg', 'l-dis'] },
      b: { id: 'b', title: 'Dice "sí"', description: 'Línea uno\nLínea dos', labelIds: [] },
      c: { id: 'c', title: 'Año nuevo', description: 'Sin nada raro', labelIds: ['l-dis'] },
      d: { id: 'd', title: 'Última', description: '', labelIds: [] },
    },
  };
}

describe('exportar el tablero a CSV', () => {
  it('genera una fila de encabezados y una fila por tarjeta', () => {
    const board = createSeedBoard();
    const rows = parseCsv(boardToCsv(board));
    expect(rows[0]).toEqual(HEADERS);
    expect(rows).toHaveLength(1 + Object.keys(board.cards).length);
    for (const row of rows) expect(row).toHaveLength(HEADERS.length);
  });

  it('respeta el orden de columnas y de tarjetas', () => {
    const board = createSeedBoard();
    // Se cambia el orden para no depender de cómo vengan los datos de ejemplo.
    board.columns.reverse();
    board.columns[0]!.cardIds.reverse();
    const expected = board.columns.flatMap((col) =>
      col.cardIds.map((id, i) => [col.title, String(i + 1), board.cards[id]!.title]),
    );
    const rows = parseCsv(boardToCsv(board)).slice(1);
    expect(rows.map((r) => r.slice(0, 3))).toEqual(expected);
  });

  it('pone los nombres de las etiquetas, no sus ids', () => {
    const rows = parseCsv(boardToCsv(smallBoard()));
    const fila = rows.find((r) => r[2] === 'Hola, mundo')!;
    expect(fila[4]).toBe('Urgente, Diseño');
    expect(rows.find((r) => r[2] === 'Año nuevo')![4]).toBe('Diseño');
  });

  it('escapa comas, comillas y saltos de línea', () => {
    const csv = boardToCsv(smallBoard());
    expect(csv).toContain('"Hola, mundo"');
    expect(csv).toContain('"Dice ""sí"""');
    expect(csv).toContain('"Línea uno\nLínea dos"');
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(1 + 4);
    expect(rows[2]).toEqual(['Por hacer', '2', 'Dice "sí"', 'Línea uno\nLínea dos', '']);
  });

  it('neutraliza textos que Excel tomaría por fórmulas', () => {
    const board = smallBoard();
    const peligrosos = ['=SUMA(1;2)', '+34 600', '-1', '@HOY()', '\t=1', '\r=1'];
    board.columns[0]!.cardIds = [];
    board.columns[1]!.cardIds = peligrosos.map((_, i) => `p${i}`);
    peligrosos.forEach((title, i) => {
      board.cards[`p${i}`] = { id: `p${i}`, title, description: '=MAL()', labelIds: [] };
    });
    board.columns[2]!.title = '=Columna';
    board.labels[0]!.name = '@etiqueta';
    board.cards.d!.labelIds = ['l-urg'];
    const rows = parseCsv(boardToCsv(board)).slice(1);
    const celdas = rows.flat();
    for (const celda of celdas) expect(celda).not.toMatch(/^[=+\-@\t\r]/);
    expect(rows.map((r) => r[2])).toEqual([...peligrosos.map((t) => `'${t}`), 'Última']);
    expect(rows[0]![3]).toBe("'=MAL()");
    expect(rows.at(-1)![0]).toBe("'=Columna");
    expect(rows.at(-1)![4]).toBe("'@etiqueta");
  });

  it('una columna vacía no rompe la exportación', () => {
    // Acordado: una columna sin tarjetas no aparece en el archivo (solo hay filas de tarjetas).
    const rows = parseCsv(boardToCsv(smallBoard()));
    expect(rows).toHaveLength(1 + 4);
    expect(rows.map((r) => r[0])).not.toContain('Vacía');
    expect(rows.at(-1)).toEqual(['Hecho', '1', 'Última', '', '']);
  });

  it('no modifica el tablero', () => {
    const board = smallBoard();
    const antes = structuredClone(board);
    boardToCsv(board);
    boardCsvFile(board);
    expect(board).toEqual(antes);
  });

  it('añade la marca BOM para que Excel lea bien las tildes y la ñ', () => {
    const board = smallBoard();
    const file = boardCsvFile(board);
    expect(CSV_BOM).toBe('﻿');
    expect(file.content.startsWith('﻿')).toBe(true);
    expect(file.content.slice(1)).toBe(boardToCsv(board));
    expect(file.name).toBe('clonello-tablero.csv');
    expect(file.type).toMatch(/^text\/csv/);
  });
});
