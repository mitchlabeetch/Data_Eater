// benchmarks/verify_split_logic_prototype.ts

interface Column {
  name: string;
  type: string;
}

function generateUniqueNames(columns: Column[], newColNames: string[]): string[] {
    const existingNames = new Set(columns.map(c => c.name));
    const finalNames: string[] = [];

    // Determine unique names
    for (const name of newColNames) {
    let uniqueName = name;
    let counter = 1;
    while (existingNames.has(uniqueName)) {
        uniqueName = `${name}_${counter}`;
        counter++;
    }
    existingNames.add(uniqueName);
    finalNames.push(uniqueName);
    }
    return finalNames;
}

// Test Cases
const columns: Column[] = [
    { name: 'id', type: 'INTEGER' },
    { name: 'name', type: 'VARCHAR' },
    { name: 'email', type: 'VARCHAR' },
    { name: 'city_1', type: 'VARCHAR' }
];

const testCases = [
    {
        input: ['first_name', 'last_name'],
        expected: ['first_name', 'last_name'],
        desc: "No collision"
    },
    {
        input: ['name', 'city'],
        expected: ['name_1', 'city'],
        desc: "Collision with existing 'name'"
    },
    {
        input: ['city', 'city_1'],
        expected: ['city', 'city_1_1'],
        desc: "Collision with 'city_1'"
    },
    {
        input: ['tag', 'tag'],
        expected: ['tag', 'tag_1'],
        desc: "Self collision"
    },
    {
        input: ['name', 'name'],
        expected: ['name_1', 'name_2'],
        desc: "Collision with existing 'name' and self collision"
    }
];

let passed = true;
console.log("Running Split Logic Verification...");

testCases.forEach((tc, idx) => {
    const result = generateUniqueNames(columns, tc.input);
    const resultStr = JSON.stringify(result);
    const expectedStr = JSON.stringify(tc.expected);

    if (resultStr === expectedStr) {
        console.log(`✅ Test ${idx + 1} (${tc.desc}): PASSED`);
    } else {
        console.error(`❌ Test ${idx + 1} (${tc.desc}): FAILED`);
        console.error(`   Expected: ${expectedStr}`);
        console.error(`   Actual:   ${resultStr}`);
        passed = false;
    }
});

if (passed) {
    console.log("\nAll tests passed!");
    process.exit(0);
} else {
    console.error("\nSome tests failed.");
    process.exit(1);
}
