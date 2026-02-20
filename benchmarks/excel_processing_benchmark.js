import ExcelJS from 'exceljs';
import { performance } from 'perf_hooks';
import fs from 'fs';

const FILENAME = 'benchmark_temp.xlsx';
const ROW_COUNT = 50000;

async function generateExcel() {
    if (fs.existsSync(FILENAME)) {
        console.log(`${FILENAME} already exists.`);
        return;
    }
    console.log(`Generating ${FILENAME} with ${ROW_COUNT} rows...`);
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Sheet1');

    sheet.columns = [
        { header: 'Id', key: 'id' },
        { header: 'Name', key: 'name' },
        { header: 'Date', key: 'date' },
        { header: 'Value', key: 'value' },
        { header: 'Notes', key: 'notes' }
    ];

    const rows = [];
    for (let i = 0; i < ROW_COUNT; i++) {
        rows.push({
            id: i,
            name: `Item ${i}`,
            date: new Date(),
            value: Math.random() * 1000,
            notes: `Some random notes for item ${i}`
        });
    }
    sheet.addRows(rows);

    await workbook.xlsx.writeFile(FILENAME);
    console.log(`Generated ${FILENAME}.`);
}

async function benchmark() {
    console.log('Starting benchmark...');
    const start = performance.now();

    // Simulate what happens in registerFile
    const buffer = await fs.promises.readFile(FILENAME);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) throw new Error("Excel file is empty or has no sheets");

    const csvBuffer = await workbook.csv.writeBuffer();
    // Simulate creating a Blob (just measuring the buffer creation is enough as it's the CPU intensive part)

    const end = performance.now();
    console.log(`Processing time: ${(end - start).toFixed(2)}ms`);
    return end - start;
}

(async () => {
    try {
        await generateExcel();
        await benchmark();
    } catch (e) {
        console.error(e);
    } finally {
        // Cleanup if needed, but keeping it for re-runs is useful
        // fs.unlinkSync(FILENAME);
    }
})();
