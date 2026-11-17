/** Quita tildes, mayúsculas y espacios de los extremos: « Revisión » → «revision». */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLocaleLowerCase('es');
}
