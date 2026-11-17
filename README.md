# VA360 - Clonello

Clonello es un tablero de tareas tipo kanban hecho por VA360 como app de demo. Tiene columnas que se crean, renombran, reordenan y borran, y tarjetas con título, descripción y etiquetas de color que se arrastran de una columna a otra. Al hacer clic en una tarjeta se abre su detalle. Puedes tener varios tableros y pasar de uno a otro con el botón «Tableros», junto al título.

Funciona entero en el navegador: no hay servidor ni cuentas. Lo que cambias se guarda en tu navegador y la primera vez aparece un tablero de ejemplo, el lanzamiento de la web de una agencia de viajes inventada.

**Pruébala aquí: https://va360labs.github.io/va360-clonello/**

## Arrancar en local

Necesitas Node.js 22 o posterior.

```
npm ci
npm run dev
```

Abre http://localhost:5173/va360-clonello/

## Probar

```
npm test            # pruebas de la lógica y de la interfaz
npm run typecheck   # comprobación de tipos
npm run build       # build de producción en dist/
```

Cada PR y cada push a `main` pasan esas comprobaciones en GitHub Actions. Lo que entra en `main` se publica solo en GitHub Pages.

## Cómo está hecho

Vite, React y TypeScript, con [@dnd-kit](https://dndkit.com/) para arrastrar y Vitest con Testing Library para las pruebas. Las decisiones del proyecto y su porqué están en [`docs/memoria.md`](docs/memoria.md). Las reglas para los agentes que trabajan en el repo están en [`CLAUDE.md`](CLAUDE.md).
