import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { Card, Label } from '../board/types';
import { LabelChip } from './LabelChip';
import './CardTile.css';

interface CardFaceProps {
  card: Card;
  labels: Label[];
}

/** Lo que se ve de una tarjeta. Lo usan la tarjeta del tablero y la que vuela al arrastrar. */
export function CardFace({ card, labels }: CardFaceProps) {
  const cardLabels = card.labelIds
    .map((id) => labels.find((l) => l.id === id))
    .filter((l): l is Label => l !== undefined);

  return (
    <>
      {cardLabels.length > 0 && (
        <div className="card__labels">
          {cardLabels.map((label) => (
            <LabelChip key={label.id} label={label} />
          ))}
        </div>
      )}
      <h3 className="card__title">{card.title}</h3>
      {card.description && <p className="card__desc">{card.description}</p>}
    </>
  );
}

interface CardTileProps extends CardFaceProps {
  columnId: string;
  onOpen: (cardId: string) => void;
}

/** Tarjeta del tablero: se arrastra con ratón, dedo o teclado (espacio) y se abre con clic o Intro. */
export function CardTile({ card, labels, columnId, onOpen }: CardTileProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: card.id,
    data: { type: 'card', columnId },
    attributes: { roleDescription: 'tarjeta arrastrable' },
  });

  return (
    <li
      ref={setNodeRef}
      className="column__item"
      style={{ transform: CSS.Translate.toString(transform), transition }}
    >
      <article
        {...attributes}
        {...listeners}
        aria-label={card.title}
        className={isDragging ? 'card card--placeholder' : 'card'}
        onClick={() => onOpen(card.id)}
        onKeyDown={(event) => {
          listeners?.onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === 'Enter') onOpen(card.id);
        }}
      >
        <CardFace card={card} labels={labels} />
      </article>
    </li>
  );
}
