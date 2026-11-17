import { describe, expect, it } from 'vitest';
import { formatDueDate, isOverdue, isValidDueDate, toIsoDate } from './dueDate';

describe('fecha límite', () => {
  const today = '2026-11-17';

  it('está vencida', () => {
    expect(isOverdue('2026-11-16', today)).toBe(true);
    expect(isOverdue('2026-11-17', today)).toBe(false);
    expect(isOverdue('2026-11-18', today)).toBe(false);
    expect(isOverdue(null, today)).toBe(false);
  });

  it('compara bien entre meses y años', () => {
    expect(isOverdue('2025-12-31', '2026-01-01')).toBe(true);
    expect(isOverdue('2026-10-30', '2026-11-01')).toBe(true);
    expect(isOverdue('2027-01-01', '2026-12-31')).toBe(false);
  });

  it('solo acepta fechas AAAA-MM-DD que existen', () => {
    expect(isValidDueDate('2026-11-20')).toBe(true);
    expect(isValidDueDate('2028-02-29')).toBe(true);
    expect(isValidDueDate('2026-02-30')).toBe(false);
    expect(isValidDueDate('2026-13-01')).toBe(false);
    expect(isValidDueDate('2026-1-5')).toBe(false);
    expect(isValidDueDate('20/11/2026')).toBe(false);
    expect(isValidDueDate('')).toBe(false);
    expect(isValidDueDate(20261120)).toBe(false);
  });

  it('convierte un Date a AAAA-MM-DD con la hora local', () => {
    expect(toIsoDate(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toIsoDate(new Date(2026, 10, 17, 0, 1))).toBe('2026-11-17');
  });

  it('muestra la fecha corta y añade el año si no es el actual', () => {
    expect(formatDueDate('2026-11-20', today)).toBe('20 nov');
    expect(formatDueDate('2026-01-03', today)).toBe('3 ene');
    expect(formatDueDate('2027-09-01', today)).toBe('1 sep 2027');
  });
});
