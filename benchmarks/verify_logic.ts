
// benchmarks/verify_logic.ts

// Mock Arrow-like Proxy
class MockArrowRow {
    data: Record<string, any>;
    constructor(data: Record<string, any>) {
        this.data = data;
    }

    // Simulate property access
    get(prop: string) {
        return this.data[prop];
    }

    toJSON() {
        return { ...this.data };
    }
}

// Proxy handler to allow property access like row.colName
const handler = {
    get(target: MockArrowRow, prop: string | symbol) {
        if (prop === 'toJSON') return target.toJSON.bind(target);
        if (typeof prop === 'string') return target.get(prop);
        return Reflect.get(target, prop);
    },
    // Simulate non-enumerable properties (Arrow Proxies often don't enumerate cols)
    ownKeys(target: MockArrowRow) {
        return [];
    }
};

const createRow = (data: Record<string, any>) => new Proxy(new MockArrowRow(data), handler);

const rows = [
    createRow({ id: 1, name: "Alice" }),
    createRow({ id: 2, name: "Bob" })
];

const columns = [{ name: 'id' }, { name: 'name' }];

console.log("--- Verifying Smart Query Logic ---");
// Logic copied from smartQueryService.ts
const processBatchLogic = (dataBatch: any[]) => {
    // Materialize batch if needed (handle Arrow Proxies)
    const safeBatch = (dataBatch.length > 0 && typeof dataBatch[0].toJSON === 'function')
        ? dataBatch.map(r => r.toJSON())
        : dataBatch;

    // Test headers extraction
    const headers = Object.keys(safeBatch[0] || {}).join(',');
    console.log("Headers:", headers);
    return headers;
};

const headers = processBatchLogic(rows);
if (headers === "id,name") {
    console.log("✅ Smart Query Logic Passed");
} else {
    console.error("❌ Smart Query Logic Failed. Got:", headers);
    process.exit(1);
}

console.log("\n--- Verifying Export Logic ---");
// Logic copied from exportService.ts
const exportExcelLogic = (rows: any[], columns: { name: string }[]) => {
    const plainRows = rows.map(row => {
        const obj: any = {};
        columns.forEach(col => {
            obj[col.name] = row[col.name];
        });
        return obj;
    });
    console.log("Plain Rows:", plainRows);
    return plainRows;
};

const plain = exportExcelLogic(rows, columns);
if (plain.length === 2 && plain[0].name === "Alice" && plain[1].id === 2) {
    console.log("✅ Export Logic Passed");
} else {
    console.error("❌ Export Logic Failed");
    process.exit(1);
}
