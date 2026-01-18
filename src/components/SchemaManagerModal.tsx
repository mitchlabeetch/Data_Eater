import React, { useState, useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { Settings2, X, Play, Loader2, ArrowRight, ArrowUp, ArrowDown, Database, Type } from 'lucide-react';
import clsx from 'clsx';

interface SchemaManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const mainframize = (name: string): string => {
  let clean = name.toUpperCase().replace(/[^A-Z0-9]/g, '_');
  if (clean.length <= 10) return clean;
  const noUnderscore = clean.replace(/_/g, '');
  if (noUnderscore.length <= 10) return noUnderscore;
  return noUnderscore.substring(0, 10);
};

export const SchemaManagerModal: React.FC<SchemaManagerModalProps> = ({ isOpen, onClose }) => {
  const { columns, executeMutation, rawQuery } = useDataStore();
  const [mappings, setMappings] = useState<Record<string, string>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [mode, setMode] = useState<'STANDARD' | 'AS400'>('STANDARD');
  const [copybookText, setCopybookText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const map: Record<string, string> = {};
      columns.forEach(c => { map[c.name] = c.name; });
      setMappings(map);
      setOrder(columns.map(c => c.name));
    }
  }, [isOpen, columns]);

  const handleApplyRules = () => {
    const newMappings = { ...mappings };
    order.forEach(colName => {
      if (mode === 'AS400') {
        newMappings[colName] = mainframize(newMappings[colName]);
      }
    });
    setMappings(newMappings);
  };

  const handleParseCopybook = () => {
    const lines = copybookText.split('\n').filter(l => l.trim().length > 0);
    const newMappings = { ...mappings };
    order.forEach((colName, idx) => {
      if (idx < lines.length) {
        let name = lines[idx].trim().split(/\s+/)[0];
        if (/^\d+$/.test(name) && lines[idx].trim().split(/\s+/).length > 1) {
           name = lines[idx].trim().split(/\s+/)[1];
        }
        newMappings[colName] = mode === 'AS400' ? mainframize(name) : name;
      }
    });
    setMappings(newMappings);
  };

  const moveColumn = (index: number, direction: 'UP' | 'DOWN') => {
    const newOrder = [...order];
    const targetIndex = direction === 'UP' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newOrder.length) return;
    [newOrder[index], newOrder[targetIndex]] = [newOrder[targetIndex], newOrder[index]];
    setOrder(newOrder);
  };

  const handleApply = async () => {
    setIsProcessing(true);
    try {
      // 1. Rename columns (Parallelized)
      let renameCount = 0;
      const renamePromises = [];

      for (const [oldName, newName] of Object.entries(mappings)) {
        if (oldName !== newName) {
           // Use rawQuery to avoid store updates (and heavy refresh side effects) per column
           renamePromises.push(
               rawQuery(`ALTER TABLE current_dataset RENAME COLUMN "${oldName}" TO "${newName}"`)
           );
           renameCount++;
        }
      }

      if (renamePromises.length > 0) {
          await Promise.all(renamePromises);
      }
      
      // 2. Reorder (DuckDB doesn't have an EASY reorder, we must recreate or select in order)
      // We'll use a VIEW trick or just update the internal store if we only want UI order.
      // But for a true schema manager, we should recreate the table.
      const mappedOrder = order.map(oldName => `"${mappings[oldName]}"`).join(', ');

      const desc = renameCount > 0
          ? `Réorganisation et Renommage (${renameCount} cols)`
          : "Réorganisation des colonnes";

      await executeMutation(`CREATE TABLE schema_temp AS SELECT ${mappedOrder} FROM current_dataset`, desc);
      await executeMutation(`DROP TABLE current_dataset`, "Nettoyage ancien schéma");
      await executeMutation(`ALTER TABLE schema_temp RENAME TO current_dataset`, "Finalisation du nouveau schéma");
      
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la mise à jour du schéma.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-surface-active rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-surface-active bg-background-dark/50 flex justify-between items-center">
          <h2 className="text-lg font-bold text-white flex items-center gap-2"><Settings2 size={20} className="text-primary" />Gestionnaire de Schéma</h2>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Controls */}
          <div className="w-72 border-r border-border-dark p-6 space-y-6 bg-background-dark/20 overflow-y-auto custom-scrollbar">
            <div className="space-y-3">
              <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">1. Mode de Renommage</label>
              <div className="flex flex-col gap-2">
                <button onClick={() => setMode('STANDARD')} className={clsx("flex items-center gap-3 p-3 rounded-lg border transition-all text-left", mode === 'STANDARD' ? "bg-primary/10 border-primary text-white" : "bg-surface-active border-border-dark text-text-muted")}>
                  <Type size={16} />
                  <div>
                    <p className="text-xs font-bold">Standard</p>
                    <p className="text-[10px] opacity-70">Libre (UTF-8)</p>
                  </div>
                </button>
                <button onClick={() => setMode('AS400')} className={clsx("flex items-center gap-3 p-3 rounded-lg border transition-all text-left", mode === 'AS400' ? "bg-primary/10 border-primary text-white" : "bg-surface-active border-border-dark text-text-muted")}>
                  <Database size={16} />
                  <div>
                    <p className="text-xs font-bold">IBM i (AS400)</p>
                    <p className="text-[10px] opacity-70">10 chars, MAJ, A-Z</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-border-dark/50">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black uppercase tracking-widest text-text-muted">2. Import Définition</label>
                <button onClick={handleParseCopybook} disabled={!copybookText} className="text-[9px] font-bold text-primary hover:underline disabled:opacity-30">PARSER</button>
              </div>
              <textarea 
                value={copybookText}
                onChange={(e) => setCopybookText(e.target.value)}
                placeholder="Collez un Copybook ou une liste de noms..."
                className="w-full h-32 bg-background-dark text-[10px] font-mono text-text-muted p-2 rounded border border-border-dark focus:border-primary outline-none resize-none"
              />
            </div>

            <button onClick={handleApplyRules} className="w-full py-2 bg-surface-active hover:bg-primary/20 border border-border-dark hover:border-primary text-[10px] font-black uppercase tracking-widest text-white transition-all">Appliquer Règles</button>
          </div>

          {/* Main - List */}
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-4">
             <div className="flex justify-between items-center px-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-subtle">Ordre & Noms des colonnes</h3>
                <span className="text-[10px] text-text-muted italic">Glissez ou utilisez les flèches pour réordonner</span>
             </div>
             <div className="space-y-1 bg-background-dark/50 rounded-xl border border-border-dark overflow-hidden divide-y divide-border-dark/30">
                {order.map((colName, idx) => (
                  <div key={colName} className="p-3 flex items-center gap-4 group hover:bg-primary/5 transition-colors">
                    <div className="flex flex-col gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                       <button onClick={() => moveColumn(idx, 'UP')} className="p-0.5 hover:text-primary text-text-muted"><ArrowUp size={12}/></button>
                       <button onClick={() => moveColumn(idx, 'DOWN')} className="p-0.5 hover:text-primary text-text-muted"><ArrowDown size={12}/></button>
                    </div>
                    <span className="text-xs text-text-muted font-mono w-1/3 truncate" title={colName}>{colName}</span>
                    <ArrowRight size={14} className="text-primary/30" />
                    <div className="flex-1 relative">
                       <input 
                         type="text" 
                         value={mappings[colName] || ''} 
                         onChange={e => setMappings({ ...mappings, [colName]: mode === 'AS400' ? e.target.value.toUpperCase() : e.target.value })}
                         className={clsx("w-full bg-surface-active border border-border-dark rounded px-3 py-1.5 text-xs font-mono font-bold focus:border-primary outline-none", mode === 'AS400' ? "text-primary uppercase" : "text-white")}
                         maxLength={mode === 'AS400' ? 10 : 100}
                       />
                       {mode === 'AS400' && (
                         <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-subtle font-mono">{mappings[colName]?.length || 0}/10</span>
                       )}
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </div>

        <div className="p-4 border-t border-surface-active bg-surface-dark flex justify-between items-center">
          <p className="text-[10px] text-text-muted italic px-4">
            <span className="text-orange-400 font-bold">⚠️ Risque de rupture :</span> Le changement de nom ou d'ordre impacte les exports et scripts existants.
          </p>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-text-muted font-bold text-xs hover:text-white transition-colors">ANNULER</button>
            <button disabled={isProcessing} onClick={handleApply} className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-dim text-background-dark font-black text-xs shadow-lg flex items-center gap-2 transition-all disabled:opacity-50">
              {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              APPLIQUER LE SCHÉMA
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};