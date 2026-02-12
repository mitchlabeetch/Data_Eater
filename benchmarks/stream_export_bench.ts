import { performance } from 'perf_hooks';

// 1. Mock Data Generator
async function* mockRowGenerator(count: number, rowSize: number) {
    const row = {
        id: 1,
        name: "Test User",
        email: "test@example.com",
        description: "A".repeat(rowSize), // Control size
        value: 123.45
    };
    for (let i = 0; i < count; i++) {
        yield { ...row, id: i };
    }
}

// 2. Baseline: Load all, then process
async function baselineExport(count: number) {
    const rows = [];
    const gen = mockRowGenerator(count, 100); // 100 char string
    for await (const row of gen) {
        rows.push(row);
    }
    // Simulate export processing
    let outputSize = 0;
    for (const r of rows) {
        outputSize += JSON.stringify(r).length;
    }
    return outputSize;
}

// 3. Optimized: Stream process
async function streamExport(count: number) {
    const gen = mockRowGenerator(count, 100);
    let outputSize = 0;
    for await (const row of gen) {
        outputSize += JSON.stringify(row).length;
    }
    return outputSize;
}

async function measure(label: string, fn: () => Promise<number>) {
    // Force GC if available to get cleaner start
    if (global.gc) {
        try { global.gc(); } catch (e) {}
    }

    const startMem = process.memoryUsage().heapUsed;
    const start = performance.now();

    await fn();

    const end = performance.now();
    const endMem = process.memoryUsage().heapUsed;

    console.log(`${label}:`);
    console.log(`  Time: ${(end - start).toFixed(2)}ms`);
    console.log(`  Mem Delta: ${((endMem - startMem) / 1024 / 1024).toFixed(2)} MB`);
    // Note: This is imperfect as GC might run during execution, but shows allocation pressure
}

async function run() {
    const COUNT = 500000; // 500k rows
    console.log(`Benchmarking with ${COUNT} rows...`);

    await measure('Baseline (Load All)', () => baselineExport(COUNT));
    await measure('Stream (Iterative)', () => streamExport(COUNT));
}

run();
