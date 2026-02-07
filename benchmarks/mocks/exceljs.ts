
import { Buffer } from 'buffer';

export const loadCalls: any[] = [];
export const writeBufferCalls: any[] = [];

class Workbook {
    xlsx = {
        load: async (buffer: any) => {
            loadCalls.push(buffer);
        }
    };
    csv = {
        writeBuffer: async () => {
            writeBufferCalls.push(true);
            return Buffer.from("mock,csv");
        }
    };
    getWorksheet(id: number) { return {}; }
}

export default { Workbook };

export const resetExcelMocks = () => {
    loadCalls.length = 0;
    writeBufferCalls.length = 0;
};
