import { describe, expect, it } from 'vitest';
import { formatDueDate, isOverdue, isValidDueDate, localDateOf } from './dueDate';

describe('fecha válida', () => {
  it('acepta días reales en formato AAAA-MM-DD', () => {
    expect(isValidDueDate('2026-12-01')).toBe(true);
    expect(isValidDueDate('2028-02-29')).toBe(true);
  });

  it('rechaza lo que no es un día real o no tiene el formato', () => {
    for (const value of ['2026-13-45', '2026-02-30', '2027-02-29', 'mañana', '', '2026-1-5', '2026-12-01T10:00', 20261201, null]) {
      expect(isValidDueDate(value)).toBe(false);
    }
  });
});

describe('vencida', () => {
  const hoy = '2026-11-17';

  it('vencida si la fecha es anterior a hoy', () => {
    expect(isOverdue('2026-11-16', hoy)).toBe(true);
    expect(isOverdue('2025-12-31', hoy)).toBe(true);
  });

  it('no vencida el mismo día que vence', () => {
    expect(isOverdue('2026-11-17', hoy)).toBe(false);
  });

  it('no vencida si es futura', () => {
    expect(isOverdue('2026-11-18', hoy)).toBe(false);
    expect(isOverdue('2027-01-01', hoy)).toBe(false);
  });

  it('sin fecha nunca está vencida', () => {
    expect(isOverdue(null, hoy)).toBe(false);
  });
});

describe('día local', () => {
  it('convierte un instante en el día del calendario local', () => {
    expect(localDateOf(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(localDateOf(new Date(2026, 11, 31, 0, 0))).toBe('2026-12-31');
  });
});

describe('formato corto', () => {
  it('muestra día y mes abreviado en español', () => {
    expect(formatDueDate('2026-12-01', '2026-11-17')).toBe('1 dic');
    expect(formatDueDate('2026-09-15', '2026-11-17')).toBe('15 sept');
  });

  it('añade el año si no es el de hoy', () => {
    expect(formatDueDate('2027-01-08', '2026-11-17')).toBe('8 ene 2027');
  });
});
