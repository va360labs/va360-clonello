import logo from '../assets/logo-va360.png';
import { boardCsvFile } from '../board/export';
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
  const dark = theme === 'oscuro';
  const { board } = useBoard();
  return (
    <header className="header">
      <div className="header__brand">
        <img className="header__logo" src={logo} alt="VA360" width={125} height={24} />
        <span className="header__divider" aria-hidden="true" />
        <span className="header__product">Clonello</span>
      </div>
      <div className="header__actions">
        <p className="header__note">Los cambios se guardan en este navegador</p>
        <button
          type="button"
          className="header__export"
          onClick={() => downloadBoardCsv(board)}
          aria-label="Exportar tablero"
          title="Descargar las tarjetas en un archivo para Excel"
        >
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

/** Descarga el tablero como CSV en el propio navegador, sin enviar nada a ningún servidor. */
function downloadBoardCsv(board: Board) {
  const file = boardCsvFile(board);
  const url = URL.createObjectURL(new Blob([file.content], { type: file.type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
