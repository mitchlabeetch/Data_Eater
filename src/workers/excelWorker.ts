// src/workers/excelWorker.ts

self.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
    try {
        const { buffer } = e.data;
        const ExcelJS = (await import('exceljs')).default;
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.load(buffer);
        const worksheet = workbook.getWorksheet(1);

        if (!worksheet) {
          throw new Error("Excel file is empty or has no sheets");
        }

        // Use ExcelJS native buffer write (much more memory efficient)
        const csvBuffer = await workbook.csv.writeBuffer();

        // Convert Node.js Buffer to Uint8Array if necessary (though Buffer is a Uint8Array)
        // We transfer the underlying ArrayBuffer to avoid copying.
        // Note: csvBuffer.buffer might be larger than csvBuffer.byteLength if it's a slice from a pool,
        // but for a full file write it's usually fresh.
        // To be safe, we use a fresh Uint8Array copy if the buffer is shared/offset,
        // or just transfer the buffer if it matches.

        let bufferToTransfer: ArrayBuffer;
        let finalArray: Uint8Array;

        if (csvBuffer.byteOffset === 0 && csvBuffer.byteLength === csvBuffer.buffer.byteLength) {
            bufferToTransfer = csvBuffer.buffer;
            finalArray = csvBuffer;
        } else {
            finalArray = new Uint8Array(csvBuffer);
            bufferToTransfer = finalArray.buffer;
        }

        // Transfer buffer to avoid copy
        // @ts-ignore
        self.postMessage({ buffer: finalArray }, [bufferToTransfer]);
    } catch (error) {
        if (error instanceof Error) {
            self.postMessage({ error: error.message });
        } else {
            self.postMessage({ error: String(error) });
        }
    }
};
