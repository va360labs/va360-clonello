import { describe, expect, it } from 'vitest';
import { TABLERO_V1_JSON } from './fixtures/tableroV1';
import { validateStoredData } from './schema';
import {
  BACKUP_KEY,
  BACKUP_KEY_V1,
  STORAGE_KEY,
  STORAGE_KEY_V1,
  loadBoard,
  saveBoard,
  type StorageLike,
} from './storage';
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
  it('usa las claves clonello:v2 y clonello:v1', () => {
    expect(STORAGE_KEY).toBe('clonello:v2');
    expect(BACKUP_KEY).toBe('clonello:v2:respaldo');
    expect(STORAGE_KEY_V1).toBe('clonello:v1');
    expect(BACKUP_KEY_V1).toBe('clonello:v1:respaldo');
  });

  it('la primera visita guarda en clonello:v2', () => {
    const storage = memoryStorage();
    const result = loadBoard(storage);
    expect(result.origin).toBe('seeded');
    expect(result.board).toEqual(createSeedBoard());
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual({ version: 2, board: createSeedBoard() });
    expect(storage.data[STORAGE_KEY_V1]).toBeUndefined();
  });

  it('lee clonello:v2 si existe', () => {
    const board = { ...createSeedBoard(), title: 'Mi tablero' };
    board.cards['card-legal']!.dueDate = '2026-12-01';
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ version: 2, board }),
      [STORAGE_KEY_V1]: JSON.stringify({ version: 1, board: { ...createSeedBoard(), title: 'Viejo' } }),
    });
    const result = loadBoard(storage);
    expect(result.origin).toBe('stored');
    expect(result.board.title).toBe('Mi tablero');
    expect(result.board.cards['card-legal']?.dueDate).toBe('2026-12-01');
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
    const raw = JSON.stringify({ version: 2, board: { title: 'Roto', columns: 'no', cards: {}, labels: [] } });
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

describe('migrar desde clonello:v1', () => {
  it('si solo hay clonello:v1, la valida, la migra, la guarda en clonello:v2 y no borra la v1', () => {
    const storage = memoryStorage({ [STORAGE_KEY_V1]: TABLERO_V1_JSON });
    const v1 = JSON.parse(TABLERO_V1_JSON);

    const result = loadBoard(storage);

    expect(result.origin).toBe('migrated');
    expect(result.problems).toEqual([]);
    expect(result.board.columns).toEqual(v1.board.columns);
    expect(result.board.labels).toEqual(v1.board.labels);
    expect(Object.keys(result.board.cards)).toEqual(Object.keys(v1.board.cards));
    for (const [id, card] of Object.entries(v1.board.cards)) {
      expect(result.board.cards[id]).toEqual({ ...(card as object), dueDate: null });
    }

    const saved = JSON.parse(storage.data[STORAGE_KEY]!);
    expect(validateStoredData(saved).ok).toBe(true);
    expect(saved).toEqual({ version: 2, board: result.board });
    // La v1 se queda tal cual, como respaldo.
    expect(storage.data[STORAGE_KEY_V1]).toBe(TABLERO_V1_JSON);
    expect(storage.data[BACKUP_KEY_V1]).toBeUndefined();
  });

  it('después de migrar, la siguiente carga lee la v2', () => {
    const storage = memoryStorage({ [STORAGE_KEY_V1]: TABLERO_V1_JSON });
    const first = loadBoard(storage);
    expect(loadBoard(storage)).toEqual({ board: first.board, origin: 'stored', problems: [] });
  });

  it('si la v1 es ilegible, la respalda y siembra como hasta ahora', () => {
    for (const raw of ['{roto', JSON.stringify({ version: 1, board: { title: 'Roto', columns: 'no', cards: {}, labels: [] } })]) {
      const storage = memoryStorage({ [STORAGE_KEY_V1]: raw });
      const result = loadBoard(storage);
      expect(result.origin).toBe('recovered');
      expect(result.problems.length).toBeGreaterThan(0);
      expect(result.board).toEqual(createSeedBoard());
      expect(storage.data[BACKUP_KEY_V1]).toBe(raw);
      expect(storage.data[STORAGE_KEY_V1]).toBe(raw);
      expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual({ version: 2, board: createSeedBoard() });
    }
  });

  it('migra aunque no se pueda guardar la v2', () => {
    const storage: StorageLike = {
      getItem: (key) => (key === STORAGE_KEY_V1 ? TABLERO_V1_JSON : null),
      setItem: () => {
        throw new Error('lleno');
      },
    };
    const result = loadBoard(storage);
    expect(result.origin).toBe('migrated');
    expect(result.board.title).toBe(JSON.parse(TABLERO_V1_JSON).board.title);
  });
});

describe('guardar', () => {
  it('guarda el tablero con su versión y se puede volver a cargar', () => {
    const storage = memoryStorage();
    const board = { ...createSeedBoard(), title: 'Ida y vuelta' };
    expect(saveBoard(storage, board)).toBe(true);
    expect(Object.keys(storage.data)).toEqual([STORAGE_KEY]);
    expect(loadBoard(storage)).toEqual({ board, origin: 'stored', problems: [] });
  });
});
