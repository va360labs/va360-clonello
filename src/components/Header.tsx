import logo from '../assets/logo-va360.png';
import { CSV_MIME, boardToCsv, csvFileName } from '../board/exportCsv';
import type { Board } from '../board/types';
import type { Theme } from '../preferencias/tema';
import { useBoard } from '../state/BoardProvider';
import { DownloadIcon, MoonIcon, SunIcon } from './icons';
import './Header.css';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
  const { board } = useBoard();
  const dark = theme === 'oscuro';
  return (
    <header className="header">
      <div className="header__brand">
        <img className="header__logo" src={logo} alt="VA360" width={125} height={24} />
        <span className="header__divider" aria-hidden="true" />
        <span className="header__product">Clonello</span>
      </div>
      <div className="header__actions">
        <p className="header__note">Los cambios se guardan en este navegador</p>
        <button type="button" className="header__export" onClick={() => downloadCsv(board)}>
          <DownloadIcon />
          <span className="header__export-text">Exportar tablero</span>
        </button>
        <button
          type="button"
          className="header__theme"
          onClick={onToggleTheme}
          aria-label={dark ? 'Activar modo claro' : 'Activar modo oscuro'}
          title={dark ? 'Modo claro' : 'Modo oscuro'}
        >
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  );
}

/** Descarga el tablero tal como está ahora en un archivo CSV. Solo lee el tablero. */
function downloadCsv(board: Board) {
  const blob = new Blob([boardToCsv(board)], { type: CSV_MIME });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = csvFileName(new Date());
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
