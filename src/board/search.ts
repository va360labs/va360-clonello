import type { Card } from './types';

/**
 * Búsqueda de tarjetas. Es solo una forma de ver el tablero: no cambia ni guarda datos.
 * Se busca en el título y la descripción (no en las etiquetas), sin distinguir
 * mayúsculas ni tildes y sin tener en cuenta los espacios de los extremos.
 */

/** Texto en minúsculas y sin tildes ni diéresis, para comparar. */
export function normalizeForSearch(text: string): string {
  return text.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase();
}

/** ¿Hay algo que buscar? Vacío o solo espacios equivale a no buscar. */
export function isActiveSearch(query: string): boolean {
  return query.trim() !== '';
}

/** ¿La tarjeta coincide con lo buscado? Con una búsqueda vacía, todas coinciden. */
export function cardMatches(card: Card, query: string): boolean {
  const needle = normalizeForSearch(query.trim());
  if (!needle) return true;
  return normalizeForSearch(card.title).includes(needle) || normalizeForSearch(card.description).includes(needle);
}
