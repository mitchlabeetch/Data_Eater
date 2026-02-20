// src/workers/excelWorker.ts

self.onmessage = async (e: MessageEvent<{ buffer: ArrayBuffer }>) => {
  try {
    const { buffer } = e.data;
    const ExcelJS = (await import('exceljs')).default;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1); // Load first sheet

    if (!worksheet) throw new Error("Excel file is empty or has no sheets");

    // Use ExcelJS native buffer write (much more memory efficient)
    const csvBuffer = await workbook.csv.writeBuffer();

    // csvBuffer is a node Buffer which is a Uint8Array subclass.
    // We transfer the underlying ArrayBuffer to the main thread.
    // If the buffer is a view on a shared buffer, we might need to copy, but usually writeBuffer creates a new one.
    // To be safe and compliant with transferables, we access .buffer
    const arrayBuffer = csvBuffer.buffer;

    // @ts-ignore - TS might complain about Transferable type matching
    self.postMessage({ buffer: csvBuffer }, [arrayBuffer]);

  } catch (error) {
    if (error instanceof Error) {
        self.postMessage({ error: error.message });
    } else {
        self.postMessage({ error: String(error) });
    }
  }
};
