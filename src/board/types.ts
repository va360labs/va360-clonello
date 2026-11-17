/**
 * Modelo de datos del tablero.
 *
 * Es el esquema que se guarda en localStorage (ver storage.ts). Cualquier cambio
 * aquí es un cambio de esquema: exige subir SCHEMA_VERSION, una clave nueva y una
 * migración desde la versión anterior. Ver docs/memoria.md.
 *
 * Desde la versión 2 hay varios tableros (Workspace). Board es el contenido de
 * uno, igual que en la versión 1; BoardEntry le añade su id.
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

/** Un tablero de la lista, con su id. */
export interface BoardEntry extends Board {
  id: string;
}

/** Todos los tableros de quien usa la app y cuál tiene abierto. */
export interface Workspace {
  /** Id del tablero abierto. Siempre existe en boards. */
  activeBoardId: string;
  /** Nunca está vacía. El orden es el orden en el selector. */
  boards: BoardEntry[];
}
