# Memoria del proyecto

Decisiones ya tomadas en Clonello y por qué. Cada cambio de arquitectura añade aquí su entrada en la misma PR (ver el registro al final).

## Sin backend

La app es estática y se publica en GitHub Pages. Cada visitante tiene su propio tablero en su navegador.

- **Por qué**: es una demo pública. Sin servidor no hay coste, ni secretos, ni cuentas, y cualquier PR se puede revisar y desplegar sin infraestructura.
- **Consecuencia**: no hay usuarios ni datos compartidos. Compartir o colaborar exigiría un backend y es una decisión grande que habría que registrar aquí.

## localStorage con esquema versionado

- Clave `clonello:v2` (`SCHEMA_VERSION` = 2). El valor es un sobre `{ "version": 2, "activeBoardId": "…", "boards": [ { "id": "…", …tablero } ] }` (`src/board/storage.ts`).
- `loadWorkspace()` valida lo leído con `validateStoredData()` (`src/board/schema.ts`). La validación es a mano, sin librerías: lista no vacía, ids de tablero únicos, el tablero abierto existe y cada tablero es coherente por dentro (columnas, tarjetas y etiquetas). Los errores dicen qué tablero falla.
- Orden de lectura: `clonello:v2`; si no existe, `clonello:v1` (se valida con `validateStoredDataV1`, se migra con `migrateV1ToV2`, se valida con el de v2 y se guarda en v2); si tampoco existe, se siembran los datos de ejemplo (`createSeedData()` en `src/board/seed.ts`). Origen de la carga: `stored`, `migrated`, `seeded` o `recovered`.
- `clonello:v1` **no se borra ni se escribe**: queda en el navegador como respaldo. Si existen las dos claves, manda v2.
- Datos ilegibles (JSON roto o esquema inválido): se copian en la clave de respaldo de su versión (`clonello:v2:respaldo` o `clonello:v1:respaldo`), se vuelve a sembrar en v2 y la app muestra el aviso. Una migración correcta no muestra aviso.
- **Por qué versionado**: el día que cambie el modelo, los tableros guardados en navegadores de gente real no deben romperse ni perderse.
- **Por qué sin zod**: el esquema es pequeño, así no hay dependencias y los mensajes salen en español.

### Cómo cambiar el esquema (migración)

Se aplicó por primera vez de v1 a v2 en el encargo #9 (`src/board/migrate.ts`). Para una v3:

1. Sube `SCHEMA_VERSION` en `schema.ts` y usa una clave nueva (`clonello:v3`). Conserva el validador anterior con su sufijo (`validateStoredDataV2`), igual que se conservó `validateStoredDataV1`.
2. Escribe una función pura `migrateV2ToV3(datosV2)` con sus pruebas, incluido un ejemplo real de la versión anterior (el de v1 está en `src/board/fixtures.ts`). Sin ids al azar: la migración debe dar siempre lo mismo.
3. `loadWorkspace()` lee primero la clave nueva. Si no existe, lee la anterior, la valida con su validador, la migra, la valida con el nuevo y la guarda en la clave nueva. Encadena las migraciones si hace falta (v1 → v2 → v3).
4. No borres las claves anteriores en la misma versión: sirven de respaldo.
5. Actualiza los datos de ejemplo y registra la decisión aquí.

## Modelo de datos normalizado

```
Workspace { activeBoardId, boards: BoardEntry[] }      // lo que se guarda (más version: 2)
BoardEntry = Board + { id }
Board { title, columns: Column[], cards: Record<id, Card>, labels: Label[] }
Column { id, title, cardIds: string[] }
Card { id, title, description, labelIds: string[] }
Label { id, name, color }
```

- Varios tableros: el orden de `boards` es el orden en el selector y nunca está vacía. Cada tablero tiene sus propias columnas, tarjetas y etiquetas; no se comparten ni se mueven tarjetas entre tableros.
- El tablero abierto (`activeBoardId`) se guarda **dentro de los datos v2**, no en `clonello:preferencias`: apunta a un tablero concreto y debe ser coherente con la lista (el validador lo comprueba).
- El orden de `columns` es el orden en pantalla. El orden de `cardIds` es el orden dentro de la columna.
- Las tarjetas viven en un índice por id. Mover una tarjeta solo cambia listas de ids.
- Las etiquetas son del tablero y las tarjetas las referencian por id. Se pueden crear desde el detalle de una tarjeta; si algún día se renombran, el cambio llegará a todas las tarjetas a la vez.
- Colores de etiqueta: una lista cerrada (`LABEL_COLORS`). No hay amarillo para no competir con el dorado.

## Reducer puro

- Toda operación es una acción de `workspaceReducer` (`src/board/reducer.ts`). Las de tableros (`board/create`, `board/select`, `board/rename`, `board/delete`) cambian la lista; el resto pasan a `boardReducer` y solo tocan el tablero abierto (los demás siguen siendo el mismo objeto). `board/replace` sustituye el contenido del abierto sin cambiar su id.
- No se puede borrar el último tablero. Al borrar el abierto se abre el anterior de la lista (o el siguiente si era el primero).
- Un tablero nuevo empieza con tres columnas vacías («Por hacer», «En curso», «Hecho», `STARTER_COLUMN_TITLES`) y sin etiquetas; sus ids llegan en la acción (`createBoard()` en `actions.ts`).
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
- Ratón encima de una tarjeta: borde `--line-strong` y sombra suave `--shadow-hover` (más ligera que `--shadow-lift`), sin dorado ni desplazamiento. La sombra solo con `@media (hover: hover)` y nunca en el hueco (`.card--placeholder`) ni en la tarjeta que vuela (`.card--overlay`). Con foco de teclado se combina con `--focus-ring` para que el anillo dorado no se pierda.
- Diseño propio: columnas como calles abiertas separadas por un filete, sin cajas grises; etiquetas con punto de color y fondo teñido.
- Escritorio de referencia: 1920×1080. En móvil (menos de 720 px) las columnas ocupan casi todo el ancho y se desplazan con imán.

