import type { Board } from './types';

/**
 * Exportar el tablero a CSV para abrirlo en Excel o LibreOffice.
 *
 * Funciones puras: solo leen el tablero. Formato acordado (ver docs/memoria.md):
 * punto y coma como separador (lo que espera Excel en español), fin de línea CRLF,
 * marca BOM UTF-8 para que se lean bien las tildes y la ñ, una fila por tarjeta en
 * el orden de la pantalla y las columnas sin tarjetas no aparecen.
 */

export const CSV_SEPARATOR = ';';
export const CSV_BOM = '﻿';
export const CSV_FILE_NAME = 'clonello-tablero.csv';
export const CSV_MIME_TYPE = 'text/csv;charset=utf-8';

const HEADERS = ['Columna', 'Posición', 'Título', 'Descripción', 'Etiquetas'];

/** Caracteres con los que Excel empieza a leer una fórmula (o los que la esconden). */
const FORMULA_START = /^[=+\-@\t\r]/;

/** Prepara un texto para una celda: evita fórmulas y entrecomilla si hace falta. */
function cell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  // Se entrecomilla también con coma para que LibreOffice no se confunda si elige otro separador.
  return /[";,\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Convierte el tablero en texto CSV (sin BOM): encabezados y una fila por tarjeta. */
export function boardToCsv(board: Board): string {
  const labelNames = new Map(board.labels.map((l) => [l.id, l.name]));
  const rows: string[][] = [HEADERS];
  for (const column of board.columns) {
    column.cardIds.forEach((id, index) => {
      const card = board.cards[id];
      if (!card) return;
      const labels = card.labelIds.flatMap((labelId) => labelNames.get(labelId) ?? []);
      rows.push([column.title, String(index + 1), card.title, card.description, labels.join(', ')]);
    });
  }
  return rows.map((row) => row.map(cell).join(CSV_SEPARATOR)).join('\r\n') + '\r\n';
}

/** Lo que se descarga: nombre, tipo y contenido con BOM para Excel. */
export function boardCsvFile(board: Board): { name: string; type: string; content: string } {
  return { name: CSV_FILE_NAME, type: CSV_MIME_TYPE, content: CSV_BOM + boardToCsv(board) };
}
