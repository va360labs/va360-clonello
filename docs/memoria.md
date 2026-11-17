# Memoria del proyecto

Decisiones ya tomadas en Clonello y por qué. Cada cambio de arquitectura añade aquí su entrada en la misma PR (ver el registro al final).

## Sin backend

La app es estática y se publica en GitHub Pages. Cada visitante tiene su propio tablero en su navegador.

- **Por qué**: es una demo pública. Sin servidor no hay coste, ni secretos, ni cuentas, y cualquier PR se puede revisar y desplegar sin infraestructura.
- **Consecuencia**: no hay usuarios ni datos compartidos. Compartir o colaborar exigiría un backend y es una decisión grande que habría que registrar aquí.

## localStorage con esquema versionado

- Clave `clonello:v1`. El valor es un sobre `{ "version": 1, "board": { … } }` (`src/board/storage.ts`).
- `loadBoard()` valida lo leído con `validateStoredData()` (`src/board/schema.ts`). La validación es a mano, sin librerías, y comprueba también la coherencia entre columnas, tarjetas y etiquetas.
- Primera visita o navegador sin `localStorage`: se siembran los datos de ejemplo (`src/board/seed.ts`).
- Datos ilegibles (JSON roto o esquema inválido): se copian en `clonello:v1:respaldo`, se vuelve a sembrar y la app muestra un aviso.
- **Por qué versionado**: el día que cambie el modelo, los tableros guardados en navegadores de gente real no deben romperse ni perderse.
- **Por qué sin zod**: el esquema es pequeño, así no hay dependencias y los mensajes salen en español.

### Cómo cambiar el esquema (migración)

1. Sube `SCHEMA_VERSION` en `schema.ts` y usa una clave nueva (`clonello:v2`).
2. Escribe una función pura `migrateV1ToV2(datosV1)` con sus pruebas, incluido un tablero v1 real de ejemplo.
3. `loadBoard()` lee primero la clave nueva. Si no existe, lee la v1, la valida con el validador v1, la migra, la valida con el nuevo y la guarda en la clave nueva.
4. No borres la clave v1 en la misma versión: sirve de respaldo.
5. Actualiza los datos de ejemplo y registra la decisión aquí.

## Modelo de datos normalizado

```
Board { title, columns: Column[], cards: Record<id, Card>, labels: Label[] }
Column { id, title, cardIds: string[] }
Card { id, title, description, labelIds: string[] }
Label { id, name, color }
```

- El orden de `columns` es el orden en pantalla. El orden de `cardIds` es el orden dentro de la columna.
- Las tarjetas viven en un índice por id. Mover una tarjeta solo cambia listas de ids.
- Las etiquetas son del tablero y las tarjetas las referencian por id. Se pueden crear desde el detalle de una tarjeta; si algún día se renombran, el cambio llegará a todas las tarjetas a la vez.
- Colores de etiqueta: una lista cerrada (`LABEL_COLORS`). No hay amarillo para no competir con el dorado.

## Reducer puro

- Toda operación es una acción de `boardReducer` (`src/board/reducer.ts`).
- El reducer no genera ids, no lee la hora y no toca `localStorage`. Los ids llegan en la acción: los crean los creadores de `src/board/actions.ts`.
- Una acción sin sentido (id que no existe, título vacío, mover a la misma posición) devuelve **el mismo objeto**. Las pruebas lo comprueban con `toBe`.
- `card/move` recibe `toIndex` como la posición final en la columna de destino una vez retirada la tarjeta de su sitio.
- **Por qué**: se prueba sin navegador, en milisegundos, y cada encargo cabe en una acción nueva con sus pruebas.

## Arrastrar y soltar con @dnd-kit

