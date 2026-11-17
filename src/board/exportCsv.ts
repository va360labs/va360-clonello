import type { Board } from './types';

/**
 * Exportación del tablero a CSV para abrirlo en Excel o LibreOffice.
 *
 * Función pura de lectura: no modifica el tablero ni toca localStorage. La
 * descarga (Blob y enlace) la hace la interfaz. Ver docs/memoria.md.
 */

/** Marca de orden de bytes UTF-8: sin ella Excel lee las tildes como basura. */
export const BOM = '﻿';

/** Punto y coma: Excel en español usa la coma como decimal y abre así cada dato en su celda. */
export const CSV_SEPARATOR = ';';

/** Fin de línea de CSV (RFC 4180). */
const EOL = '\r\n';

export const CSV_HEADER = ['Columna', 'Tarjeta', 'Descripción', 'Etiquetas'] as const;

export const CSV_MIME = 'text/csv;charset=utf-8';

/** Caracteres iniciales que Excel o LibreOffice interpretan como fórmula. */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Prepara un texto como celda: neutraliza fórmulas y entrecomilla si hace falta. */
function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return /[";\r\n,]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

function row(values: readonly string[]): string {
  return values.map(cell).join(CSV_SEPARATOR);
}

/**
 * Devuelve el CSV del tablero: una fila de cabecera y una fila por tarjeta, en
 * el orden de la pantalla. Una columna sin tarjetas sale como una fila con su
 * nombre y el resto de celdas en blanco.
 */
export function boardToCsv(board: Board): string {
  const labelNames = new Map(board.labels.map((l) => [l.id, l.name]));
  const lines = [row(CSV_HEADER)];
  for (const column of board.columns) {
    if (column.cardIds.length === 0) {
      lines.push(row([column.title, '', '', '']));
      continue;
    }
    for (const id of column.cardIds) {
      const card = board.cards[id];
      if (!card) continue;
      const labels = card.labelIds.flatMap((labelId) => labelNames.get(labelId) ?? []).join(', ');
      lines.push(row([column.title, card.title, card.description, labels]));
    }
  }
  return BOM + lines.join(EOL) + EOL;
}

/** Nombre del archivo con la fecha local de descarga, p. ej. «clonello-2026-11-17.csv». */
export function csvFileName(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `clonello-${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}.csv`;
}
