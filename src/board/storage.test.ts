import { describe, expect, it } from 'vitest';
import { BACKUP_KEY, LEGACY_BACKUP_KEY, LEGACY_STORAGE_KEY, STORAGE_KEY, loadBoard, saveBoard, type StorageLike } from './storage';
import { SCHEMA_VERSION } from './schema';
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
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual({ version: SCHEMA_VERSION, board: createSeedBoard() });
  });

  it('carga lo guardado si es válido', () => {
    const board = { ...createSeedBoard(), title: 'Mi tablero' };
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify({ version: SCHEMA_VERSION, board }) });
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
    const raw = JSON.stringify({ version: SCHEMA_VERSION, board: { title: 'Roto', columns: 'no', cards: {}, labels: [] } });
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

/** Tablero guardado por la versión 1 de la app (sin fecha límite). */
const V1_BOARD = {
  title: 'Mi tablero antiguo',
  labels: [{ id: 'l-1', name: 'Casa', color: 'verde' }],
  columns: [
    { id: 'c-1', title: 'Pendiente', cardIds: ['k-2', 'k-1'] },
    { id: 'c-2', title: 'Hecho', cardIds: [] },
  ],
  cards: {
    'k-1': { id: 'k-1', title: 'Pintar', description: 'Salón', labelIds: ['l-1'] },
    'k-2': { id: 'k-2', title: 'Comprar pintura', description: '', labelIds: [] },
  },
};

describe('migrar desde la versión 1', () => {
  it('las claves son clonello:v2 y clonello:v1', () => {
    expect(STORAGE_KEY).toBe('clonello:v2');
    expect(LEGACY_STORAGE_KEY).toBe('clonello:v1');
  });

  it('carga desde v1 si no existe v2', () => {
    const rawV1 = JSON.stringify({ version: 1, board: V1_BOARD });
    const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: rawV1 });
    const result = loadBoard(storage);

    expect(result.origin).toBe('stored');
    expect(result.problems).toEqual([]);
    expect(result.board.title).toBe('Mi tablero antiguo');
    expect(result.board.columns).toEqual(V1_BOARD.columns);
    expect(result.board.cards['k-1']).toEqual({ ...V1_BOARD.cards['k-1'], dueDate: null });
    expect(result.board.cards['k-2']).toEqual({ ...V1_BOARD.cards['k-2'], dueDate: null });

    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual({ version: SCHEMA_VERSION, board: result.board });
    // La copia antigua se queda como respaldo.
    expect(storage.data[LEGACY_STORAGE_KEY]).toBe(rawV1);
  });

  it('prefiere v2 si existe', () => {
    const board = { ...createSeedBoard(), title: 'El nuevo' };
    const storage = memoryStorage({
      [STORAGE_KEY]: JSON.stringify({ version: SCHEMA_VERSION, board }),
      [LEGACY_STORAGE_KEY]: JSON.stringify({ version: 1, board: V1_BOARD }),
    });
    const result = loadBoard(storage);
    expect(result.origin).toBe('stored');
    expect(result.board.title).toBe('El nuevo');
  });

  it('v1 ilegible va a respaldo y se vuelve a sembrar', () => {
    const rawV1 = JSON.stringify({ version: 1, board: { ...V1_BOARD, columns: 'no' } });
    const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: rawV1 });
    const result = loadBoard(storage);
    expect(result.origin).toBe('recovered');
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.board).toEqual(createSeedBoard());
    expect(storage.data[LEGACY_BACKUP_KEY]).toBe(rawV1);
    expect(storage.data[LEGACY_STORAGE_KEY]).toBe(rawV1);
    expect(JSON.parse(storage.data[STORAGE_KEY]!).board).toEqual(createSeedBoard());
  });

  it('v1 con JSON roto va a respaldo y se vuelve a sembrar', () => {
    const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: '{roto' });
    const result = loadBoard(storage);
    expect(result.origin).toBe('recovered');
    expect(storage.data[LEGACY_BACKUP_KEY]).toBe('{roto');
  });

  it('una vez migrado, la siguiente carga lee v2', () => {
    const storage = memoryStorage({ [LEGACY_STORAGE_KEY]: JSON.stringify({ version: 1, board: V1_BOARD }) });
    const first = loadBoard(storage);
    storage.data[LEGACY_STORAGE_KEY] = '{ya no se lee';
    expect(loadBoard(storage)).toEqual(first);
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
