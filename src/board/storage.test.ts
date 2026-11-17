import { describe, expect, it } from 'vitest';
import { REAL_V1 } from './fixtures';
import { migrateV1ToV2 } from './migrate';
import { createSeedData } from './seed';
import {
  BACKUP_KEY,
  STORAGE_KEY,
  V1_BACKUP_KEY,
  V1_STORAGE_KEY,
  loadWorkspace,
  saveWorkspace,
  type StorageLike,
} from './storage';
import type { Workspace } from './types';

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

const seedWorkspace = (): Workspace => {
  const { activeBoardId, boards } = createSeedData();
  return { activeBoardId, boards };
};

const activeOf = (ws: Workspace) => ws.boards.find((b) => b.id === ws.activeBoardId)!;

describe('claves', () => {
  it('guarda en clonello:v2 y respalda en su propia clave', () => {
    expect(STORAGE_KEY).toBe('clonello:v2');
    expect(BACKUP_KEY).toBe('clonello:v2:respaldo');
    expect(V1_STORAGE_KEY).toBe('clonello:v1');
    expect(V1_BACKUP_KEY).toBe('clonello:v1:respaldo');
  });
});

describe('cargar y sembrar', () => {
  it('sin datos, siembra v2 con el tablero de ejemplo', () => {
    const storage = memoryStorage();
    const result = loadWorkspace(storage);
    expect(result.origin).toBe('seeded');
    expect(result.workspace).toEqual(seedWorkspace());
    const saved = JSON.parse(storage.data[STORAGE_KEY]!);
    expect(saved).toEqual({ version: 2, ...seedWorkspace() });
    const open = activeOf(saved);
    expect(open.columns).toHaveLength(4);
    expect(Object.keys(open.cards).length).toBeGreaterThanOrEqual(10);
    expect(storage.data[V1_STORAGE_KEY]).toBeUndefined();
  });

  it('carga lo guardado en v2 si es válido', () => {
    const data = createSeedData();
    data.boards.push({ ...data.boards[0]!, id: 'board-otro', title: 'Otro' });
    data.activeBoardId = 'board-otro';
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(data) });
    const result = loadWorkspace(storage);
    expect(result.origin).toBe('stored');
    expect(result.workspace.boards.map((b) => b.title)).toEqual(['Lanzamiento de la web de Brisa Viajes', 'Otro']);
    expect(result.workspace.activeBoardId).toBe('board-otro');
    expect(result.problems).toEqual([]);
  });

  it('migra desde clonello:v1 si no hay v2', () => {
    const rawV1 = JSON.stringify(REAL_V1);
    const storage = memoryStorage({ [V1_STORAGE_KEY]: rawV1 });
    const result = loadWorkspace(storage);
    expect(result.origin).toBe('migrated');
    expect(result.problems).toEqual([]);
    const { version: _version, ...expected } = migrateV1ToV2(REAL_V1);
    expect(result.workspace).toEqual(expected);
    expect(activeOf(result.workspace).title).toBe(REAL_V1.board.title);
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual(migrateV1ToV2(REAL_V1));
    expect(storage.data[V1_STORAGE_KEY]).toBe(rawV1);
  });

  it('prefiere v2 si existe', () => {
    const rawV1 = JSON.stringify(REAL_V1);
    const data = createSeedData();
    data.boards[0]!.title = 'El de v2';
    const storage = memoryStorage({ [STORAGE_KEY]: JSON.stringify(data), [V1_STORAGE_KEY]: rawV1 });
    const result = loadWorkspace(storage);
    expect(result.origin).toBe('stored');
    expect(activeOf(result.workspace).title).toBe('El de v2');
    expect(storage.data[V1_STORAGE_KEY]).toBe(rawV1);
  });

  it('v2 ilegible se copia a respaldo y se vuelve a sembrar', () => {
    const rawV1 = JSON.stringify(REAL_V1);
    const storage = memoryStorage({ [STORAGE_KEY]: '{esto no es json', [V1_STORAGE_KEY]: rawV1 });
    const result = loadWorkspace(storage);
    expect(result.origin).toBe('recovered');
    expect(result.workspace).toEqual(seedWorkspace());
    expect(result.problems.length).toBeGreaterThan(0);
    expect(storage.data[BACKUP_KEY]).toBe('{esto no es json');
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual(createSeedData());
    expect(storage.data[V1_STORAGE_KEY]).toBe(rawV1);
  });

  it('v2 con un esquema inválido también se respalda', () => {
    const raw = JSON.stringify({ version: 2, activeBoardId: 'x', boards: [] });
    const storage = memoryStorage({ [STORAGE_KEY]: raw });
    const result = loadWorkspace(storage);
    expect(result.origin).toBe('recovered');
    expect(storage.data[BACKUP_KEY]).toBe(raw);
  });

  it('v1 ilegible sin v2', () => {
    const raw = JSON.stringify({ version: 1, board: { title: 'Roto', columns: 'no', cards: {}, labels: [] } });
    const storage = memoryStorage({ [V1_STORAGE_KEY]: raw });
    const result = loadWorkspace(storage);
    expect(result.origin).toBe('recovered');
    expect(result.problems.length).toBeGreaterThan(0);
    expect(result.workspace).toEqual(seedWorkspace());
    expect(storage.data[V1_BACKUP_KEY]).toBe(raw);
    expect(storage.data[V1_STORAGE_KEY]).toBe(raw);
    expect(JSON.parse(storage.data[STORAGE_KEY]!)).toEqual(createSeedData());
  });

  it('v1 con JSON roto sin v2 también se respalda', () => {
    const storage = memoryStorage({ [V1_STORAGE_KEY]: '{roto' });
    const result = loadWorkspace(storage);
    expect(result.origin).toBe('recovered');
    expect(storage.data[V1_BACKUP_KEY]).toBe('{roto');
  });

  it('funciona sin localStorage disponible', () => {
    const result = loadWorkspace(null);
    expect(result.origin).toBe('seeded');
    expect(result.workspace).toEqual(seedWorkspace());
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
    expect(loadWorkspace(broken).workspace).toEqual(seedWorkspace());
    expect(saveWorkspace(broken, seedWorkspace())).toBe(false);
  });
});

describe('guardar', () => {
  it('guarda los tableros con su versión y se pueden volver a cargar', () => {
    const storage = memoryStorage();
    const workspace = seedWorkspace();
    workspace.boards[0]!.title = 'Ida y vuelta';
    expect(saveWorkspace(storage, workspace)).toBe(true);
    expect(loadWorkspace(storage)).toEqual({ workspace, origin: 'stored', problems: [] });
  });
});
