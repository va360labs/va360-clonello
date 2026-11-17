import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_ROWS, decodeCsvBytes, parseCardsCsv, type CsvParseResult } from './csv';

const rowsOf = (result: CsvParseResult) => {
  if (!result.ok) throw new Error(`Se esperaba un CSV válido: ${result.error}`);
  return result.rows;
};

describe('lector de CSV de tarjetas', () => {
  it('lee un CSV con cabecera titulo,descripcion,columna', () => {
    const result = parseCardsCsv('titulo,descripcion,columna\nComprar dominio,Mirar precios,Por hacer\nLogo,,Ideas\n');
    expect(result).toEqual({
      ok: true,
      discarded: 0,
      rows: [
        { title: 'Comprar dominio', description: 'Mirar precios', column: 'Por hacer' },
        { title: 'Logo', description: '', column: 'Ideas' },
      ],
    });
  });

  it('respeta comillas, comas y saltos de línea dentro de un campo', () => {
    const csv = 'titulo,descripcion\n"Hola, mundo","Dice ""hola""\nen dos líneas"\nOtra,"Con ; punto y coma"';
    expect(rowsOf(parseCardsCsv(csv))).toEqual([
      { title: 'Hola, mundo', description: 'Dice "hola"\nen dos líneas', column: '' },
      { title: 'Otra', description: 'Con ; punto y coma', column: '' },
    ]);
  });

  it('acepta punto y coma como separador', () => {
    const conComas = parseCardsCsv('titulo,descripcion,columna\nUno,Algo,Ideas\nDos,"Tres, cuatro",Hecho');
    const conPuntoYComa = parseCardsCsv('titulo;descripcion;columna\nUno;Algo;Ideas\nDos;Tres, cuatro;Hecho');
    expect(conPuntoYComa).toEqual(conComas);
    expect(rowsOf(conPuntoYComa)).toHaveLength(2);
  });

  it('acepta finales de línea CRLF y la marca BOM inicial', () => {
    const limpio = parseCardsCsv('titulo;descripcion\nDiseño;Año nuevo\nCañón;"Línea 1\nLínea 2"\n');
    const windows = parseCardsCsv('﻿titulo;descripcion\r\nDiseño;Año nuevo\r\nCañón;"Línea 1\r\nLínea 2"\r\n');
    expect(windows).toEqual(limpio);
    expect(rowsOf(windows)[0]).toEqual({ title: 'Diseño', description: 'Año nuevo', column: '' });
  });

  it('ignora las filas vacías y las filas sin título', () => {
    const result = parseCardsCsv('titulo;descripcion\r\n\r\nUno;\r\n;;\r\n  ;Sin título\r\nDos;\r\n;Tampoco\r\n\r\n');
    expect(result).toEqual({
      ok: true,
      discarded: 2,
      rows: [
        { title: 'Uno', description: '', column: '' },
        { title: 'Dos', description: '', column: '' },
      ],
    });
  });

  it('la cabecera admite mayúsculas, tildes y los nombres en inglés', () => {
    for (const header of ['Título,Descripción,Columna', ' TITULO , DESCRIPCION , COLUMNA ', 'title,description,column']) {
      expect(rowsOf(parseCardsCsv(`${header}\nUno,Algo,Ideas`))).toEqual([
        { title: 'Uno', description: 'Algo', column: 'Ideas' },
      ]);
    }
  });

  it('ignora las columnas que no conoce', () => {
    expect(rowsOf(parseCardsCsv('id,titulo,precio\n7,Uno,"1,20"'))).toEqual([
      { title: 'Uno', description: '', column: '' },
    ]);
  });

  it('un archivo sin columna de título da un error en español', () => {
    expect(parseCardsCsv('nombre;precio\nCafé;1,20\n')).toEqual({
      ok: false,
      error: 'El archivo no tiene una columna «titulo».',
    });
  });

  it('un archivo vacío o solo con la cabecera da un error', () => {
    expect(parseCardsCsv('')).toEqual({ ok: false, error: 'El archivo está vacío.' });
    expect(parseCardsCsv('﻿\r\n\r\n')).toEqual({ ok: false, error: 'El archivo está vacío.' });
    expect(parseCardsCsv('titulo,descripcion\n')).toEqual({ ok: false, error: 'El archivo no tiene filas de tarjetas.' });
  });

  it('unas comillas sin cerrar dan un error', () => {
    const result = parseCardsCsv('titulo\n"Uno\nDos');
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(/comillas/);
  });

  it(`rechaza archivos de más de ${MAX_IMPORT_ROWS} tarjetas`, () => {
    const lines = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `Tarjeta ${i}`);
    const result = parseCardsCsv(`titulo\n${lines.join('\n')}`);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toMatch(String(MAX_IMPORT_ROWS));
    expect(rowsOf(parseCardsCsv(`titulo\n${lines.slice(1).join('\n')}`))).toHaveLength(MAX_IMPORT_ROWS);
  });

  it('lee UTF-8 con o sin BOM y, si no lo es, el formato antiguo de Excel', () => {
    const utf8 = new TextEncoder().encode('titulo\nDiseño');
    expect(decodeCsvBytes(utf8)).toBe('titulo\nDiseño');
    expect(decodeCsvBytes(new Uint8Array([0xef, 0xbb, 0xbf, ...utf8]))).toBe('titulo\nDiseño');
    // «Diseño» guardado por un Excel antiguo (Windows-1252): la ñ es el byte 0xF1.
    const antiguo = new Uint8Array([...new TextEncoder().encode('titulo\nDise'), 0xf1, 0x6f]);
    expect(decodeCsvBytes(antiguo)).toBe('titulo\nDiseño');
  });
});
