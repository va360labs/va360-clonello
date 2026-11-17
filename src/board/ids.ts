/**
 * Genera ids cortos con prefijo legible: col-3f9a1c2b, card-…, label-…, board-…
 * El reducer no genera ids (sería impuro): llegan ya creados en la acción.
 */
export function createId(prefix: 'board' | 'col' | 'card' | 'label'): string {
  const random =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 8)
      : Math.random().toString(16).slice(2, 10);
  return `${prefix}-${random}`;
}
