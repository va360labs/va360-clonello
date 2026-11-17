/**
 * Fechas límite de las tarjetas.
 *
 * Una fecha límite es un día del calendario, sin hora ni zona: «AAAA-MM-DD».
 * Nada de aquí lee el reloj: «hoy» llega siempre como parámetro, en el mismo formato.
 */

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const SHORT_MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'] as const;

/** true si es un día real escrito como «AAAA-MM-DD» (rechaza 2026-13-45 o 2026-02-30). */
export function isValidDueDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** Vencida si la fecha es anterior a hoy. El mismo día del vencimiento todavía no lo está. */
export function isOverdue(dueDate: string | null, today: string): boolean {
  return dueDate !== null && dueDate < today;
}

/** El día del calendario local de un instante, como «AAAA-MM-DD». */
export function localDateOf(instant: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${instant.getFullYear()}-${pad(instant.getMonth() + 1)}-${pad(instant.getDate())}`;
}

/** Formato corto en español: «1 dic», y con año si no es el de hoy: «8 ene 2027». */
export function formatDueDate(dueDate: string, today: string): string {
  const [year, month, day] = dueDate.split('-');
  const text = `${Number(day)} ${SHORT_MONTHS[Number(month) - 1] ?? ''}`;
  return year === today.slice(0, 4) ? text : `${text} ${year}`;
}
