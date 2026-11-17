import { describe, expect, it } from 'vitest';
import { cardMatches } from './search';
import { createSeedBoard } from './seed';

const board = createSeedBoard();
const cards = Object.values(board.cards);
const byTitle = (title: string) => cards.find((c) => c.title === title)!;
const matching = (query: string) => cards.filter((c) => cardMatches(c, query)).map((c) => c.title);

describe('cardMatches', () => {
  it('coincide por el título', () => {
    expect(cardMatches(byTitle('Formulario de contacto'), 'contacto')).toBe(true);
    expect(cardMatches(byTitle('Elegir el alojamiento'), 'contacto')).toBe(false);
  });

  it('coincide por la descripción', () => {
    expect(byTitle('Blog con guías de destinos').title).not.toMatch(/Lisboa/);
    expect(cardMatches(byTitle('Blog con guías de destinos'), 'Lisboa')).toBe(true);
    expect(matching('Lisboa')).toEqual(['Blog con guías de destinos']);
  });

  it('no distingue mayúsculas ni tildes', () => {
    const found = matching('GUIA');
    expect(found).toContain('Guía de estilo: colores y tipografías');
    expect(found).toContain('Blog con guías de destinos');
    expect(cardMatches(byTitle('Mapa de páginas de la web'), 'PAGINAS')).toBe(true);
    expect(cardMatches(byTitle('Formulario de contacto'), 'fórmulário')).toBe(true);
  });

  it('una búsqueda vacía o de solo espacios deja ver todas', () => {
    expect(matching('')).toHaveLength(cards.length);
    expect(matching('   ')).toHaveLength(cards.length);
  });

  it('ignora los espacios de los extremos', () => {
    expect(matching('correo').length).toBeGreaterThan(0);
    expect(matching('  correo  ')).toEqual(matching('correo'));
  });

  it('no busca en los nombres de las etiquetas', () => {
    expect(matching('Urgente')).toEqual([]);
  });
});
