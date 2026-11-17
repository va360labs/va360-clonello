import { useState } from 'react';
import { browserStorage, type StorageLike } from './board/storage';
import { BoardView } from './components/BoardView';
import { Header } from './components/Header';
import { useTheme } from './preferencias/useTheme';
import { BoardProvider, useBoard } from './state/BoardProvider';
import './App.css';

export function App({ storage }: { storage?: StorageLike | null }) {
  const [store] = useState(() => (storage === undefined ? browserStorage() : storage));
  const { theme, toggleTheme } = useTheme(store);
  return (
    <BoardProvider storage={store}>
      <div className="app">
        <Header theme={theme} onToggleTheme={toggleTheme} />
        <main className="app__main">
          <RecoveryNotice />
          <BoardView />
        </main>
      </div>
    </BoardProvider>
  );
}

/** Aviso si lo guardado en el navegador no se pudo leer y se cargaron los datos de ejemplo. */
function RecoveryNotice() {
  const { loadResult } = useBoard();
  const [visible, setVisible] = useState(loadResult.origin === 'recovered');
  if (!visible) return null;
  return (
    <div className="notice" role="status">
      <p>
        No se pudieron leer los datos guardados en este navegador, así que se han cargado los de ejemplo. Lo
        anterior queda copiado aparte por si hiciera falta recuperarlo.
      </p>
      <button type="button" className="btn btn--ghost" onClick={() => setVisible(false)}>
        Entendido
      </button>
    </div>
  );
}
