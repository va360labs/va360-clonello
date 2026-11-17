import logo from '../assets/logo-va360.png';
import type { Theme } from '../preferencias/tema';
import { MoonIcon, SunIcon } from './icons';
import './Header.css';

interface HeaderProps {
  theme: Theme;
  onToggleTheme: () => void;
}

export function Header({ theme, onToggleTheme }: HeaderProps) {
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
