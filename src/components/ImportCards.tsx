import { useRef, type ChangeEvent } from 'react';
import { importCards } from '../board/actions';
import { decodeCsvBytes, parseCardsCsv } from '../board/csv';
import { useBoard } from '../state/BoardProvider';
import { CloseIcon, UploadIcon } from './icons';
import './ImportCards.css';

/** Tamaño máximo del archivo: de sobra para 500 tarjetas. */
const MAX_FILE_BYTES = 1024 * 1024;

export interface ImportResult {
  kind: 'ok' | 'error';
  message: string;
}

interface ImportCardsButtonProps {
  onResult: (result: ImportResult) => void;
}

/**
 * Botón «Importar tarjetas»: abre el selector de archivos, lee el CSV en el
 * navegador y despacha `cards/import`. Las filas sin columna (o con una que no
 * existe) van a la primera columna del tablero.
 */
export function ImportCardsButton({ onResult }: ImportCardsButtonProps) {
  const { board, dispatch } = useBoard();
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Se vacía para poder elegir otra vez el mismo archivo.
    input.value = '';
    if (!file) return;

    const fail = (message: string) => onResult({ kind: 'error', message: `No se ha importado nada. ${message}` });
    const firstColumn = board.columns[0];
    if (!firstColumn) return fail('Crea primero una columna para poder importar tarjetas.');
    if (file.size > MAX_FILE_BYTES) return fail('El archivo es demasiado grande: el máximo es 1 MB.');

    let text: string;
    try {
      text = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
    } catch {
      return fail('No se ha podido abrir el archivo.');
    }

    const result = parseCardsCsv(text);
    if (result.error) return fail(result.error);
    if (result.rows.length === 0) return fail('Ninguna fila tiene título.');

    dispatch(importCards(result.rows, firstColumn.id));
    onResult({ kind: 'ok', message: describeImport(result.rows.length, result.skippedRows) });
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost import-button"
        aria-label="Importar tarjetas"
        title="Crear tarjetas desde un archivo CSV con las columnas titulo, descripcion y columna"
        onClick={() => inputRef.current?.click()}
      >
        <UploadIcon />
        Importar tarjetas
      </button>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        aria-label="Archivo CSV con tarjetas"
        hidden
        onChange={handleFile}
      />
    </>
  );
}

/** Aviso tras importar: cuántas tarjetas se crearon y cuántas filas se saltaron. */
export function ImportNotice({ result, onClose }: { result: ImportResult; onClose: () => void }) {
  return (
    <div className={`notice import-notice import-notice--${result.kind}`} role="status">
      <p>{result.message}</p>
      <button type="button" className="icon-btn" aria-label="Cerrar el aviso" onClick={onClose}>
        <CloseIcon />
      </button>
    </div>
  );
}

function describeImport(created: number, skippedRows: number[]): string {
  const parts = [created === 1 ? 'Se ha importado 1 tarjeta.' : `Se han importado ${created} tarjetas.`];
  const skipped = skippedRows.length;
  if (skipped > 0) {
    const shown = skippedRows.slice(0, 10);
    const list =
      shown.length === 1 ? String(shown[0]) : `${shown.slice(0, -1).join(', ')} y ${String(shown.at(-1))}`;
    const rows = skipped > shown.length ? `${shown.join(', ')}…` : list;
    parts.push(
      skipped === 1
        ? `Se ha saltado 1 fila sin título (fila ${rows}).`
        : `Se han saltado ${skipped} filas sin título (filas ${rows}).`,
    );
  }
  return parts.join(' ');
}
