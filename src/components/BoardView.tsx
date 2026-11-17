import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  getFirstCollision,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type Active,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type Over,
  type UniqueIdentifier,
} from '@dnd-kit/core';
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { findColumnOfCard } from '../board/reducer';
import type { Board } from '../board/types';
import { useBoard } from '../state/BoardProvider';
import { AddColumnForm } from './AddColumnForm';
import { CardFace } from './CardTile';
import { ColumnPreview, ColumnView } from './ColumnView';
import './BoardView.css';

type DragKind = 'card' | 'column';

const kindOf = (item: Active | Over | null): DragKind | undefined =>
  item?.data.current?.type as DragKind | undefined;

export function BoardView() {
  const { board, dispatch } = useBoard();
  const [, setOpenCardId] = useState<string | null>(null);
  const [active, setActive] = useState<{ id: string; kind: DragKind } | null>(null);

  // Tablero tal y como estaba al empezar a arrastrar: se restaura si se cancela.
  const snapshot = useRef<Board | null>(null);
  const lastOverId = useRef<UniqueIdentifier | null>(null);
  const movedToNewColumn = useRef(false);

  useEffect(() => {
    requestAnimationFrame(() => {
      movedToNewColumn.current = false;
    });
  }, [board]);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
      // Intro queda libre para abrir la tarjeta; el espacio coge y suelta.
      keyboardCodes: { start: ['Space'], cancel: ['Escape'], end: ['Space'] },
    }),
  );

  /**
   * Colisiones para varias listas: al arrastrar una columna solo cuentan columnas;
   * al arrastrar una tarjeta, si el puntero cae sobre una columna con tarjetas,
   * se busca la tarjeta más cercana dentro de ella.
   */
  const collisionDetection: CollisionDetection = useCallback(
    (args) => {
      if (active?.kind === 'column') {
        return closestCenter({
          ...args,
          droppableContainers: args.droppableContainers.filter((c) => c.data.current?.type === 'column'),
        });
      }

      const pointerHits = pointerWithin(args);
      const hits = pointerHits.length > 0 ? pointerHits : rectIntersection(args);
      let overId = getFirstCollision(hits, 'id');

      if (overId != null) {
        const column = board.columns.find((c) => c.id === overId);
        if (column && column.cardIds.length > 0) {
          const closestCard = closestCenter({
            ...args,
            droppableContainers: args.droppableContainers.filter((c) =>
              column.cardIds.includes(String(c.id)),
            ),
          })[0];
          overId = closestCard?.id ?? overId;
        }
        lastOverId.current = overId;
        return [{ id: overId }];
      }

      if (movedToNewColumn.current && active) lastOverId.current = active.id;
      return lastOverId.current ? [{ id: lastOverId.current }] : [];
    },
    [active, board.columns],
  );

  function handleDragStart({ active: dragged }: DragStartEvent) {
    const kind = kindOf(dragged);
    if (!kind) return;
    snapshot.current = board;
    setActive({ id: String(dragged.id), kind });
  }

  /** Mientras se arrastra una tarjeta sobre otra columna, se pasa a esa columna. */
  function handleDragOver({ active: dragged, over }: DragOverEvent) {
    if (!over || kindOf(dragged) !== 'card') return;
    const cardId = String(dragged.id);
    const overId = String(over.id);
    const from = findColumnOfCard(board, cardId);
    const overIsColumn = kindOf(over) === 'column';
    const to = overIsColumn ? board.columns.find((c) => c.id === overId) : findColumnOfCard(board, overId);
    if (!from || !to || from.id === to.id) return;

    let toIndex = to.cardIds.length;
    if (!overIsColumn) {
      const overIndex = to.cardIds.indexOf(overId);
      const rect = dragged.rect.current.translated;
      const below = rect ? rect.top > over.rect.top + over.rect.height / 2 : false;
      toIndex = overIndex + (below ? 1 : 0);
    }
    movedToNewColumn.current = true;
    dispatch({ type: 'card/move', cardId, toColumnId: to.id, toIndex });
  }

  function handleDragEnd({ active: dragged, over }: DragEndEvent) {
    const kind = kindOf(dragged);
    setActive(null);

    if (!over) {
      restoreSnapshot();
      return;
    }
    snapshot.current = null;

    const draggedId = String(dragged.id);
    const overId = String(over.id);

    if (kind === 'column') {
      const overColumnId = kindOf(over) === 'column' ? overId : findColumnOfCard(board, overId)?.id;
      const toIndex = board.columns.findIndex((c) => c.id === overColumnId);
      if (toIndex !== -1) dispatch({ type: 'column/move', columnId: draggedId, toIndex });
      return;
    }

    if (kind === 'card' && kindOf(over) === 'card') {
      const column = findColumnOfCard(board, draggedId);
      if (column && column.cardIds.includes(overId)) {
        dispatch({ type: 'card/move', cardId: draggedId, toColumnId: column.id, toIndex: column.cardIds.indexOf(overId) });
      }
    }
  }

  function restoreSnapshot() {
    if (snapshot.current) dispatch({ type: 'board/replace', board: snapshot.current });
    snapshot.current = null;
    setActive(null);
  }

  const announcements = useAnnouncements(board);
  const activeCard = active?.kind === 'card' ? board.cards[active.id] : undefined;
  const activeColumn = active?.kind === 'column' ? board.columns.find((c) => c.id === active.id) : undefined;

  return (
    <section className="board" aria-labelledby="board-title">
      <div className="board__head">
        <h1 id="board-title" className="board__title">
          {board.title}
        </h1>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={restoreSnapshot}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable:
              'Para mover este elemento, pulsa la barra espaciadora. Muévelo con las flechas, suéltalo con la barra espaciadora o cancela con Escape.',
          },
        }}
      >
        <div className="board__lanes">
          <SortableContext items={board.columns.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
            {board.columns.map((column, index) => (
              <ColumnView
                key={column.id}
                column={column}
                index={index}
                total={board.columns.length}
                onOpenCard={setOpenCardId}
              />
            ))}
          </SortableContext>
          {board.columns.length === 0 && (
            <p className="board__empty">Este tablero no tiene columnas. Crea la primera para empezar a organizar el trabajo.</p>
          )}
          <AddColumnForm />
        </div>

        <DragOverlay>
          {activeCard && (
            <article className="card card--overlay">
              <CardFace card={activeCard} labels={board.labels} />
            </article>
          )}
          {activeColumn && <ColumnPreview column={activeColumn} cards={board.cards} labels={board.labels} />}
        </DragOverlay>
      </DndContext>

    </section>
  );
}

/** Mensajes para lectores de pantalla durante el arrastre, en español. */
function useAnnouncements(board: Board): Announcements {
  const name = (id: UniqueIdentifier) => {
    const card = board.cards[String(id)];
    if (card) return `la tarjeta «${card.title}»`;
    const column = board.columns.find((c) => c.id === id);
    return column ? `la columna «${column.title}»` : 'el elemento';
  };
  const where = (id: UniqueIdentifier) => {
    const column = board.columns.find((c) => c.id === id) ?? findColumnOfCard(board, String(id));
    return column ? `en la columna «${column.title}»` : '';
  };
  return {
    onDragStart: ({ active }) => `Has cogido ${name(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over ? `${capitalize(name(active.id))} está ${where(over.id)}.` : `${capitalize(name(active.id))} está fuera del tablero.`,
    onDragEnd: ({ active, over }) =>
      over ? `Has soltado ${name(active.id)} ${where(over.id)}.` : `Has soltado ${name(active.id)} fuera: vuelve a su sitio.`,
    onDragCancel: ({ active }) => `Movimiento cancelado. ${capitalize(name(active.id))} vuelve a su sitio.`,
  };
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
