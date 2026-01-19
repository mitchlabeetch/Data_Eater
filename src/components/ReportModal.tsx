import React from 'react';
import { X, ShieldAlert, CheckCircle, AlertTriangle } from 'lucide-react';
import { AS400Report } from '../lib/validators/as400';
import clsx from 'clsx';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: AS400Report | null;
}

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, report }) => {
  if (!isOpen || !report) return null;

  const isAllValid = report.headers.valid && report.encoding.valid && report.structure.valid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-border-dark w-full max-w-2xl rounded-xl shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border-dark bg-background-dark/50 rounded-t-xl">
          <div className="flex items-center gap-3">
             <div className={clsx("p-2 rounded-lg", isAllValid ? "bg-primary/20 text-primary" : "bg-red-500/20 text-red-500")}>
               {isAllValid ? <CheckCircle size={24} /> : <ShieldAlert size={24} />}
             </div>
             <div>
               <h2 className="text-xl font-bold text-white">Rapport de Validation AS400</h2>
               <p className="text-sm text-text-muted">
                 {isAllValid ? "Le fichier est conforme aux standards IBM i." : "Des problèmes de compatibilité ont été détectés."}
               </p>
             </div>
          </div>
          <button onClick={onClose} className="text-text-muted hover:text-white transition-colors" aria-label="Fermer le rapport">
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          
          {/* Section: Headers */}
          <Section 
            title="Noms de Colonnes (Headers)" 
            isValid={report.headers.valid}
            errors={report.headers.errors}
            validMsg="Tous les noms respectent la limite de 30 caractères."
          />

          {/* Section: Encoding */}
          <Section 
            title="Encodage (Windows-1252)" 
            isValid={report.encoding.valid}
            errors={report.encoding.errors.map(e => `Ligne ${e.row} [${e.col}]: Caractère interdit "${e.char}" dans "${e.value}"`)}
            validMsg="Aucun caractère hors-norme (Emoji, Unicode complexe) détecté."
          />

           {/* Section: Structure */}
           <Section 
            title="Structure & Délimiteurs" 
            isValid={report.structure.valid}
            errors={report.structure.errors}
            validMsg="Aucun saut de ligne ou tabulation interne détecté."
          />

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-dark flex justify-end gap-3 bg-surface-active/30 rounded-b-xl">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-surface-active hover:bg-border-dark text-white rounded-lg text-sm font-bold transition-colors"
          >
            Fermer
          </button>
          {!isAllValid && (
             <button 
               className="px-4 py-2 bg-primary text-background-dark rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(57,255,20,0.3)] hover:opacity-90"
             >
               Tenter Correction Auto
             </button>
          )}
        </div>

      </div>
    </div>
  );
};

const Section: React.FC<{ title: string; isValid: boolean; errors: string[]; validMsg: string }> = ({ title, isValid, errors, validMsg }) => (
  <div className={clsx("p-4 rounded-lg border", isValid ? "bg-primary/5 border-primary/20" : "bg-red-500/5 border-red-500/20")}>
    <div className="flex items-center gap-2 mb-2">
      {isValid ? <CheckCircle size={16} className="text-primary" /> : <AlertTriangle size={16} className="text-red-400" />}
      <h3 className={clsx("font-bold text-sm", isValid ? "text-primary" : "text-red-400")}>{title}</h3>
    </div>
    
    {isValid ? (
      <p className="text-xs text-subtle ml-6">{validMsg}</p>
    ) : (
      <ul className="list-disc ml-10 space-y-1">
        {errors.slice(0, 10).map((err, idx) => (
          <li key={idx} className="text-xs text-red-300">{err}</li>
        ))}
        {errors.length > 10 && <li className="text-xs text-red-300 italic">...et {errors.length - 10} autres erreurs.</li>}
      </ul>
    )}
  </div>
);

export default ReportModal;
