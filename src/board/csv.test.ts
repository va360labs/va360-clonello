import { describe, expect, it } from 'vitest';
import { MAX_IMPORT_ROWS, decodeCsvBytes, parseCardsCsv } from './csv';

describe('lector de CSV de tarjetas', () => {
  it('lee un CSV sencillo con cabecera', () => {
    const result = parseCardsCsv('titulo,descripcion,columna\nComprar dominio,Mirar precios,Por hacer\nLogo,,Ideas\n');
    expect(result.error).toBeUndefined();
    expect(result.problems).toEqual([]);
    expect(result.rows).toEqual([
      { row: 2, title: 'Comprar dominio', description: 'Mirar precios', column: 'Por hacer' },
      { row: 3, title: 'Logo', description: '', column: 'Ideas' },
    ]);
  });

  it('acepta punto y coma como separador', () => {
    const conComas = parseCardsCsv('titulo,descripcion,columna\nUno,Algo,Ideas\nDos,Otra cosa,Hecho');
    const conPuntoYComa = parseCardsCsv('titulo;descripcion;columna\nUno;Algo;Ideas\nDos;Otra cosa;Hecho');
    expect(conPuntoYComa).toEqual(conComas);
    expect(conPuntoYComa.rows).toHaveLength(2);
  });

  it('respeta comillas, comas y saltos de línea dentro de un campo', () => {
    const csv = 'titulo,descripcion\n"Hola, ""mundo""","Primera línea\nSegunda línea"\nOtra,"Con ; punto y coma"';
    const result = parseCardsCsv(csv);
    expect(result.rows).toEqual([
      { row: 2, title: 'Hola, "mundo"', description: 'Primera línea\nSegunda línea', column: '' },
      { row: 3, title: 'Otra', description: 'Con ; punto y coma', column: '' },
    ]);
  });

  it('ignora líneas vacías, el BOM y los saltos de línea de Windows', () => {
    const limpio = parseCardsCsv('titulo;columna\nUno;Ideas\nDos;Hecho');
    const sucio = parseCardsCsv('﻿titulo;columna\r\n\r\nUno;Ideas\r\n;\r\n\r\nDos;Hecho\r\n\r\n');
    expect(sucio.error).toBeUndefined();
    expect(sucio.problems).toEqual([]);
    expect(sucio.rows.map(({ title, column }) => ({ title, column }))).toEqual(
      limpio.rows.map(({ title, column }) => ({ title, column })),
    );
  });

  it('la cabecera no distingue mayúsculas ni tildes', () => {
    for (const header of ['Título', 'TITULO', 'titulo', ' TÍTULO ']) {
      const result = parseCardsCsv(`${header},Descripción,Columna\nUno,Algo,Ideas`);
      expect(result.rows).toEqual([{ row: 2, title: 'Uno', description: 'Algo', column: 'Ideas' }]);
    }
  });

  it('avisa de las filas sin título', () => {
    const result = parseCardsCsv('titulo,descripcion\nUno,\n   ,Sin título\nTres,');
    expect(result.rows.map((r) => r.title)).toEqual(['Uno', 'Tres']);
    expect(result.problems).toEqual(['Fila 3: no tiene título.']);
  });

  it('rechaza un archivo sin columna de título', () => {
    const result = parseCardsCsv('nombre,descripcion\nUno,Algo');
    expect(result.rows).toEqual([]);
    expect(result.error).toMatch(/columna «titulo»/);
  });

  it('rechaza un archivo vacío o solo con la cabecera', () => {
    expect(parseCardsCsv('').error).toBe('El archivo está vacío.');
    expect(parseCardsCsv('﻿\r\n\r\n').error).toBe('El archivo está vacío.');
    const soloCabecera = parseCardsCsv('titulo,descripcion\n');
    expect(soloCabecera.rows).toEqual([]);
    expect(soloCabecera.error).toMatch(/no tiene ninguna tarjeta/);
  });

  it('rechaza unas comillas sin cerrar', () => {
    const result = parseCardsCsv('titulo\n"Uno\nDos');
    expect(result.rows).toEqual([]);
    expect(result.error).toMatch(/comillas/);
  });

  it(`rechaza archivos de más de ${MAX_IMPORT_ROWS} tarjetas`, () => {
    const lines = Array.from({ length: MAX_IMPORT_ROWS + 1 }, (_, i) => `Tarjeta ${i}`);
    const result = parseCardsCsv(`titulo\n${lines.join('\n')}`);
    expect(result.rows).toEqual([]);
    expect(result.error).toMatch(String(MAX_IMPORT_ROWS));
  });

  it('lee UTF-8 y, si no lo es, el formato antiguo de Excel (Windows-1252)', () => {
    const utf8 = new TextEncoder().encode('titulo\nDiseño');
    expect(decodeCsvBytes(utf8)).toBe('titulo\nDiseño');
    // «Diseño» guardado por un Excel antiguo: la ñ es el byte 0xF1.
    const latin = new Uint8Array([...new TextEncoder().encode('titulo\nDise'), 0xf1, 0x6f]);
    expect(decodeCsvBytes(latin)).toBe('titulo\nDiseño');
  });
});
