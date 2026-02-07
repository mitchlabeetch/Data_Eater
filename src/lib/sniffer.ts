const CHUNK_SIZE = 16 * 1024; // 16KB sniff size
const JAGGED_SCAN_SIZE = 1024 * 1024; // 1MB scan limit

export interface SniffResult {
  encoding: 'UTF-8' | 'WINDOWS-1252';
  delimiter: string;
  hasHeader: boolean;
  newline: '\r\n' | '\n' | '\r';
  format: 'CSV' | 'JSON';
}

export interface JaggedRowError {
  row: number;
  expected: number;
  actual: number;
  content: string;
}

/**
 * Heuristic to detect if a Uint8Array is valid UTF-8.
 * Windows-1252 will often have byte sequences that are invalid in UTF-8.
 */
const isUtf8 = (bytes: Uint8Array): boolean => {
  let i = 0;
  while (i < bytes.length) {
    if (bytes[i] <= 0x7F) {
      // ASCII
      i++;
      continue;
    }
    
    // Invalid starting byte for UTF-8
    if (bytes[i] >= 0xF5 || bytes[i] <= 0xC1) return false;
    
    let following = 0;
    if (bytes[i] >= 0xC2 && bytes[i] <= 0xDF) following = 1;
    else if (bytes[i] >= 0xE0 && bytes[i] <= 0xEF) following = 2;
    else if (bytes[i] >= 0xF0 && bytes[i] <= 0xF4) following = 3;
    
    if (i + following >= bytes.length) return true; // Truncated sequence at end is OK for sniffing
    
    for (let j = 1; j <= following; j++) {
      if ((bytes[i + j] & 0xC0) !== 0x80) return false; // Invalid continuation byte
    }
    
    i += following + 1;
  }
  return true;
};

const detectDelimiter = (text: string): string => {
  const candidates = [',', ';', '\t', '|'];
  const lines = text.split(/\r?\n/).filter(line => line.length > 0).slice(0, 10);
  
  if (lines.length === 0) return ',';

  let bestDelimiter = ',';
  let bestScore = 0;

  for (const delim of candidates) {
    // Check consistency: Deviation of column count should be low
    const counts = lines.map(line => line.split(delim).length);
    const avg = counts.reduce((a, b) => a + b, 0) / counts.length;
    
    // We prefer delimiters that produce > 1 column
    if (avg <= 1) continue;

    const variance = counts.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / counts.length;
    
    // Score: High average column count + Low variance is good
    // We penalize variance heavily. A perfect CSV has variance 0.
    const score = (avg * 10) - (variance * 100);
    
    if (score > bestScore) {
      bestScore = score;
      bestDelimiter = delim;
    }
  }

  return bestDelimiter;
};

export const sniffFile = async (file: File): Promise<SniffResult> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const uint8 = new Uint8Array(buffer);
        
        // 1. Detect Encoding
        const encoding = isUtf8(uint8) ? 'UTF-8' : 'WINDOWS-1252';
        
        // 2. Decode for text analysis
        const decoder = new TextDecoder(encoding === 'WINDOWS-1252' ? 'windows-1252' : 'utf-8');
        const text = decoder.decode(uint8);
        const trimmed = text.trim();

        // 3. Detect Format (JSON vs CSV)
        let format: 'CSV' | 'JSON' = 'CSV';
        if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
           try {
             // Quick check if it looks like JSON structure
             JSON.parse(trimmed.substring(0, Math.min(trimmed.length, 10000)) + (trimmed.length > 10000 && trimmed.startsWith('[') ? ']' : '}'));
             format = 'JSON';
           } catch {
             // Fallback to CSV if parsing fails heavily, but simple heuristic is often enough
             if (trimmed.startsWith('[') || trimmed.startsWith('{')) format = 'JSON'; 
           }
        }
        
        // 4. Detect Delimiter
        const delimiter = format === 'JSON' ? '' : detectDelimiter(text);
        
        // 5. Detect Newline
        const newline = text.includes('\r\n') ? '\r\n' : (text.includes('\r') ? '\r' : '\n');

        // 6. Detect Header
        const hasHeader = true;

        resolve({
          encoding,
          delimiter,
          hasHeader,
          newline,
          format
        });
      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    
    // Read only the first chunk
    const blob = file.slice(0, CHUNK_SIZE);
    reader.readAsArrayBuffer(blob);
  });
};

export const detectJaggedRows = async (file: File, delimiter?: string, encoding: 'UTF-8' | 'WINDOWS-1252' = 'UTF-8'): Promise<JaggedRowError[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const buffer = e.target?.result as ArrayBuffer;
        const decoder = new TextDecoder(encoding === 'WINDOWS-1252' ? 'windows-1252' : 'utf-8');
        const text = decoder.decode(buffer);
        
        const lines = text.split(/\r?\n/);
        const nonEmptyLines = lines.filter(l => l.trim().length > 0);
        
        if (nonEmptyLines.length < 2) return resolve([]);

        // If delimiter not provided, sniff it from first line
        const safeDelimiter = delimiter || detectDelimiter(nonEmptyLines[0]);
        
        // Robust split handling quoted strings
        // Matches delimiter only if followed by even number of quotes
        const getColCount = (line: string) => {
          // Optimized heuristic: count delimiters OUTSIDE quotes without string allocation
          if (line.length === 0) return 1;

          let count = 1;
          let i = 0;
          const len = line.length;
          const delimLen = safeDelimiter.length;
          const isSingleChar = delimLen === 1;

          while (i < len) {
            if (line[i] === '"') {
              // fast forward to next quote
              const closingIndex = line.indexOf('"', i + 1);
              if (closingIndex !== -1) {
                i = closingIndex + 1;
                continue;
              }
            }

            if (isSingleChar) {
              if (line[i] === safeDelimiter) {
                count++;
              }
            } else {
              if (line.startsWith(safeDelimiter, i)) {
                count++;
                i += delimLen - 1;
              }
            }
            i++;
          }
          return count;
        };
        
        const expectedCols = getColCount(nonEmptyLines[0]);
        const errors: JaggedRowError[] = [];

        // Check first 1000 lines or all if smaller
        const limit = Math.min(nonEmptyLines.length, 1000);
        
        for (let i = 1; i < limit; i++) {
           const count = getColCount(nonEmptyLines[i]);
           if (count !== expectedCols) {
             errors.push({
               row: i + 1, // 1-based index
               expected: expectedCols,
               actual: count,
               content: nonEmptyLines[i].substring(0, 50) + (nonEmptyLines[i].length > 50 ? '...' : '')
             });
             
             if (errors.length >= 5) break; // Limit to 5 errors
           }
        }
        
        resolve(errors);

      } catch (err) {
        reject(err);
      }
    };
    
    reader.onerror = () => reject(reader.error);
    const blob = file.slice(0, JAGGED_SCAN_SIZE);
    reader.readAsArrayBuffer(blob);
  });
};
