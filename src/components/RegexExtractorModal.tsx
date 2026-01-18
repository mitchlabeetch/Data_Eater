import React, { useState, useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { Regex, X, Play, Loader2, ArrowRight } from 'lucide-react';
import clsx from 'clsx';

interface RegexExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RegexExtractorModal: React.FC<RegexExtractorModalProps> = ({ isOpen, onClose }) => {
  const { selectedColumn, fetchRows, executeMutation } = useDataStore();
  const [pattern, setPattern] = useState<string>('');
  const [previewData, setPreviewData] = useState<string[][]>([]);
  const [newColNames, setNewColNames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sampleRows, setSampleRows] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      let active = true;
      setSampleRows([]); // Clear previous data
      setIsProcessing(true);
      setError(null);

      fetchRows(5)
        .then(rows => {
          if (active) {
            setSampleRows(rows);
            setIsProcessing(false);
          }
        })
        .catch(err => {
          if (active) {
            setError(err instanceof Error ? err.message : String(err));
            setIsProcessing(false);
          }
        });

      return () => { active = false; };
    }
  }, [isOpen, fetchRows]);

  useEffect(() => {
    if (isOpen && selectedColumn && pattern && sampleRows.length > 0) {
      const timer = setTimeout(loadPreview, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedColumn, pattern, sampleRows]);

  const loadPreview = () => {
    if (!selectedColumn || !pattern || sampleRows.length === 0) return;
    setError(null);
    try {
      const re = new RegExp(pattern);
      const extracted = sampleRows.map(r => {
        const val = String(r[selectedColumn] || '');
        const match = val.match(re);
        if (match) return match.length > 1 ? match.slice(1) : [match[0]];
        return [];
      });
      const maxGroups = Math.max(...extracted.map(e => e.length), 0);
      if (newColNames.length !== maxGroups) setNewColNames(Array.from({ length: maxGroups }, (_, i) => `${selectedColumn}_ext${i + 1}`));
      setPreviewData(extracted);
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleApply = async () => {
    if (!selectedColumn || !pattern || newColNames.length === 0) return;
    setIsProcessing(true);
    try {
      for (const colName of newColNames) { await executeMutation(`ALTER TABLE current_dataset ADD COLUMN IF NOT EXISTS "${colName}" VARCHAR`); }
      const setClauses = newColNames.map((colName, idx) => `"${colName}" = regexp_extract("${selectedColumn}", '${pattern.replace(/'/g, "''")}', ${idx + 1})`).join(', ');
      await executeMutation(`UPDATE current_dataset SET ${setClauses}`, `Extraction Regex sur ${selectedColumn}`);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de l'extraction Regex.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !selectedColumn) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-surface-active rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
        <div className="p-4 border-b border-surface-active bg-background-dark/50 flex justify-between items-center"><h2 className="text-lg font-bold text-white flex items-center gap-2"><Regex size={20} className="text-primary" />Extracteur Regex</h2><button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button></div>
        <div className="p-6 space-y-6">
          <div className="space-y-2"><label className="text-[10px] font-black uppercase text-text-muted">Pattern Regex</label><div className="relative"><input type="text" value={pattern} onChange={e => setPattern(e.target.value)} placeholder="Ex: (\d+)\s*units" className={clsx("w-full bg-background-dark border rounded-lg p-3 text-sm font-mono focus:outline-none transition-colors", error ? "border-red-500/50" : "border-border-dark focus:border-primary")} />{error && <p className="text-[10px] text-red-400 mt-1">{error}</p>}</div></div>
          <div className="space-y-3"><h3 className="text-xs font-bold uppercase tracking-wider text-subtle">Nouvelles Colonnes & Aperçu</h3><div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">{newColNames.map((name, idx) => (<div key={idx} className="flex items-center gap-3 bg-background-dark/50 p-2 rounded border border-border-dark"><input type="text" value={name} onChange={(e) => { const n = [...newColNames]; n[idx] = e.target.value; setNewColNames(n); }} className="flex-1 bg-transparent border-none outline-none text-xs font-mono text-primary" /><ArrowRight size={14} className="text-subtle" /><span className="text-[10px] text-white truncate max-w-[150px] font-mono bg-surface-active px-1.5 py-0.5 rounded">{previewData[0]?.[idx] || <span className="italic opacity-30">N/A</span>}</span></div>))}{newColNames.length === 0 && !error && (<div className="text-center py-8 text-subtle text-xs italic">Entrez un pattern avec des parenthèses (groupes) pour extraire des données.</div>)}</div></div>
        </div>
        <div className="p-4 border-t border-surface-active bg-surface-dark flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-text-muted font-bold text-xs">ANNULER</button>
          <button disabled={!pattern || newColNames.length === 0 || isProcessing} onClick={handleApply} className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-dim text-background-dark font-black text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-30">{isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}EXTRAIRE</button>
        </div>
      </div>
    </div>
  );
};