import logo from '../assets/logo-va360.png';
import './Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header__brand">
        <img className="header__logo" src={logo} alt="VA360" width={125} height={24} />
        <span className="header__dot" aria-hidden="true">
          ·
        </span>
        <span className="header__product">Clonello</span>
      </div>
      <p className="header__note">Los cambios se guardan en este navegador</p>
    </header>
  );
}
