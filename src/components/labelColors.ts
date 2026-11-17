import type { LabelColor } from '../board/types';

/**
 * Tonos de las etiquetas. Son datos del usuario, no acentos de marca: por eso
 * no hay amarillo (chocaría con el dorado, el único acento de la interfaz).
 */
export const LABEL_HEX: Record<LabelColor, string> = {
  rojo: '#d64545',
  naranja: '#e07b39',
  verde: '#2f9e6b',
  turquesa: '#1a9aa0',
  azul: '#3a6fd8',
  morado: '#8155c9',
  rosa: '#cf4f8e',
  gris: '#6b7280',
};

export const LABEL_COLOR_NAMES: Record<LabelColor, string> = {
  rojo: 'Rojo',
  naranja: 'Naranja',
  verde: 'Verde',
  turquesa: 'Turquesa',
  azul: 'Azul',
  morado: 'Morado',
  rosa: 'Rosa',
  gris: 'Gris',
};
