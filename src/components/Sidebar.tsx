import React from 'react';
import Mascot from './Mascot';
import ColumnStats from './ColumnStats';
import { LineageTree } from './LineageTree';
import { useDataStore } from '../stores/dataStore';
import { Lock, Database, ArrowLeft, FileText, HardDrive, Hash, HelpCircle, Copy, AlertCircle, Activity } from 'lucide-react';

interface SidebarProps {
  onOpenFAQ: () => void;
  onOpenHealth: () => void;
  onOpenViz: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onOpenFAQ, onOpenHealth, onOpenViz }) => {
  const { fileMeta, rowCount, columns, selectedColumn, selectColumn, duplicates, mergeDuplicates, healthReport } = useDataStore();

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-primary';
    if (score >= 50) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <aside className="w-72 bg-surface-dark border-r border-border-dark flex flex-col h-full shrink-0 transition-all duration-300">
      
      {/* Header / Context Switcher */}
      <div className="p-4 border-b border-border-dark min-h-[64px] flex flex-col justify-center gap-2">
        <div className="flex items-center justify-between">
          {selectedColumn ? (
            <button 
              onClick={() => selectColumn(null)}
              className="flex items-center gap-2 text-text-muted hover:text-white transition-colors text-xs font-bold uppercase tracking-wider group"
            >
              <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
              Retour
            </button>
          ) : (
            <div className="flex items-center gap-2 text-primary">
               <Database size={16} />
               <h3 className="text-sm font-bold uppercase tracking-wider">Fichier Actuel</h3>
            </div>
          )}
          
          <button 
            onClick={onOpenFAQ}
            className="p-1.5 rounded-lg hover:bg-surface-active text-text-muted hover:text-white transition-colors"
            title="Comment ça marche ?"
            aria-label="Ouvrir le manuel d'aide"
          >
            <HelpCircle size={16} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
        {selectedColumn ? (
          // 1. Column Analysis Mode
          <ColumnStats onOpenViz={onOpenViz} />
        ) : (
          // 2. Global File Mode (Default)
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            {fileMeta ? (
               <>
                 {/* Metadata Card */}
                 <div className="space-y-3">
                   <div className="flex justify-between items-center group">
                      <div className="flex items-center gap-2 text-text-muted">
                        <FileText size={12} />
                        <span className="text-[11px] uppercase font-semibold">Nom</span>
                      </div>
                      <span className="text-white text-xs font-mono truncate max-w-[140px]" title={fileMeta.name}>
                        {fileMeta.name}
                      </span>
                   </div>
                   <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-text-muted">
                        <HardDrive size={12} />
                        <span className="text-[11px] uppercase font-semibold">Taille</span>
                      </div>
                      <span className="text-white text-xs">{(fileMeta.size / 1024 / 1024).toFixed(2)} MB</span>
                   </div>
                 </div>

                 {/* Vital Signs (Big Numbers) */}
                 <div className="grid grid-cols-2 gap-3 pt-4 border-t border-border-dark">
                   <div className="bg-surface-active p-3 rounded-lg border border-border-dark hover:border-primary/50 transition-colors">
                     <span className="text-[10px] text-subtle uppercase font-bold block mb-1">Lignes</span>
                     <span className="text-lg font-mono font-bold text-white">{rowCount.toLocaleString()}</span>
                   </div>
                   <div className="bg-surface-active p-3 rounded-lg border border-border-dark hover:border-primary/50 transition-colors">
                     <span className="text-[10px] text-subtle uppercase font-bold block mb-1">Colonnes</span>
                     <span className="text-lg font-mono font-bold text-primary">{columns.length}</span>
                   </div>
                 </div>

                 {/* Health Report Button */}
                 {healthReport && (
                    <button 
                      onClick={onOpenHealth}
                      className="w-full bg-surface-active hover:bg-surface-active/80 p-3 rounded-lg border border-border-dark hover:border-primary/50 transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <Activity size={16} className={getScoreColor(healthReport.overallScore)} />
                        <span className="text-xs font-bold uppercase text-white">Bulletin Santé</span>
                      </div>
                      <span className={`font-mono font-bold ${getScoreColor(healthReport.overallScore)}`}>
                        {healthReport.overallScore}%
                      </span>
                    </button>
                 )}

                 {/* Duplicates Section */}
                 {duplicates && (
                   <div className="pt-4 border-t border-border-dark space-y-3 animate-in slide-in-from-left-2">
                     <div className="flex items-center gap-2 text-white">
                       <Copy size={14} className="text-yellow-500" />
                       <h4 className="text-xs font-bold uppercase tracking-wider">Doublons Détectés</h4>
                     </div>
                     
                     <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3">
                       <div className="flex justify-between items-end mb-2">
                         <span className="text-xs text-yellow-500 font-medium">Lignes en trop</span>
                         <span className="text-xl font-black text-white">{duplicates.total}</span>
                       </div>
                       
                       <div className="space-y-1">
                         {duplicates.groups.map((g: any, idx: number) => (
                           <div key={idx} className="flex justify-between text-[10px] text-text-muted">
                             <span>Groupe #{idx + 1}</span>
                             <span className="font-mono bg-background-dark px-1.5 rounded">{g.count} copies</span>
                           </div>
                         ))}
                         {duplicates.groups.length === 5 && (
                           <div className="text-[10px] text-subtle italic text-center pt-1">...et autres</div>
                         )}
                       </div>
                     </div>

                     <button 
                       onClick={mergeDuplicates}
                       className="w-full py-2 bg-yellow-500 hover:bg-yellow-400 text-background-dark rounded-lg text-xs font-bold uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2"
                     >
                       <AlertCircle size={14} />
                       Rassembler les entrées
                     </button>
                   </div>
                 )}

                 {/* Data Lineage (Recipe) */}
                 <div className="pt-6 border-t border-border-dark">
                    <LineageTree />
                 </div>
               </>
            ) : (
              // Empty State
              <div className="h-40 border border-dashed border-border-dark rounded-lg flex flex-col items-center justify-center text-subtle gap-2">
                 <Hash size={24} className="opacity-50" />
                 <p className="text-xs italic">Aucune donnée chargée</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Mascot Integration Box (Always Visible) */}
      <div className="p-4 border-t border-border-dark bg-background-dark/30 z-10">
        <Mascot />
        <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-subtle font-bold uppercase tracking-widest">
          <Lock size={10} className="text-primary" />
          <span>Protection Active</span>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
