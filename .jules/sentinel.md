## 2026-01-17 - DuckDB SQL Injection Risk
**Vulnerability:** The `ingestCSV` function in `src/services/duckdb.ts` constructs SQL queries using string interpolation with unvalidated file names and delimiters.
**Learning:** Even in local-first WASM databases, injection is possible if user input (filenames, sniffed delimiters) is treated as trusted code. This could lead to client-side DoS or data corruption.
**Prevention:** Use prepared statements or bind parameters where possible. If DuckDB WASM doesn't support them for `read_csv` options easily, strictly sanitize/validate all inputs (filenames to alphanumeric, delimiters to known set) before interpolation.
