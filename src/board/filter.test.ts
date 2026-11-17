import { describe, expect, it } from 'vitest';
import { filterCards, isSearching } from './filter';
import { createSeedBoard } from './seed';

const board = createSeedBoard();
const allCards = Object.values(board.cards);
const titles = (query: string) => filterCards(allCards, query).map((c) => c.title);

describe('filterCards', () => {
  it('con el texto vacío coinciden todas las tarjetas', () => {
    expect(filterCards(allCards, '')).toEqual(allCards);
    expect(filterCards(allCards, '   ')).toEqual(allCards);
    expect(isSearching('')).toBe(false);
    expect(isSearching('  ')).toBe(false);
    expect(isSearching(' a ')).toBe(true);
  });

  it('encuentra por el título', () => {
    expect(titles('boletín')).toEqual(['Boletín mensual con ofertas']);
  });

  it('encuentra por la descripción', () => {
    expect(titles('Lisboa')).toEqual(['Blog con guías de destinos']);
    expect(board.cards['card-blog']!.title).not.toMatch(/lisboa/i);
  });

  it('no distingue mayúsculas ni tildes', () => {
    expect(titles('LISBOA')).toEqual(titles('Lisboa'));
    expect(titles('boletin')).toEqual(titles('boletín'));
    expect(titles('guias')).toEqual(titles('guías'));
    expect(titles('guias')).toContain('Blog con guías de destinos');
    expect(titles('  Lisboa  ')).toEqual(titles('Lisboa'));
  });

  it('sin coincidencias no devuelve ninguna', () => {
    expect(filterCards(allCards, 'zzz')).toEqual([]);
  });

  it('no cambia las tarjetas que recibe y respeta su orden', () => {
    const copy = structuredClone(allCards);
    const result = filterCards(allCards, 'a');
    expect(allCards).toEqual(copy);
    const order = allCards.filter((c) => result.includes(c));
    expect(result).toEqual(order);
  });
});
