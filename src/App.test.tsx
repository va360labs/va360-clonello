import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { STORAGE_KEY } from './board/storage';
import { PREFERENCES_KEY } from './preferencias/tema';

const column = (name: string) => screen.getByRole('region', { name });
const storedBoard = () => JSON.parse(window.localStorage.getItem(STORAGE_KEY)!).board;

describe('App', () => {
  it('muestra el tablero de ejemplo la primera vez', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: 'Lanzamiento de la web de Brisa Viajes' })).toBeInTheDocument();
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(['Ideas', 'Por hacer', 'En curso', 'Hecho']);
    const perColumn = titles.map((name) => within(column(name!)).getAllByRole('listitem').length);
    expect(perColumn).toEqual([3, 3, 3, 3]);
    const tile = screen.getByRole('button', { name: 'Formulario de contacto' });
    expect(within(tile).getByText('Desarrollo')).toBeInTheDocument();
  });

  it('añade una tarjeta a una columna y la guarda', async () => {
    const user = userEvent.setup();
    render(<App />);
    const hecho = column('Hecho');
    await user.click(within(hecho).getByRole('button', { name: 'Añadir tarjeta' }));
    await user.type(within(hecho).getByRole('textbox', { name: /nueva tarjeta/ }), 'Publicar la web{Enter}');
    expect(within(hecho).getByRole('button', { name: 'Publicar la web' })).toBeInTheDocument();
    const saved = storedBoard();
    const hechoIds: string[] = saved.columns.find((c: { title: string }) => c.title === 'Hecho').cardIds;
    expect(hechoIds.map((id) => saved.cards[id].title)).toContain('Publicar la web');
  });

  it('crea, renombra y borra una columna', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Nueva columna' }));
    await user.type(screen.getByRole('textbox', { name: 'Nombre de la nueva columna' }), 'Revisión{Enter}');
    expect(column('Revisión')).toBeInTheDocument();

    await user.click(within(column('Revisión')).getByRole('button', { name: 'Revisión' }));
    const input = screen.getByRole('textbox', { name: 'Nombre de la columna' });
    await user.clear(input);
    await user.type(input, 'Pruebas{Enter}');
    expect(column('Pruebas')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Opciones de la columna Pruebas' }));
    await user.click(screen.getByRole('button', { name: 'Borrar columna' }));
    expect(screen.getByText('¿Borrar la columna «Pruebas»?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Borrar columna' }));
    expect(screen.queryByRole('region', { name: 'Pruebas' })).not.toBeInTheDocument();
  });

  it('pide confirmación antes de borrar una columna con tarjetas', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Opciones de la columna Ideas' }));
    await user.click(screen.getByRole('button', { name: 'Borrar columna' }));
    expect(screen.getByText('¿Borrar «Ideas» y sus 3 tarjetas?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Cancelar' }));
    expect(column('Ideas')).toBeInTheDocument();
  });

  it('mueve una columna con el menú', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Opciones de la columna Hecho' }));
    expect(screen.getByRole('button', { name: 'Mover a la derecha' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Mover a la izquierda' }));
    const titles = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(titles).toEqual(['Ideas', 'Por hacer', 'Hecho', 'En curso']);
  });

  it('edita una tarjeta en el detalle: título, descripción y etiquetas', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Formulario de contacto' }));
    const dialog = screen.getByRole('dialog', { name: 'Formulario de contacto' });

    const title = within(dialog).getByRole('textbox', { name: 'Título de la tarjeta' });
    await user.clear(title);
    await user.type(title, 'Formulario de reservas');
    await user.type(within(dialog).getByRole('textbox', { name: 'Descripción' }), ' Con aviso por correo.');

    const urgente = within(dialog).getByRole('button', { name: 'Urgente' });
    expect(urgente).toHaveAttribute('aria-pressed', 'false');
    await user.click(urgente);
    expect(urgente).toHaveAttribute('aria-pressed', 'true');

    await user.click(within(dialog).getByRole('button', { name: 'Listo' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    const tile = screen.getByRole('button', { name: 'Formulario de reservas' });
    expect(within(tile).getByText('Urgente')).toBeInTheDocument();
    expect(within(tile).getByText(/Con aviso por correo\.$/)).toBeInTheDocument();
  });

  it('crea una etiqueta nueva desde el detalle y se la pone a la tarjeta', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Elegir el alojamiento' }));
    const dialog = screen.getByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: 'Nueva etiqueta' }));
    await user.type(within(dialog).getByRole('textbox', { name: 'Nombre de la etiqueta' }), 'Legal');
    await user.click(within(dialog).getByRole('radio', { name: 'Rosa' }));
    await user.click(within(dialog).getByRole('button', { name: 'Crear etiqueta' }));
    expect(within(dialog).getByRole('button', { name: 'Legal' })).toHaveAttribute('aria-pressed', 'true');
    expect(storedBoard().labels.at(-1)).toMatchObject({ name: 'Legal', color: 'rosa' });
  });

  it('cierra el detalle con Escape y guarda lo escrito', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Boletín mensual con ofertas' }));
    const description = screen.getByRole('textbox', { name: 'Descripción' });
    await user.clear(description);
    await user.type(description, 'Primer envío en enero.');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByText('Primer envío en enero.')).toBeInTheDocument();
  });

  it('borra una tarjeta desde el detalle tras confirmar', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.click(screen.getByRole('button', { name: 'Mapa de páginas de la web' }));
    await user.click(screen.getByRole('button', { name: 'Borrar tarjeta' }));
    await user.click(screen.getByRole('button', { name: 'Sí, borrar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Mapa de páginas de la web' })).not.toBeInTheDocument();
    expect(Object.values(storedBoard().cards).map((c) => (c as { title: string }).title)).not.toContain(
      'Mapa de páginas de la web',
    );
  });

  it('conserva los cambios al volver a abrir la app', async () => {
    const user = userEvent.setup();
    const { unmount } = render(<App />);
    await user.click(within(column('Ideas')).getByRole('button', { name: 'Añadir tarjeta' }));
    await user.type(screen.getByRole('textbox', { name: /nueva tarjeta/ }), 'Sorteo de un viaje{Enter}');
    unmount();
    render(<App />);
    expect(within(column('Ideas')).getByRole('button', { name: 'Sorteo de un viaje' })).toBeInTheDocument();
  });

  it('avisa si los datos guardados estaban rotos y carga los de ejemplo', () => {
    window.localStorage.setItem(STORAGE_KEY, '{roto');
    render(<App />);
    expect(screen.getByText(/No se pudieron leer los datos guardados/)).toBeInTheDocument();
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4);
  });

  describe('modo oscuro', () => {
    // La cabecera de la app es la primera: jsdom también da rol banner a las cabeceras de columna.
    const banner = () => screen.getAllByRole('banner')[0]!;
    const temaDelHtml = () => document.documentElement.getAttribute('data-tema');

    it('hay un botón para activar el modo oscuro', () => {
      render(<App />);
      expect(within(banner()).getByRole('button', { name: 'Activar modo oscuro' })).toBeInTheDocument();
      expect(temaDelHtml()).not.toBe('oscuro');
    });

    it('al pulsarlo cambia el tema y el botón', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.click(within(banner()).getByRole('button', { name: 'Activar modo oscuro' }));
      expect(temaDelHtml()).toBe('oscuro');
      const volver = within(banner()).getByRole('button', { name: 'Activar modo claro' });
      await user.click(volver);
      expect(temaDelHtml()).toBe('claro');
      expect(within(banner()).getByRole('button', { name: 'Activar modo oscuro' })).toBeInTheDocument();
    });

    it('el tema se recuerda al volver', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<App />);
      await user.click(within(banner()).getByRole('button', { name: 'Activar modo oscuro' }));
      unmount();
      document.documentElement.removeAttribute('data-tema');

      expect(window.localStorage.getItem(PREFERENCES_KEY)).toBe('{"tema":"oscuro"}');
      render(<App />);
      expect(temaDelHtml()).toBe('oscuro');
      expect(within(banner()).getByRole('button', { name: 'Activar modo claro' })).toBeInTheDocument();
    });

    it('cambiar el tema no toca el tablero', async () => {
      const user = userEvent.setup();
      render(<App />);
      const antes = window.localStorage.getItem(STORAGE_KEY);
      expect(antes).not.toBeNull();
      await user.click(within(banner()).getByRole('button', { name: 'Activar modo oscuro' }));
      await user.click(within(banner()).getByRole('button', { name: 'Activar modo claro' }));
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(antes);
    });

    it('sin localStorage arranca en claro y el botón sigue funcionando', async () => {
      const user = userEvent.setup();
      render(<App storage={null} />);
      await user.click(within(banner()).getByRole('button', { name: 'Activar modo oscuro' }));
      expect(temaDelHtml()).toBe('oscuro');
    });
  });
});
