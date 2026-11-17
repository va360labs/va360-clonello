import { useRef, useState } from 'react';
import { findColumnOfCard } from '../board/reducer';
import type { Card } from '../board/types';
import { useBoard } from '../state/BoardProvider';
import { CloseIcon, TrashIcon } from './icons';
import { LabelPicker } from './LabelPicker';
import { Modal } from './Modal';
import './CardModal.css';

interface CardModalProps {
  card: Card;
  onClose: () => void;
}

/** Detalle de una tarjeta. Título y descripción se guardan al salir del campo o al cerrar. */
export function CardModal({ card, onClose }: CardModalProps) {
  const { board, dispatch } = useBoard();
  const [title, setTitle] = useState(card.title);
  const [description, setDescription] = useState(card.description);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const drafts = useRef({ title, description });
  drafts.current = { title, description };

  const column = findColumnOfCard(board, card.id);
  const headingId = `detalle-${card.id}`;

  function commit() {
    dispatch({ type: 'card/update', cardId: card.id, changes: drafts.current });
  }

  function commitAndClose() {
    commit();
    onClose();
  }

  function moveTo(columnId: string) {
    const target = board.columns.find((c) => c.id === columnId);
    if (target) dispatch({ type: 'card/move', cardId: card.id, toColumnId: columnId, toIndex: target.cardIds.length });
  }

  return (
    <Modal labelledBy={headingId} onClose={commitAndClose}>
      <div className="card-modal">
        <h2 id={headingId} className="visually-hidden">
          {card.title}
        </h2>

        <div className="card-modal__top">
          <label className="card-modal__column">
            <span>Columna</span>
            <select className="field" value={column?.id} onChange={(e) => moveTo(e.target.value)}>
              {board.columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="icon-btn" aria-label="Cerrar" onClick={commitAndClose}>
            <CloseIcon />
          </button>
        </div>

        <textarea
          className="card-modal__title"
          aria-label="Título de la tarjeta"
          rows={2}
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/\n/g, ' '))}
          onBlur={() => {
            if (!title.trim()) setTitle(card.title);
            commit();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
        />

        <section className="card-modal__section" aria-labelledby={`${headingId}-etiquetas`}>
          <h3 id={`${headingId}-etiquetas`} className="card-modal__section-title">
            Etiquetas
          </h3>
          <LabelPicker card={card} />
        </section>

        <section className="card-modal__section">
          <h3 className="card-modal__section-title">
            <label htmlFor={`${headingId}-fecha`}>Fecha límite</label>
          </h3>
          <div className="card-modal__due">
            <input
              id={`${headingId}-fecha`}
              type="date"
              className="field card-modal__due-input"
              value={card.dueDate ?? ''}
              onChange={(e) => dispatch({ type: 'card/setDueDate', cardId: card.id, dueDate: e.target.value || null })}
            />
            {card.dueDate && (
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => dispatch({ type: 'card/setDueDate', cardId: card.id, dueDate: null })}
              >
                Quitar fecha
              </button>
            )}
          </div>
        </section>

        <section className="card-modal__section">
          <h3 className="card-modal__section-title">
            <label htmlFor={`${headingId}-descripcion`}>Descripción</label>
          </h3>
          <textarea
            id={`${headingId}-descripcion`}
            className="field card-modal__desc"
            rows={6}
            placeholder="Añade más detalles para el equipo"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onBlur={commit}
          />
        </section>

        <footer className="card-modal__footer">
          {confirmingDelete ? (
            <div className="card-modal__confirm" role="group" aria-label="Confirmar borrado">
              <p>¿Borrar esta tarjeta? No se puede deshacer.</p>
              <button
                type="button"
                className="btn btn--danger-solid"
                autoFocus
                onClick={() => {
                  dispatch({ type: 'card/delete', cardId: card.id });
                  onClose();
                }}
              >
                Sí, borrar
              </button>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmingDelete(false)}>
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" className="btn btn--danger" onClick={() => setConfirmingDelete(true)}>
              <TrashIcon width={16} height={16} />
              Borrar tarjeta
            </button>
          )}
          {!confirmingDelete && (
            <button type="button" className="btn btn--primary" onClick={commitAndClose}>
              Listo
            </button>
          )}
        </footer>
      </div>
    </Modal>
  );
}
