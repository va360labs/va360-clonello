import { describe, expect, it } from 'vitest';
import { STORAGE_KEY } from '../board/storage';
import { DEFAULT_THEME, PREFERENCES_KEY, loadTheme, saveTheme } from './tema';

/** Almacenamiento en memoria, como en las pruebas de src/board/storage.test.ts. */
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
  };
}

describe('preferencia de tema', () => {
  it('sin nada guardado devuelve el tema por defecto', () => {
    expect(DEFAULT_THEME).toBe('claro');
    expect(loadTheme(memoryStorage())).toBe('claro');
  });

  it('guarda y recupera el tema oscuro', () => {
    const storage = memoryStorage();
    saveTheme(storage, 'oscuro');
    expect(loadTheme(storage)).toBe('oscuro');
    expect(PREFERENCES_KEY).toBe('clonello:preferencias');
    expect(PREFERENCES_KEY).not.toBe(STORAGE_KEY);
    expect([...storage.data.keys()]).toEqual([PREFERENCES_KEY]);
    expect(storage.data.has(STORAGE_KEY)).toBe(false);

    saveTheme(storage, 'claro');
    expect(loadTheme(storage)).toBe('claro');
  });

  it('un valor guardado raro se ignora', () => {
    const raros = ['no es json', '{"tema":', '"oscuro"', 'null', '42', '[]', '{"tema":"morado"}', '{"tema":1}', '{}'];
    for (const raw of raros) {
      expect(() => loadTheme(memoryStorage({ [PREFERENCES_KEY]: raw }))).not.toThrow();
      expect(loadTheme(memoryStorage({ [PREFERENCES_KEY]: raw }))).toBe('claro');
    }
  });

  it('un almacenamiento que lanza errores no rompe nada', () => {
    const roto = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
    };
    expect(loadTheme(roto)).toBe('claro');
    expect(() => saveTheme(roto, 'oscuro')).not.toThrow();
  });

  it('sin localStorage no falla', () => {
    expect(loadTheme(null)).toBe('claro');
    expect(() => saveTheme(null, 'oscuro')).not.toThrow();
  });
});
