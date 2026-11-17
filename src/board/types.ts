/**
 * Modelo de datos del tablero.
 *
 * Es el esquema que se guarda en localStorage (ver storage.ts). Cualquier cambio
 * aquí es un cambio de esquema: exige subir SCHEMA_VERSION, una clave nueva y una
 * migración desde la versión anterior. Ver docs/memoria.md.
 */

export const LABEL_COLORS = [
  'rojo',
  'naranja',
  'verde',
  'turquesa',
  'azul',
  'morado',
  'rosa',
  'gris',
] as const;

export type LabelColor = (typeof LABEL_COLORS)[number];

export interface Label {
  id: string;
  name: string;
  color: LabelColor;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  /** Ids de etiquetas del tablero, en el orden en que se añadieron. */
  labelIds: string[];
  /** Fecha límite 'AAAA-MM-DD' (solo día), o null si no tiene. Desde el esquema 2. */
  dueDate: string | null;
}

export interface Column {
  id: string;
  title: string;
  /** Orden de las tarjetas dentro de la columna. */
  cardIds: string[];
}

export interface Board {
  title: string;
  /** El orden del array es el orden de las columnas en pantalla. */
  columns: Column[];
  /** Tarjetas indexadas por id. Cada tarjeta está en exactamente una columna. */
  cards: Record<string, Card>;
  labels: Label[];
}

/**
 * Formato 1 (clave clonello:v1), solo para leer y migrar tableros antiguos.
 * Igual que el actual, pero las tarjetas no tenían fecha límite.
 */
export type CardV1 = Omit<Card, 'dueDate'>;

export interface BoardV1 extends Omit<Board, 'cards'> {
  cards: Record<string, CardV1>;
}
