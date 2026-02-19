import { Buffer } from 'buffer';
import iconv from 'iconv-lite';

// Polyfill Buffer for worker environment
if (typeof self !== 'undefined') {
  (self as any).Buffer = Buffer;
}
if (typeof global !== 'undefined' && !(global as any).Buffer) {
  (global as any).Buffer = Buffer;
}

export interface CSVExportMessage {
  rows: any[];
  columns: { name: string }[];
  delimiter: string;
  encoding: 'utf-8' | 'windows-1252';
  includeHeaders: boolean;
}

export const generateCSV = (
  rows: any[],
  columns: { name: string }[],
  delimiter: string,
  encoding: 'utf-8' | 'windows-1252',
  includeHeaders: boolean
): (string | Uint8Array | Buffer)[] => {
  const chunks: (string | Uint8Array | Buffer)[] = [];
  const CHUNK_SIZE = 2000;

  // 1. Header
  if (includeHeaders) {
    const headerRow = columns.map(c => `"${c.name}"`).join(delimiter);
    if (encoding === 'windows-1252') {
       chunks.push(iconv.encode(headerRow, 'win1252'));
    } else {
       chunks.push(headerRow);
    }
  }

  // 2. Data Rows
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunkRows = rows.slice(i, i + CHUNK_SIZE);

    const chunkStr = chunkRows.map(row => {
      return columns.map(col => {
        const val = row[col.name];
        const strVal = val === null || val === undefined ? '' : String(val);
        // Escape quotes: simple regex for global replacement
        return `"${strVal.split('"').join('""')}"`;
      }).join(delimiter);
    }).join('\n');

    // Add newline separator if needed (before the chunk if not the first chunk, or after header)
    if (chunks.length > 0) {
        if (encoding === 'windows-1252') {
            chunks.push(iconv.encode('\n', 'win1252'));
        } else {
            chunks.push('\n');
        }
    }

    if (encoding === 'windows-1252') {
       chunks.push(iconv.encode(chunkStr, 'win1252'));
    } else {
       chunks.push(chunkStr);
    }
  }

  return chunks;
};

if (typeof self !== 'undefined') {
  self.onmessage = (e: MessageEvent<CSVExportMessage>) => {
    try {
      const { rows, columns, delimiter, encoding, includeHeaders } = e.data;
      const chunks = generateCSV(rows, columns, delimiter, encoding, includeHeaders);

      // We can return the chunks directly. The main thread will create the Blob.
      // This avoids sending a Blob across which might be slightly different depending on browser support,
      // but returning chunks is safe.
      // Actually, creating the Blob in the worker and sending it is also fine and standard.
      // Let's create the Blob here to offload that work too.

      let blob: Blob;
      if (encoding === 'windows-1252') {
        blob = new Blob(chunks, { type: 'text/csv;charset=windows-1252' });
      } else {
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        blob = new Blob([bom, ...chunks], { type: 'text/csv;charset=utf-8' });
      }

      self.postMessage({ blob });
    } catch (error) {
      if (error instanceof Error) {
        self.postMessage({ error: error.message });
      } else {
        self.postMessage({ error: String(error) });
      }
    }
  };
}
