import React, { useState } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useMascotStore } from '../stores/mascotStore';
import { MASCOT_STATES } from '../lib/constants';
import { runSmartQuery } from '../services/smartQueryService';
import { X, Bot, Shield, Lock, Play, RotateCcw } from 'lucide-react';
import clsx from 'clsx';

interface SmartQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const SmartQueryModal: React.FC<SmartQueryModalProps> = ({ isOpen, onClose }) => {
  const { columns, prepareForCloud, reconcileCloud } = useDataStore();
  const { setMascot } = useMascotStore();
  
  const [query, setQuery] = useState('');
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  if (!isOpen) return null;

  const toggleCol = (colName: string) => {
    const newSet = new Set(hiddenCols);
    if (newSet.has(colName)) newSet.delete(colName);
    else newSet.add(colName);
    setHiddenCols(newSet);
  };

  const handleExecute = async () => {
    setIsProcessing(true);
    setMascot(MASCOT_STATES.COOKING, "Préparation des données pour l'IA...");

    try {
      // 1. Prepare (Clean & Inject ID)
      const dataToSend = await prepareForCloud(Array.from(hiddenCols));
      
      // 2. Process (Batch API)
      setMascot(MASCOT_STATES.COOKING, "Interrogation du 'Chef' (IA)...");
      const processedData = await runSmartQuery(query, dataToSend, (p) => setProgress(p));

      // 3. Reconcile
      setMascot(MASCOT_STATES.COOKING, "Réintégration des résultats...");
      await reconcileCloud(processedData);

      setMascot(MASCOT_STATES.SLEEPING, "Mission accomplie !");
      setIsProcessing(false);
      onClose();

    } catch (e) {
      console.error(e);
      const errorMessage = e instanceof Error ? e.message : "Erreur lors de l'appel à l'IA.";
      setMascot(MASCOT_STATES.INDIGESTION, errorMessage);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-primary/30 w-full max-w-2xl rounded-xl shadow-[0_0_50px_rgba(19,236,91,0.1)] flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-border-dark bg-background-dark/80 rounded-t-xl flex justify-between items-center">
          <div className="flex items-center gap-3 text-primary">
             <Bot size={28} />
             <div>
               <h2 className="text-xl font-bold text-white">Appel à un Ami (IA)</h2>
               <p className="text-xs text-text-muted">Traitement sémantique sécurisé sur serveur privé.</p>
             </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white" aria-label="Fermer l'assistant IA"><X size={24} /></button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Query Input */}
          <div className="space-y-2">
            <label className="text-sm font-bold text-white">Votre Requête</label>
            <textarea 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ex: Standardise les noms de produits en français et ajoute une colonne catégorie..."
              className="w-full h-24 bg-background-dark border border-border-dark rounded-xl p-3 text-sm text-white focus:border-primary focus:outline-none resize-none"
            />
            <p className="text-xs text-text-muted italic">Conseil : Soyez précis sur le format attendu.</p>
          </div>

          {/* Privacy Section */}
          <div className="bg-surface-active/30 rounded-xl p-4 space-y-4 border border-border-dark">
            <div className="flex items-center gap-2 text-primary font-bold text-sm">
              <Shield size={16} /> Sécurisation des Données
            </div>
            <p className="text-xs text-subtle">
              Sélectionnez les colonnes à <strong>cacher</strong> avant l'envoi. Elles ne quitteront jamais votre machine.
            </p>
            
            <div className="border border-border-dark rounded-lg bg-background-dark/50 max-h-[150px] overflow-y-auto p-2 grid grid-cols-3 gap-2 custom-scrollbar">
              {columns.map(col => {
                const isHidden = hiddenCols.has(col.name);
                return (
                  <button
                    key={col.name}
                    onClick={() => toggleCol(col.name)}
                    className={clsx(
                      "flex items-center gap-2 p-1.5 rounded text-[10px] font-mono text-left transition-colors border",
                      isHidden 
                        ? "bg-red-500/10 border-red-500/30 text-red-300" 
                        : "bg-surface-active border-transparent text-text-muted hover:text-white"
                    )}
                  >
                    <div className={clsx(
                      "size-3 rounded flex items-center justify-center border shrink-0",
                      isHidden ? "bg-red-500 border-red-500 text-black" : "border-subtle"
                    )}>
                      {isHidden && <Lock size={8} />}
                    </div>
                    <span className="truncate">{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-6 border-t border-border-dark flex justify-between items-center bg-surface-active/30 rounded-b-xl">
          <div className="flex items-center gap-2">
             {isProcessing && (
               <div className="flex items-center gap-2 text-xs font-bold text-primary">
                 <div className="w-24 h-2 bg-background-dark rounded-full overflow-hidden">
                   <div className="h-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
                 </div>
                 <span>{progress}%</span>
               </div>
             )}
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={() => setQuery('')}
              className="px-4 py-2 text-text-muted hover:text-white text-sm font-bold flex items-center gap-2"
            >
              <RotateCcw size={14} /> Effacer
            </button>
            <button 
              onClick={handleExecute}
              disabled={!query || isProcessing}
              className="px-6 py-2 bg-primary hover:bg-primary-dim text-background-dark rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(19,236,91,0.3)] transition-all flex items-center gap-2 disabled:opacity-50"
            >
              <Play size={16} />
              Lancer le Traitement
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default SmartQueryModal;