## Cómo se prueban las cosas

- Vitest con jsdom (`vite.config.ts`). `src/test/setup.ts` limpia el DOM y `localStorage` después de cada prueba.
- **Lógica**: pruebas puras del reducer, la validación, la carga y los datos de ejemplo (`src/board/*.test.ts`). `loadWorkspace` recibe un almacenamiento en memoria.
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

## Preferencias de la interfaz

Las preferencias de quien usa la app (por ejemplo, el tema claro u oscuro) **no son datos del tablero**. Se guardan en su propio módulo (`src/preferencias/`) y en su propia clave de `localStorage`, sin tocar `src/board/storage.ts`, `schema.ts` ni `types.ts`: así un cambio de aspecto nunca se convierte en un cambio del formato de los datos guardados.

Una preferencia visual se aplica antes del primer pintado (un script corto en `index.html`), para que la página no destelle con el tema equivocado al cargar.

- Excepción a «nadie fuera de `src/board/storage.ts` toca `localStorage`»: `src/preferencias/` y el script de `index.html` pueden leer y escribir **solo** la clave `clonello:preferencias`. Nunca tocan las claves del tablero (`clonello:v1`, `clonello:v2` ni sus respaldos).
- Formato: `{ "tema": "claro" | "oscuro" }`. Lo que no encaje (JSON roto, otro valor, sin `localStorage`) se ignora y se usa el tema por defecto. Si cambia el formato, hay que cambiar a la vez `src/preferencias/tema.ts` y el script de `index.html`.

### Modo oscuro

- Dos temas, claro y oscuro, con un botón de luna/sol en la cabecera («Activar modo oscuro» / «Activar modo claro»). Sin tercera opción «como el sistema».
- La primera visita empieza siempre en **claro**, el aspecto de marca, aunque el sistema esté en oscuro: es más predecible y el script previo al pintado y las pruebas no dependen de `prefers-color-scheme`.
- Se activa con `data-tema="oscuro"` en `<html>`. Los colores oscuros son los mismos tokens de `src/styles/tokens.css` redefinidos en `:root[data-tema='oscuro']`; los componentes no saben de temas.
- La cabecera sigue navy en los dos temas; en oscuro se separa del fondo con un filete (`--header-line`). El dorado sigue igual y sobre él el texto sigue siendo navy. `<meta name="theme-color">` no cambia: la cabecera es navy en ambos.
- Los colores sueltos que quedaban en los `.css` pasaron a tokens (`--text-on-danger`, `--text-on-label`, `--backdrop`, `--header-divider`, `--line-bold`). Las etiquetas tiñen su fondo mezclando su color con `--surface` (`--label-tint`, más intenso en oscuro); sus tonos (`LABEL_HEX`) no cambian porque son datos y se leen bien sobre los dos fondos.

## Lo que la app no hace todavía

Se dejó fuera a propósito: fechas límite, búsqueda y filtros, exportar e importar, checklists, asignar personas, compartir y permisos, mover o copiar tarjetas entre tableros, enlaces propios por tablero, historial de actividad y deshacer.

## Registro de decisiones

| Fecha | Decisión |
| --- | --- |
| 2026-11-17 | Versión base: sin backend, `localStorage` versionado (`clonello:v1`), modelo normalizado, reducer puro, @dnd-kit, CSS plano con tokens VA360, Vitest + Testing Library y despliegue en GitHub Pages. |
| 2026-11-17 | Encargo #1: sombra suave `--shadow-hover` al pasar el ratón por una tarjeta, solo en dispositivos con ratón (en táctil el hover se queda pegado), sin moverla para no empujar a las demás y conservando el anillo de foco. Sin prueba en Vitest: jsdom no aplica `:hover` ni pinta sombras y la interfaz no se prueba por clases CSS; se revisa a mano en navegador. |
| 2026-11-17 | Preferencias de la interfaz fuera de los datos del tablero: módulo y clave propios, nunca en `storage.ts`, y aplicadas antes del primer pintado. Se decide al revisar la PR #5, que guardaba el tema en `storage.ts` y por eso pasaba a riesgo alto. |
| 2026-11-17 | Encargo #6: modo oscuro. Botón en la cabecera, tokens oscuros en `tokens.css` bajo `data-tema="oscuro"`, preferencia en `src/preferencias/` con clave `clonello:preferencias` (excepción explícita a la regla de `localStorage`) y script en `index.html` para no destellar. Empieza siempre en claro y solo hay dos opciones. Colores sueltos pasados a tokens. Sin tocar `src/board/`. |
| 2026-11-17 | Encargo #9: varios tableros. Formato `clonello:v2` (`SCHEMA_VERSION` = 2) con lista de tableros y `activeBoardId` dentro de los datos (apunta a un tablero concreto, no es una preferencia visual). Migración pura `migrateV1ToV2` con id fijo `board-1`; `clonello:v1` se lee, nunca se borra y queda de respaldo; respaldo de ilegibles en la clave de su versión. Crear, cambiar, renombrar y borrar con confirmación, sin borrar el último. Tablero nuevo con «Por hacer», «En curso» y «Hecho». Etiquetas de cada tablero. Selector «Tableros» junto al título (no en la cabecera navy, que en móvil no tiene sitio), con teclado y Escape. Sin direcciones por tablero ni límite de tableros. La demo siembra solo el tablero de ejemplo. |
