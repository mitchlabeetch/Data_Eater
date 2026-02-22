
import { performance } from 'perf_hooks';

const safeDelimiter = ',';
const delimCode = safeDelimiter.charCodeAt(0);
const quoteCode = '"'.charCodeAt(0);

// Current implementation
const getColCountCurrent = (line) => {
   let count = 1;
   let inQuote = false;
   for (let i = 0; i < line.length; i++) {
       if (line[i] === '"') {
           inQuote = !inQuote;
       } else if (line[i] === safeDelimiter && !inQuote) {
           count++;
       }
   }
   return count;
};

// IndexOf implementation
const getColCountIndexOf = (line) => {
    let count = 1;
    let inQuote = false;
    let i = 0;
    const len = line.length;

    while (i < len) {
        if (inQuote) {
            const nextQuote = line.indexOf('"', i);
            if (nextQuote === -1) {
                break;
            }
            inQuote = false;
            i = nextQuote + 1;
        } else {
            const nextQuote = line.indexOf('"', i);
            const nextDelim = line.indexOf(safeDelimiter, i);

            if (nextDelim === -1) {
                if (nextQuote === -1) {
                    break;
                } else {
                    inQuote = true;
                    i = nextQuote + 1;
                }
            } else {
                if (nextQuote === -1 || nextDelim < nextQuote) {
                    count++;
                    i = nextDelim + 1;
                } else {
                    inQuote = true;
                    i = nextQuote + 1;
                }
            }
        }
    }
    return count;
};

// IndexOf Optimized implementation
const getColCountIndexOfOpt = (line) => {
    let count = 1;
    let inQuote = false;
    let i = 0;
    const len = line.length;

    while (i < len) {
        if (inQuote) {
            const nextQuote = line.indexOf('"', i);
            if (nextQuote === -1) {
                // Unclosed quote, rest is quoted. No more delimiters counted.
                break;
            }
            inQuote = false;
            i = nextQuote + 1;
        } else {
            // Optimization: Find delimiter first
            const nextDelim = line.indexOf(safeDelimiter, i);
            if (nextDelim === -1) {
                // No more delimiters in the rest of the string.
                // Even if there are quotes, they won't reveal new delimiters we should count.
                break;
            }

            const nextQuote = line.indexOf('"', i);

            if (nextQuote === -1 || nextDelim < nextQuote) {
                // Delimiter is real
                count++;
                i = nextDelim + 1;
            } else {
                // Quote is first
                inQuote = true;
                i = nextQuote + 1;
            }
        }
    }
    return count;
};

// Generate data
const lines = [];
// Case 1: Many columns, no quotes
const lineSimple = Array(100).fill('value').join(',');
// Case 2: Many columns, quoted values
const lineQuoted = Array(100).fill('"value,with,comma"').join(',');
// Case 3: Mixed
const lineMixed = Array(50).fill('val').concat(Array(50).fill('"val"')).join(',');
// Case 4: Long strings
const lineLong = Array(10).fill('a'.repeat(1000)).join(',');

// Add many lines
for (let i = 0; i < 5000; i++) {
    lines.push(lineSimple);
    lines.push(lineQuoted);
    lines.push(lineMixed);
    lines.push(lineLong);
}

const runBenchmark = (name, fn) => {
    const start = performance.now();
    let total = 0;
    for (const line of lines) {
        total += fn(line);
    }
    const end = performance.now();
    return end - start;
};

// Warmup
runBenchmark('Current', getColCountCurrent);
runBenchmark('IndexOf', getColCountIndexOf);
runBenchmark('IndexOfOpt', getColCountIndexOfOpt);

console.log('Running benchmark...');
const tCurrent = runBenchmark('Current', getColCountCurrent);
const tIndexOf = runBenchmark('IndexOf', getColCountIndexOf);
const tIndexOfOpt = runBenchmark('IndexOfOpt', getColCountIndexOfOpt);

console.log(`Current: ${tCurrent.toFixed(2)}ms`);
console.log(`IndexOf: ${tIndexOf.toFixed(2)}ms`);
console.log(`IndexOfOpt: ${tIndexOfOpt.toFixed(2)}ms`);

// Verify correctness
console.log('\nVerifying correctness...');
const testCases = [
    'val1,val2,val3',
    'val1,"val2",val3',
    'val1,"val,2",val3',
    'val1,"val""2",val3',
    'val1,"val""2,val3",val4',
    'val1,"broken,val2',
    'broken",val2,val3',
    '',
    ',,',
    '"","",""'
];

let errors = 0;
for (const tc of testCases) {
    const expected = getColCountCurrent(tc);
    const actual = getColCountIndexOfOpt(tc);
    if (expected !== actual) {
        console.error(`Mismatch for "${tc}": Expected ${expected}, Got ${actual}`);
        errors++;
    }
}
if (errors === 0) console.log('All test cases passed.');
else console.log(`Found ${errors} mismatches.`);
