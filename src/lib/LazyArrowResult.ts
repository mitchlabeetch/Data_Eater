export class LazyArrowResult<T = any> {
    private table: any; // Using any for Table to avoid hard dependency on apache-arrow types
    readonly length: number;

    constructor(table: any) {
        this.table = table;
        this.length = table.numRows;

        // Proxy ensures index access [0], [1] works like an array
        return new Proxy(this, {
            get: (target, prop, receiver) => {
                if (typeof prop === 'string') {
                    // Optimized integer check for index access
                    const index = Number(prop);
                    if (Number.isInteger(index) && index >= 0 && index < target.length) {
                        return target.table.get(index);
                    }
                }
                return Reflect.get(target, prop, receiver);
            }
        });
    }

    // Direct access helper (faster than [i])
    get(index: number): T | null {
        if (index < 0 || index >= this.length) return null;
        return this.table.get(index);
    }

    // Materialize to real array (expensive)
    toArray(): T[] {
        return this.table.toArray();
    }

    // JSON Serialization support
    toJSON(): T[] {
        return this.toArray();
    }

    [Symbol.iterator]() {
        let index = 0;
        const table = this.table;
        const length = this.length;
        return {
            next: () => {
                if (index < length) {
                    return { value: table.get(index++), done: false };
                } else {
                    return { done: true, value: undefined };
                }
            }
        };
    }

    // --- Array Methods Implementation ---

    map<U>(callback: (row: T, index: number, array: LazyArrowResult<T>) => U): U[] {
        const result: U[] = new Array(this.length);
        for (let i = 0; i < this.length; i++) {
            result[i] = callback(this.table.get(i), i, this);
        }
        return result;
    }

    slice(start?: number, end?: number): T[] {
        const len = this.length;
        let s = start === undefined ? 0 : start;
        let e = end === undefined ? len : end;

        if (s < 0) s += len;
        if (e < 0) e += len;
        if (s < 0) s = 0;
        if (e > len) e = len;
        if (s >= e) return [];

        const size = e - s;
        const result = new Array(size);
        for (let i = 0; i < size; i++) {
            result[i] = this.table.get(s + i);
        }
        return result;
    }

    filter(callback: (row: T, index: number, array: LazyArrowResult<T>) => boolean): T[] {
        const result: T[] = [];
        for (let i = 0; i < this.length; i++) {
            const row = this.table.get(i);
            if (callback(row, i, this)) {
                result.push(row);
            }
        }
        return result;
    }

    forEach(callback: (row: T, index: number, array: LazyArrowResult<T>) => void): void {
        for (let i = 0; i < this.length; i++) {
            callback(this.table.get(i), i, this);
        }
    }

    find(callback: (row: T, index: number, array: LazyArrowResult<T>) => boolean): T | undefined {
        for (let i = 0; i < this.length; i++) {
            const row = this.table.get(i);
            if (callback(row, i, this)) {
                return row;
            }
        }
        return undefined;
    }

    some(callback: (row: T, index: number, array: LazyArrowResult<T>) => boolean): boolean {
         for (let i = 0; i < this.length; i++) {
            if (callback(this.table.get(i), i, this)) {
                return true;
            }
        }
        return false;
    }

    every(callback: (row: T, index: number, array: LazyArrowResult<T>) => boolean): boolean {
         for (let i = 0; i < this.length; i++) {
            if (!callback(this.table.get(i), i, this)) {
                return false;
            }
        }
        return true;
    }

    reduce<U>(callback: (previousValue: U, currentValue: T, currentIndex: number, array: LazyArrowResult<T>) => U, initialValue: U): U {
        let accumulator = initialValue;
        for (let i = 0; i < this.length; i++) {
            accumulator = callback(accumulator, this.table.get(i), i, this);
        }
        return accumulator;
    }
}
