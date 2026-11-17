import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { formatDueDate, isOverdue, toIsoDate } from '../board/dueDate';
import type { Card, Label } from '../board/types';
import { CalendarIcon } from './icons';
import { LabelChip } from './LabelChip';
import './CardTile.css';

interface CardFaceProps {
  card: Card;
  labels: Label[];
  /** Id para la fecha límite, si la tarjeta la usa como descripción accesible. */
  dueDateId?: string;
}

/** Lo que se ve de una tarjeta. Lo usan la tarjeta del tablero y la que vuela al arrastrar. */
export function CardFace({ card, labels, dueDateId }: CardFaceProps) {
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
      {card.dueDate && <DueDate id={dueDateId} dueDate={card.dueDate} />}
    </>
  );
}

/** Fecha límite de la tarjeta. Si ya pasó, lo dice con color y con el texto «Vencida». */
function DueDate({ id, dueDate }: { id: string | undefined; dueDate: string }) {
  // La lógica no lee la hora: «hoy» se calcula aquí y se pasa a isOverdue.
  const today = toIsoDate(new Date());
  const overdue = isOverdue(dueDate, today);
  return (
    <p id={id} className={overdue ? 'card__due card__due--overdue' : 'card__due'}>
      <CalendarIcon width={14} height={14} />
      <span className="visually-hidden">Fecha límite: </span>
      <time dateTime={dueDate}>{formatDueDate(dueDate, today)}</time>
      {overdue && <span className="card__due-flag">Vencida</span>}
    </p>
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

  const dueDateId = `fecha-${card.id}`;

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
        aria-describedby={card.dueDate ? `${attributes['aria-describedby']} ${dueDateId}` : attributes['aria-describedby']}
        className={isDragging ? 'card card--placeholder' : 'card'}
        onClick={() => onOpen(card.id)}
        onKeyDown={(event) => {
          listeners?.onKeyDown?.(event);
          if (!event.defaultPrevented && event.key === 'Enter') onOpen(card.id);
        }}
      >
        <CardFace card={card} labels={labels} dueDateId={dueDateId} />
      </article>
    </li>
  );
}
