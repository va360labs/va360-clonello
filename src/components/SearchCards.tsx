import { useRef } from 'react';
import { CloseIcon, SearchIcon } from './icons';
import './SearchCards.css';

interface SearchFieldProps {
  query: string;
  onChange: (query: string) => void;
  searching: boolean;
}

/**
 * Campo para buscar tarjetas por título o descripción. Solo cambia lo que se ve:
 * el texto vive en el estado de BoardView y no se guarda.
 */
export function SearchField({ query, onChange, searching }: SearchFieldProps) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="search" role="search">
      <div className="search__box">
        <SearchIcon className="search__icon" width={16} height={16} />
        <input
          ref={input}
          type="search"
          className="field search__input"
          aria-label="Buscar tarjetas"
          aria-describedby="buscar-ayuda"
          placeholder="Buscar tarjetas"
          autoComplete="off"
          spellCheck={false}
          value={query}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape' && query) {
              e.preventDefault();
              onChange('');
            }
          }}
        />
        {query && (
          <button type="button" className="icon-btn search__clear" aria-label="Borrar la búsqueda" onClick={() => {
              onChange('');
              input.current?.focus();
            }}>
            <CloseIcon width={16} height={16} />
          </button>
        )}
      </div>
      <p id="buscar-ayuda" className="search__hint">
        {searching
          ? 'Mientras buscas no se pueden mover ni añadir tarjetas.'
          : 'Busca en el título y la descripción.'}
      </p>
    </div>
  );
}

/** Región que anuncia el resultado de la búsqueda. Siempre está en la página para que los lectores de pantalla la oigan. */
export function SearchStatus({ searching, matches }: { searching: boolean; matches: number }) {
  return (
    <div role="status" className={searching && matches === 0 ? 'notice search__none' : undefined}>
      {searching &&
        (matches === 0 ? (
          'Ninguna tarjeta coincide con la búsqueda.'
        ) : (
          <span className="visually-hidden">
            {matches === 1 ? '1 tarjeta coincide con la búsqueda.' : `${matches} tarjetas coinciden con la búsqueda.`}
          </span>
        ))}
    </div>
  );
}
