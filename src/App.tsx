import { useEffect, useCallback, useState } from "react";
import Sidebar from "./components/Sidebar";
import Toolbox from "./components/Toolbox";
import ExportModal from "./components/ExportModal";
import FAQPage from "./components/FAQPage";
import FilterModal from "./components/FilterModal";
import NormalizationModal from "./components/NormalizationModal";
import { useDataStore } from "./stores/dataStore";
import { useViewStore } from "./stores/viewStore";
import { useDropzone } from 'react-dropzone';
import { Upload, Search, Filter, Save, FileOutput, Shield, Loader2, ArrowDownUp, LogOut } from "lucide-react";
import clsx from "clsx";

function App() {
  const { 
    initializeEngine, 
    loadFile, 
    isReady, 
    rows, 
    columns, 
    rowCount, 
    fileMeta, 
    isLoading, 
    selectedColumn, 
    selectColumn,
    searchQuery,
    setSearchQuery,
    sortConfig,
    setSort,
    hasUnsavedChanges,
    resetData
  } = useDataStore();
  const { openFilter, isNormalizationOpen, closeNormalization } = useViewStore();
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);

  // Initialize DuckDB on mount
  useEffect(() => {
    initializeEngine();
  }, [initializeEngine]);

  const handleQuit = async () => {
    if (hasUnsavedChanges) {
      if (!confirm("Attention : vous avez effectué des modifications sur ce fichier sans exporter la nouvelle version. Êtes-vous sûre de vouloir quitter la gestion de ce fichier ?")) {
        return;
      }
    }
    await resetData();
  };

  // Dropzone logic
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      loadFile(acceptedFiles[0]);
    }
  }, [loadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    noClick: !!fileMeta // Disable click on dropzone if file loaded (use toolbar button instead)
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-background-dark text-white overflow-hidden font-display">
      {/* Header */}
      <header className="h-16 border-b border-border-dark flex items-center justify-between px-6 bg-background-dark/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-surface-active p-1 rounded-lg border border-border-dark flex items-center justify-center overflow-hidden">
            <img src="/DE_ICON.png" alt="Data Eater Icon" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              DATA EATER <span className="text-[10px] font-normal text-text-muted border border-border-dark px-2 py-0.5 rounded-full">v1.2</span>
            </h1>
          </div>
          
          {fileMeta && (
            <button 
              onClick={handleQuit}
              className="ml-4 flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-colors border border-red-500/20"
            >
              <LogOut size={12} />
              Quitter cette table
            </button>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-4 h-9 bg-border-dark hover:bg-surface-active rounded-lg text-sm font-bold transition-all border border-transparent hover:border-text-muted"
          >
            <FileOutput size={16} />
            Exporter
          </button>
          <button 
            onClick={() => setIsExportOpen(true)}
            className="flex items-center gap-2 px-4 h-9 bg-primary hover:bg-primary-dim text-background-dark rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)]"
          >
            <Save size={16} />
            Sauvegarder
          </button>
        </div>
      </header>

      <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
      <FAQPage isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
      <FilterModal />
      <NormalizationModal isOpen={isNormalizationOpen} onClose={closeNormalization} />

      {/* Main Layout */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenFAQ={() => setIsFAQOpen(true)} />

        <main className="flex-1 flex flex-col bg-background-dark relative min-w-0">
          {/* Toolbar */}
          <div className="h-14 border-b border-border-dark flex items-center justify-between px-6 bg-background-dark/30 shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher (SQL)..." 
                  className="bg-surface-dark border border-border-dark rounded-md h-8 pl-9 pr-4 text-xs w-64 focus:outline-none focus:border-primary transition-colors placeholder:text-subtle"
                />
              </div>
              <button 
                onClick={openFilter}
                className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-white transition-colors"
              >
                <Filter size={14} />
                Filtres
              </button>
            </div>

            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-subtle tracking-widest">
              <Shield size={12} className="text-primary" />
              Chiffrement Local
            </div>
          </div>

          {/* Workspace Area */}
          <div className="flex-1 flex flex-col overflow-hidden relative">
            
            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-50 bg-background-dark/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <Loader2 size={48} className="text-primary animate-spin" />
                <p className="text-white font-bold text-lg animate-pulse">Digestion en cours...</p>
              </div>
            )}

            {/* View State: Empty vs Data */}
            {!fileMeta ? (
              // Empty State - Drop Zone
              <div 
                {...getRootProps()} 
                className={clsx(
                  "flex-1 flex flex-col items-center justify-center p-12 transition-colors cursor-pointer m-12 rounded-3xl relative overflow-hidden",
                  isDragActive ? "bg-primary/5" : "hover:bg-surface-dark/30"
                )}
              >
                <input {...getInputProps()} />
                
                <div className="max-w-md text-center space-y-8 z-10 pointer-events-none">
                  <div className={clsx(
                    "size-24 rounded-2xl flex items-center justify-center mx-auto transition-colors",
                    isDragActive ? "text-primary bg-primary/20" : "bg-surface-dark text-subtle"
                  )}>
                    <Upload size={48} />
                  </div>

                  <div className="space-y-3">
                    <h2 className="text-3xl font-black tracking-tight text-white uppercase italic">
                      {isDragActive ? "MIAM ! Lâchez ici" : "Prêt à Digérer"}
                    </h2>
                    <p className="text-text-muted text-base font-medium max-w-sm mx-auto">
                      Déposez vos fichiers CSV ou exports AS400 pour lancer l'analyse locale sécurisée.
                    </p>
                  </div>

                  <div className="pt-4">
                    <button 
                      className="px-10 h-14 bg-primary text-background-dark rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(19,236,91,0.2)] hover:shadow-[0_0_30px_rgba(19,236,91,0.4)] hover:scale-105 transition-all"
                    >
                      Sélectionner un Fichier
                    </button>
                  </div>
                </div>

                {/* Border Glow */}
                <div className={clsx(
                  "absolute inset-0 border-2 border-dashed rounded-3xl transition-colors duration-300",
                  isDragActive ? "border-primary shadow-[inset_0_0_40px_rgba(19,236,91,0.1)]" : "border-border-dark"
                )} />
              </div>
            ) : (
              // Data Grid State
              <div className="flex-1 overflow-auto w-full custom-scrollbar">
                <table className="w-full text-left border-collapse">
                  <thead className="bg-surface-active text-text-muted text-xs uppercase font-medium sticky top-0 z-10 shadow-md">
                    <tr>
                      <th className="p-3 border-b border-border-dark w-12 text-center bg-surface-active">#</th>
                      {columns.map((col) => {
                        const isSelected = selectedColumn === col.name;
                        const sort = sortConfig?.column === col.name ? sortConfig.direction : null;
                        
                        return (
                          <th 
                            key={col.name} 
                            onClick={() => selectColumn(isSelected ? null : col.name)}
                            className={clsx(
                              "p-3 border-b border-border-dark font-semibold tracking-wider whitespace-nowrap cursor-pointer transition-colors group select-none",
                              isSelected ? "bg-primary/20 text-white border-b-primary" : "bg-surface-active hover:bg-surface-dark hover:text-white"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span>{col.name}</span>
                              <span className={clsx("text-[10px] px-1 rounded transition-colors", isSelected ? "bg-primary text-background-dark" : "bg-background-dark text-subtle")}>
                                {col.type}
                              </span>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSort(col.name);
                                }}
                                className={clsx(
                                  "p-1 rounded hover:bg-white/10 transition-all",
                                  sort ? "text-primary opacity-100" : "text-subtle opacity-0 group-hover:opacity-100"
                                )}
                              >
                                <ArrowDownUp size={12} className={clsx(sort === 'DESC' && "rotate-180")} />
                              </button>
                            </div>
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-dark text-sm text-gray-300 font-mono">
                    {rows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-surface-dark/50 transition-colors">
                         <td className="p-3 text-center text-subtle text-xs border-r border-border-dark">{idx + 1}</td>
                         {columns.map((col) => {
                           const isSelected = selectedColumn === col.name;
                           return (
                             <td 
                                key={col.name + idx} 
                                className={clsx(
                                  "p-3 truncate max-w-[200px] transition-colors border-r border-transparent",
                                  isSelected && "bg-primary/5 border-r-primary/10"
                                )} 
                                title={String(row[col.name])}
                             >
                               {String(row[col.name])}
                             </td>
                           );
                         })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          
          {/* Footer Bar */}
          <footer className="h-8 border-t border-border-dark bg-background-dark flex items-center justify-between px-4 text-[10px] font-medium text-subtle uppercase tracking-widest shrink-0">
             <div className="flex gap-4">
               <span>{fileMeta ? fileMeta.name : "Aucun fichier"}</span>
               <span>{rowCount.toLocaleString()} Lignes</span>
               {selectedColumn && <span className="text-primary">Colonne: {selectedColumn}</span>}
             </div>
             <div className="flex items-center gap-2">
               <div className={clsx("size-1.5 rounded-full animate-pulse", isReady ? "bg-primary" : "bg-red-500")} />
               Moteur DuckDB {isReady ? "Prêt" : "Non initialisé"}
             </div>
                    </footer>
                  </main>
          
                  <Toolbox />
                </div>
              </div>
            );
          }
          
          export default App;
          