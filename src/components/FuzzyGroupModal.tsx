import React, { useState, useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { query } from '../services/duckdb';
import { Sparkles, X, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';

interface Cluster {
  canonical: string;
  members: string[];
}

interface FuzzyGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const FuzzyGroupModal: React.FC<FuzzyGroupModalProps> = ({ isOpen, onClose }) => {
  const { selectedColumn, executeMutation } = useDataStore();
  const [clusters, setClusters] = useState<Cluster[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isOpen && selectedColumn) {
      analyzeFuzzy();
    }
  }, [isOpen, selectedColumn]);

  const analyzeFuzzy = async () => {
    if (!selectedColumn) return;
    setIsAnalyzing(true);
    try {
      // Use DuckDB Levenshtein for MUCH faster and smarter clustering in WASM
      // Limit to top 1000 distinct values to prevent browser hang on huge datasets (O(N^2))
      const sql = `
        WITH keys AS (
          SELECT DISTINCT "${selectedColumn}" as val 
          FROM current_dataset 
          WHERE "${selectedColumn}" IS NOT NULL 
          LIMIT 1000
        )
        SELECT k1.val as v1, k2.val as v2 
        FROM keys k1, keys k2 
        WHERE k1.val < k2.val 
        AND levenshtein(k1.val, k2.val) BETWEEN 1 AND 3
      `;
      
      const res = await query(sql);
      
      // Group results into clusters
      const groups = new Map<string, Set<string>>();
      
      res.forEach((row: any) => {
        const v1 = String(row.v1);
        const v2 = String(row.v2);
        
        // Simple Union-Find-like grouping
        let foundKey = v1;
        for (const [key, set] of groups.entries()) {
           if (set.has(v1) || set.has(v2)) {
             foundKey = key;
             break;
           }
        }
        
        if (!groups.has(foundKey)) {
          groups.set(foundKey, new Set([foundKey]));
        }
        groups.get(foundKey)?.add(v1);
        groups.get(foundKey)?.add(v2);
      });

      const uiClusters: Cluster[] = Array.from(groups.entries()).map(([key, set]) => ({
        canonical: key,
        members: Array.from(set).sort()
      }));

      setClusters(uiClusters);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleApply = async () => {
    if (clusters.length === 0) return;
    setIsApplying(true);
    try {
      const caseParts = clusters.map(c => {
        const membersList = c.members.map(m => `'${m.replace(/'/g, "''")}'`).join(', ');
        return `WHEN "${selectedColumn}" IN (${membersList}) THEN '${c.canonical.replace(/'/g, "''")}'`;
      }).join(' ');
      const sql = `UPDATE current_dataset SET "${selectedColumn}" = CASE ${caseParts} ELSE "${selectedColumn}" END`;
      await executeMutation(sql, `Harmonisation Fuzzy: ${selectedColumn}`);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'harmonisation.");
    } finally {
      setIsApplying(false);
    }
  };

  const updateCanonical = (idx: number, newVal: string) => {
    const next = [...clusters];
    next[idx].canonical = newVal;
    setClusters(next);
  };

  if (!isOpen || !selectedColumn) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-surface-active rounded-xl shadow-2xl w-full max-w-3xl h-[75vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-surface-active bg-background-dark/50 flex justify-between items-center"><h2 className="text-lg font-bold text-white flex items-center gap-2"><Sparkles size={20} className="text-primary" />Harmonisation Intelligente (Fuzzy)</h2><button onClick={onClose} className="text-text-muted hover:text-white transition-colors"><X size={20} /></button></div>
        <div className="flex-1 flex flex-col min-h-0">
          <div className="p-6 border-b border-surface-active flex items-center justify-between"><div className="space-y-1"><p className="text-xs text-text-muted uppercase font-bold tracking-widest">Analyse de la colonne</p><p className="text-sm font-mono text-primary">{selectedColumn}</p></div>{isAnalyzing && <div className="flex items-center gap-2 text-xs text-primary animate-pulse"><Loader2 size={14} className="animate-spin" /> Recherche de similarités...</div>}</div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar bg-background-dark/20">
             {clusters.length === 0 && !isAnalyzing && (
               <div className="h-full flex flex-col items-center justify-center text-subtle italic text-sm"><CheckCircle2 size={48} className="opacity-10 mb-4" />Aucun doublon approximatif détecté sur l'échantillon.</div>
             )}
             {clusters.map((cluster, idx) => (
               <div key={idx} className="bg-surface-active/30 border border-border-dark rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-3"><span className="text-[10px] font-black bg-primary text-background-dark px-1.5 py-0.5 rounded uppercase">Groupe #{idx+1}</span><div className="flex-1 h-px bg-border-dark" /></div>
                  <div className="flex items-start gap-4">
                    <div className="flex-1 space-y-2"><label className="text-[9px] font-bold text-text-muted uppercase">Valeurs Trouvées</label><div className="flex flex-wrap gap-1.5">{cluster.members.map(m => (<span key={m} className="px-2 py-1 rounded bg-background-dark text-[10px] font-mono text-white border border-border-dark italic">{m || '(Vide)'}</span>))}</div></div>
                    <ChevronRight size={20} className="text-primary self-center" /><div className="w-1/3 space-y-2"><label className="text-[9px] font-bold text-primary uppercase">Valeur Cible (Finale)</label><input type="text" value={cluster.canonical} onChange={e => updateCanonical(idx, e.target.value)} className="w-full bg-background-dark border border-primary/30 rounded p-2 text-xs font-bold text-white focus:border-primary outline-none" /></div>
                  </div>
               </div>
             ))}
          </div>
        </div>
        <div className="p-4 border-t border-surface-active bg-surface-dark flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-text-muted font-bold text-xs">ANNULER</button>
          <button disabled={clusters.length === 0 || isApplying} onClick={handleApply} className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-dim text-background-dark font-black text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-30">{isApplying ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}APPLIQUER LA FUSION</button>
        </div>
      </div>
    </div>
  );
};