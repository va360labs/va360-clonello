import { useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, Column, Label } from '../board/types';
import { cardMatches, isActiveSearch } from '../board/search';
import { useBoard } from '../state/BoardProvider';
import { AddCardForm } from './AddCardForm';
import { CardFace, CardTile } from './CardTile';
import { ColumnMenu } from './ColumnMenu';
import { GripIcon } from './icons';
import './ColumnView.css';

interface ColumnViewProps {
  column: Column;
  index: number;
  total: number;
  /** Texto buscado. Si hay búsqueda, solo se pintan las tarjetas que coinciden y no se arrastra ni se añade. */
  query: string;
  onOpenCard: (cardId: string) => void;
}

export function ColumnView({ column, index, total, query, onOpenCard }: ColumnViewProps) {
  const { board, dispatch } = useBoard();
  const [editing, setEditing] = useState(false);
  // Con tarjetas ocultas, la posición al soltar no sería la real: mientras se busca no se arrastra.
  const searching = isActiveSearch(query);
  const visibleIds = searching
    ? column.cardIds.filter((id) => board.cards[id] && cardMatches(board.cards[id], query))
    : column.cardIds;
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: column.id,
      data: { type: 'column' },
      disabled: searching,
      attributes: { roleDescription: 'columna arrastrable' },
    });

  const titleId = `${column.id}-titulo`;

  return (
    <section
      ref={setNodeRef}
      className={isDragging ? 'column column--placeholder' : 'column'}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      aria-labelledby={titleId}
    >
      <header className="column__head">
        {editing ? (
          <RenameInput
            initial={column.title}
            onDone={(title) => {
              if (title !== null) dispatch({ type: 'column/rename', columnId: column.id, title });
              setEditing(false);
            }}
          />
        ) : (
          <h2 className="column__title" id={titleId}>
            <button
              type="button"
              className="column__title-btn"
              title="Pulsa para renombrar"
              onClick={() => setEditing(true)}
            >
              {column.title}
            </button>
          </h2>
        )}
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="icon-btn column__grip"
          disabled={searching}
          {...attributes}
          {...listeners}
          aria-label={`Mover la columna ${column.title}`}
        >
          <GripIcon />
        </button>
        <ColumnMenu column={column} index={index} total={total} onRename={() => setEditing(true)} />
      </header>

      <SortableContext items={visibleIds} strategy={verticalListSortingStrategy}>
        <ol className="column__cards">
          {visibleIds.map((cardId) => {
            const card = board.cards[cardId];
            return card ? (
              <CardTile
                key={cardId}
                card={card}
                labels={board.labels}
                columnId={column.id}
                dragDisabled={searching}
                onOpen={onOpenCard}
              />
            ) : null;
          })}
        </ol>
      </SortableContext>

      {visibleIds.length === 0 &&
        (searching ? (
          <p className="column__empty">Ninguna coincide en esta columna.</p>
        ) : (
          <p className="column__empty">Arrastra aquí una tarjeta o añade una nueva.</p>
        ))}

      {/* Una tarjeta nueva que no coincidiera desaparecería al momento: mientras se busca no se añade. */}
      {!searching && <AddCardForm columnId={column.id} columnTitle={column.title} />}
    </section>
  );
}

/** Campo para renombrar. Intro o salir del campo guarda; Escape cancela (devuelve null). */
function RenameInput({ initial, onDone }: { initial: string; onDone: (title: string | null) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <input
      className="field column__rename"
      aria-label="Nombre de la columna"
      value={value}
      autoFocus
      onFocus={(e) => e.currentTarget.select()}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => onDone(value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') onDone(value);
        if (e.key === 'Escape') onDone(null);
      }}
    />
  );
}

/** Columna que vuela mientras se arrastra. */
export function ColumnPreview({ column, cards, labels }: { column: Column; cards: Record<string, Card>; labels: Label[] }) {
  return (
    <div className="column column--overlay">
      <header className="column__head">
        <h2 className="column__title">
          <span className="column__title-btn">{column.title}</span>
        </h2>
      </header>
      <ol className="column__cards">
        {column.cardIds.map((id) => {
          const card = cards[id];
          return card ? (
            <li key={id} className="column__item">
              <article className="card">
                <CardFace card={card} labels={labels} />
              </article>
            </li>
          ) : null;
        })}
      </ol>
    </div>
  );
}
