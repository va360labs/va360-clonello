/**
 * Lector de CSV para importar tarjetas. Puro y sin dependencias: recibe el texto
 * del archivo y devuelve las filas válidas, los problemas de cada fila y, si el
 * archivo entero no sirve, un error. Los textos están en español porque se
 * enseñan tal cual en la interfaz. Ver docs/memoria.md («Importar tarjetas»).
 */

/** Límite de tarjetas por archivo, para no colgar el navegador ni llenar el almacenamiento. */
export const MAX_IMPORT_ROWS = 500;

export interface CsvCardRow {
  /** Número de fila en la hoja de cálculo (la cabecera es la fila 1). */
  row: number;
  title: string;
  description: string;
  /** Nombre de la columna del tablero tal y como viene en el archivo ('' si no trae). */
  column: string;
}

export interface CsvParseResult {
  rows: CsvCardRow[];
  /** Filas que se saltan, explicadas en español con su número de fila. */
  problems: string[];
  /** Números de las filas que se saltan. */
  skippedRows: number[];
  /** Si existe, el archivo no se puede importar y `rows` viene vacío. */
  error?: string;
}

const HEADERS = { title: 'titulo', description: 'descripcion', column: 'columna' } as const;

/** Quita mayúsculas, tildes y espacios de los extremos: «Título» → «titulo». */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLocaleLowerCase('es');
}

/**
 * Convierte los bytes del archivo en texto. Primero UTF-8; si no lo es, el
 * formato de los Excel antiguos en español (Windows-1252), para que las tildes
 * no salgan rotas.
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
  const fail = (error: string): CsvParseResult => ({ rows: [], problems: [], skippedRows: [], error });

  const records = splitRecords(clean, detectDelimiter(clean));
  if (!records) return fail('No se ha podido leer el archivo: hay unas comillas sin cerrar.');

  // Cada registro guarda su número de fila; las filas vacías no cuentan como datos.
  const numbered = records
    .map((fields, index) => ({ fields, row: index + 1 }))
    .filter(({ fields }) => fields.some((f) => f.trim() !== ''));
  const [header, ...data] = numbered;
  if (!header) return fail('El archivo está vacío.');

  const names = header.fields.map(normalizeName);
  const titleAt = names.indexOf(HEADERS.title);
  if (titleAt === -1) {
    return fail(
      'El archivo no tiene una columna «titulo». La primera fila debe llevar los nombres de las columnas: titulo y, si quieres, descripcion y columna.',
    );
  }
  const descriptionAt = names.indexOf(HEADERS.description);
  const columnAt = names.indexOf(HEADERS.column);
  const cell = (fields: string[], at: number) => (at === -1 ? '' : (fields[at] ?? ''));

  const rows: CsvCardRow[] = [];
  const problems: string[] = [];
  const skippedRows: number[] = [];
  for (const { fields, row } of data) {
    const title = cell(fields, titleAt).trim();
    if (!title) {
      problems.push(`Fila ${row}: no tiene título.`);
      skippedRows.push(row);
      continue;
    }
    rows.push({
      row,
      title,
      description: cell(fields, descriptionAt).trim(),
      column: cell(fields, columnAt).trim(),
    });
  }

  if (rows.length > MAX_IMPORT_ROWS) {
    return fail(`El archivo tiene ${rows.length} tarjetas y el máximo son ${MAX_IMPORT_ROWS}. Divídelo en varios.`);
  }
  if (rows.length === 0 && problems.length === 0) {
    return fail('El archivo no tiene ninguna tarjeta: solo trae la fila de los nombres de las columnas.');
  }
  return { rows, problems, skippedRows };
}

/** Punto y coma si la primera línea tiene más «;» que «,» (CSV de Excel en español); si no, coma. */
function detectDelimiter(text: string): ',' | ';' {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? '';
  const count = (char: string) => firstLine.split(char).length - 1;
  return count(';') > count(',') ? ';' : ',';
}

/**
 * Parte el texto en registros y campos según RFC 4180: comillas dobles para
 * campos con separadores o saltos de línea y "" para unas comillas literales.
 * Devuelve null si quedan comillas sin cerrar.
 */
function splitRecords(text: string, delimiter: string): string[][] | null {
  const records: string[][] = [];
  let fields: string[] = [];
  let field = '';
  let quoted = false;
  let i = 0;

  while (i < text.length) {
    const char = text[i]!;
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        quoted = false;
      } else if (!(char === '\r' && text[i + 1] === '\n')) {
        // Dentro de un campo, el salto de línea de Windows queda como uno normal.
        field += char;
      }
      i += 1;
      continue;
    }

    if (char === '"' && field === '') {
      quoted = true;
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
    i += 1;
  }

  if (quoted) return null;
  if (field !== '' || fields.length > 0) {
    fields.push(field);
    records.push(fields);
  }
  return records;
}
