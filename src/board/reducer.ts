import type { Board, Card, Column, LabelColor, Workspace } from './types';

/**
 * Todas las operaciones del tablero. El reducer es puro: no genera ids, no lee
 * la hora ni toca localStorage. Si una acción no tiene sentido (id que no existe,
 * título vacío…) devuelve el mismo objeto sin cambios.
 */
export type BoardAction =
  | { type: 'column/add'; id: string; title: string }
  | { type: 'column/rename'; columnId: string; title: string }
  | { type: 'column/delete'; columnId: string }
  | { type: 'column/move'; columnId: string; toIndex: number }
  | { type: 'card/add'; id: string; columnId: string; title: string }
  | { type: 'card/update'; cardId: string; changes: Partial<Pick<Card, 'title' | 'description'>> }
  | { type: 'card/delete'; cardId: string }
  /** toIndex es la posición en la columna de destino una vez retirada la tarjeta de su sitio. */
  | { type: 'card/move'; cardId: string; toColumnId: string; toIndex: number }
  | { type: 'card/toggleLabel'; cardId: string; labelId: string }
  | { type: 'label/add'; id: string; name: string; color: LabelColor }
  /** Sustituye el contenido del tablero abierto (por ejemplo, al cancelar un arrastre). */
  | { type: 'board/replace'; board: Board };

/** Operaciones sobre la lista de tableros. */
export type WorkspaceBoardsAction =
  /** columnIds: ids para las columnas iniciales (STARTER_COLUMN_TITLES), en orden. */
  | { type: 'board/create'; id: string; title: string; columnIds: string[] }
  | { type: 'board/select'; boardId: string }
  | { type: 'board/rename'; boardId: string; title: string }
  | { type: 'board/delete'; boardId: string };

export type WorkspaceAction = BoardAction | WorkspaceBoardsAction;

/** Columnas con las que empieza un tablero nuevo. */
export const STARTER_COLUMN_TITLES = ['Por hacer', 'En curso', 'Hecho'] as const;

/**
 * Reducer de todos los tableros. Las acciones de tableros cambian la lista o el
 * abierto; el resto se aplican con boardReducer solo al tablero abierto y los
 * demás se quedan como estaban (mismo objeto).
 */
export function workspaceReducer(workspace: Workspace, action: WorkspaceAction): Workspace {
  switch (action.type) {
    case 'board/create': {
      const title = action.title.trim();
      const columnIds = action.columnIds.slice(0, STARTER_COLUMN_TITLES.length);
      if (!title || workspace.boards.some((b) => b.id === action.id)) return workspace;
      if (new Set(columnIds).size !== columnIds.length) return workspace;
      const columns: Column[] = columnIds.map((id, i) => ({ id, title: STARTER_COLUMN_TITLES[i]!, cardIds: [] }));
      return {
        activeBoardId: action.id,
        boards: [...workspace.boards, { id: action.id, title, columns, cards: {}, labels: [] }],
      };
    }

    case 'board/select': {
      if (action.boardId === workspace.activeBoardId) return workspace;
      if (!workspace.boards.some((b) => b.id === action.boardId)) return workspace;
      return { ...workspace, activeBoardId: action.boardId };
    }

    case 'board/rename': {
      const title = action.title.trim();
      const board = workspace.boards.find((b) => b.id === action.boardId);
      if (!title || !board || board.title === title) return workspace;
      return { ...workspace, boards: workspace.boards.map((b) => (b.id === board.id ? { ...b, title } : b)) };
    }

    case 'board/delete': {
      const index = workspace.boards.findIndex((b) => b.id === action.boardId);
      if (index === -1 || workspace.boards.length === 1) return workspace;
      const boards = workspace.boards.filter((b) => b.id !== action.boardId);
      if (action.boardId !== workspace.activeBoardId) return { ...workspace, boards };
      // Se abre el anterior en la lista, o el siguiente si se borró el primero.
      const next = boards[Math.max(0, index - 1)]!;
      return { activeBoardId: next.id, boards };
    }

    default: {
      const active = workspace.boards.find((b) => b.id === workspace.activeBoardId);
      if (!active) return workspace;
      const next = boardReducer(active, action);
      if (next === active) return workspace;
      return {
        ...workspace,
        boards: workspace.boards.map((b) => (b === active ? { ...next, id: active.id } : b)),
      };
    }
  }
}

