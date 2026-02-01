import iconv from 'iconv-lite';
import { Buffer } from 'buffer';

// Polyfill Buffer for browser environment (needed for iconv-lite)
if (typeof self !== 'undefined') {
  (self as any).Buffer = Buffer;
}

self.onmessage = async (e: MessageEvent) => {
  const { rows, columns, delimiter, encoding, includeHeaders } = e.data;

  try {
    const chunks: (string | Uint8Array | Buffer)[] = [];

    // 1. Header
    if (includeHeaders) {
      const headerRow = columns.map((c: any) => `"${c.name}"`).join(delimiter);
      if (encoding === 'windows-1252') {
         chunks.push(iconv.encode(headerRow, 'win1252'));
      } else {
         chunks.push(headerRow);
      }
    }

    // 2. Data Rows
    const processRow = (row: any) => {
        return columns.map((col: any) => {
            const val = row[col.name];
            const strVal = val === null || val === undefined ? '' : String(val);
            // Optimized replacement
            return `"${strVal.replaceAll('"', '""')}"`;
        }).join(delimiter);
    };

    let needNewline = includeHeaders;

    const CHUNK_SIZE = 5000;
    for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const chunkRows = rows.slice(i, i + CHUNK_SIZE);
        const chunkStr = chunkRows.map(processRow).join('\n');

        if (needNewline && chunkStr.length > 0) {
             if (encoding === 'windows-1252') {
                chunks.push(iconv.encode('\n', 'win1252'));
             } else {
                chunks.push('\n');
             }
        }

        if (chunkStr.length > 0) {
            if (encoding === 'windows-1252') {
                chunks.push(iconv.encode(chunkStr, 'win1252'));
            } else {
                chunks.push(chunkStr);
            }
            needNewline = true;
        }
    }

    // 3. Create Blob
    let blob: Blob;
    if (encoding === 'windows-1252') {
      blob = new Blob(chunks, { type: 'text/csv;charset=windows-1252' });
    } else {
      // UTF-8 with BOM
      const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
      blob = new Blob([bom, ...chunks], { type: 'text/csv;charset=utf-8' });
    }

    self.postMessage({ status: 'success', blob });

  } catch (error) {
    self.postMessage({ status: 'error', error: String(error) });
  }
};
