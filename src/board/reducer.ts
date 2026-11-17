import { normalizeName } from './text';
import type { Board, Card, Column, LabelColor } from './types';

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
  /**
   * Añade varias tarjetas de golpe (importar un CSV), al final de su columna y en
   * orden. `column` es el título de la columna, sin distinguir mayúsculas ni
   * tildes; si viene vacío o no existe, la tarjeta va a la primera columna.
   */
  | { type: 'cards/import'; cards: ImportedCard[] }
  | { type: 'board/replace'; board: Board };

export interface ImportedCard {
  id: string;
  title: string;
  description: string;
  column: string;
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

    case 'cards/import': {
      const [firstColumn] = board.columns;
      if (!firstColumn) return board;
      // Un id repetido o ya usado no pisa nada: no se importa ninguna tarjeta.
      const ids = action.cards.map((c) => c.id);
      if (new Set(ids).size !== ids.length || ids.some((id) => !id || Object.hasOwn(board.cards, id))) return board;

      const columnByName = new Map<string, string>();
      for (const c of [...board.columns].reverse()) columnByName.set(normalizeName(c.title), c.id);

      const cards = { ...board.cards };
      const added = new Map<string, string[]>();
      for (const imported of action.cards) {
        const title = imported.title.trim();
        if (!title) continue;
        const columnId = columnByName.get(normalizeName(imported.column)) ?? firstColumn.id;
        cards[imported.id] = { id: imported.id, title, description: imported.description, labelIds: [] };
        added.set(columnId, [...(added.get(columnId) ?? []), imported.id]);
      }
      if (added.size === 0) return board;
      return {
        ...board,
        columns: board.columns.map((c) => {
          const extra = added.get(c.id);
          return extra ? { ...c, cardIds: [...c.cardIds, ...extra] } : c;
        }),
        cards,
      };
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
