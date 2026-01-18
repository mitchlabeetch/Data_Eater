import React, { useState } from 'react';
import { useDataStore } from '../stores/dataStore';
import { query } from '../services/duckdb';
import { ListCollapse, X, Play, Loader2, ArrowDown } from 'lucide-react';
import clsx from 'clsx';

interface UnpivotModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UnpivotModal: React.FC<UnpivotModalProps> = ({ isOpen, onClose }) => {
  const { columns, executeMutation } = useDataStore();
  const [valueCols, setValueCols] = useState<Set<string>>(new Set());
  const [varName, setVarName] = useState('Attribut');
  const [valName, setValName] = useState('Valeur');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUnpivot = async () => {
    if (valueCols.size === 0) return;
    setIsProcessing(true);
    try {
      const colsToUnpivot = Array.from(valueCols).map(c => `"${c}"`).join(', ');
      const sql = `CREATE TABLE unpivoted_temp AS UNPIVOT current_dataset ON ${colsToUnpivot} INTO NAME "${varName}" VALUE "${valName}"`;
      await query(sql);
      await executeMutation(`DROP TABLE current_dataset`, "Mise au format long");
      await executeMutation(`ALTER TABLE unpivoted_temp RENAME TO current_dataset`, `Dépivotage de ${valueCols.size} colonnes`);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors du dépivotage.");
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleCol = (col: string, list: Set<string>, setList: (l: Set<string>) => void) => {
    const next = new Set(list);
    if (next.has(col)) {
      next.delete(col);
    } else {
      next.add(col);
    }
    setList(next);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-surface-active rounded-xl shadow-2xl w-full max-w-3xl h-[70vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-surface-active bg-background-dark/50 flex justify-between items-center"><h2 className="text-lg font-bold text-white flex items-center gap-2"><ListCollapse size={20} className="text-primary" />Dépivoter (Melt / Unpivot)</h2><button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button></div>
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 p-6 space-y-6 overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted">1. Colonnes à Dépivoter</label><div className="space-y-1 max-h-64 overflow-y-auto pr-2 custom-scrollbar">{columns.map(c => (<button key={c.name} onClick={() => toggleCol(c.name, valueCols, setValueCols)} className={clsx("w-full text-left px-3 py-2 rounded text-xs font-mono border transition-all", valueCols.has(c.name) ? "bg-primary/20 border-primary text-primary font-bold" : "bg-background-dark border-border-dark text-text-muted hover:border-primary/30")}>{c.name}</button>))}</div></div>
              <div className="space-y-4">
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted">2. Nom de la Colonne "Variable"</label><input type="text" value={varName} onChange={e => setVarName(e.target.value)} className="w-full bg-background-dark border border-border-dark rounded p-2 text-sm text-white focus:border-primary outline-none" /></div>
                <div className="space-y-2"><label className="text-[10px] font-black uppercase tracking-widest text-text-muted">3. Nom de la Colonne "Valeur"</label><input type="text" value={valName} onChange={e => setValName(e.target.value)} className="w-full bg-background-dark border border-border-dark rounded p-2 text-sm text-white focus:border-primary outline-none" /></div>
                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 space-y-3"><h4 className="text-[10px] font-bold text-primary uppercase">Transformation</h4><div className="flex items-center gap-4 justify-center"><div className="text-center"><div className="text-xs text-white font-bold">{valueCols.size}</div><div className="text-[9px] text-text-muted uppercase">Colonnes</div></div><ArrowDown size={16} className="text-primary" /><div className="text-center"><div className="text-xs text-white font-bold">2</div><div className="text-[9px] text-text-muted uppercase">Colonnes</div></div></div><p className="text-[9px] text-text-muted italic text-center">Les lignes seront multipliées par {valueCols.size || 1}.</p></div>
              </div>
            </div>
          </div>
        </div>
        <div className="p-4 border-t border-surface-active bg-surface-dark flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-text-muted font-bold text-xs">ANNULER</button>
          <button disabled={valueCols.size === 0 || isProcessing} onClick={handleUnpivot} className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-dim text-background-dark font-black text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-30">{isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}EXÉCUTER LE DÉPIVOTAGE</button>
        </div>
      </div>
    </div>
  );
};