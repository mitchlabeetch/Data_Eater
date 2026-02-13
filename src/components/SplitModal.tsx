import React, { useState, useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { SplitSquareHorizontal, ArrowRight } from 'lucide-react';

interface SplitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SplitModal: React.FC<SplitModalProps> = ({ isOpen, onClose }) => {
  const { selectedColumn, fetchRows, executeMutation, columns } = useDataStore();
  const [delimiter, setDelimiter] = useState<string>(',');
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [newColNames, setNewColNames] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Load Preview
  useEffect(() => {
    if (isOpen && selectedColumn) {
      loadPreview();
    }
  }, [isOpen, selectedColumn, delimiter]);

  const loadPreview = async () => {
    if (!selectedColumn) return;
    const rows = await fetchRows(5);
    const splitData = rows.map(r => {
      const val = String(r[selectedColumn] || '');
      return val.split(delimiter);
    });
    
    // Determine max parts to auto-generate inputs
    const maxParts = Math.max(...splitData.map(d => d.length));
    
    // Initialize col names if length changed
    if (newColNames.length !== maxParts) {
       setNewColNames(Array.from({ length: maxParts }, (_, i) => `${selectedColumn}_part${i + 1}`));
    }

    setPreviewData(splitData);
  };

  const handleApply = async () => {
    if (!selectedColumn) return;
    setIsProcessing(true);

    try {
      // 1. Resolve Column Name Collisions
      // We ensure we don't overwrite existing columns by suffixing new names if needed.
      const existingNames = columns.map(c => c.name);
      const finalColNames = generateUniqueNames(existingNames, newColNames);

      // 2. Add Columns
      // DuckDB doesn't support adding multiple columns in one ALTER TABLE (standard SQL limitation usually)
      for (const colName of finalColNames) {
        await executeMutation(`ALTER TABLE current_dataset ADD COLUMN "${colName.replace(/"/g, '""')}" VARCHAR`);
      }

      // 3. Update Data
      // UPDATE table SET col1 = list_extract(str_split(src, delim), 1), col2 = ...
      // list_extract is 1-based in DuckDB
      const setClauses = finalColNames.map((colName, idx) => {
        // str_split returns a list. 
        // We use unnest or list_extract. list_extract(list, index)
        // DuckDB list indices are 1-based.
        return `"${colName}" = list_extract(string_split("${selectedColumn}", '${delimiter}'), ${idx + 1})`;
      }).join(', ');

      await executeMutation(`UPDATE current_dataset SET ${setClauses}`);
      
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors du découpage");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !selectedColumn) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-surface-active rounded-xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 border-b border-surface-active bg-background-dark/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <SplitSquareHorizontal size={20} className="text-primary" />
            Découper la colonne : <span className="text-primary font-mono">{selectedColumn}</span>
          </h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          
          {/* Settings */}
          <div className="flex items-center gap-4">
            <label className="text-sm text-text-muted">Séparateur :</label>
            <div className="flex gap-2">
              {[',', ';', '-', '/', '|', ' '].map(d => (
                <button
                  key={d}
                  onClick={() => setDelimiter(d)}
                  className={`size-8 rounded flex items-center justify-center font-mono text-sm border ${
                    delimiter === d ? 'bg-primary text-background-dark border-primary' : 'bg-background-dark border-border-dark text-white hover:border-primary/50'
                  }`}
                >
                  {d === ' ' ? '␣' : d}
                </button>
              ))}
              <input 
                type="text" 
                maxLength={1}
                value={delimiter}
                onChange={(e) => setDelimiter(e.target.value)}
                className="size-8 rounded bg-background-dark border border-border-dark text-center font-mono text-sm focus:border-primary outline-none text-white"
                placeholder="?"
              />
            </div>
          </div>

          {/* Column Naming & Preview */}
          <div className="space-y-3">
             <h3 className="text-xs font-bold uppercase tracking-wider text-subtle">Nouvelles Colonnes</h3>
             <div className="grid grid-cols-1 gap-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {newColNames.map((name, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-background-dark/50 p-2 rounded border border-border-dark">
                     <span className="text-xs font-mono text-text-muted w-6 text-center">#{idx + 1}</span>
                     <input 
                       type="text" 
                       value={name}
                       onChange={(e) => {
                         const newNames = [...newColNames];
                         newNames[idx] = e.target.value;
                         setNewColNames(newNames);
                       }}
                       className="flex-1 bg-transparent border-none outline-none text-sm font-mono text-primary placeholder-subtle"
                     />
                     <ArrowRight size={14} className="text-subtle" />
                     <span className="text-xs text-white truncate max-w-[150px]">
                       {previewData[0]?.[idx] || <span className="italic text-subtle opacity-50">Vide</span>}
                     </span>
                  </div>
                ))}
             </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-surface-active bg-background-dark flex justify-end gap-3">
          <button 
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-surface-active hover:bg-surface-active/80 text-white font-medium text-sm"
          >
            Annuler
          </button>
          <button 
            onClick={handleApply}
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dim text-background-dark font-bold text-sm flex items-center gap-2"
          >
            {isProcessing ? 'Découpage...' : 'Appliquer'}
          </button>
        </div>

      </div>
    </div>
  );
};

function generateUniqueNames(existingColumns: string[], proposedNames: string[]): string[] {
  const usedNames = new Set(existingColumns);
  const resultNames: string[] = [];

  for (const name of proposedNames) {
    let uniqueName = name;
    let counter = 1;

    while (usedNames.has(uniqueName)) {
      uniqueName = `${name}_${counter}`;
      counter++;
    }

    usedNames.add(uniqueName);
    resultNames.push(uniqueName);
  }
  return resultNames;
}
