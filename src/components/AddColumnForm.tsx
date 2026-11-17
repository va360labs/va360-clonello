import { useRef, useState, type FormEvent } from 'react';
import { addColumn } from '../board/actions';
import { useBoard } from '../state/BoardProvider';
import { PlusIcon } from './icons';

/** Última calle del tablero: crea columnas nuevas al final. */
export function AddColumnForm() {
  const { dispatch } = useBoard();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const laneRef = useRef<HTMLDivElement>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    dispatch(addColumn(title));
    setTitle('');
    requestAnimationFrame(() => laneRef.current?.scrollIntoView?.({ inline: 'end', block: 'nearest' }));
  }

  function close() {
    setOpen(false);
    setTitle('');
  }

  return (
    <div className="new-column" ref={laneRef}>
      {open ? (
        <form className="add-form new-column__form" onSubmit={submit}>
          <input
            className="field"
            aria-label="Nombre de la nueva columna"
            placeholder="Nombre de la columna"
            value={title}
            autoFocus
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') close();
            }}
          />
          <div className="add-form__actions">
            <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
              Crear columna
            </button>
            <button type="button" className="btn btn--ghost" onClick={close}>
              Cancelar
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="new-column__button" onClick={() => setOpen(true)}>
          <PlusIcon width={16} height={16} />
          Nueva columna
        </button>
      )}
    </div>
  );
}
