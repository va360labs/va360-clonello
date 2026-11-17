import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import { boardReducer, type BoardAction } from '../board/reducer';
import { browserStorage, loadBoard, saveBoard, type LoadResult, type StorageLike } from '../board/storage';
import type { Board } from '../board/types';

interface BoardContextValue {
  board: Board;
  dispatch: Dispatch<BoardAction>;
  /** Cómo se cargó el tablero al abrir la app (para avisar si hubo que recuperar). */
  loadResult: Pick<LoadResult, 'origin' | 'problems'>;
}

const BoardContext = createContext<BoardContextValue | null>(null);

interface BoardProviderProps {
  children: ReactNode;
  /** Por defecto, localStorage del navegador. Las pruebas pueden pasar otro. */
  storage?: StorageLike | null;
}

/** Une el reducer puro con localStorage: carga al montar y guarda cada cambio. */
export function BoardProvider({ children, storage }: BoardProviderProps) {
  const [store] = useState(() => (storage === undefined ? browserStorage() : storage));
  const [initial] = useState(() => loadBoard(store));
  const [board, dispatch] = useReducer(boardReducer, initial.board);

  useEffect(() => {
    saveBoard(store, board);
  }, [store, board]);

  return (
    <BoardContext.Provider
      value={{ board, dispatch, loadResult: { origin: initial.origin, problems: initial.problems } }}
    >
      {children}
    </BoardContext.Provider>
  );
}

export function useBoard(): BoardContextValue {
  const value = useContext(BoardContext);
  if (!value) throw new Error('useBoard debe usarse dentro de <BoardProvider>');
  return value;
}
