export interface Column {
  name: string;
  type: string;
}

/**
 * Filters columns to those relevant for a given search query based on type heuristics.
 * This optimizes performance by avoiding expensive CAST and ILIKE operations on columns
 * that cannot possibly match the query (e.g. searching "abc" in an INTEGER column).
 */
export const getRelevantColumns = (columns: Column[], query: string): Column[] => {
  const q = query.trim();
  if (!q) return [];

  const hasDigits = /\d/.test(q);
  const lowerQ = q.toLowerCase();

  // Boolean heuristic: does the query contain "true" or "false" or is a substring of them?
  const isBooleanLike = lowerQ.includes("true") || lowerQ.includes("false") || "true".includes(lowerQ) || "false".includes(lowerQ);

  return columns.filter(col => {
    const type = col.type.toUpperCase();

    // 1. Text Types: Always include
    if (type.includes('CHAR') || type.includes('TEXT') || type.includes('STRING')) {
      return true;
    }

    // 2. Numeric Types: Include only if query contains digits, or characters common in numbers (-, .)
    // Edge case: "Infinity", "NaN" are valid numeric values in text representation.
    if (
      type.includes('INT') ||
      type.includes('DOUBLE') ||
      type.includes('FLOAT') ||
      type.includes('DECIMAL') ||
      type.includes('REAL') ||
      type.includes('NUMERIC')
    ) {
      if (hasDigits || /[\-\.]/.test(q)) return true;
      if (lowerQ.includes("infinity") || lowerQ.includes("nan")) return true;
      return false;
    }

    // 3. Boolean Types: Include only if query overlaps with "true" or "false"
    if (type.includes('BOOL')) {
      return isBooleanLike;
    }

    // 4. Date/Time Types: Include if query has digits or common separators
    if (type.includes('DATE') || type.includes('TIME')) {
        return hasDigits || /[\-\/\:\.]/.test(q);
    }

    // 5. Fallback: Include any other types (UUID, BLOB, etc.) to be safe
    return true;
  });
};
