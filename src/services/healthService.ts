import { query } from './duckdb';
import { validateForAS400 } from '../lib/validators/as400';
import { detectJaggedRows } from '../lib/sniffer';

export interface ColumnHealth {
  name: string;
  type: string;
  nullCount: number;
  nullPercent: number;
  uniqueCount: number;
  score: number; // 0-100
  outliers?: number; // Count of values > 3 std dev
  patternMatch?: string; // Detected pattern (Email, SIRET, etc)
}

export interface GlobalHealthReport {
  overallScore: number;
  rowCount: number;
  columnHealth: Record<string, ColumnHealth>;
  issues: {
    critical: string[];
    warning: string[];
    info: string[];
  };
  as400Report: ReturnType<typeof validateForAS400>;
}

// Common Robertet / French Patterns
const PATTERNS = {
  EMAIL: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  SIRET: /^\d{14}$/,
  NIR: /^[12]\d{12}(\d{2})?$/, // French SSN
  IBAN: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/
};

export const analyzeHealth = async (columns: { name: string; type: string }[], file?: File): Promise<GlobalHealthReport> => {
  const issues = { critical: [], warning: [], info: [] } as any;
  
  // 1. Core Metrics Query
  const aggs = columns.map(col => {
    const safeName = `"${col.name}"`;
    const base = `COUNT(${safeName}) as "count_${col.name}", COUNT(DISTINCT ${safeName}) as "dist_${col.name}"`;
    
    // Add stats for numeric columns
    if (['DOUBLE', 'DECIMAL', 'INTEGER', 'BIGINT'].includes(col.type.toUpperCase())) {
      return `${base}, AVG(${safeName}) as "avg_${col.name}", STDDEV(${safeName}) as "std_${col.name}"`;
    }
    return base;
  }).join(', ');

  const sql = `SELECT COUNT(*) as total_rows, ${aggs} FROM current_dataset`;
  const res = await query(sql);
  const statsRow = res[0];
  const rowCount = Number(statsRow.total_rows);

  // Fetch sample rows for heuristics (Pattern Matching, AS400)
  // We fetch a larger sample to increase chances of finding non-null values
  const sampleRows = await query(`SELECT * FROM current_dataset LIMIT 1000`) as any[];

  const columnHealth: Record<string, ColumnHealth> = {};

  // Prepare outlier checks
  const outlierChecks: string[] = [];
  const outlierCols: string[] = [];

  for (const col of columns) {
    const colType = col.type.toUpperCase();
    if (['DOUBLE', 'DECIMAL', 'INTEGER', 'BIGINT'].includes(colType)) {
      const avg = Number(statsRow[`avg_${col.name}`]);
      const std = Number(statsRow[`std_${col.name}`]);

      if (std > 0) {
        // Prepare bulk query part
        outlierChecks.push(`SUM(CASE WHEN ABS("${col.name}" - ${avg}) > ${3 * std} THEN 1 ELSE 0 END) as "outlier_${col.name}"`);
        outlierCols.push(col.name);
      }
    }
  }

  // Execute single outlier query if needed
  let outlierResults: Record<string, number> = {};
  if (outlierChecks.length > 0) {
    const outlierSql = `SELECT ${outlierChecks.join(', ')} FROM current_dataset`;
    const outlierRes = await query(outlierSql);
    const row = outlierRes[0];

    outlierCols.forEach(name => {
      outlierResults[name] = Number(row[`outlier_${name}`]);
    });
  }

  let totalColumnScore = 0;

  for (const col of columns) {
    const count = Number(statsRow[`count_${col.name}`]);
    const unique = Number(statsRow[`dist_${col.name}`]);
    const nullCount = rowCount - count;
    const nullPercent = rowCount > 0 ? (nullCount / rowCount) * 100 : 0;
    
    let score = 100;
    if (nullPercent > 10) score -= 10;
    if (nullPercent > 50) score -= 30;
    
    let outlierCount = 0;
    const colType = col.type.toUpperCase();

    // Outlier Detection (Z-Score > 3)
    if (['DOUBLE', 'DECIMAL', 'INTEGER', 'BIGINT'].includes(colType)) {
      if (outlierResults[col.name] !== undefined) {
        outlierCount = outlierResults[col.name];
        if (outlierCount > 0) {
          score -= Math.min(outlierCount, 10);
          issues.warning.push(`Colonne "${col.name}" : ${outlierCount} valeurs aberrantes détectées (Z-Score > 3).`);
        }
      }
    }

    // Pattern Matching (Heuristic)
    let detectedPattern: string | undefined;
    if (colType === 'VARCHAR') {
      const values: string[] = [];
      for (const row of sampleRows) {
        const val = row[col.name];
        if (val !== null && val !== undefined && val !== '') {
          values.push(String(val));
        }
        if (values.length >= 10) break;
      }
      
      for (const [key, regex] of Object.entries(PATTERNS)) {
        const matchCount = values.filter(v => regex.test(v)).length;
        if (values.length > 0 && matchCount > values.length * 0.7) { // 70% match in sample
          detectedPattern = key;
          break;
        }
      }
    }

    columnHealth[col.name] = {
      name: col.name,
      type: col.type,
      nullCount,
      nullPercent,
      uniqueCount: unique,
      score,
      outliers: outlierCount,
      patternMatch: detectedPattern
    };

    totalColumnScore += score;
  }

  // 2. Structural Checks (Jagged Rows)
  if (file && !file.name.endsWith('.xlsx')) {
    try {
      const jaggedErrors = await detectJaggedRows(file);
      if (jaggedErrors.length > 0) {
        jaggedErrors.forEach(err => {
          issues.critical.push(`Ligne brisée #${err.row}: Attendait ${err.expected} colonnes, trouvé ${err.actual}.`);
        });
      }
    } catch (e) {
      console.warn("Jagged Row Scan Failed", e);
    }
  }

  // 3. AS400 Validation
  // Reuse the fetched sampleRows (up to 1000 is fine, validator handles it)
  const as400 = validateForAS400(sampleRows, columns);

  const overallScore = Math.round(totalColumnScore / columns.length);

  return {
    overallScore,
    rowCount,
    columnHealth,
    issues,
    as400Report: as400
  };
};
