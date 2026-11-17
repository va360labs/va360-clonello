import logo from '../assets/logo-va360.png';
import { MoonIcon } from './icons';
import './Header.css';

interface HeaderProps {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({ darkMode, onToggleDarkMode }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__brand">
        <img className="header__logo" src={logo} alt="VA360" width={125} height={24} />
        <span className="header__divider" aria-hidden="true" />
        <span className="header__product">Clonello</span>
      </div>
      <div className="header__end">
        <p className="header__note">Los cambios se guardan en este navegador</p>
        <button type="button" className="header__theme" aria-pressed={darkMode} onClick={onToggleDarkMode}>
          <MoonIcon />
          <span className="header__theme-text">Modo oscuro</span>
        </button>
      </div>
    </header>
  );
}
