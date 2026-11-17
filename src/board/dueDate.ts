/**
 * Fecha límite de una tarjeta: solo día, como texto 'AAAA-MM-DD' (sin hora ni
 * huso horario). Funciones puras: quien necesite «hoy» lo pasa como argumento,
 * así el reducer y las pruebas no dependen del reloj.
 */

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'] as const;

/** true si es un texto 'AAAA-MM-DD' y ese día existe (2026-02-30 no). */
export function isValidDueDate(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = ISO_DATE.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || day < 1) return false;
  // Día 0 del mes siguiente = último día de este mes. En UTC para no depender del huso.
  return day <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * Vencida a partir del día siguiente a la fecha límite: el mismo día todavía no.
 * `today` es 'AAAA-MM-DD'. Las fechas ISO se comparan bien como texto.
 */
export function isOverdue(dueDate: string | null, today: string): boolean {
  return dueDate !== null && dueDate < today;
}

/** El día de un Date en la hora local de quien usa la app, como 'AAAA-MM-DD'. */
export function toIsoDate(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Fecha corta para la tarjeta: «20 nov», o «20 nov 2027» si no es de este año. */
export function formatDueDate(dueDate: string, today: string): string {
  const [year, month, day] = dueDate.split('-');
  const text = `${Number(day)} ${MONTHS[Number(month) - 1] ?? ''}`;
  return year === today.slice(0, 4) ? text : `${text} ${year}`;
}
