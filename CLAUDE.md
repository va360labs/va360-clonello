# Clonello: instrucciones para agentes

Clonello es un tablero kanban de demo de VA360: Vite, React y TypeScript, sin backend, con los datos en `localStorage`. Lo mantiene una «fábrica de software» de agentes. Cada encargo se resuelve en su propia rama con una PR revisada.

Antes de tocar nada, lee `docs/memoria.md`. Ahí están las decisiones ya tomadas y el porqué de cada una.

## Comandos

```
npm ci              # instalar dependencias
npm run dev         # servidor local en http://localhost:5173/va360-clonello/
npm test            # pruebas (Vitest), sale con 0 si todo pasa
npm run typecheck   # tipos de TypeScript
npm run build       # tipos + build de producción en dist/
```

## Reglas

1. **Primero la prueba, luego el código.** Escribe la prueba que describe el encargo, comprueba que falla y solo entonces implementa. La lógica se prueba en `src/board/*.test.ts` y la interfaz en `src/**/*.test.tsx` con Testing Library.
2. **Todas las pruebas deben pasar.** Antes de abrir la PR, `npm test`, `npm run typecheck` y `npm run build` terminan sin errores. No se borran, se saltan (`.skip`, `.only`) ni se rebajan pruebas para que pasen.
3. **No toques `.github/workflows/` ni el esquema de datos sin que el encargo lo pida.** El esquema son `src/board/types.ts`, `src/board/schema.ts` y las claves de `src/board/storage.ts`. Si el encargo lo pide, sigue el procedimiento de migración de `docs/memoria.md`.
4. **Registra cada decisión de arquitectura en `docs/memoria.md`**, en la misma PR: qué se decidió, por qué y la fecha.
5. **Textos de la interfaz en español**: botones, avisos, errores, `aria-label` y anuncios para lectores de pantalla. Frases cortas, en mayúscula solo la primera letra y sin tecnicismos.
6. **La lógica va en el reducer puro** (`src/board/reducer.ts`). Los componentes solo despachan acciones. Nadie fuera de `src/board/storage.ts` lee ni escribe `localStorage`.
7. **Paleta y tipografía**: usa los tokens de `src/styles/tokens.css` (navy `#1A1A2E` en la cabecera y dorado `#C9A227` como único acento, solo en lo interactivo). Nada de colores sueltos ni fuentes nuevas.
8. **La demo publicada nunca aparece vacía.** Si cambias los datos de ejemplo (`src/board/seed.ts`), que sigan siendo 4 columnas y unas 12 tarjetas válidas.
9. **Una PR por encargo**, pequeña y con commits en español.

## Dónde está cada cosa

| Ruta | Qué hay |
| --- | --- |
| `src/board/` | Dominio puro: tipos, reducer, acciones, validación del esquema, datos de ejemplo y `localStorage`. Sin React. |
| `src/state/BoardProvider.tsx` | Une el reducer con `localStorage` y lo expone con `useBoard()`. |
| `src/components/` | Interfaz: tablero, columnas, tarjetas, modal de detalle. Cada componente con su `.css`. |
| `src/styles/` | Tokens de diseño y estilos base. |
| `src/App.test.tsx` | Pruebas de la app completa con Testing Library. |
| `docs/memoria.md` | Decisiones del proyecto. |
