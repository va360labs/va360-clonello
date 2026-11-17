/**
 * Un tablero v1 tal como lo guardaba la versión anterior en clonello:v1: los datos de
 * ejemplo más una columna, una tarjeta y una etiqueta creadas por la persona (ids
 * aleatorios, saltos de línea…). Sirve para probar la migración a v2 con datos reales.
 */
export const TABLERO_V1_JSON = `
{
  "version": 1,
  "board": {
    "title": "Lanzamiento de la web de Brisa Viajes",
    "labels": [
      {
        "id": "label-diseno",
        "name": "Diseño",
        "color": "morado"
      },
      {
        "id": "label-desarrollo",
        "name": "Desarrollo",
        "color": "azul"
      },
      {
        "id": "label-contenido",
        "name": "Contenido",
        "color": "verde"
      },
      {
        "id": "label-marketing",
        "name": "Marketing",
        "color": "naranja"
      },
      {
        "id": "label-seo",
        "name": "SEO",
        "color": "turquesa"
      },
      {
        "id": "label-urgente",
        "name": "Urgente",
        "color": "rojo"
      },
      {
        "id": "label-0c4be1f9",
        "name": "Legal",
        "color": "rosa"
      }
    ],
    "columns": [
      {
        "id": "col-ideas",
        "title": "Ideas",
        "cardIds": [
          "card-grupos",
          "card-blog",
          "card-boletin"
        ]
      },
      {
        "id": "col-por-hacer",
        "title": "Por hacer",
        "cardIds": [
          "card-legal",
          "card-dominio",
          "card-fotos"
        ]
      },
      {
        "id": "col-en-curso",
        "title": "En curso",
        "cardIds": [
          "card-inicio",
          "card-contacto",
          "card-meta"
        ]
      },
      {
        "id": "col-hecho",
        "title": "Hecho",
        "cardIds": [
          "card-estilo",
          "card-mapa",
          "card-alojamiento"
        ]
      },
      {
        "id": "col-3f9a1c2b",
        "title": "Revisión",
        "cardIds": [
          "card-7d21e0aa"
        ]
      }
    ],
    "cards": {
      "card-grupos": {
        "id": "card-grupos",
        "title": "Página de viajes en grupo",
        "description": "Propuesta de Raúl: listar las salidas en grupo de primavera con un formulario para apuntarse a la lista de interés.",
        "labelIds": [
          "label-marketing",
          "label-contenido"
        ]
      },
      "card-blog": {
        "id": "card-blog",
        "title": "Blog con guías de destinos",
        "description": "Empezar con tres guías cortas: Lisboa, Oporto y Asturias. Inés ya tiene borradores de las dos primeras.",
        "labelIds": [
          "label-contenido",
          "label-seo"
        ]
      },
      "card-boletin": {
        "id": "card-boletin",
        "title": "Boletín mensual con ofertas",
        "description": "Recoger correos desde el pie de página y enviar una vez al mes las ofertas de última hora.",
        "labelIds": [
          "label-marketing"
        ]
      },
      "card-legal": {
        "id": "card-legal",
        "title": "Aviso legal y política de cookies",
        "description": "Revisarlos con la gestoría antes de publicar. Sin esto no se puede abrir la web.",
        "labelIds": [
          "label-contenido",
          "label-urgente",
          "label-0c4be1f9"
        ]
      },
      "card-dominio": {
        "id": "card-dominio",
        "title": "Conectar el dominio y el correo",
        "description": "Apuntar el dominio al nuevo alojamiento y comprobar que el correo de reservas sigue llegando.",
        "labelIds": [
          "label-desarrollo",
          "label-urgente"
        ]
      },
      "card-fotos": {
        "id": "card-fotos",
        "title": "Fotos de cabecera para cada destino",
        "description": "Fotos horizontales de al menos 1600 px de ancho. Lucía prepara una selección para elegir juntos.",
        "labelIds": [
          "label-diseno"
        ]
      },
      "card-inicio": {
        "id": "card-inicio",
        "title": "Maquetar la página de inicio",
        "description": "Cabecera con los destinos de temporada, tres viajes destacados y opiniones de clientes.",
        "labelIds": [
          "label-desarrollo",
          "label-diseno"
        ]
      },
      "card-contacto": {
        "id": "card-contacto",
        "title": "Formulario de contacto",
        "description": "Los mensajes deben llegar al correo de reservas y quien escribe recibe una confirmación.",
        "labelIds": [
          "label-desarrollo"
        ]
      },
      "card-meta": {
        "id": "card-meta",
        "title": "Títulos y descripciones para buscadores",
        "description": "Uno por página principal, de menos de 160 caracteres y con el destino en el título.",
        "labelIds": [
          "label-seo"
        ]
      },
      "card-estilo": {
        "id": "card-estilo",
        "title": "Guía de estilo: colores y tipografías",
        "description": "Aprobada por todo el equipo. Está en la carpeta compartida de diseño.",
        "labelIds": [
          "label-diseno"
        ]
      },
      "card-mapa": {
        "id": "card-mapa",
        "title": "Mapa de páginas de la web",
        "description": "Inicio, Destinos, Viajes en grupo, Quiénes somos y Contacto.",
        "labelIds": [
          "label-contenido"
        ]
      },
      "card-alojamiento": {
        "id": "card-alojamiento",
        "title": "Elegir el alojamiento",
        "description": "Contratado el plan básico. Marcos tiene los accesos.",
        "labelIds": [
          "label-desarrollo"
        ]
      },
      "card-7d21e0aa": {
        "id": "card-7d21e0aa",
        "title": "Repasar textos con Inés",
        "description": "Antes del viernes.\\nSin prisa.",
        "labelIds": [
          "label-contenido",
          "label-urgente"
        ]
      }
    }
  }
}
`;
