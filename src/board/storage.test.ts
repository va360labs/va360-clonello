import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, STORAGE_KEY, loadBoard, saveBoard, type StorageLike } from './storage';
import { createSeedBoard } from './seed';

/** localStorage en memoria para probar sin depender del navegador. */
function memoryStorage(initial: Record<string, string> = {}): StorageLike & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (key) => (key in data ? data[key]! : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

describe('cargar y sembrar', () => {
  it('la primera vez siembra los datos de ejemplo y los guarda', () => {
    const storage = memoryStorage();
    const result = loadBoard(storage);
    expect(result.origin).toBe('seeded');
    expect(result.board).toEqual(createSeedBoard());
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual({ version: 1, board: createSeedBoard() });
  });

  it('carga lo guardado si es válido', () => {
    const board = { ...createSeedBoard(), title: 'Mi tablero' };
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: 1, board }) });
    const result = loadBoard(storage);
    expect(result.origin).toBe('stored');
    expect(result.board.title).toBe('Mi tablero');
    expect(result.problems).toEqual([]);
  });

  it('si el JSON está roto, guarda una copia y vuelve a sembrar', () => {
    const storage = memoryStorage({ [STORAGE_KEY]: '{esto no es json' });
    const result = loadBoard(storage);
    expect(result.origin).toBe('recovered');
    expect(result.board).toEqual(createSeedBoard());
    expect(result.problems.length).toBeGreaterThan(0);
    expect(storage.data[BACKUP_KEY]).toBe('{esto no es json');
    expect(JSON.parse(storage.data[STORAGE_KEY]!).board).toEqual(createSeedBoard());
  });

  it('si el esquema no es válido, guarda una copia y vuelve a sembrar', () => {
    const raw = JSON.stringify({ version: 1, board: { title: 'Roto', columns: 'no', cards: {}, labels: [] } });
    const storage = memoryStorage({ [STORAGE_KEY]: raw });
    const result = loadBoard(storage);
    expect(result.origin).toBe('recovered');
    expect(storage.data[BACKUP_KEY]).toBe(raw);
  });

  it('funciona sin localStorage disponible', () => {
    const result = loadBoard(null);
    expect(result.origin).toBe('seeded');
    expect(result.board).toEqual(createSeedBoard());
  });

  it('no revienta si el almacenamiento lanza errores', () => {
    const broken: StorageLike = {
      getItem: () => {
        throw new Error('bloqueado');
      },
      setItem: () => {
        throw new Error('lleno');
      },
    };
    expect(loadBoard(broken).board).toEqual(createSeedBoard());
    expect(saveBoard(broken, createSeedBoard())).toBe(false);
  });
});

describe('guardar', () => {
  it('guarda el tablero con su versión y se puede volver a cargar', () => {
    const storage = memoryStorage();
    const board = { ...createSeedBoard(), title: 'Ida y vuelta' };
    expect(saveBoard(storage, board)).toBe(true);
    expect(loadBoard(storage)).toEqual({ board, origin: 'stored', problems: [] });
  });
});