- Las columnas son un `SortableContext` horizontal y cada columna tiene un `SortableContext` vertical con sus tarjetas (`src/components/BoardView.tsx`).
- La detección de colisiones es propia. Al arrastrar una columna solo cuentan columnas. Al arrastrar una tarjeta sobre una columna, se busca la tarjeta más cercana dentro de ella.
- `onDragOver` pasa la tarjeta a otra columna en cuanto entra, `onDragEnd` reordena dentro de la misma y cancelar (o soltar fuera) restaura el tablero de antes del arrastre.
- Sensores:
  - ratón, desde 6 px de movimiento, para que el clic abra la tarjeta;
  - táctil, con 200 ms de pulsación, para que el dedo pueda desplazar el tablero;
  - teclado: espacio coge y suelta, flechas mueven, Escape cancela e Intro abre la tarjeta.
- Los anuncios para lectores de pantalla están en español.
- **Por qué dnd-kit**: es accesible con teclado, funciona en móvil (el arrastre nativo de HTML5 no), está mantenido y no impone estilos.

## Estructura de carpetas

```
src/
  board/        dominio puro (sin React) y sus pruebas
  state/        BoardProvider: reducer + localStorage, hook useBoard()
  components/   interfaz, un .tsx y su .css por componente
  styles/       tokens.css (paleta, tipos, medidas) y base.css
  test/         configuración de las pruebas
  App.tsx       composición de la app
  App.test.tsx  pruebas de la app completa
```

## Estilos, paleta y tipografía

- CSS plano, un archivo por componente, más los tokens en `src/styles/tokens.css`. Sin Tailwind ni CSS-in-JS: así un diff de estilos se lee bien en una PR.
- Paleta VA360:
  - navy `#1A1A2E` en la cabecera;
  - dorado `#C9A227` como **único acento**, solo en lo interactivo: botón principal, anillo de foco y la tarjeta que se levanta al arrastrar;
  - fondo claro frío `#EDEFF3`, superficies blancas y texto `#1B1D2A`.
- El dorado nunca va como texto sobre fondo claro (no tiene contraste). Sobre dorado, el texto es navy.
- Tipografía Inter variable, autoalojada con `@fontsource-variable/inter`. Sin peticiones a Google Fonts.
- Diseño propio: columnas como calles abiertas separadas por un filete, sin cajas grises; etiquetas con punto de color y fondo teñido.
- Escritorio de referencia: 1920×1080. En móvil (menos de 720 px) las columnas ocupan casi todo el ancho y se desplazan con imán.

## Cómo se prueban las cosas

- Vitest con jsdom (`vite.config.ts`). `src/test/setup.ts` limpia el DOM y `localStorage` después de cada prueba.
- **Lógica**: pruebas puras del reducer, la validación, la carga y los datos de ejemplo (`src/board/*.test.ts`). `loadBoard` recibe un almacenamiento en memoria.
- **Interfaz**: Testing Library por rol y nombre accesible, nunca por clases CSS. Las columnas son regiones con el nombre de su título y las tarjetas son botones con el nombre de su título.
- El arrastre no se prueba en jsdom (no calcula posiciones). Se prueba `card/move` y `column/move` en el reducer, y el gesto real con un navegador headless antes de publicar.
- Nombres de prueba en español.

## Convenciones

- Identificadores de código en inglés. Comentarios, textos de interfaz, nombres de prueba, documentación y commits en español.
- Componentes como funciones con nombre exportado (`export function ColumnView`), sin `export default`.
- TypeScript estricto, con `noUncheckedIndexedAccess`.

## Publicación

- `.github/workflows/ci.yml`: en cada PR y en cada push a `main` corre `npm ci`, tipos, `npm test` y `npm run build`.
- En push a `main`, además, despliega `dist/` en GitHub Pages con `actions/deploy-pages`.
- Vite usa `base: '/va360-clonello/'`. URL publicada: https://va360labs.github.io/va360-clonello/

## Lo que la app no hace todavía

Se dejó fuera a propósito: fechas límite, búsqueda y filtros, modo oscuro, exportar e importar, checklists, asignar personas, varios tableros, compartir y permisos, historial de actividad y deshacer.

## Registro de decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-17 | Versión base: sin backend, `localStorage` versionado (`clonello:v1`), modelo normalizado, reducer puro, @dnd-kit, CSS plano con tokens VA360, Vitest + Testing Library y despliegue en GitHub Pages. |
