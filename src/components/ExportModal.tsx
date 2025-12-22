import React, { useState, useEffect } from 'react';
import { X, FileOutput, Save, Settings } from 'lucide-react';
import { ExportOptions, DEFAULT_EXPORT_OPTIONS, PRESETS, generateExport } from '../services/exportService';
import { useDataStore } from '../stores/dataStore';
import clsx from 'clsx';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose }) => {
  const { fileMeta, columns, fetchRows, markExported } = useDataStore();
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [isExporting, setIsExporting] = useState(false);

  // Auto-set filename based on loaded file
  useEffect(() => {
    if (fileMeta) {
      const baseName = fileMeta.name.substring(0, fileMeta.name.lastIndexOf('.')) || fileMeta.name;
      setOptions(prev => ({ ...prev, filename: `${baseName}_clean` }));
    }
  }, [fileMeta]);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    // Fetch ALL rows for export (not just the view)
    const allRows = await fetchRows(1000000); // 1M limit for V1
    await generateExport(allRows, columns, options);
    markExported(); // Mark as safe
    setIsExporting(false);
    onClose();
  };

  const applyPreset = (key: string) => {
    const preset = PRESETS[key];
    if (preset) {
      setOptions(prev => ({
        ...preset,
        filename: prev.filename // Keep current filename
      }));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-border-dark w-full max-w-md rounded-xl shadow-2xl flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-dark bg-background-dark/50 rounded-t-xl">
          <div className="flex items-center gap-3 text-primary">
             <div className="p-2 rounded-lg bg-primary/20">
               <FileOutput size={20} />
             </div>
             <div>
               <h2 className="text-lg font-bold text-white">Exporter les Données</h2>
               <p className="text-xs text-text-muted">Sauvegarder le fichier nettoyé</p>
             </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          
          {/* Filename */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-subtle tracking-wider">Nom du Fichier</label>
            <div className="flex">
              <input 
                type="text" 
                value={options.filename}
                onChange={(e) => setOptions({...options, filename: e.target.value})}
                className="flex-1 bg-background-dark border border-border-dark rounded-l-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              />
              <div className="bg-surface-active border border-l-0 border-border-dark px-3 py-2 text-sm text-text-muted rounded-r-lg font-mono">
                .{options.format}
              </div>
            </div>
          </div>

          {/* Presets */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase text-subtle tracking-wider flex items-center gap-2">
              <Settings size={12} />
              Presets Rapides
            </label>
            <div className="flex gap-2">
              {Object.keys(PRESETS).map(key => (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className="px-3 py-1.5 rounded-lg bg-surface-active border border-border-dark text-xs font-medium text-text-muted hover:text-white hover:border-primary transition-colors"
                >
                  {key.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Format Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold uppercase text-subtle tracking-wider">Format</label>
              <select 
                value={options.format}
                onChange={(e) => setOptions({...options, format: e.target.value as any})}
                className="w-full bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary"
              >
                <option value="csv">CSV (Texte)</option>
                <option value="xlsx">Excel (XLSX)</option>
                <option value="json">JSON (Web)</option>
              </select>
            </div>
            
            <div className="space-y-1.5">
               <label className="text-xs font-bold uppercase text-subtle tracking-wider">Encodage</label>
               <select 
                 value={options.encoding}
                 onChange={(e) => setOptions({...options, encoding: e.target.value as any})}
                 disabled={options.format === 'xlsx' || options.format === 'json'} // Only for CSV
                 className="w-full bg-background-dark border border-border-dark rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-primary disabled:opacity-50"
               >
                 <option value="utf-8">UTF-8 (Standard)</option>
                 <option value="windows-1252">Windows-1252 (AS400)</option>
               </select>
            </div>
          </div>

          {/* CSV Specifics */}
          {options.format === 'csv' && (
             <div className="p-4 rounded-lg bg-surface-active/30 border border-border-dark space-y-4 animate-in fade-in slide-in-from-top-2">
               <div className="flex items-center justify-between">
                 <label className="text-xs text-text-muted">Délimiteur</label>
                 <div className="flex bg-background-dark rounded-lg p-1 border border-border-dark">
                   {[';', ',', '\t'].map(d => (
                     <button
                       key={d}
                       onClick={() => setOptions({...options, delimiter: d as any})}
                       className={clsx(
                         "size-6 flex items-center justify-center rounded text-xs font-mono transition-colors",
                         options.delimiter === d ? "bg-primary text-background-dark font-bold" : "text-subtle hover:text-white"
                       )}
                     >
                       {d === '\t' ? 'TAB' : d}
                     </button>
                   ))}
                 </div>
               </div>
               
               <div className="flex items-center justify-between">
                 <label className="text-xs text-text-muted">Inclure les En-têtes</label>
                 <input 
                   type="checkbox" 
                   checked={options.includeHeaders}
                   onChange={(e) => setOptions({...options, includeHeaders: e.target.checked})}
                   className="rounded bg-background-dark border-border-dark text-primary focus:ring-0"
                 />
               </div>
             </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-dark flex justify-end gap-3 bg-surface-active/30 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-surface-active hover:bg-border-dark text-white rounded-lg text-sm font-bold transition-colors"
          >
            Annuler
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="px-6 py-2 bg-primary hover:bg-primary-dim text-background-dark rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(57,255,20,0.3)] transition-all flex items-center gap-2"
          >
            {isExporting ? 'Exportation...' : (
              <>
                <Save size={16} />
                Sauvegarder
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};

export default ExportModal;
