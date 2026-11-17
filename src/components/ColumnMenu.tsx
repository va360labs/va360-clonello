import { useEffect, useRef, useState } from 'react';
import type { Column } from '../board/types';
import { useBoard } from '../state/BoardProvider';
import { MoreIcon } from './icons';

interface ColumnMenuProps {
  column: Column;
  index: number;
  total: number;
  onRename: () => void;
}

/** Opciones de una columna: renombrar, moverla a un lado u otro y borrarla. */
export function ColumnMenu({ column, index, total, onRename }: ColumnMenuProps) {
  const { dispatch } = useBoard();
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function close() {
    setOpen(false);
    setConfirming(false);
  }

  function move(toIndex: number) {
    dispatch({ type: 'column/move', columnId: column.id, toIndex });
    close();
  }

  const count = column.cardIds.length;
  const question =
    count === 0
      ? `¿Borrar la columna «${column.title}»?`
      : `¿Borrar «${column.title}» y ${count === 1 ? 'su tarjeta' : `sus ${count} tarjetas`}?`;

  return (
    <div className="menu" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="icon-btn"
        aria-label={`Opciones de la columna ${column.title}`}
        aria-expanded={open}
        onClick={() => (open ? close() : setOpen(true))}
      >
        <MoreIcon />
      </button>

      {open && (
        <div className="menu__panel">
          {confirming ? (
            <div className="menu__confirm">
              <p>{question}</p>
              <p className="menu__hint">No se puede deshacer.</p>
              <div className="menu__confirm-actions">
                <button
                  type="button"
                  className="btn btn--danger-solid"
                  autoFocus
                  onClick={() => dispatch({ type: 'column/delete', columnId: column.id })}
                >
                  Borrar columna
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <ul className="menu__list">
              <li>
                <button
                  type="button"
                  className="menu__item"
                  onClick={() => {
                    close();
                    onRename();
                  }}
                >
                  Renombrar
                </button>
              </li>
              <li>
                <button type="button" className="menu__item" disabled={index === 0} onClick={() => move(index - 1)}>
                  Mover a la izquierda
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className="menu__item"
                  disabled={index === total - 1}
                  onClick={() => move(index + 1)}
                >
                  Mover a la derecha
                </button>
              </li>
              <li>
                <button type="button" className="menu__item menu__item--danger" onClick={() => setConfirming(true)}>
                  Borrar columna
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