export function boardReducer(board: Board, action: BoardAction): Board {
  switch (action.type) {
    case 'column/add': {
      const title = action.title.trim();
      if (!title || board.columns.some((c) => c.id === action.id)) return board;
      return { ...board, columns: [...board.columns, { id: action.id, title, cardIds: [] }] };
    }

    case 'column/rename': {
      const title = action.title.trim();
      const column = board.columns.find((c) => c.id === action.columnId);
      if (!title || !column || column.title === title) return board;
      return updateColumn(board, action.columnId, (c) => ({ ...c, title }));
    }

    case 'column/delete': {
      const column = board.columns.find((c) => c.id === action.columnId);
      if (!column) return board;
      const cards = { ...board.cards };
      for (const cardId of column.cardIds) delete cards[cardId];
      return { ...board, columns: board.columns.filter((c) => c.id !== action.columnId), cards };
    }

    case 'column/move': {
      const from = board.columns.findIndex((c) => c.id === action.columnId);
      if (from === -1) return board;
      const to = clamp(action.toIndex, 0, board.columns.length - 1);
      if (from === to) return board;
      return { ...board, columns: moveItem(board.columns, from, to) };
    }

    case 'card/add': {
      const title = action.title.trim();
      const column = board.columns.find((c) => c.id === action.columnId);
      if (!title || !column || board.cards[action.id]) return board;
      const card: Card = { id: action.id, title, description: '', labelIds: [] };
      return {
        ...updateColumn(board, column.id, (c) => ({ ...c, cardIds: [...c.cardIds, card.id] })),
        cards: { ...board.cards, [card.id]: card },
      };
    }

    case 'card/update': {
      const card = board.cards[action.cardId];
      if (!card) return board;
      const title = action.changes.title?.trim();
      const next: Card = {
        ...card,
        title: title ? title : card.title,
        description: action.changes.description ?? card.description,
      };
      if (next.title === card.title && next.description === card.description) return board;
      return { ...board, cards: { ...board.cards, [card.id]: next } };
    }

    case 'card/delete': {
      const column = findColumnOfCard(board, action.cardId);
      if (!column) return board;
      const cards = { ...board.cards };
      delete cards[action.cardId];
      return {
        ...updateColumn(board, column.id, (c) => ({
          ...c,
          cardIds: c.cardIds.filter((id) => id !== action.cardId),
        })),
        cards,
      };
    }

    case 'card/move': {
      const source = findColumnOfCard(board, action.cardId);
      const target = board.columns.find((c) => c.id === action.toColumnId);
      if (!source || !target) return board;

      if (source.id === target.id) {
        const from = source.cardIds.indexOf(action.cardId);
        const to = clamp(action.toIndex, 0, source.cardIds.length - 1);
        if (from === to) return board;
        return updateColumn(board, source.id, (c) => ({ ...c, cardIds: moveItem(c.cardIds, from, to) }));
      }

      const to = clamp(action.toIndex, 0, target.cardIds.length);
      const targetIds = [...target.cardIds];
      targetIds.splice(to, 0, action.cardId);
      return {
        ...board,
        columns: board.columns.map((c) => {
          if (c.id === source.id) return { ...c, cardIds: c.cardIds.filter((id) => id !== action.cardId) };
          if (c.id === target.id) return { ...c, cardIds: targetIds };
          return c;
        }),
      };
    }

    case 'card/toggleLabel': {
      const card = board.cards[action.cardId];
      if (!card || !board.labels.some((l) => l.id === action.labelId)) return board;
      const labelIds = card.labelIds.includes(action.labelId)
        ? card.labelIds.filter((id) => id !== action.labelId)
        : [...card.labelIds, action.labelId];
      return { ...board, cards: { ...board.cards, [card.id]: { ...card, labelIds } } };
    }

    case 'label/add': {
      const name = action.name.trim();
      const taken = board.labels.some(
        (l) => l.id === action.id || l.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'),
      );
      if (!name || taken) return board;
      return { ...board, labels: [...board.labels, { id: action.id, name, color: action.color }] };
    }

    case 'board/replace':
      return action.board;
  }
}

/** Columna que contiene la tarjeta, o undefined si no está en ninguna. */
export function findColumnOfCard(board: Board, cardId: string): Column | undefined {
  return board.columns.find((c) => c.cardIds.includes(cardId));
}

function updateColumn(board: Board, columnId: string, update: (column: Column) => Column): Board {
  return { ...board, columns: board.columns.map((c) => (c.id === columnId ? update(c) : c)) };
}

function moveItem<T>(items: readonly T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  if (item !== undefined) next.splice(to, 0, item);
  return next;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
