import { useState, type FormEvent } from 'react';
import { addCard } from '../board/actions';
import { useBoard } from '../state/BoardProvider';
import { PlusIcon } from './icons';

/** Botón «Añadir tarjeta» que se convierte en un campo para escribir el título. */
export function AddCardForm({ columnId, columnTitle }: { columnId: string; columnTitle: string }) {
  const { dispatch } = useBoard();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');

  function submit(event?: FormEvent) {
    event?.preventDefault();
    if (!title.trim()) return;
    dispatch(addCard(columnId, title));
    setTitle('');
  }

  function close() {
    setOpen(false);
    setTitle('');
  }

  if (!open) {
    return (
      <button type="button" className="btn btn--ghost column__add" onClick={() => setOpen(true)}>
        <PlusIcon width={16} height={16} />
        Añadir tarjeta
      </button>
    );
  }

  return (
    <form className="add-form" onSubmit={submit}>
      <textarea
        className="field"
        aria-label={`Título de la nueva tarjeta en ${columnTitle}`}
        placeholder="¿Qué hay que hacer?"
        rows={2}
        value={title}
        autoFocus
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) submit(e);
          if (e.key === 'Escape') close();
        }}
      />
      <div className="add-form__actions">
        <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
          Añadir
        </button>
        <button type="button" className="btn btn--ghost" onClick={close}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
