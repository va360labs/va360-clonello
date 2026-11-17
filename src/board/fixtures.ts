/**
 * Datos de prueba compartidos. No los usa la app: solo las pruebas.
 */
import type { StoredDataV1 } from './schema';

/** Tablero v1 tal y como lo guardaba la versión publicada de la demo. */
export const REAL_V1: StoredDataV1 = {
  version: 1,
  board: {
    title: 'Lanzamiento de la web de Brisa Viajes',
    labels: [
      { id: 'label-diseno', name: 'Diseño', color: 'morado' },
      { id: 'label-a1b2c3d4', name: 'Legal', color: 'rosa' },
    ],
    columns: [
      { id: 'col-ideas', title: 'Ideas', cardIds: ['card-grupos', 'card-5e6f7a8b'] },
      { id: 'col-9c0d1e2f', title: 'Revisión', cardIds: [] },
    ],
    cards: {
      'card-grupos': { id: 'card-grupos', title: 'Página de viajes en grupo', description: 'Propuesta de Raúl.', labelIds: ['label-diseno'] },
      'card-5e6f7a8b': { id: 'card-5e6f7a8b', title: 'Sorteo de un viaje', description: '', labelIds: ['label-a1b2c3d4', 'label-diseno'] },
    },
  },
};
