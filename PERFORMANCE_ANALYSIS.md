# Performance Analysis: RegexExtractorModal

## Issue
The `RegexExtractorModal` component allows users to preview the result of a regex pattern on a sample of the current dataset.

### Current Behavior
The component performs a database fetch (`fetchRows(5)`) inside the `loadPreview` function.
`loadPreview` is called:
1. When `isOpen`, `selectedColumn`, or `pattern` changes.
2. It is debounced by 300ms.

However, since `fetchRows` is inside `loadPreview`, every time the user types in the pattern input (triggering the effect after debounce), a new query is sent to DuckDB.

Even though DuckDB is fast, this involves:
1.  Async communication with the worker.
2.  Query parsing and execution (`SELECT * FROM current_dataset LIMIT 5`).
3.  Serialization of results back to the main thread.

### Optimized Behavior
The sample rows (5 rows) are identical regardless of the regex pattern. They only depend on the underlying dataset.

We can:
1.  Fetch the sample rows *once* when the modal opens.
2.  Store them in a local state (`sampleRows`).
3.  Reuse this in-memory array for `loadPreview` whenever the pattern changes.

### Expected Impact
-   **Database Calls**: Reduced from $N$ (number of pattern updates) to $1$ (per modal open).
-   **Latency**: Regex preview updates will be instant (synchronous CPU operation) rather than async (waiting for DB worker).
