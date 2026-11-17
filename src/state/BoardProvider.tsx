import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  useState,
  type Dispatch,
  type ReactNode,
} from 'react';
import { workspaceReducer, type WorkspaceAction } from '../board/reducer';
import { browserStorage, loadWorkspace, saveWorkspace, type LoadResult, type StorageLike } from '../board/storage';
import type { BoardEntry } from '../board/types';

interface BoardContextValue {
  /** El tablero abierto. */
  board: BoardEntry;
  /** Todos los tableros, en el orden del selector. */
  boards: BoardEntry[];
  dispatch: Dispatch<WorkspaceAction>;
  /** Cómo se cargaron los datos al abrir la app (para avisar si hubo que recuperar). */
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
  const [initial] = useState(() => loadWorkspace(store));
  const [workspace, dispatch] = useReducer(workspaceReducer, initial.workspace);

  useEffect(() => {
    saveWorkspace(store, workspace);
  }, [store, workspace]);

  // El reducer garantiza que el abierto existe; el primero es solo una red de seguridad.
  const board = workspace.boards.find((b) => b.id === workspace.activeBoardId) ?? workspace.boards[0]!;

  return (
    <BoardContext.Provider
      value={{
        board,
        boards: workspace.boards,
        dispatch,
        loadResult: { origin: initial.origin, problems: initial.problems },
      }}
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
