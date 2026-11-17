import { useEffect, useRef, useState, type FormEvent } from 'react';
import { createBoard } from '../board/actions';
import { useBoard } from '../state/BoardProvider';
import { CheckIcon, ChevronDownIcon, PlusIcon } from './icons';
import './BoardSwitcher.css';

type Mode = 'list' | 'create' | 'rename' | 'confirm';

/**
 * Control de tableros junto al título: lista para pasar de uno a otro, crear uno
 * nuevo y renombrar o borrar el abierto. Solo despacha acciones.
 */
export function BoardSwitcher() {
  const { board, boards, dispatch } = useBoard();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('list');
  const [title, setTitle] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeItemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) close();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // Al abrir la lista, el foco entra en el tablero abierto para moverse con Tab.
  useEffect(() => {
    if (open && mode === 'list') activeItemRef.current?.focus();
  }, [open, mode]);

  function close(returnFocus = false) {
    setOpen(false);
    setMode('list');
    setTitle('');
    if (returnFocus) triggerRef.current?.focus();
  }

  function select(boardId: string) {
    dispatch({ type: 'board/select', boardId });
    close(true);
  }

  function submitCreate(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    dispatch(createBoard(title));
    close(true);
  }

  function submitRename(event: FormEvent) {
    event.preventDefault();
    if (!title.trim()) return;
    dispatch({ type: 'board/rename', boardId: board.id, title });
    close(true);
  }

  function remove() {
    dispatch({ type: 'board/delete', boardId: board.id });
    close(true);
  }

  const onlyOne = boards.length === 1;

  return (
    <div className="menu board-switcher" ref={rootRef}>
      <button
        ref={triggerRef}
        type="button"
        className="board-switcher__trigger"
        aria-expanded={open}
        aria-controls={open ? 'board-switcher-panel' : undefined}
        onClick={() => (open ? close() : setOpen(true))}
      >
        Tableros
        <ChevronDownIcon width={16} height={16} />
      </button>

      {open && (
        <div id="board-switcher-panel" className="menu__panel board-switcher__panel" role="group" aria-label="Tableros">
          {mode === 'list' && (
            <>
              <p className="board-switcher__heading">Tus tableros</p>
              <ul className="menu__list board-switcher__boards">
                {boards.map((b) => {
                  const current = b.id === board.id;
                  return (
                    <li key={b.id}>
                      <button
                        ref={current ? activeItemRef : undefined}
                        type="button"
                        className="menu__item board-switcher__item"
                        aria-current={current ? 'true' : undefined}
                        onClick={() => (current ? close(true) : select(b.id))}
                      >
                        <span className="board-switcher__name">{b.title}</span>
                        {current && <CheckIcon width={16} height={16} />}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <ul className="menu__list board-switcher__actions">
                <li>
                  <button type="button" className="menu__item board-switcher__item" onClick={() => setMode('create')}>
                    <PlusIcon width={16} height={16} />
                    Nuevo tablero
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="menu__item"
                    onClick={() => {
                      setTitle(board.title);
                      setMode('rename');
                    }}
                  >
                    Renombrar tablero
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className="menu__item menu__item--danger"
                    disabled={onlyOne}
                    aria-describedby={onlyOne ? 'board-switcher-only' : undefined}
                    onClick={() => setMode('confirm')}
                  >
                    Borrar tablero
                  </button>
                  {onlyOne && (
                    <p id="board-switcher-only" className="menu__hint board-switcher__hint">
                      No se puede borrar el único tablero.
                    </p>
                  )}
                </li>
              </ul>
            </>
          )}

          {(mode === 'create' || mode === 'rename') && (
            <form className="add-form board-switcher__form" onSubmit={mode === 'create' ? submitCreate : submitRename}>
              <input
                className="field"
                aria-label={mode === 'create' ? 'Nombre del nuevo tablero' : 'Nombre del tablero'}
                placeholder="Nombre del tablero"
                value={title}
                autoFocus
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="add-form__actions">
                <button type="submit" className="btn btn--primary" disabled={!title.trim()}>
                  {mode === 'create' ? 'Crear tablero' : 'Guardar'}
                </button>
                <button
                  type="button"
                  className="btn btn--ghost"
                  onClick={() => {
                    setTitle('');
                    setMode('list');
                  }}
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {mode === 'confirm' && (
            <div className="menu__confirm">
              <p>¿Borrar el tablero «{board.title}» con todas sus columnas y tarjetas?</p>
              <p className="menu__hint">No se puede deshacer.</p>
              <div className="menu__confirm-actions">
                <button type="button" className="btn btn--danger-solid" autoFocus onClick={remove}>
                  Sí, borrar tablero
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setMode('list')}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
