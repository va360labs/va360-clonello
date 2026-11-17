import { useState, type CSSProperties, type FormEvent } from 'react';
import { addLabel } from '../board/actions';
import { LABEL_COLORS, type Card, type LabelColor } from '../board/types';
import { useBoard } from '../state/BoardProvider';
import { CheckIcon, PlusIcon } from './icons';
import { LABEL_COLOR_NAMES, LABEL_HEX } from './labelColors';

/** Etiquetas del tablero como interruptores, más un formulario para crear una nueva. */
export function LabelPicker({ card }: { card: Card }) {
  const { board, dispatch } = useBoard();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<LabelColor>('azul');

  const nameTaken = board.labels.some(
    (l) => l.name.toLocaleLowerCase('es') === name.trim().toLocaleLowerCase('es'),
  );

  function create(event: FormEvent) {
    event.preventDefault();
    if (!name.trim() || nameTaken) return;
    const action = addLabel(name, color);
    dispatch(action);
    if (action.type === 'label/add') dispatch({ type: 'card/toggleLabel', cardId: card.id, labelId: action.id });
    setName('');
    setCreating(false);
  }

  return (
    <div className="label-picker">
      <ul className="label-picker__list">
        {board.labels.map((label) => {
          const on = card.labelIds.includes(label.id);
          return (
            <li key={label.id}>
              <button
                type="button"
                className="label-toggle"
                aria-pressed={on}
                style={{ '--label': LABEL_HEX[label.color] } as CSSProperties}
                onClick={() => dispatch({ type: 'card/toggleLabel', cardId: card.id, labelId: label.id })}
              >
                <span className="label-toggle__dot" aria-hidden="true">
                  {on && <CheckIcon width={11} height={11} strokeWidth={3.2} />}
                </span>
                {label.name}
              </button>
            </li>
          );
        })}
        {!creating && (
          <li>
            <button type="button" className="label-toggle label-toggle--new" onClick={() => setCreating(true)}>
              <PlusIcon width={14} height={14} />
              Nueva etiqueta
            </button>
          </li>
        )}
      </ul>

      {creating && (
        <form className="label-form" onSubmit={create}>
          <input
            className="field"
            aria-label="Nombre de la etiqueta"
            placeholder="Nombre de la etiqueta"
            value={name}
            autoFocus
            maxLength={24}
            onChange={(e) => setName(e.target.value)}
          />
          <fieldset className="label-form__colors">
            <legend className="visually-hidden">Color</legend>
            {LABEL_COLORS.map((c) => (
              <label key={c} className="swatch" style={{ '--label': LABEL_HEX[c] } as CSSProperties}>
                <input
                  type="radio"
                  name="label-color"
                  value={c}
                  checked={color === c}
                  onChange={() => setColor(c)}
                  aria-label={LABEL_COLOR_NAMES[c]}
                />
                <span aria-hidden="true" />
              </label>
            ))}
          </fieldset>
          {nameTaken && <p className="label-form__error">Ya hay una etiqueta con ese nombre.</p>}
          <div className="add-form__actions">
            <button type="submit" className="btn btn--primary" disabled={!name.trim() || nameTaken}>
              Crear etiqueta
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setCreating(false)}>
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
