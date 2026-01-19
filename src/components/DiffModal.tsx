import React, { useState, useCallback } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useDropzone } from 'react-dropzone';
import { X, ArrowRightLeft, FileText, Upload, CheckCircle, AlertTriangle, Download } from 'lucide-react';
import clsx from 'clsx';
import { generateExport } from '../services/exportService';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DiffModal: React.FC<DiffModalProps> = ({ isOpen, onClose }) => {
  const { fileMeta, loadComparisonFile, diffReport, isLoading, clearDiff } = useDataStore();
  const [comparisonFile, setComparisonFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setComparisonFile(acceptedFiles[0]);
    }
  }, []);

  const handleCloseComparison = () => {
    setComparisonFile(null);
    clearDiff();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'text/csv': ['.csv'], 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'] },
    maxFiles: 1
  });

  const handleCompare = async () => {
    if (comparisonFile) {
      await loadComparisonFile(comparisonFile);
    }
  };

  const handleExportDiff = async () => {
    if (!diffReport) return;
    
    // Prepare Diff Data for Export
    // Structure: Status | Row Data...
    const addedRows = diffReport.rowsAdded.map(r => ({ ...r, _DIFF_STATUS: 'ADDED (V2)' }));
    const removedRows = diffReport.rowsRemoved.map(r => ({ ...r, _DIFF_STATUS: 'REMOVED (V1)' }));
    const combined = [...addedRows, ...removedRows];
    
    // Get columns from first row (assuming schema match)
    const cols = Object.keys(combined[0] || {}).map(k => ({ name: k }));

    await generateExport(combined, cols, {
      filename: `diff_report_${fileMeta?.name}_vs_${comparisonFile?.name}`,
      format: 'csv',
      encoding: 'utf-8',
      delimiter: ',',
      includeHeaders: true
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-border-dark w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-dark bg-background-dark/50 rounded-t-xl">
          <div className="flex items-center gap-3 text-primary">
             <div className="p-2 rounded-lg bg-primary/20">
               <ArrowRightLeft size={24} />
             </div>
             <div>
               <h2 className="text-xl font-bold text-white">Comparer Deux Tables</h2>
               <p className="text-xs text-text-muted">Analysez les différences entre la version actuelle et un nouveau fichier.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors" aria-label="Fermer la comparaison">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8 bg-background-dark/30 flex-1 overflow-y-auto">
          
          {/* File Comparison Stage */}
          <div className="flex items-center justify-center gap-8">
            
            {/* File A (Current) */}
            <div className="w-64 p-6 rounded-xl bg-surface-active/30 border border-border-dark flex flex-col items-center gap-4 text-center">
              <div className="size-16 rounded-full bg-surface-dark flex items-center justify-center text-primary border border-primary/30">
                <FileText size={32} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase text-subtle tracking-wider mb-1">Fichier Actuel (V1)</p>
                <p className="text-sm font-bold text-white truncate max-w-[200px]" title={fileMeta?.name}>{fileMeta?.name}</p>
                <p className="text-xs text-text-muted">{(fileMeta?.size || 0 / 1024).toFixed(0)} KB</p>
              </div>
            </div>

            {/* VS Icon */}
            <div className="flex flex-col items-center gap-2 text-subtle">
              <div className="h-px w-12 bg-border-dark" />
              <span className="font-bold font-mono text-xs">VS</span>
              <div className="h-px w-12 bg-border-dark" />
            </div>

            {/* File B (Upload) */}
            {comparisonFile ? (
              <div className="w-64 p-6 rounded-xl bg-surface-active/30 border border-primary/50 flex flex-col items-center gap-4 text-center relative group">
                <button 
                  onClick={handleCloseComparison}
                  className="absolute top-2 right-2 p-1 rounded-full bg-surface-dark text-text-muted hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                  aria-label="Supprimer le fichier comparé"
                >
                  <X size={14} />
                </button>
                <div className="size-16 rounded-full bg-surface-dark flex items-center justify-center text-white border border-white/20">
                  <FileText size={32} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-subtle tracking-wider mb-1">Fichier Comparé (V2)</p>
                  <p className="text-sm font-bold text-white truncate max-w-[200px]" title={comparisonFile.name}>{comparisonFile.name}</p>
                  <p className="text-xs text-text-muted">{(comparisonFile.size / 1024).toFixed(0)} KB</p>
                </div>
              </div>
            ) : (
              <div 
                {...getRootProps()}
                className={clsx(
                  "w-64 p-6 rounded-xl border-2 border-dashed flex flex-col items-center gap-4 text-center cursor-pointer transition-colors",
                  isDragActive ? "bg-primary/5 border-primary" : "bg-transparent border-border-dark hover:border-primary/50 hover:bg-surface-active/20"
                )}
              >
                <input {...getInputProps()} />
                <div className="size-16 rounded-full bg-surface-dark flex items-center justify-center text-subtle">
                  <Upload size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-subtle tracking-wider mb-1">Charger un fichier</p>
                  <p className="text-xs text-text-muted">Glissez ou cliquez pour sélectionner</p>
                </div>
              </div>
            )}

          </div>

          {/* Results Section */}
          {diffReport && (
            <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 pt-6 border-t border-border-dark">
              
              {diffReport.schemaMismatch ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                    <AlertTriangle size={18} />
                    <span className="font-bold text-sm">Structure Différente : Comparaison impossible ligne à ligne</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-surface-dark border border-border-dark">
                      <h4 className="text-xs font-bold uppercase text-subtle mb-2">Manquant dans V2</h4>
                      {diffReport.schemaMismatch.columnsInV1Only.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {diffReport.schemaMismatch.columnsInV1Only.map(c => (
                            <span key={c} className="px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-mono">{c}</span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-text-muted italic">Aucune</span>}
                    </div>
                    <div className="p-4 rounded-xl bg-surface-dark border border-border-dark">
                      <h4 className="text-xs font-bold uppercase text-subtle mb-2">Nouveau dans V2</h4>
                      {diffReport.schemaMismatch.columnsInV2Only.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {diffReport.schemaMismatch.columnsInV2Only.map(c => (
                            <span key={c} className="px-2 py-1 rounded bg-primary/10 text-primary text-xs font-mono">{c}</span>
                          ))}
                        </div>
                      ) : <span className="text-xs text-text-muted italic">Aucune</span>}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2">
                    {diffReport.added === 0 && diffReport.removed === 0 ? (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20">
                        <CheckCircle size={18} />
                        <span className="font-bold text-sm">Les fichiers sont identiques !</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 text-yellow-500 border border-yellow-500/20">
                        <AlertTriangle size={18} />
                        <span className="font-bold text-sm">Des différences ont été trouvées</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 flex flex-col items-center">
                      <span className="text-2xl font-black text-red-400">-{diffReport.removed}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-red-300/70">Lignes Supprimées (V1)</span>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20 flex flex-col items-center">
                      <span className="text-2xl font-black text-primary">+{diffReport.added}</span>
                      <span className="text-xs font-bold uppercase tracking-wider text-primary/70">Lignes Ajoutées (V2)</span>
                    </div>
                  </div>

                  {/* Aperçu Heatmap */}
                  {(diffReport.added > 0 || diffReport.removed > 0) && (
                    <div className="space-y-3">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-subtle flex items-center gap-2">
                        <div className="size-1 bg-primary rounded-full shadow-[0_0_5px_#13ec5b]" />
                        Aperçu des Écarts (Top 10)
                      </h4>
                      <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden max-h-64 overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                          <thead className="bg-background-dark/50 text-[10px] uppercase text-text-muted sticky top-0 z-10 shadow-sm">
                            <tr>
                              <th className="p-2 border-b border-border-dark">Action</th>
                              {Object.keys(diffReport.rowsAdded[0] || diffReport.rowsRemoved[0] || {}).slice(0, 4).map(k => (
                                <th key={k} className="p-2 border-b border-border-dark">{k}</th>
                              ))}
                              <th className="p-2 border-b border-border-dark">...</th>
                            </tr>
                          </thead>
                          <tbody className="text-[11px] font-mono">
                            {/* Removed Rows */}
                            {diffReport.rowsRemoved.slice(0, 5).map((row, i) => (
                              <tr key={`rem-${i}`} className="bg-red-500/5 text-red-200/70 border-b border-red-500/10">
                                <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-bold uppercase">Supprimé</span></td>
                                {Object.values(row).slice(0, 4).map((v: any, j) => (
                                  <td key={j} className="p-2 truncate max-w-[120px]">{String(v)}</td>
                                ))}
                                <td className="p-2">...</td>
                              </tr>
                            ))}
                            {/* Added Rows */}
                            {diffReport.rowsAdded.slice(0, 5).map((row, i) => (
                              <tr key={`add-${i}`} className="bg-primary/5 text-primary/70 border-b border-primary/10">
                                <td className="p-2"><span className="px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[9px] font-bold uppercase">Ajouté</span></td>
                                {Object.values(row).slice(0, 4).map((v: any, j) => (
                                  <td key={j} className="p-2 truncate max-w-[120px]">{String(v)}</td>
                                ))}
                                <td className="p-2">...</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-dark flex justify-end gap-3 bg-surface-active/30 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-transparent hover:bg-surface-active text-text-muted hover:text-white rounded-lg text-sm font-bold transition-colors"
          >
            Fermer
          </button>
          
          {!diffReport ? (
            <button 
              onClick={handleCompare}
              disabled={!comparisonFile || isLoading}
              className="px-6 py-2 bg-primary hover:bg-primary-dim text-background-dark rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(19,236,91,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Lancer l'Analyse
            </button>
          ) : (
            <button 
              onClick={handleExportDiff}
              className="px-6 py-2 bg-primary hover:bg-primary-dim text-background-dark rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(19,236,91,0.3)] transition-all flex items-center gap-2"
            >
              <Download size={16} />
              Exporter le Rapport
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default DiffModal;
