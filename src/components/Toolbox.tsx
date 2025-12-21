import React, { useState } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useViewStore } from '../stores/viewStore';
import { validateForAS400, AS400Report } from '../lib/validators/as400';
import ReportModal from './ReportModal';
import DiffModal from './DiffModal';
import SmartQueryModal from './SmartQueryModal';
import { DateTime } from 'luxon';
import { 
  Wrench, 
  Trash2, 
  Scissors, 
  CalendarDays, 
  Merge, 
  ShieldCheck, 
  CaseUpper,
  CaseLower,
  Eraser,
  ArrowDownUp,
  Sparkles,
  Bot
} from 'lucide-react';
import clsx from 'clsx';

const Toolbox: React.FC = () => {
  const { selectedColumn, executeMutation, fetchRows, columns } = useDataStore();
    const { openNormalization } = useViewStore();
    const [report, setReport] = useState<AS400Report | null>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isDiffOpen, setIsDiffOpen] = useState(false);
    const [isSmartQueryOpen, setIsSmartQueryOpen] = useState(false);
  
    const handleTransform = (type: 'UPPER' | 'LOWER' | 'TRIM') => {
  
    if (!selectedColumn) return;
    const safeCol = `"${selectedColumn}"`;
    
    let sql = '';
    switch (type) {
      case 'UPPER':
        sql = `UPDATE current_dataset SET ${safeCol} = UPPER(${safeCol})`;
        break;
      case 'LOWER':
        sql = `UPDATE current_dataset SET ${safeCol} = LOWER(${safeCol})`;
        break;
      case 'TRIM':
        sql = `UPDATE current_dataset SET ${safeCol} = TRIM(${safeCol})`;
        break;
    }
    executeMutation(sql);
  };

  const handleDeleteColumn = () => {
    if (!selectedColumn) return;
    const safeCol = `"${selectedColumn}"`;
    if (confirm(`Êtes-vous sûr de vouloir supprimer la colonne ${selectedColumn} ?`)) {
      executeMutation(`ALTER TABLE current_dataset DROP ${safeCol}`);
    }
  };

  const handleAS400Check = async () => {
    const rows = await fetchRows(1000); // Check sample
    const result = validateForAS400(rows, columns);
    setReport(result);
    setIsReportOpen(true);
  };

  const handleDateFix = async () => {
    if (!selectedColumn) return;
    const safeCol = `"${selectedColumn}"`;
    
    // 1. Fetch Distinct Values to process in JS (Code First)
    const distinctRows = await fetchRows(10000); 
    
    const uniqueValues = Array.from(new Set(distinctRows.map(r => r[selectedColumn]).filter(v => v !== null && v !== '')));
    
    if (uniqueValues.length === 0) return;

    const updates: { old: string, new: string }[] = [];

    uniqueValues.forEach(val => {
      const v = String(val).trim();
      let dt = DateTime.fromFormat(v, 'dd/MM/yyyy'); // Try French first
      if (!dt.isValid) dt = DateTime.fromISO(v); // Try ISO
      if (!dt.isValid) dt = DateTime.fromFormat(v, 'MM/dd/yyyy'); // Try US
      if (!dt.isValid) dt = DateTime.fromFormat(v, 'yyyy/MM/dd'); // Try other

      if (dt.isValid) {
        // Standardize to ISO YYYY-MM-DD for DB
        const newVal = dt.toFormat('yyyy-MM-dd');
        if (newVal !== v) {
          updates.push({ old: v.replace(/'/g, "''"), new: newVal });
        }
      }
    });

    if (updates.length === 0) return;

    // 2. Build SQL CASE Statement
    const limitedUpdates = updates.slice(0, 200); 
    const limitCases = limitedUpdates.map(u => `WHEN '${u.old}' THEN '${u.new}'`).join(' ');

    const sql = `UPDATE current_dataset SET ${safeCol} = CASE ${safeCol} ${limitCases} ELSE ${safeCol} END`;
    
    executeMutation(sql);
  };

  return (
    <aside className="w-64 bg-surface-dark border-l border-border-dark flex flex-col shrink-0 h-full">
      <ReportModal 
        isOpen={isReportOpen} 
        onClose={() => setIsReportOpen(false)} 
        report={report} 
      />
      <DiffModal 
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
      />
      <SmartQueryModal
        isOpen={isSmartQueryOpen}
        onClose={() => setIsSmartQueryOpen(false)}
      />

      {/* Header */}
      <div className="p-4 border-b border-border-dark min-h-[64px] flex items-center gap-2 text-primary">
        <Wrench size={16} />
        <h3 className="text-sm font-bold uppercase tracking-wider">Boîte à Outils</h3>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        
        {/* Helper Text */}
        {!selectedColumn && (
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-text-muted text-center">
            Sélectionnez une colonne pour activer les outils de transformation.
          </div>
        )}

        {/* Group: Normalization */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Normalisation</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <ToolButton 
              icon={<CaseUpper size={14} />} 
              label="MAJUSCULE" 
              onClick={() => handleTransform('UPPER')}
              disabled={!selectedColumn}
            />
            <ToolButton 
              icon={<CaseLower size={14} />} 
              label="minuscule" 
              onClick={() => handleTransform('LOWER')}
              disabled={!selectedColumn}
            />
          </div>
          
          <ToolButton 
            icon={<Scissors size={14} />} 
            label="Nettoyer Espaces" 
            subtitle="Supprime espaces début/fin"
            onClick={() => handleTransform('TRIM')}
            disabled={!selectedColumn}
          />

          <ToolButton 
            icon={<CalendarDays size={14} />} 
            label="Standardiser Dates" 
            subtitle="Format ISO (YYYY-MM-DD)"
            onClick={handleDateFix}
            disabled={!selectedColumn}
          />
        </div>

        {/* Group: Intelligence */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Intelligence</h4>
          <ToolButton 
            icon={<Sparkles size={14} />} 
            label="Normalisation Avancée" 
            subtitle="Timezone, Geo, Fuzzy"
            onClick={openNormalization}
          />
          <ToolButton 
            icon={<Bot size={14} />} 
            label="Appel à un Ami" 
            subtitle="Requête IA Sécurisée"
            onClick={() => setIsSmartQueryOpen(true)}
          />
        </div>

        {/* Group: Structure */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Structure</h4>
          
          <ToolButton 
            icon={<Merge size={14} />} 
            label="Fusionner Colonnes" 
            subtitle="Concaténer A + B"
            disabled={true} 
          />

          <ToolButton 
            icon={<ArrowDownUp size={14} />} 
            label="Comparer Fichiers" 
            subtitle="Identifier les changements (V1 vs V2)"
            onClick={() => setIsDiffOpen(true)}
          />

          <ToolButton 
            icon={<Eraser size={14} />} 
            label="Nettoyer Nulls" 
            subtitle="Remplacer vide par ''"
            disabled={!selectedColumn}
            onClick={() => executeMutation(`UPDATE current_dataset SET "${selectedColumn}" = '' WHERE "${selectedColumn}" IS NULL`)}
          />

          <ToolButton 
            icon={<Trash2 size={14} />} 
            label="Supprimer Colonne" 
            variant="danger"
            onClick={handleDeleteColumn}
            disabled={!selectedColumn}
          />
        </div>

        {/* Group: Robertet Legacy */}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Legacy (Grasse)</h4>
          
          <ToolButton 
            icon={<ShieldCheck size={14} />} 
            label="Valider AS400" 
            subtitle="Check encodage & taille"
            onClick={handleAS400Check}
          />
        </div>

      </div>
    </aside>
  );
};

interface ToolButtonProps {
  icon: React.ReactNode;
  label: string;
  subtitle?: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'default' | 'danger';
}

const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, subtitle, onClick, disabled, variant = 'default' }) => {
  return (
    <button 
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex items-center gap-3 p-2.5 rounded-lg border transition-all w-full text-left group relative overflow-hidden",
        disabled 
          ? "opacity-50 cursor-not-allowed bg-surface-dark border-border-dark" 
          : variant === 'danger'
            ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500 text-red-400"
            : "bg-surface-active border-border-dark hover:border-primary hover:bg-surface-active/80 text-white"
      )}
    >
      <div className={clsx(
        "transition-colors",
        disabled ? "text-subtle" : variant === 'danger' ? "text-red-400" : "text-text-muted group-hover:text-primary"
      )}>
        {icon}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="text-xs font-medium truncate">{label}</span>
        {subtitle && <span className="text-[10px] text-subtle truncate">{subtitle}</span>}
      </div>
    </button>
  );
};

export default Toolbox;
