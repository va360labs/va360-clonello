import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { App } from './App';
import { LEGACY_STORAGE_KEY, STORAGE_KEY } from './board/storage';
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

  describe('importar tarjetas', () => {
    const csvFile = (content: string, name = 'tarjetas.csv') => new File([content], name, { type: 'text/csv' });
    const fileInput = () => screen.getByLabelText('Archivo CSV con tarjetas');
    const cardCount = () => Object.keys(storedBoard().cards).length;
    // dnd-kit tiene su propia región role="status" (vacía) para los anuncios del arrastre.
    const notices = () => screen.queryAllByRole('status').filter((el) => el.textContent?.trim());
    const findNotice = () =>
      waitFor(() => {
        const [notice] = notices();
        if (!notice) throw new Error('No hay aviso');
        return notice;
      });

    async function importFile(user: ReturnType<typeof userEvent.setup>, file: File) {
      const button = screen.getByRole('button', { name: 'Importar tarjetas' });
      await user.click(button);
      await user.upload(fileInput(), file);
    }

    it('hay un botón «Importar tarjetas» al que se llega con el teclado', async () => {
      const user = userEvent.setup();
      render(<App />);
      const button = screen.getByRole('button', { name: 'Importar tarjetas' });
      await user.tab();
      await user.tab();
      expect(button).toHaveFocus();
    });

    it('importar un CSV crea las tarjetas', async () => {
      const user = userEvent.setup();
      render(<App />);
      const antes = cardCount();
      await importFile(
        user,
        csvFile(
          '﻿Título;Descripción;Columna\r\nPublicar en redes;"Instagram, Facebook";Hecho\r\nRevisar textos;;\r\nMedir visitas;;hecho\r\n',
        ),
      );

      const status = await findNotice();
      expect(status).toHaveTextContent('Se han importado 3 tarjetas.');
      const hecho = column('Hecho');
      expect(within(hecho).getByRole('button', { name: 'Publicar en redes' })).toBeInTheDocument();
      expect(within(hecho).getByRole('button', { name: 'Medir visitas' })).toBeInTheDocument();
      expect(within(hecho).getAllByRole('listitem')).toHaveLength(5);
      expect(within(column('Ideas')).getByRole('button', { name: 'Revisar textos' })).toBeInTheDocument();
      expect(within(screen.getByRole('button', { name: 'Publicar en redes' })).getByText('Instagram, Facebook')).toBeInTheDocument();
      expect(cardCount()).toBe(antes + 3);
    });

    it('un CSV con filas erróneas avisa en español', async () => {
      const user = userEvent.setup();
      render(<App />);
      await importFile(user, csvFile('titulo,descripcion\nBuena,\n,Sin título\nOtra buena,\n,Tampoco\n'));
      const status = await findNotice();
      expect(status).toHaveTextContent('Se han importado 2 tarjetas.');
      expect(status).toHaveTextContent('Se han saltado 2 filas sin título (filas 3 y 5).');
      expect(screen.getByRole('button', { name: 'Buena' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Otra buena' })).toBeInTheDocument();
    });

    it('un archivo que no es un CSV válido no cambia el tablero', async () => {
      const user = userEvent.setup();
      render(<App />);
      const antes = window.localStorage.getItem(STORAGE_KEY);
      await importFile(user, csvFile('nombre;precio\nCafé;1,20\n'));
      const status = await findNotice();
      expect(status).toHaveTextContent(/No se ha importado nada/);
      expect(status).toHaveTextContent(/columna «titulo»/);
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(antes);
      expect(screen.queryByRole('button', { name: 'Café' })).not.toBeInTheDocument();

      await importFile(user, csvFile(''));
      expect(await screen.findByText(/El archivo está vacío/)).toBeInTheDocument();
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(antes);
    });

    it('se puede cerrar el aviso', async () => {
      const user = userEvent.setup();
      render(<App />);
      await importFile(user, csvFile('titulo\nUna\n'));
      await findNotice();
      await user.click(screen.getByRole('button', { name: 'Cerrar el aviso' }));
      expect(notices()).toEqual([]);
    });

    it('las tarjetas importadas se conservan al recargar', async () => {
      const data: Record<string, string> = {};
      const memory = {
        getItem: (key: string) => data[key] ?? null,
        setItem: (key: string, value: string) => {
          data[key] = value;
        },
      };
      const user = userEvent.setup();
      const { unmount } = render(<App storage={memory} />);
      await importFile(user, csvFile('titulo,columna\nViaje a Lisboa,Por hacer\nViaje a Oporto,Por hacer\n'));
      await findNotice();
      unmount();

      render(<App storage={memory} />);
      const porHacer = column('Por hacer');
      expect(within(porHacer).getByRole('button', { name: 'Viaje a Lisboa' })).toBeInTheDocument();
      expect(within(porHacer).getByRole('button', { name: 'Viaje a Oporto' })).toBeInTheDocument();
    });
  });

  describe('fecha límite', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    /** Fija «hoy» solo para Date, sin parar los temporizadores que usa user-event. */
    const fixToday = (iso: string) => {
      vi.useFakeTimers({ toFake: ['Date'] });
      vi.setSystemTime(new Date(`${iso}T10:00:00`));
    };

    async function setDueDate(user: ReturnType<typeof userEvent.setup>, cardTitle: string, date: string) {
      await user.click(screen.getByRole('button', { name: cardTitle }));
      const dialog = screen.getByRole('dialog', { name: cardTitle });
      const input = within(dialog).getByLabelText('Fecha límite');
      await user.clear(input);
      await user.type(input, date);
      await user.click(within(dialog).getByRole('button', { name: 'Listo' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    }

    it('una tarjeta sin fecha no muestra nada', () => {
      fixToday('2026-11-17');
      render(<App />);
      const tile = screen.getByRole('button', { name: 'Formulario de contacto' });
      expect(within(tile).queryByText(/Fecha límite/)).not.toBeInTheDocument();
      expect(within(tile).queryByText('Vencida')).not.toBeInTheDocument();
    });

    it('poner una fecha desde el detalle', async () => {
      fixToday('2026-11-17');
      const user = userEvent.setup();
      render(<App />);
      await setDueDate(user, 'Formulario de contacto', '2026-11-20');
      const tile = screen.getByRole('button', { name: 'Formulario de contacto' });
      expect(within(tile).getByText('20 nov')).toBeInTheDocument();
      expect(within(tile).queryByText('Vencida')).not.toBeInTheDocument();
      const saved = storedBoard();
      const card = Object.values(saved.cards).find((c) => (c as { title: string }).title === 'Formulario de contacto');
      expect(card).toMatchObject({ dueDate: '2026-11-20' });
    });

    it('cambiar la fecha desde el detalle', async () => {
      fixToday('2026-11-17');
      const user = userEvent.setup();
      render(<App />);
      await setDueDate(user, 'Formulario de contacto', '2026-11-20');
      await setDueDate(user, 'Formulario de contacto', '2026-12-03');
      const tile = screen.getByRole('button', { name: 'Formulario de contacto' });
      expect(within(tile).getByText('3 dic')).toBeInTheDocument();
      expect(within(tile).queryByText('20 nov')).not.toBeInTheDocument();
    });

    it('una tarjeta vencida se nota', async () => {
      fixToday('2026-11-17');
      const user = userEvent.setup();
      render(<App />);
      await setDueDate(user, 'Formulario de contacto', '2026-11-16');
      await setDueDate(user, 'Elegir el alojamiento', '2026-11-25');
      await setDueDate(user, 'Mapa de páginas de la web', '2026-11-17');

      const vencida = screen.getByRole('button', { name: 'Formulario de contacto' });
      expect(within(vencida).getByText('Vencida')).toBeInTheDocument();
      expect(within(vencida).getByText('16 nov')).toBeInTheDocument();
      // El lector de pantalla lo lee junto a la tarjeta.
      expect(vencida).toHaveAccessibleDescription(/Vencida/);

      const futura = screen.getByRole('button', { name: 'Elegir el alojamiento' });
      expect(within(futura).getByText('25 nov')).toBeInTheDocument();
      expect(within(futura).queryByText('Vencida')).not.toBeInTheDocument();

      const hoy = screen.getByRole('button', { name: 'Mapa de páginas de la web' });
      expect(within(hoy).queryByText('Vencida')).not.toBeInTheDocument();

      expect(screen.getAllByText('Vencida')).toHaveLength(1);
    });

    it('quitar la fecha', async () => {
      fixToday('2026-11-17');
      const user = userEvent.setup();
      render(<App />);
      await setDueDate(user, 'Formulario de contacto', '2026-11-20');

      await user.click(screen.getByRole('button', { name: 'Formulario de contacto' }));
      const dialog = screen.getByRole('dialog', { name: 'Formulario de contacto' });
      await user.click(within(dialog).getByRole('button', { name: 'Quitar fecha' }));
      expect(within(dialog).getByLabelText('Fecha límite')).toHaveValue('');
      expect(within(dialog).queryByRole('button', { name: 'Quitar fecha' })).not.toBeInTheDocument();
      await user.click(within(dialog).getByRole('button', { name: 'Listo' }));

      const tile = screen.getByRole('button', { name: 'Formulario de contacto' });
      expect(within(tile).queryByText('20 nov')).not.toBeInTheDocument();
    });

    it('la fecha sobrevive al recargar', async () => {
      fixToday('2026-11-17');
      const user = userEvent.setup();
      const { unmount } = render(<App />);
      await setDueDate(user, 'Formulario de contacto', '2026-11-20');
      unmount();
      expect(JSON.parse(window.localStorage.getItem('clonello:v2')!).version).toBe(2);

      render(<App />);
      const tile = screen.getByRole('button', { name: 'Formulario de contacto' });
      expect(within(tile).getByText('20 nov')).toBeInTheDocument();
    });

    it('un tablero guardado con la versión 1 se conserva al actualizar', () => {
      const v1 = {
        version: 1,
        board: {
          title: 'Mi tablero de antes',
          labels: [],
          columns: [{ id: 'c-1', title: 'Pendiente', cardIds: ['k-1'] }],
          cards: { 'k-1': { id: 'k-1', title: 'Tarea antigua', description: '', labelIds: [] } },
        },
      };
      window.localStorage.setItem(LEGACY_STORAGE_KEY, JSON.stringify(v1));
      render(<App />);
      expect(screen.getByRole('heading', { level: 1, name: 'Mi tablero de antes' })).toBeInTheDocument();
      expect(within(column('Pendiente')).getByRole('button', { name: 'Tarea antigua' })).toBeInTheDocument();
      expect(screen.queryByText(/No se pudieron leer/)).not.toBeInTheDocument();
      expect(storedBoard().cards['k-1']).toMatchObject({ dueDate: null });
      expect(JSON.parse(window.localStorage.getItem(LEGACY_STORAGE_KEY)!)).toEqual(v1);
    });
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
