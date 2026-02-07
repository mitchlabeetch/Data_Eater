
// benchmarks/sniffer_bench.js

const safeDelimiterSingle = ',';
const safeDelimiterMulti = '::';

// Original implementation (simulated)
const getColCountOriginal = (line, delimiter) => {
    // regex depends on nothing external, but split uses delimiter
    const stripped = line.replace(/"[^"]*"/g, '""');
    return stripped.split(delimiter).length;
};

// Optimized implementation
const getColCountOptimized = (line, delimiter) => {
    if (line.length === 0) return 1;

    let count = 1;
    let i = 0;
    const len = line.length;
    const delimLen = delimiter.length;
    const isSingleChar = delimLen === 1;
    const singleDelim = isSingleChar ? delimiter : '';

    while (i < len) {
        const char = line[i];
        if (char === '"') {
            // fast forward to next quote
            const closingIndex = line.indexOf('"', i + 1);
            if (closingIndex !== -1) {
                i = closingIndex + 1;
                continue;
            }
        }

        if (isSingleChar) {
            if (char === singleDelim) {
                count++;
            }
        } else {
            if (line.startsWith(delimiter, i)) {
                count++;
                i += delimLen - 1;
            }
        }
        i++;
    }
    return count;
};

// Test Data Generation
const lines = [];
for (let i = 0; i < 10000; i++) {
    if (i % 3 === 0) {
        lines.push(`col1,col2,col3,col4,col5`);
    } else if (i % 3 === 1) {
        lines.push(`"col1","col2","col3","col4","col5"`);
    } else {
        lines.push(`"col1, with comma","col2","col3","col4, more"`);
    }
}

// Multi-char lines
const linesMulti = lines.map(l => l.split(',').join('::'));

// Function to measure
const measure = (name, fn, data, delim) => {
    const start = performance.now();
    for (let i = 0; i < 100; i++) {
        for (const line of data) {
            fn(line, delim);
        }
    }
    const end = performance.now();
    console.log(`${name}: ${(end - start).toFixed(2)}ms`);
    return end - start;
};

// Warmup
console.log("Warming up...");
lines.forEach(l => getColCountOriginal(l, safeDelimiterSingle));
lines.forEach(l => getColCountOptimized(l, safeDelimiterSingle));

console.log("--- Single Char Delimiter ---");
measure("Original (Single)", getColCountOriginal, lines, safeDelimiterSingle);
measure("Optimized (Single)", getColCountOptimized, lines, safeDelimiterSingle);

console.log("--- Multi Char Delimiter ---");
measure("Original (Multi)", getColCountOriginal, linesMulti, safeDelimiterMulti);
measure("Optimized (Multi)", getColCountOptimized, linesMulti, safeDelimiterMulti);

// Verify Correctness
console.log("--- Verifying Correctness ---");
let errors = 0;
lines.forEach((l, idx) => {
    const o = getColCountOriginal(l, safeDelimiterSingle);
    const n = getColCountOptimized(l, safeDelimiterSingle);
    if (o !== n) {
        console.error(`Mismatch (Single) at line ${idx}: Original=${o}, Optimized=${n}, Line='${l}'`);
        errors++;
        if (errors < 5) console.log(l);
    }
});
linesMulti.forEach((l, idx) => {
    const o = getColCountOriginal(l, safeDelimiterMulti);
    const n = getColCountOptimized(l, safeDelimiterMulti);
    if (o !== n) {
        console.error(`Mismatch (Multi) at line ${idx}: Original=${o}, Optimized=${n}, Line='${l}'`);
        errors++;
        if (errors < 5) console.log(l);
    }
});

if (errors === 0) {
    console.log("All checks passed!");
} else {
    console.log(`Found ${errors} mismatches.`);
}
