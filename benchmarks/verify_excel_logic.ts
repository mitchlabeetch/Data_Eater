
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Helper to get directory
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mock global objects
global.Worker = class Worker { constructor(s: any) {} } as any;
global.File = class File {
    name: string;
    size: number;
    constructor(chunks: any[], name: string) {
        this.name = name;
        this.size = 100;
    }
    arrayBuffer() { return Promise.resolve(new ArrayBuffer(10)); }
    slice(s: number, e: number) {
        return {
            arrayBuffer: () => Promise.resolve(new ArrayBuffer(e-s))
        };
    }
} as any;
global.Blob = global.File; // roughly
// global.crypto = { randomUUID: () => 'uuid-' + Math.random() } as any;

async function run() {
    const srcPath = path.resolve(__dirname, '../src/services/duckdb.ts');
    const destPath = path.resolve(__dirname, 'temp_duckdb.ts');

    let content = fs.readFileSync(srcPath, 'utf-8');

    // Replacements
    content = content.replace(/import \* as duckdb from '@duckdb\/duckdb-wasm';/g, "import * as duckdb from './mocks/duckdb';");

    // Replace the ?url imports with consts
    content = content.replace(/import duckdb_wasm from '@duckdb\/duckdb-wasm\/dist\/duckdb-mvp.wasm\?url';/g, "const duckdb_wasm = 'mock_wasm';");
    content = content.replace(/import mvp_worker from '@duckdb\/duckdb-wasm\/dist\/duckdb-browser-mvp.worker.js\?url';/g, "const mvp_worker = 'mock_worker';");
    content = content.replace(/import duckdb_eh from '@duckdb\/duckdb-wasm\/dist\/duckdb-eh.wasm\?url';/g, "const duckdb_eh = 'mock_eh';");
    content = content.replace(/import eh_worker from '@duckdb\/duckdb-wasm\/dist\/duckdb-browser-eh.worker.js\?url';/g, "const eh_worker = 'mock_eh_worker';");

    content = content.replace(/import { sniffFile } from '..\/lib\/sniffer';/g, "import { sniffFile } from './mocks/sniffer';");
    content = content.replace(/import\('exceljs'\)/g, "import('./mocks/exceljs')");

    fs.writeFileSync(destPath, content);

    try {
        const mod = await import('./temp_duckdb.ts');
        const { registerFile, initDuckDB } = mod;

        await initDuckDB();

        // Import mocks to inspect calls
        const duckdbMock = await import('./mocks/duckdb.ts');
        const excelMock = await import('./mocks/exceljs.ts');

        console.log("--- Test Case 1: Spatial Success ---");
        // Mock query success for spatial
        duckdbMock.mockQuery.impl = async (sql: string) => {
            if (sql.includes('INSTALL spatial')) return [];
            if (sql.includes('st_read')) return [];
            return [];
        };

        // We need the file checks in registerFile to pass (isExcel)
        // isExcelExtension = /\.xlsx$/i.test(file.name);
        // isZipFile checks magic bytes.
        // My mock slice returns arrayBuffer. I need to ensure it passes checks if I want to reach the excel logic.
        // isZipFile: bytes[0] === 0x50 && bytes[1] === 0x4B && bytes[2] === 0x03 && bytes[3] === 0x04;

        // Let's improve File mock for isZipFile
        global.File.prototype.slice = function(s: number, e: number) {
            return {
                arrayBuffer: () => {
                    const b = new Uint8Array(4);
                    b[0] = 0x50; b[1] = 0x4B; b[2] = 0x03; b[3] = 0x04;
                    return Promise.resolve(b.buffer);
                }
            };
        } as any;

        const file1 = new global.File([], "test.xlsx");
        const res1 = await registerFile(file1);

        console.log("Result:", res1);
        console.log("DuckDB calls:", duckdbMock.mockQuery.calls);
        console.log("ExcelJS loads:", excelMock.loadCalls.length);

        if (duckdbMock.mockQuery.calls.some((c: string) => c.includes('st_read')) && excelMock.loadCalls.length === 0) {
             console.log("✅ PASS: Used spatial extension");
        } else {
             console.log("❌ FAIL: Did not use spatial extension or used ExcelJS");
             // If it didn't use spatial, it might have fallen back or logic is wrong.
             // Currently the logic is NOT implemented yet, so we EXPECT FAIL for "Used spatial".
             // Wait, I am writing this verification script BEFORE implementation?
             // Yes, so I can verify my implementation works after I do it.
             // Currently it should FAIL test 1 and PASS test 2 (if I simulate failure it just does normal logic).
             // Actually, currently it ALWAYS uses ExcelJS.
             // So for now: expect "FAIL: Did not use spatial extension".
        }

        console.log("--- Test Case 2: Spatial Failure (Fallback) ---");
        // Reset calls
        duckdbMock.resetMocks();
        excelMock.resetExcelMocks();

        // Mock query failure
        duckdbMock.mockQuery.impl = async (sql: string) => {
            if (sql.includes('INSTALL spatial')) throw new Error("Extension not found");
            return [];
        };

        const file2 = new global.File([], "test2.xlsx");
        const res2 = await registerFile(file2);

        console.log("Result:", res2);
        console.log("DuckDB calls:", duckdbMock.mockQuery.calls);
        console.log("ExcelJS loads:", excelMock.loadCalls.length);

        if (excelMock.loadCalls.length > 0) {
            console.log("✅ PASS: Used ExcelJS fallback");
        } else {
            console.log("❌ FAIL: Did not use ExcelJS fallback");
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (fs.existsSync(destPath)) fs.unlinkSync(destPath);
    }
}

run();
