import type { StoredData } from './schema';
import type { Board, Card } from './types';

/**
 * Datos de ejemplo: el lanzamiento de la web de Brisa Viajes, una agencia
 * inventada con un equipo pequeño. Se cargan la primera vez que alguien abre
 * la app, para que la demo publicada nunca aparezca vacía.
 */
const card = (id: string, title: string, description: string, labelIds: string[]): Card => ({
  id,
  title,
  description,
  labelIds,
});

const SEED: Board = {
  title: 'Lanzamiento de la web de Brisa Viajes',
  labels: [
    { id: 'label-diseno', name: 'Diseño', color: 'morado' },
    { id: 'label-desarrollo', name: 'Desarrollo', color: 'azul' },
    { id: 'label-contenido', name: 'Contenido', color: 'verde' },
    { id: 'label-marketing', name: 'Marketing', color: 'naranja' },
    { id: 'label-seo', name: 'SEO', color: 'turquesa' },
    { id: 'label-urgente', name: 'Urgente', color: 'rojo' },
  ],
  columns: [
    { id: 'col-ideas', title: 'Ideas', cardIds: ['card-grupos', 'card-blog', 'card-boletin'] },
    { id: 'col-por-hacer', title: 'Por hacer', cardIds: ['card-legal', 'card-dominio', 'card-fotos'] },
    { id: 'col-en-curso', title: 'En curso', cardIds: ['card-inicio', 'card-contacto', 'card-meta'] },
    { id: 'col-hecho', title: 'Hecho', cardIds: ['card-estilo', 'card-mapa', 'card-alojamiento'] },
  ],
  cards: Object.fromEntries(
    [
      card(
        'card-grupos',
        'Página de viajes en grupo',
        'Propuesta de Raúl: listar las salidas en grupo de primavera con un formulario para apuntarse a la lista de interés.',
        ['label-marketing', 'label-contenido'],
      ),
      card(
        'card-blog',
        'Blog con guías de destinos',
        'Empezar con tres guías cortas: Lisboa, Oporto y Asturias. Inés ya tiene borradores de las dos primeras.',
        ['label-contenido', 'label-seo'],
      ),
      card(
        'card-boletin',
        'Boletín mensual con ofertas',
        'Recoger correos desde el pie de página y enviar una vez al mes las ofertas de última hora.',
        ['label-marketing'],
      ),
      card(
        'card-legal',
        'Aviso legal y política de cookies',
        'Revisarlos con la gestoría antes de publicar. Sin esto no se puede abrir la web.',
        ['label-contenido', 'label-urgente'],
      ),
      card(
        'card-dominio',
        'Conectar el dominio y el correo',
        'Apuntar el dominio al nuevo alojamiento y comprobar que el correo de reservas sigue llegando.',
        ['label-desarrollo', 'label-urgente'],
      ),
      card(
        'card-fotos',
        'Fotos de cabecera para cada destino',
        'Fotos horizontales de al menos 1600 px de ancho. Lucía prepara una selección para elegir juntos.',
        ['label-diseno'],
      ),
      card(
        'card-inicio',
        'Maquetar la página de inicio',
        'Cabecera con los destinos de temporada, tres viajes destacados y opiniones de clientes.',
        ['label-desarrollo', 'label-diseno'],
      ),
      card(
        'card-contacto',
        'Formulario de contacto',
        'Los mensajes deben llegar al correo de reservas y quien escribe recibe una confirmación.',
        ['label-desarrollo'],
      ),
      card(
        'card-meta',
        'Títulos y descripciones para buscadores',
        'Uno por página principal, de menos de 160 caracteres y con el destino en el título.',
        ['label-seo'],
      ),
      card(
        'card-estilo',
        'Guía de estilo: colores y tipografías',
        'Aprobada por todo el equipo. Está en la carpeta compartida de diseño.',
        ['label-diseno'],
      ),
      card(
        'card-mapa',
        'Mapa de páginas de la web',
        'Inicio, Destinos, Viajes en grupo, Quiénes somos y Contacto.',
        ['label-contenido'],
      ),
      card(
        'card-alojamiento',
        'Elegir el alojamiento',
        'Contratado el plan básico. Marcos tiene los accesos.',
        ['label-desarrollo'],
      ),
    ].map((c) => [c.id, c]),
  ),
};

/** Devuelve una copia nueva de los datos de ejemplo. */
export function createSeedBoard(): Board {
  return structuredClone(SEED);
}

/** Id del tablero de ejemplo en la lista de tableros. */
export const SEED_BOARD_ID = 'board-brisa';

/** Datos de ejemplo en formato v2: el tablero de ejemplo, solo y abierto. */
export function createSeedData(): StoredData {
  return { version: 2, activeBoardId: SEED_BOARD_ID, boards: [{ id: SEED_BOARD_ID, ...createSeedBoard() }] };
}
