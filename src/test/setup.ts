import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  // El tema se aplica en <html>, fuera del árbol que limpia cleanup().
  document.documentElement.removeAttribute('data-tema');
});
