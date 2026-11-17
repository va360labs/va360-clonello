import { useState } from 'react';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, Column, Label } from '../board/types';
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
  onOpenCard: (cardId: string) => void;
}

export function ColumnView({ column, index, total, onOpenCard }: ColumnViewProps) {
  const { board, dispatch } = useBoard();
  const [editing, setEditing] = useState(false);
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({
      id: column.id,
      data: { type: 'column' },
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
        <CardCount count={column.cardIds.length} />
        <button
          ref={setActivatorNodeRef}
          type="button"
          className="icon-btn column__grip"
          {...attributes}
          {...listeners}
          aria-label={`Mover la columna ${column.title}`}
        >
          <GripIcon />
        </button>
        <ColumnMenu column={column} index={index} total={total} onRename={() => setEditing(true)} />
      </header>

      <SortableContext items={column.cardIds} strategy={verticalListSortingStrategy}>
        <ol className="column__cards">
          {column.cardIds.map((cardId) => {
            const card = board.cards[cardId];
            return card ? (
              <CardTile key={cardId} card={card} labels={board.labels} columnId={column.id} onOpen={onOpenCard} />
            ) : null;
          })}
        </ol>
      </SortableContext>

      {column.cardIds.length === 0 && <p className="column__empty">Arrastra aquí una tarjeta o añade una nueva.</p>}

      <AddCardForm columnId={column.id} columnTitle={column.title} />
    </section>
  );
}

/**
 * Número de tarjetas de la columna. Va fuera del <h2> para que el nombre de la
 * columna siga siendo solo su título. En pantalla, solo el número; los lectores
 * de pantalla oyen «N tarjetas».
 */
function CardCount({ count }: { count: number }) {
  return (
    <span className="column__count">
      <span aria-hidden="true">{count}</span>
      <span className="visually-hidden">{count === 1 ? '1 tarjeta' : `${count} tarjetas`}</span>
    </span>
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
        <CardCount count={column.cardIds.length} />
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
