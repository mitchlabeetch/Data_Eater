/**
 * Interface for the DuckDB/Arrow Table object.
 * We only need a few methods to make it work.
 */
interface ArrowTable<T = any> {
    numRows: number;
    get: (index: number) => { toJSON: () => T } | null;
    toArray: () => T[];
}

export class LazyArrowResult<T = any> {
    private table: ArrowTable<T>;
    private proxy: LazyArrowResult<T>;

    constructor(table: ArrowTable<T>) {
        this.table = table;
        // Bind methods to this instance
        this.map = this.map.bind(this);
        this.forEach = this.forEach.bind(this);
        this.filter = this.filter.bind(this);
        this.reduce = this.reduce.bind(this);
        this.slice = this.slice.bind(this);
        this.find = this.find.bind(this);
        this.every = this.every.bind(this);
        this.some = this.some.bind(this);
        this.indexOf = this.indexOf.bind(this);
        this.includes = this.includes.bind(this);
        this.sort = this.sort.bind(this);
        this.toJSON = this.toJSON.bind(this);

        this.proxy = new Proxy(this, {
            get: (target, prop, receiver) => {
                // Handle numeric indices
                if (typeof prop === 'string') {
                    const index = Number(prop);
                    if (!isNaN(index) && Number.isInteger(index)) {
                         return target.getRow(index);
                    }
                }

                // Forward known properties/methods to the instance
                return Reflect.get(target, prop, receiver);
            }
        });

        return this.proxy as any;
    }

    get length() {
        return this.table.numRows;
    }

    /**
     * Retrieves a row at the given index and converts it to JSON.
     * This is the "lazy" part - we only convert when asked.
     */
    getRow(index: number): T | undefined {
        if (index < 0 || index >= this.length) return undefined;
        const row = this.table.get(index);
        // DuckDB rows are proxies, usually calling toJSON() gives the plain object.
        // If row is null/undefined, return it as is.
        return row && typeof row.toJSON === 'function' ? row.toJSON() : row as any;
    }

    [Symbol.iterator]() {
        let index = 0;
        return {
            next: () => {
                if (index < this.length) {
                    return { value: this.getRow(index++), done: false };
                }
                return { value: undefined, done: true };
            }
        };
    }

    map<U>(callback: (value: T, index: number, array: T[]) => U): U[] {
        const len = this.length;
        const result = new Array(len);
        for (let i = 0; i < len; i++) {
            result[i] = callback(this.getRow(i) as T, i, this.proxy as any);
        }
        return result;
    }

    forEach(callback: (value: T, index: number, array: T[]) => void): void {
        const len = this.length;
        for (let i = 0; i < len; i++) {
            callback(this.getRow(i) as T, i, this.proxy as any);
        }
    }

    filter(callback: (value: T, index: number, array: T[]) => boolean): T[] {
        const result: T[] = [];
        const len = this.length;
        for (let i = 0; i < len; i++) {
            const val = this.getRow(i) as T;
            if (callback(val, i, this.proxy as any)) {
                result.push(val);
            }
        }
        return result;
    }

    reduce<U>(callback: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U {
        let accumulator = initialValue;
        const len = this.length;
        for (let i = 0; i < len; i++) {
            accumulator = callback(accumulator, this.getRow(i) as T, i, this.proxy as any);
        }
        return accumulator;
    }

    slice(start?: number, end?: number): T[] {
        const len = this.length;
        let k = start || 0;
        if (k < 0) k += len;

        let final = end === undefined ? len : end;
        if (final < 0) final += len;

        // Clamp to valid range
        if (k < 0) k = 0;
        if (final > len) final = len;
        if (k > len) k = len;

        const size = Math.max(0, final - k);
        const result = new Array(size);

        for (let i = 0; i < size; i++) {
            result[i] = this.getRow(k + i);
        }
        return result;
    }

    indexOf(searchElement: T, fromIndex: number = 0): number {
        const len = this.length;
        if (fromIndex >= len) return -1;
        let k = Math.max(fromIndex >= 0 ? fromIndex : len + fromIndex, 0);

        for (let i = k; i < len; i++) {
            if (this.getRow(i) === searchElement) return i;
        }
        return -1;
    }

    includes(searchElement: T, fromIndex: number = 0): boolean {
        return this.indexOf(searchElement, fromIndex) !== -1;
    }

    sort(compareFn?: (a: T, b: T) => number): this {
        throw new Error("LazyArrowResult is read-only. Use .slice().sort() to sort a copy.");
    }

    /**
     * Supports JSON.stringify().
     * This triggers full materialization.
     */
    toJSON(): T[] {
        return this.map(r => r);
    }

    find(predicate: (value: T, index: number, obj: T[]) => boolean): T | undefined {
        const len = this.length;
        for (let i = 0; i < len; i++) {
            const val = this.getRow(i) as T;
            if (predicate(val, i, this.proxy as any)) {
                return val;
            }
        }
        return undefined;
    }

    every(predicate: (value: T, index: number, array: T[]) => boolean): boolean {
        const len = this.length;
        for (let i = 0; i < len; i++) {
            if (!predicate(this.getRow(i) as T, i, this.proxy as any)) {
                return false;
            }
        }
        return true;
    }

    some(predicate: (value: T, index: number, array: T[]) => boolean): boolean {
        const len = this.length;
        for (let i = 0; i < len; i++) {
            if (predicate(this.getRow(i) as T, i, this.proxy as any)) {
                return true;
            }
        }
        return false;
    }
}
