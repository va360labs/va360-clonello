import { describe, expect, it } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
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

  describe('buscador', () => {
    const searchbox = () => screen.getByRole('searchbox', { name: 'Buscar tarjetas' });
    const SEED_TITLES = 12;
    const visibleCards = () =>
      ['Ideas', 'Por hacer', 'En curso', 'Hecho'].flatMap((name) => within(column(name)).queryAllByRole('listitem'));

    it('hay un campo para buscar tarjetas', () => {
      render(<App />);
      expect(searchbox()).toHaveValue('');
      expect(searchbox()).toHaveAccessibleDescription(/título y la descripción/);
    });

    it('filtra las tarjetas al escribir', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.type(searchbox(), 'formulario');
      expect(screen.getByRole('button', { name: 'Página de viajes en grupo' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Formulario de contacto' })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: 'Elegir el alojamiento' })).not.toBeInTheDocument();
      expect(visibleCards()).toHaveLength(2);
    });

    it('al borrar la búsqueda vuelven todas', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.type(searchbox(), 'formulario');
      await user.clear(searchbox());
      expect(visibleCards()).toHaveLength(SEED_TITLES);
      const ideas = within(column('Ideas'))
        .getAllByRole('listitem')
        .map((item) => within(item).getByRole('button').getAttribute('aria-label'));
      expect(ideas).toEqual(['Página de viajes en grupo', 'Blog con guías de destinos', 'Boletín mensual con ofertas']);
    });

    it('Escape vacía la búsqueda', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.type(searchbox(), 'formulario');
      await user.keyboard('{Escape}');
      expect(searchbox()).toHaveValue('');
      expect(visibleCards()).toHaveLength(SEED_TITLES);
    });

    it('las columnas siguen visibles aunque no tengan resultados', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.type(searchbox(), 'Lisboa');
      for (const name of ['Ideas', 'Por hacer', 'En curso', 'Hecho']) expect(column(name)).toBeInTheDocument();
      expect(visibleCards()).toHaveLength(1);
    });

    it('avisa si no hay resultados', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.type(searchbox(), 'zzzz');
      const aviso = screen.getByText('Ninguna tarjeta coincide con la búsqueda.');
      expect(aviso.closest('[role="status"]')).not.toBeNull();
      expect(visibleCards()).toHaveLength(0);
    });

    it('una tarjeta encontrada se abre y se edita como siempre', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.type(searchbox(), 'contacto');
      await user.click(screen.getByRole('button', { name: 'Formulario de contacto' }));
      expect(screen.getByRole('dialog', { name: 'Formulario de contacto' })).toBeInTheDocument();
    });

    it('mientras se busca no se añaden tarjetas', async () => {
      const user = userEvent.setup();
      render(<App />);
      await user.type(searchbox(), 'contacto');
      expect(within(column('Ideas')).queryByRole('button', { name: 'Añadir tarjeta' })).not.toBeInTheDocument();
      await user.clear(searchbox());
      expect(within(column('Ideas')).getByRole('button', { name: 'Añadir tarjeta' })).toBeInTheDocument();
    });

    it('buscar no cambia el tablero guardado', async () => {
      const user = userEvent.setup();
      const { unmount } = render(<App />);
      const antes = window.localStorage.getItem(STORAGE_KEY);
      expect(antes).not.toBeNull();
      await user.type(searchbox(), 'formulario');
      expect(window.localStorage.getItem(STORAGE_KEY)).toBe(antes);
      unmount();
      render(<App />);
      expect(searchbox()).toHaveValue('');
      expect(visibleCards()).toHaveLength(SEED_TITLES);
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
