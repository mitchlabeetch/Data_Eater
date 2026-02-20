import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const workerPath = path.resolve(__dirname, '../src/workers/excelWorker.ts');
console.log(`Reading worker from ${workerPath}`);
let workerCode = fs.readFileSync(workerPath, 'utf8');

// Strip imports
workerCode = workerCode.replace(/import type .*?;/g, '');

// Strip types in function signature
workerCode = workerCode.replace(/\(e: MessageEvent<\{ buffer: ArrayBuffer \}>\)/, '(e)');

// Strip variable types
// let bufferToTransfer: ArrayBuffer;
workerCode = workerCode.replace(/:\s*ArrayBuffer/g, '');
workerCode = workerCode.replace(/:\s*Uint8Array/g, '');

// Strip @ts-ignore
// workerCode = workerCode.replace(/\/\/ @ts-ignore/g, '');

// Mock Self
const mockSelf = {
    postMessage: (msg, transfer) => {
        console.log('Worker postMessage called with:', msg);
        if (msg.error) {
            console.error('Worker reported error:', msg.error);
            process.exit(1);
        }
        if (msg.buffer && (msg.buffer instanceof Uint8Array || Buffer.isBuffer(msg.buffer))) {
            console.log('Success: Received buffer of length', msg.buffer.length);
        } else {
            console.error('Failure: Expected buffer in message');
            process.exit(1);
        }
    },
    onmessage: null
};

// Construct Eval Code
const evalCode = `
    const self = mockSelf;
    const Buffer = require('buffer').Buffer;

    const mockExcelJS = {
        default: {
            Workbook: class {
                constructor() {
                    this.xlsx = {
                        load: async (buffer) => {
                            console.log('ExcelJS.load called with buffer length:', buffer.byteLength);
                        }
                    };
                    this.csv = {
                        writeBuffer: async () => {
                            console.log('ExcelJS.csv.writeBuffer called');
                            // Return a Buffer (which behaves like Uint8Array)
                            return Buffer.from('id,name\\n1,test');
                        }
                    };
                }
                getWorksheet(id) {
                    return {};
                }
            }
        }
    };

    const mockImport = async (name) => {
         if (name === 'exceljs') return mockExcelJS;
         throw new Error("Unknown module " + name);
    };

    // Replace dynamic import
    // We need to replace "await import('exceljs')" with "await mockImport('exceljs')"
    // inside the code string before eval.
`;

// Apply replacement to workerCode
let modifiedWorkerCode = workerCode.replace(/import\('exceljs'\)/g, 'mockImport("exceljs")');

const finalCode = `
    ${evalCode}

    (async () => {
        ${modifiedWorkerCode}

        if (self.onmessage) {
            console.log('Triggering onmessage...');
            await self.onmessage({ data: { buffer: new ArrayBuffer(100) } });
        } else {
            console.error('self.onmessage was not set');
        }
    })();
`;

try {
    eval(finalCode);
} catch (e) {
    console.error('Verification failed:', e);
    process.exit(1);
}
