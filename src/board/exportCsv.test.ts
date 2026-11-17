import { describe, expect, it } from 'vitest';
import { BOM, CSV_HEADER, boardToCsv, csvFileName } from './exportCsv';
import { createSeedBoard } from './seed';
import type { Board } from './types';

/** Lector CSV mínimo (separador «;», comillas dobles) para comprobar las celdas. */
function parseCsv(text: string): string[][] {
  const body = text.startsWith(BOM) ? text.slice(BOM.length) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < body.length; i++) {
    const ch = body[i];
    if (quoted) {
      if (ch === '"' && body[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === ';') {
      row.push(cell);
      cell = '';
    } else if (ch === '\r' && body[i + 1] === '\n') {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      i++;
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

function tinyBoard(title: string, description = '', labelIds: string[] = []): Board {
  return {
    title: 'Prueba',
    labels: [
      { id: 'l1', name: 'Diseño', color: 'morado' },
      { id: 'l2', name: 'Urgente', color: 'rojo' },
    ],
    columns: [{ id: 'c1', title: 'Por hacer', cardIds: ['k1'] }],
    cards: { k1: { id: 'k1', title, description, labelIds } },
  };
}

describe('boardToCsv', () => {
  it('genera una fila de cabecera y una fila por tarjeta', () => {
    const board = createSeedBoard();
    const rows = parseCsv(boardToCsv(board));
    expect(rows[0]).toEqual(['Columna', 'Tarjeta', 'Descripción', 'Etiquetas']);
    expect(CSV_HEADER).toEqual(['Columna', 'Tarjeta', 'Descripción', 'Etiquetas']);
    expect(rows).toHaveLength(1 + Object.keys(board.cards).length);
    for (const row of rows) expect(row).toHaveLength(4);
  });

  it('respeta el orden de columnas y tarjetas', () => {
    const board = createSeedBoard();
    const [ideas, porHacer] = board.columns;
    ideas!.cardIds.reverse();
    board.columns = [board.columns[3]!, ...board.columns.slice(0, 3)];
    const rows = parseCsv(boardToCsv(board)).slice(1);
    const expected = board.columns.flatMap((col) => col.cardIds.map((id) => [col.title, board.cards[id]!.title]));
    expect(rows.map((r) => [r[0], r[1]])).toEqual(expected);
    expect(rows[0]![0]).toBe('Hecho');
    expect(rows[3]![1]).toBe('Boletín mensual con ofertas');
    expect(porHacer!.title).toBe('Por hacer');
  });

  it('escribe los nombres de las etiquetas, no sus ids', () => {
    const rows = parseCsv(boardToCsv(tinyBoard('Logo', '', ['l1', 'l2'])));
    expect(rows[1]![3]).toBe('Diseño, Urgente');
    expect(rows[1]![3]).not.toContain('l1');
  });

  it('protege separadores, comillas y saltos de línea', () => {
    const titulo = 'Lisboa; Oporto, y el "gran" viaje';
    const descripcion = 'Primera línea\nsegunda línea\r\ntercera';
    const csv = boardToCsv(tinyBoard(titulo, descripcion));
    expect(csv).toContain('"Lisboa; Oporto, y el ""gran"" viaje"');
    const rows = parseCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(['Por hacer', titulo, descripcion, '']);
  });

  it('conserva tildes y eñes para Excel', () => {
    const csv = boardToCsv(tinyBoard('Revisión del diseño', 'Año próximo', ['l1']));
    expect(csv.startsWith('﻿')).toBe(true);
    expect(csv).toContain('Revisión del diseño');
    expect(csv).toContain('Diseño');
    expect(csv).toContain('Año próximo');
  });

  it('neutraliza celdas que Excel tomaría por fórmulas', () => {
    for (const peligroso of ['=SUMA(1;2)', '+34 600', '-1', '@cmd', '\t=1', '\r=1']) {
      const rows = parseCsv(boardToCsv(tinyBoard(peligroso, peligroso)));
      const [, titulo, descripcion] = rows[1]!;
      for (const celda of [titulo!, descripcion!]) {
        expect(celda).not.toMatch(/^[=+\-@\t\r]/);
        expect(celda).toBe(`'${peligroso}`);
      }
    }
    // Un guion en medio no se toca.
    expect(parseCsv(boardToCsv(tinyBoard('Pre-lanzamiento')))[1]![1]).toBe('Pre-lanzamiento');
  });

  it('incluye las columnas vacías', () => {
    const board = createSeedBoard();
    board.columns.splice(1, 0, { id: 'col-vacia', title: 'Revisión', cardIds: [] });
    const rows = parseCsv(boardToCsv(board));
    expect(rows).toHaveLength(1 + Object.keys(board.cards).length + 1);
    expect(rows[4]).toEqual(['Revisión', '', '', '']);

    const vacio: Board = { title: 'Vacío', columns: [], cards: {}, labels: [] };
    expect(parseCsv(boardToCsv(vacio))).toEqual([['Columna', 'Tarjeta', 'Descripción', 'Etiquetas']]);
  });

  it('no modifica el tablero', () => {
    const board = createSeedBoard();
    const copia = structuredClone(board);
    boardToCsv(board);
    expect(board).toEqual(copia);
  });
});

describe('csvFileName', () => {
  it('usa la fecha local de descarga', () => {
    expect(csvFileName(new Date(2026, 10, 7, 23, 30))).toBe('clonello-2026-11-07.csv');
  });
});
