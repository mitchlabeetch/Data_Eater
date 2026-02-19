
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Correct path to source file: benchmarks/ is where this script is.
// src/ is ../src
const servicePath = path.join(__dirname, '../src/services/smartQueryService.ts');
// Write temp file to SAME directory as original to preserve relative imports (if any) and URL resolution
const tempServicePath = path.join(__dirname, '../src/services/smartQueryService_test_temp.ts');

// Read service code
let serviceCode = fs.readFileSync(servicePath, 'utf-8');

// Inject API Key to force real path
serviceCode = serviceCode.replace(
    "const API_KEY = env.VITE_CLOUD_LLM_API_KEY || '';",
    "const API_KEY = 'TEST_KEY';"
);

// Write temp file
fs.writeFileSync(tempServicePath, serviceCode);

// Polyfill Worker
class MockWorker {
    onmessage: ((e: any) => void) | null = null;
    onerror: ((e: any) => void) | null = null;

    constructor(scriptURL: any) {
        console.log("MockWorker created with script:", scriptURL.toString());
    }

    postMessage(msg: any) {
        console.log("MockWorker received message with data length:", msg.data.length);
        // Simulate CSV generation
        const data = msg.data;
        const headers = Object.keys(data[0] || {}).join(',');
        const rows = data.map((r: any) => Object.values(r).join(',')).join('\n');
        const csv = `${headers}\n${rows}`;

        setTimeout(() => {
            if (this.onmessage) {
                this.onmessage({ data: { csv } });
            }
        }, 10);
    }

    terminate() {
        console.log("MockWorker terminated");
    }
}

(global as any).Worker = MockWorker;

// Polyfill fetch
(global as any).fetch = async (url: string, options: any) => {
    console.log("MockFetch called with URL:", url);
    // Parse body to verify CSV content is there
    const body = JSON.parse(options.body);
    const userContent = body.messages.find((m: any) => m.role === 'user').content;

    if (userContent.includes('id,name') && userContent.includes('1,Test')) {
        console.log("Fetch received CORRECT CSV content in prompt");
    } else {
        console.error("Fetch DID NOT receive expected CSV content");
        console.log("Received:", userContent);
    }

    return {
        ok: true,
        json: async () => ({
            choices: [{
                message: {
                    content: JSON.stringify({ data: [{ result: "success" }] })
                }
            }]
        })
    };
};

// Import and run
async function test() {
    try {
        console.log("Importing modified service...");
        // Use file:// URL for dynamic import
        const { processBatch } = await import(`file://${tempServicePath}`);

        const data = [{ id: 1, name: "Test" }, { id: 2, name: "Test2" }];
        console.log("Calling processBatch...");

        const result = await processBatch("Query", data, "");
        console.log("Result:", result);

    } catch (e) {
        console.error("Test failed:", e);
    } finally {
        // Cleanup
        if (fs.existsSync(tempServicePath)) {
            fs.unlinkSync(tempServicePath);
        }
    }
}

test();
