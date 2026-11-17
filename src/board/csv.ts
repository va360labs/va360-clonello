/**
 * Lector de CSV para importar tarjetas. Puro y sin dependencias: recibe el texto
 * del archivo y devuelve las filas con título o un error en español, que se
 * enseña tal cual en la interfaz. Ver docs/memoria.md («Importar tarjetas»).
 */
import { normalizeName } from './text';

/** Máximo de tarjetas por archivo, para no llenar el almacenamiento del navegador. */
export const MAX_IMPORT_ROWS = 500;
/** Tamaño máximo del archivo: de sobra para 500 tarjetas. */
export const MAX_IMPORT_BYTES = 1024 * 1024;

export interface CsvCardRow {
  title: string;
  description: string;
  /** Nombre de la columna del tablero tal y como viene en el archivo ('' si no trae). */
  column: string;
}

export type CsvParseResult =
  | {
      ok: true;
      rows: CsvCardRow[];
      /** Filas con algo escrito pero sin título. Las filas en blanco no cuentan. */
      discarded: number;
    }
  | { ok: false; error: string };

/** Nombres aceptados en la cabecera, ya normalizados (sin tildes ni mayúsculas). */
const HEADERS = {
  title: ['titulo', 'title'],
  description: ['descripcion', 'description'],
  column: ['columna', 'column'],
} as const;

/**
 * Convierte los bytes del archivo en texto. Primero UTF-8 (con o sin BOM); si no
 * lo es, Windows-1252, el formato de los Excel antiguos en español, para que las
 * tildes y eñes no salgan rotas.
 */
export function decodeCsvBytes(bytes: Uint8Array): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder('windows-1252').decode(bytes);
  }
}

export function parseCardsCsv(text: string): CsvParseResult {
  const clean = text.replace(/^﻿/, '');
  const records = splitRecords(clean, detectDelimiter(clean));
  if (!records) return { ok: false, error: 'No se pudo leer el archivo: hay unas comillas sin cerrar.' };

  const filled = records.filter((fields) => fields.some((f) => f.trim() !== ''));
  const [header, ...data] = filled;
  if (!header) return { ok: false, error: 'El archivo está vacío.' };

  const names = header.map(normalizeName);
  const find = (accepted: readonly string[]) => names.findIndex((n) => accepted.includes(n));
  const titleAt = find(HEADERS.title);
  if (titleAt === -1) return { ok: false, error: 'El archivo no tiene una columna «titulo».' };
  if (data.length === 0) return { ok: false, error: 'El archivo no tiene filas de tarjetas.' };
  const descriptionAt = find(HEADERS.description);
  const columnAt = find(HEADERS.column);
  const cell = (fields: string[], at: number) => (at === -1 ? '' : (fields[at] ?? '').trim());

  const rows: CsvCardRow[] = [];
  let discarded = 0;
  for (const fields of data) {
    const title = cell(fields, titleAt);
    if (!title) {
      discarded += 1;
      continue;
    }
    rows.push({ title, description: cell(fields, descriptionAt), column: cell(fields, columnAt) });
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      error: `El archivo tiene ${rows.length} tarjetas y el máximo son ${MAX_IMPORT_ROWS}. Divídelo en varios.`,
    };
  }
  return { ok: true, rows, discarded };
}

/** Punto y coma si la cabecera tiene más «;» que «,» (CSV de Excel en español); si no, coma. */
function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const count = (char: string) => firstLine.split(char).length - 1;
  return count(';') > count(',') ? ';' : ',';
}

/**
 * Parte el texto en registros y campos según RFC 4180: comillas dobles para los
 * campos con separadores o saltos de línea, y "" para una comilla literal. Los
 * saltos de línea de Windows (CRLF) cuentan como uno solo, también dentro de un
 * campo. Devuelve null si quedan comillas sin cerrar.
 */
function splitRecords(text: string, delimiter: string): string[][] | null {
  const records: string[][] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else if (char === '\r' && text[i + 1] === '\n') {
        // Se queda solo el \n.
      } else {
        field += char;
      }
    } else if (char === '"' && field.trim() === '') {
      quoted = true;
      field = '';
    } else if (char === delimiter) {
      fields.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      fields.push(field);
      records.push(fields);
      fields = [];
      field = '';
      if (char === '\r' && text[i + 1] === '\n') i += 1;
    } else {
      field += char;
    }
  }

  if (quoted) return null;
  if (field !== '' || fields.length > 0) {
    fields.push(field);
    records.push(fields);
  }
  return records;
}
