
export class ConsoleLogger {}

export const selectBundle = async () => ({ mainWorker: 'mock-worker', mainModule: 'mock-module', pthreadWorker: 'mock-pthread' });

export enum DuckDBDataProtocol { BROWSER_FILEREADER = 1 }

export const mockQuery = {
    impl: async (sql: string): Promise<any> => { return []; },
    calls: [] as string[]
};

export const mockRegisterFileHandle = {
    calls: [] as any[]
};

class MockConnection {
    async query(sql: string) {
        mockQuery.calls.push(sql);
        return mockQuery.impl(sql);
    }
    async close() {}
}

export class AsyncDuckDB {
    constructor(logger: any, worker: any) {}
    async instantiate() {}
    async connect() { return new MockConnection(); }
    async registerFileHandle(name: string, payload: any, protocol: any, flag: boolean) {
        mockRegisterFileHandle.calls.push({ name, payload, protocol, flag });
    }
    async terminate() {}
}

export const resetMocks = () => {
    mockQuery.calls = [];
    mockQuery.impl = async () => [];
    mockRegisterFileHandle.calls = [];
};
