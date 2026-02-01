import { performance } from 'perf_hooks';
import { Buffer } from 'buffer';

// Mock Browser Environment
global.window = {} as any;
global.window.Buffer = Buffer;

// Mock iconv-lite
const iconv = {
  encode: (str: string, enc: string) => Buffer.from(str)
};

class MockBlob {
  content: any[];
  options: any;
  constructor(content: any[], options: any) {
    this.content = content;
    this.options = options;
  }
}
global.Blob = MockBlob as any;

global.URL = {
  createObjectURL: () => 'mock-url',
  revokeObjectURL: () => {},
} as any;

global.document = {
  createElement: () => ({
    href: '',
    download: '',
    click: () => {},
  }),
  body: {
    appendChild: () => {},
    removeChild: () => {},
  },
} as any;

const triggerDownload = (blob: any, filename: string) => {
  // console.log(`Triggered download for ${filename}`);
};

// --- Original Sync Code ---
const exportCSVSync = (
  rows: any[],
  columns: { name: string }[],
  filename: string,
  encoding: 'utf-8' | 'windows-1252',
  delimiter: string,
  includeHeaders: boolean
) => {
  // 1. Build CSV String
  const headerRow = columns.map(c => `"${c.name}"`).join(delimiter);
  const dataRows = rows.map(row => {
    return columns.map(col => {
      const val = row[col.name];
      const strVal = val === null || val === undefined ? '' : String(val);
      // Escape quotes: simple regex for global replacement
      return `"${strVal.split('"').join('""')}"`;
    }).join(delimiter);
  });

  const csvContent = (includeHeaders ? [headerRow, ...dataRows] : dataRows).join('\n');

  // 2. Handle Encoding
  let blob: any;
  if (encoding === 'windows-1252') {
    // Use iconv-lite to encode
    const buffer = iconv.encode(csvContent, 'win1252');
    blob = new Blob([buffer], { type: 'text/csv;charset=windows-1252' });
  } else {
    // UTF-8 with BOM for Excel compatibility
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8' });
  }

  triggerDownload(blob, filename);
};

// --- Optimized Async Code ---
const exportCSVAsync = async (
  rows: any[],
  columns: { name: string }[],
  filename: string,
  encoding: 'utf-8' | 'windows-1252',
  delimiter: string,
  includeHeaders: boolean
) => {
  const CHUNK_SIZE = 2000;
  const chunks: (string | Uint8Array | Buffer)[] = [];

  // 1. Header
  if (includeHeaders) {
    const headerRow = columns.map(c => `"${c.name}"`).join(delimiter);
    if (encoding === 'windows-1252') {
       chunks.push(iconv.encode(headerRow, 'win1252'));
    } else {
       chunks.push(headerRow);
    }
  }

  // 2. Data Rows (Chunked)
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunkRows = rows.slice(i, i + CHUNK_SIZE);

    const chunkStr = chunkRows.map(row => {
      return columns.map(col => {
        const val = row[col.name];
        const strVal = val === null || val === undefined ? '' : String(val);
        return `"${strVal.split('"').join('""')}"`;
      }).join(delimiter);
    }).join('\n');

    // Add newline separator if needed
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

    // Yield to event loop
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  // 3. Create Blob
  let blob: any;
  if (encoding === 'windows-1252') {
    blob = new Blob(chunks, { type: 'text/csv;charset=windows-1252' });
  } else {
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    blob = new Blob([bom, ...chunks], { type: 'text/csv;charset=utf-8' });
  }

  triggerDownload(blob, filename);
};


// --- Benchmark Runner ---

const measureLag = async (fn: () => Promise<void> | void) => {
  let maxLag = 0;
  let last = performance.now();
  const interval = setInterval(() => {
    const now = performance.now();
    const lag = now - last - 10;
    if (lag > maxLag) maxLag = lag;
    last = now;
  }, 10);

  const start = performance.now();
  await fn();
  const end = performance.now();

  // Give the interval a chance to fire if it was blocked
  await new Promise(resolve => setTimeout(resolve, 50));

  clearInterval(interval);
  return { time: end - start, maxLag };
};

const run = async () => {
  console.log("Generating 100,000 rows...");
  const rows = Array.from({ length: 100000 }, (_, i) => ({
    id: i,
    name: `User ${i}`,
    email: `user${i}@example.com`,
    description: `This is a long description for user ${i} that contains "quotes" and commas, to test escaping.`,
    value: Math.random() * 1000,
  }));
  const columns = [
    { name: 'id' }, { name: 'name' }, { name: 'email' }, { name: 'description' }, { name: 'value' }
  ];

  console.log("\n--- Benchmarking Synchronous Export ---");
  const resSync = await measureLag(() => exportCSVSync(rows, columns, 'test.csv', 'utf-8', ',', true));
  console.log(`Time: ${resSync.time.toFixed(2)}ms`);
  console.log(`Max Lag: ${resSync.maxLag.toFixed(2)}ms`);

  console.log("\n--- Benchmarking Async Export ---");
  const resAsync = await measureLag(() => exportCSVAsync(rows, columns, 'test.csv', 'utf-8', ',', true));
  console.log(`Time: ${resAsync.time.toFixed(2)}ms`);
  console.log(`Max Lag: ${resAsync.maxLag.toFixed(2)}ms`);

  console.log("\n--- Results ---");
  console.log(`Lag Reduction: ${(resSync.maxLag - resAsync.maxLag).toFixed(2)}ms`);
  console.log(`Time Increase: ${(resAsync.time - resSync.time).toFixed(2)}ms (worth it for UI responsiveness)`);
};

run();
