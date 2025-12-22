import { create } from 'zustand';
import { initDuckDB, ingestCSV, query, registerFile } from '../services/duckdb';
import { useMascotStore } from './mascotStore';
import { useErrorStore } from './errorStore';
import { useViewStore } from './viewStore';
import { MASCOT_STATES } from '../lib/constants';

interface Column {
  name: string;
  type: string;
}

interface FileMeta {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

interface ColumnStats {
  nullCount: number;
  distinctCount?: number;
  min?: number | string;
  max?: number | string;
  sum?: number;
  avg?: number;
  topValues?: { value: string; count: number }[];
}

interface DataStore {
  isReady: boolean;
  isLoading: boolean;
  fileMeta: FileMeta | null;
  columns: Column[];
  rows: any[];
  rowCount: number;
  
  selectedColumn: string | null;
  columnStats: ColumnStats | null;
  searchQuery: string;
  sortConfig: { column: string; direction: 'ASC' | 'DESC' } | null;
  hasUnsavedChanges: boolean;
  
  duplicates: { total: number; groups: any[] } | null;

  // Diff State
  diffReport: {
    added: number;
    removed: number;
    rowsAdded: any[];
    rowsRemoved: any[];
    schemaMismatch?: {
      columnsInV1Only: string[];
      columnsInV2Only: string[];
    };
  } | null;

