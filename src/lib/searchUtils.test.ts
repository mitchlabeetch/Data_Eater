
import { getRelevantColumns } from './searchUtils';

const cols = [
  { name: 'id', type: 'INTEGER' },
  { name: 'name', type: 'VARCHAR' },
  { name: 'active', type: 'BOOLEAN' },
  { name: 'score', type: 'DOUBLE' },
  { name: 'created', type: 'TIMESTAMP' },
  { name: 'description', type: 'TEXT' }
];

const runTest = (name: string, query: string, expectedCols: string[]) => {
  const result = getRelevantColumns(cols, query).map(c => c.name).sort();
  const expected = expectedCols.sort();

  const isMatch = JSON.stringify(result) === JSON.stringify(expected);
  console.log(`${isMatch ? '✅' : '❌'} ${name} ("${query}") -> [${result.join(', ')}]`);
  if (!isMatch) {
    console.error(`   Expected: [${expected.join(', ')}]`);
    process.exit(1);
  }
};

console.log("--- Testing searchUtils ---");

runTest("Simple Text", "alice", ['name', 'description']);
runTest("Numeric", "42", ['id', 'name', 'score', 'created', 'description']); // created has numbers
runTest("Boolean True", "true", ['name', 'active', 'description']);
runTest("Boolean False", "false", ['name', 'active', 'description']);
runTest("Boolean Partial", "fal", ['name', 'active', 'description']);
runTest("Boolean Typo", "falsy", ['name', 'description']);

runTest("Date Sep", "2023-01", ['id', 'name', 'score', 'created', 'description']);

// "-" matches numeric (negative numbers) and Date (separator)
runTest("Minus Sign", "-", ['id', 'name', 'score', 'created', 'description']);

// "." matches numeric (decimals) and Date (separator)
runTest("Dot", ".", ['id', 'name', 'score', 'created', 'description']);

runTest("Infinity", "Infinity", ['id', 'name', 'score', 'description']);
runTest("NaN", "NaN", ['id', 'name', 'score', 'description']);

console.log("All tests passed!");
