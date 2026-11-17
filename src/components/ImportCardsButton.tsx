import { useRef, useState, type ChangeEvent } from 'react';
import { importCards } from '../board/actions';
import { MAX_IMPORT_BYTES, decodeCsvBytes, parseCardsCsv } from '../board/csv';
import { useBoard } from '../state/BoardProvider';
import { CloseIcon, UploadIcon } from './icons';
import './ImportCardsButton.css';

interface Notice {
  kind: 'ok' | 'error';
  message: string;
}

/**
 * Botón «Importar tarjetas»: abre el selector de archivos, lee el CSV en el
 * navegador y despacha `cards/import`. La lectura del CSV y la creación de las
 * tarjetas son puras (`src/board/csv.ts` y el reducer).
 */
export function ImportCardsButton() {
  const { dispatch } = useBoard();
  const inputRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice | null>(null);

  async function handleFile(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    // Se vacía para poder elegir otra vez el mismo archivo.
    input.value = '';
    if (!file) return;

    const fail = (message: string) => setNotice({ kind: 'error', message: `No se importó nada. ${message}` });
    if (file.size > MAX_IMPORT_BYTES) return fail('El archivo pesa más de 1 MB.');

    let text: string;
    try {
      text = decodeCsvBytes(new Uint8Array(await file.arrayBuffer()));
    } catch {
      return fail('No se pudo abrir el archivo.');
    }

    const result = parseCardsCsv(text);
    if (!result.ok) return fail(result.error);
    if (result.rows.length === 0) return fail('Ninguna fila tiene título.');

    dispatch(importCards(result.rows));
    setNotice({ kind: 'ok', message: describeImport(result.rows.length, result.discarded) });
  }

  return (
    <div className="import-cards">
      <button type="button" className="btn btn--ghost" onClick={() => inputRef.current?.click()}>
        <UploadIcon />
        Importar tarjetas
      </button>
      <input ref={inputRef} type="file" accept=".csv" aria-label="Importar tarjetas" hidden onChange={handleFile} />
      <div className="import-cards__live" role="status">
        {notice && (
          <div className={`import-cards__notice import-cards__notice--${notice.kind}`}>
            <p>{notice.message}</p>
            <button type="button" className="icon-btn" aria-label="Cerrar el aviso" onClick={() => setNotice(null)}>
              <CloseIcon />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function describeImport(imported: number, discarded: number): string {
  const parts = [imported === 1 ? 'Se importó 1 tarjeta.' : `Se importaron ${imported} tarjetas.`];
  if (discarded === 1) parts.push('Se descartó 1 fila sin título.');
  if (discarded > 1) parts.push(`Se descartaron ${discarded} filas sin título.`);
  return parts.join(' ');
}