  initializeEngine: () => Promise<void>;
  loadFile: (file: File) => Promise<void>;
  loadComparisonFile: (file: File) => Promise<void>;
  runQuery: (sql: string) => Promise<void>;
  executeMutation: (sql: string) => Promise<void>;
  selectColumn: (colName: string | null) => Promise<void>;
  fetchRows: (limit?: number) => Promise<any[]>;
  queryResult: (sql: string) => Promise<any[]>;
  clearDiff: () => void;
  prepareForCloud: (hiddenCols: string[]) => Promise<any[]>;
  reconcileCloud: (processedData: any[]) => Promise<void>;
  setSearchQuery: (query: string) => Promise<void>;
  setSort: (column: string) => Promise<void>;
  fetchCurrentView: () => Promise<void>;
  resetData: () => Promise<void>;
  markExported: () => void;
  checkDuplicates: () => Promise<void>;
  mergeDuplicates: () => Promise<void>;
}

const classifyError = (e: any): string => {
  const msg = String(e).toLowerCase();
  if (msg.includes("syntax error") || msg.includes("parser error")) return "DB_001";
  if (msg.includes("table") && msg.includes("not found")) return "DB_002";
  if (msg.includes("mismatch") || msg.includes("type")) return "DB_003";
  if (msg.includes("structure") || msg.includes("colonnes")) return "LOGIC_001"; 
  if (msg.includes("fetch") || msg.includes("network")) return "NET_001";
  if (msg.includes("file") || msg.includes("permission")) return "IO_001";
  return "UNKNOWN";
};

export const useDataStore = create<DataStore>((set, get) => ({
  isReady: false,
  isLoading: false,
  fileMeta: null,
  columns: [],
  rows: [],
  rowCount: 0,
  selectedColumn: null,
  columnStats: null,
  diffReport: null,
  searchQuery: '',
  sortConfig: null,
  hasUnsavedChanges: false,
  duplicates: null,

  fetchCurrentView: async () => {
    const state = get();
    if (!state.fileMeta) return;

    try {
      let sql = `SELECT * FROM current_dataset`;
      const clauses: string[] = [];

      if (state.searchQuery.trim()) {
        const q = state.searchQuery.replace(/'/g, "''");
        const conditions = state.columns
          .map(col => `CAST("${col.name}" AS VARCHAR) ILIKE '%${q}%'`)
          .join(' OR ');
        clauses.push(`(${conditions})`);
      }

      // Rules Engine
      const { rules } = useViewStore.getState();
      const activeRules = rules.filter(r => r.active && r.column).sort((a, b) => a.priority - b.priority);
      
      activeRules.forEach(rule => {
        const col = `"${rule.column}"`;
        const val = rule.value.replace(/'/g, "''");
        
        switch (rule.operator) {
          case 'equals': clauses.push(`${col} = '${val}'`); break;
          case 'not_equals': clauses.push(`${col} != '${val}'`); break;
          case 'contains': clauses.push(`CAST(${col} AS VARCHAR) ILIKE '%${val}%'`); break;
          case 'not_contains': clauses.push(`CAST(${col} AS VARCHAR) NOT ILIKE '%${val}%'`); break;
          case 'greater_than': clauses.push(`${col} > '${val}'`); break;
          case 'less_than': clauses.push(`${col} < '${val}'`); break;
          case 'starts_with': clauses.push(`CAST(${col} AS VARCHAR) ILIKE '${val}%'`); break;
          case 'ends_with': clauses.push(`CAST(${col} AS VARCHAR) ILIKE '%${val}'`); break;
          case 'is_empty': clauses.push(`(${col} IS NULL OR CAST(${col} AS VARCHAR) = '')`); break;
          case 'is_not_empty': clauses.push(`(${col} IS NOT NULL AND CAST(${col} AS VARCHAR) != '')`); break;
        }
      });

      if (clauses.length > 0) {
        sql += ` WHERE ${clauses.join(' AND ')}`;
      }

      if (state.sortConfig) {
        sql += ` ORDER BY "${state.sortConfig.column}" ${state.sortConfig.direction}`;
      }

      sql += ` LIMIT 100`;
      
      const results = await query(sql);
      set({ rows: results });
    } catch (e) {
      console.error("View Fetch Error", e);
    }
  },

  initializeEngine: async () => {
    try {
      await initDuckDB();
      set({ isReady: true });
    } catch (e) {
      console.error("Failed to start Glouton Engine", e);
    }
  },

  loadFile: async (file: File) => {
    const mascot = useMascotStore.getState();
    set({ isLoading: true });
    
    mascot.setMascot(MASCOT_STATES.EATING, `Analyse de ${file.name}...`);

    try {
      await initDuckDB();
      const result = await ingestCSV(file);
      
      if (!result) throw new Error("Ingestion failed");

      const initialData = await query(`SELECT * FROM ${result.tableName} LIMIT 100`);
      
      set({
        fileMeta: {
          name: file.name,
          size: file.size,
          type: file.type,
          lastModified: file.lastModified
        },
        columns: result.columns,
        rowCount: result.rowCount,
        rows: initialData,
        isLoading: false,
        selectedColumn: null,
        columnStats: null,
        diffReport: null,
        hasUnsavedChanges: false,
        duplicates: null
      });

      get().checkDuplicates();

      mascot.setMascot(MASCOT_STATES.SLEEPING, `Prêt ! ${result.rowCount} lignes chargées.`);
    
    } catch (error) {
      const code = classifyError(error);
      useErrorStore.getState().reportError(code, error);
      set({ isLoading: false });
    }
  },

  loadComparisonFile: async (file: File) => {
     const mascot = useMascotStore.getState();
     const state = get();
     
     set({ diffReport: null, isLoading: true });

     if (file.name === state.fileMeta?.name && file.size === state.fileMeta?.size) {
        mascot.setMascot(MASCOT_STATES.DETECTIVE, "Attention : Ces fichiers semblent identiques (Nom/Taille).");
     }

     mascot.setMascot(MASCOT_STATES.DETECTIVE, `Comparaison avec ${file.name}...`);
 
     try {
       const { conn } = await initDuckDB();
       if (!conn) throw new Error("DB not ready");
 
       await conn.query(`DROP TABLE IF EXISTS comparison_dataset`);
       
       const fileName = await registerFile(file);
       
       await conn.query(`CREATE TABLE comparison_dataset AS SELECT * FROM read_csv_auto('${fileName}')`);
       
       const schema1 = await query(`PRAGMA table_info('current_dataset')`);
       const schema2 = await query(`PRAGMA table_info('comparison_dataset')`);
       
       const cols1 = schema1.map((c: any) => c.name);
       const cols2 = schema2.map((c: any) => c.name);
       
       const inV1Only = cols1.filter(c => !cols2.includes(c));
       const inV2Only = cols2.filter(c => !cols1.includes(c));

       if (inV1Only.length > 0 || inV2Only.length > 0) {
         set({
           diffReport: {
             added: 0,
             removed: 0,
             rowsAdded: [],
             rowsRemoved: [],
             schemaMismatch: {
               columnsInV1Only: inV1Only,
               columnsInV2Only: inV2Only
             }
           },
           isLoading: false
         });
         mascot.setMascot(MASCOT_STATES.DETECTIVE, "Attention : Les structures sont différentes.");
         return;
       }

       const addedRes = await query(`SELECT * FROM comparison_dataset EXCEPT SELECT * FROM current_dataset`);
       const removedRes = await query(`SELECT * FROM current_dataset EXCEPT SELECT * FROM comparison_dataset`);
 
       set({
         diffReport: {
           added: addedRes.length,
           removed: removedRes.length,
           rowsAdded: addedRes,
           rowsRemoved: removedRes
         },
         isLoading: false
       });
 
       if (addedRes.length === 0 && removedRes.length === 0) {
         mascot.setMascot(MASCOT_STATES.SLEEPING, "Analyse terminée : Fichiers strictement identiques.");
       } else {
         mascot.setMascot(MASCOT_STATES.DETECTIVE, `Différence trouvée : +${addedRes.length} / -${removedRes.length}`);
       }
 
     } catch (e) {
       const code = classifyError(e);
       useErrorStore.getState().reportError(code, e);
       set({ isLoading: false });
     }
  },

  clearDiff: () => set({ diffReport: null }),

  runQuery: async (sql: string) => {
    set({ isLoading: true });
    try {
      const results = await query(sql);
      set({ rows: results, isLoading: false });
    } catch (e) {
      const code = classifyError(e);
      useErrorStore.getState().reportError(code, e);
      set({ isLoading: false });
    }
  },

  queryResult: async (sql: string) => {
    try {
      return await query(sql);
    } catch (e) {
      console.error("Raw Query Error", e);
      return [];
    }
  },

  executeMutation: async (sql: string) => {
    const mascot = useMascotStore.getState();
    set({ isLoading: true });
    mascot.setMascot(MASCOT_STATES.EATING, "Application des changements...");

    try {
      await query(sql);
      
      const currentRows = await query(`SELECT * FROM current_dataset LIMIT 100`);
      
      const state = get();
      if (state.selectedColumn) {
         await state.selectColumn(state.selectedColumn);
      }

      await get().checkDuplicates();

      set({ rows: currentRows, isLoading: false, hasUnsavedChanges: true });
      mascot.setMascot(MASCOT_STATES.SLEEPING, "Modification terminée !");
    
    } catch (e) {
      const code = classifyError(e);
      useErrorStore.getState().reportError(code, e);
      set({ isLoading: false });
    }
  },

  selectColumn: async (colName: string | null) => {
    if (!colName) {
      set({ selectedColumn: null, columnStats: null });
      return;
    }

    const state = get();
    if (state.selectedColumn === colName && state.columnStats) return;

    set({ selectedColumn: colName, isLoading: true });
    
    try {
      const safeCol = `"${colName}"`;
      const basicSql = `
        SELECT 
          COUNT(*) - COUNT(${safeCol}) as null_count,
          COUNT(DISTINCT ${safeCol}) as distinct_count,
          MIN(${safeCol}) as min_val,
          MAX(${safeCol}) as max_val
        FROM current_dataset
      `;
      const basicRes = await query(basicSql);
      const stats = basicRes[0];

      const colDef = state.columns.find(c => c.name === colName);
      let extendedStats: Partial<ColumnStats> = {};

      if (colDef?.type === 'DOUBLE' || colDef?.type === 'BIGINT' || colDef?.type === 'INTEGER') {
        const numSql = `SELECT SUM(${safeCol}) as sum_val, AVG(${safeCol}) as avg_val FROM current_dataset`;
        const numRes = await query(numSql);
        extendedStats = {
          sum: numRes[0].sum_val,
          avg: numRes[0].avg_val
        };
      } else {
        const topSql = `
          SELECT ${safeCol} as val, COUNT(*) as cnt 
          FROM current_dataset 
          WHERE ${safeCol} IS NOT NULL
          GROUP BY ${safeCol} 
          ORDER BY cnt DESC 
          LIMIT 5
        `;
        const topRes = await query(topSql);
        extendedStats = {
          topValues: topRes.map((r: any) => ({ value: String(r.val), count: Number(r.cnt) }))
        };
      }

      set({ 
        isLoading: false,
        columnStats: {
          nullCount: Number(stats.null_count),
          distinctCount: Number(stats.distinct_count),
          min: stats.min_val,
          max: stats.max_val,
          ...extendedStats
        }
      });

    } catch (e) {
      useErrorStore.getState().reportError(classifyError(e), e);
      set({ isLoading: false });
    }
  },

  fetchRows: async (limit = 1000) => {
    try {
      const results = await query(`SELECT * FROM current_dataset LIMIT ${limit}`);
      return results;
    } catch (e) {
      useErrorStore.getState().reportError(classifyError(e), e);
      return [];
    }
  },

  prepareForCloud: async (hiddenCols: string[]) => {
    try {
      await query(`ALTER TABLE current_dataset ADD COLUMN IF NOT EXISTS data_eater_id INTEGER`);
      await query(`UPDATE current_dataset SET data_eater_id = rowid`);

      await query(`DROP TABLE IF EXISTS cloud_staging`);
      await query(`CREATE TABLE cloud_staging AS SELECT * FROM current_dataset`);

      for (const col of hiddenCols) {
        await query(`ALTER TABLE cloud_staging DROP COLUMN IF EXISTS "${col}"`);
      }

      const exportData = await query(`SELECT * FROM cloud_staging`);
      return exportData;

    } catch (e) {
      useErrorStore.getState().reportError(classifyError(e), e);
      throw e;
    }
  },

  reconcileCloud: async (processedData: any[]) => {
    try {
      const { db, conn } = await initDuckDB();
      if (!db || !conn) return;

      const jsonContent = JSON.stringify(processedData);
      await db.registerFileText('cloud_response.json', jsonContent);
      
      await query(`DROP TABLE IF EXISTS cloud_incoming`);
      await query(`CREATE TABLE cloud_incoming AS SELECT * FROM read_json_auto('cloud_response.json')`);

      const schema = await query(`PRAGMA table_info('cloud_incoming')`);
      const colsToUpdate = schema
        .map((c: any) => c.name)
        .filter((c: string) => c !== 'data_eater_id');

      const setClause = colsToUpdate.map((col: string) => `"${col}" = cloud_incoming."${col}"`).join(', ');
      
      await query(`
        UPDATE current_dataset 
        SET ${setClause} 
        FROM cloud_incoming 
        WHERE current_dataset.data_eater_id = cloud_incoming.data_eater_id
      `);

      await query(`ALTER TABLE current_dataset DROP COLUMN data_eater_id`);
      await query(`DROP TABLE cloud_staging`);
      await query(`DROP TABLE cloud_incoming`);
      
      const currentRows = await query(`SELECT * FROM current_dataset LIMIT 100`);
      set({ rows: currentRows });

    } catch (e) {
      useErrorStore.getState().reportError(classifyError(e), e);
      throw e;
    }
  },

  setSearchQuery: async (q: string) => {
    set({ searchQuery: q });
    await get().fetchCurrentView();
  },

  setSort: async (column: string) => {
    const currentSort = get().sortConfig;
    let nextSort: { column: string, direction: 'ASC' | 'DESC' } | null = { column, direction: 'ASC' };

    if (currentSort && currentSort.column === column) {
      if (currentSort.direction === 'ASC') {
        nextSort = { column, direction: 'DESC' };
      } else {
        nextSort = null;
      }
    }

    set({ sortConfig: nextSort });
    await get().fetchCurrentView();
  },

  resetData: async () => {
    try {
      const { conn } = await initDuckDB();
      if (conn) {
        await conn.query(`DROP TABLE IF EXISTS current_dataset`);
        await conn.query(`DROP TABLE IF EXISTS comparison_dataset`);
      }
      set({
        fileMeta: null,
        columns: [],
        rows: [],
        rowCount: 0,
        selectedColumn: null,
        columnStats: null,
        diffReport: null,
        searchQuery: '',
        sortConfig: null,
        hasUnsavedChanges: false,
        duplicates: null
      });
      useMascotStore.getState().resetMascot(true);
    } catch (e) {
      console.error(e);
    }
  },

  markExported: () => set({ hasUnsavedChanges: false }),

  checkDuplicates: async () => {
    try {
      const cols = get().columns.map(c => `"${c.name}"`).join(', ');
      
      // Check for exact duplicates
      const sql = `
        SELECT count(*) as cnt
        FROM (
          SELECT count(*) 
          FROM current_dataset 
          GROUP BY ALL 
          HAVING count(*) > 1
        )
      `;
      const res = await query(sql);
      const groupCount = Number(res[0]?.cnt || 0);

      if (groupCount > 0) {
        const detailSql = `
          SELECT count(*) as count, ${cols}
          FROM current_dataset 
          GROUP BY ALL 
          HAVING count(*) > 1
          ORDER BY count(*) DESC
          LIMIT 5
        `;
        const groups = await query(detailSql);
        
        const totalDupesSql = `
          SELECT sum(cnt - 1) as wasted 
          FROM (SELECT count(*) as cnt FROM current_dataset GROUP BY ALL HAVING count(*) > 1)
        `;
        const totalRes = await query(totalDupesSql);
        const totalWasted = Number(totalRes[0]?.wasted || 0);

        set({ duplicates: { total: totalWasted, groups } });
      } else {
        set({ duplicates: null });
      }

    } catch (e) {
      console.error("Dupe Check Error", e);
    }
  },

  mergeDuplicates: async () => {
    const mascot = useMascotStore.getState();
    set({ isLoading: true });
    mascot.setMascot(MASCOT_STATES.EATING, "Fusion des doublons...");

    try {
      await query(`CREATE TABLE current_dataset_dedup AS SELECT DISTINCT * FROM current_dataset`);
      await query(`DROP TABLE current_dataset`);
      await query(`ALTER TABLE current_dataset_dedup RENAME TO current_dataset`);
      
      await get().fetchCurrentView();
      await get().checkDuplicates();
      
      set({ isLoading: false, hasUnsavedChanges: true });
      mascot.setMascot(MASCOT_STATES.SLEEPING, "Doublons fusionnés !");
    } catch (e) {
      useErrorStore.getState().reportError(classifyError(e), e);
      set({ isLoading: false });
    }
  }
}));