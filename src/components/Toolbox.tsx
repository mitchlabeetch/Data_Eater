import React, { useState } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useViewStore } from '../stores/viewStore';
import { validateForAS400, AS400Report } from '../lib/validators/as400';
import ReportModal from './ReportModal';
import DiffModal from './DiffModal';
import SmartQueryModal from './SmartQueryModal';
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
  Bot,
  SplitSquareHorizontal,
  ListCollapse,
  Regex,
  Calculator,
  GitBranch,
  CopyX,
  User,
  Phone,
  Mail,
  Banknote,
  Wand2,
  Monitor,
  Ruler,
  Sigma,
  Settings2
} from 'lucide-react';
import clsx from 'clsx';

interface ToolboxProps {
  onOpenSplit: () => void;
  onOpenJoin: () => void;
  onOpenUnpivot: () => void;
  onOpenRegex: () => void;
  onOpenFormula: () => void;
  onOpenLogic: () => void;
  onOpenDedup: () => void;
  onOpenSmartDate: () => void;
  onOpenName: () => void;
  onOpenPhone: () => void;
  onOpenEmail: () => void;
  onOpenCurrency: () => void;
  onOpenUnit: () => void;
  onOpenMojibake: () => void;
  onOpenSchema: () => void;
  onOpenFixed: () => void;
  onOpenCalendar: () => void;
  onOpenDAX: () => void;
}

const Toolbox: React.FC<ToolboxProps> = ({ 
  onOpenSplit, onOpenJoin, onOpenUnpivot, onOpenRegex, onOpenFormula,
  onOpenLogic, onOpenDedup, onOpenSmartDate, onOpenName, onOpenPhone,
  onOpenEmail, onOpenCurrency, onOpenUnit, onOpenMojibake, onOpenSchema,
  onOpenFixed, onOpenCalendar, onOpenDAX
}) => {
  const { selectedColumn, executeMutation, fetchRows, columns } = useDataStore();
    const { openNormalization } = useViewStore();
    const [report, setReport] = useState<AS400Report | null>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [isDiffOpen, setIsDiffOpen] = useState(false);
    const [isSmartQueryOpen, setIsSmartQueryOpen] = useState(false);
  
    const handleTransform = (type: 'UPPER' | 'LOWER' | 'TRIM' | 'PROPER') => {
    if (!selectedColumn) return;
    const safeCol = `"${selectedColumn}"`;
    let sql = '';
    switch (type) {
      case 'UPPER': sql = `UPDATE current_dataset SET ${safeCol} = UPPER(${safeCol})`; break;
      case 'LOWER': sql = `UPDATE current_dataset SET ${safeCol} = LOWER(${safeCol})`; break;
      case 'TRIM': sql = `UPDATE current_dataset SET ${safeCol} = TRIM(${safeCol})`; break;
      case 'PROPER': sql = `UPDATE current_dataset SET ${safeCol} = INITCAP(${safeCol})`; break;
    }
    executeMutation(sql, `Transformation ${type} sur ${selectedColumn}`);
  };

  const handleDeleteColumn = () => {
    if (!selectedColumn) return;
    const safeCol = `"${selectedColumn}"`;
    if (confirm(`Êtes-vous sûr de vouloir supprimer la colonne ${selectedColumn} ?`)) {
      executeMutation(`ALTER TABLE current_dataset DROP ${safeCol}`, `Suppression de ${selectedColumn}`);
    }
  };

  const handleAS400Check = async () => {
    const rows = await fetchRows(1000);
    const result = validateForAS400(rows, columns);
    setReport(result);
    setIsReportOpen(true);
  };

  return (
    <aside className="w-64 bg-surface-dark border-l border-border-dark flex flex-col shrink-0 h-full">
      <ReportModal isOpen={isReportOpen} onClose={() => setIsReportOpen(false)} report={report} />
      <DiffModal isOpen={isDiffOpen} onClose={() => setIsDiffOpen(false)} />
      <SmartQueryModal isOpen={isSmartQueryOpen} onClose={() => setIsSmartQueryOpen(false)} />
      <div className="p-4 border-b border-border-dark min-h-[64px] flex items-center gap-2 text-primary">
        <Wrench size={16} /><h3 className="text-sm font-bold uppercase tracking-wider">Boîte à Outils</h3>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {!selectedColumn && (<div className="p-3 rounded-lg bg-primary/10 border border-primary/20 text-[11px] text-text-muted text-center">Sélectionnez une colonne pour activer les outils.</div>)}
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Normalisation</h4>
          <div className="grid grid-cols-3 gap-1">
            <ToolButton icon={<CaseUpper size={12} />} label="MAJ" onClick={() => handleTransform('UPPER')} disabled={!selectedColumn} />
            <ToolButton icon={<CaseLower size={12} />} label="min" onClick={() => handleTransform('LOWER')} disabled={!selectedColumn} />
            <ToolButton icon={<CaseUpper size={12} className="rotate-90" />} label="Prop" onClick={() => handleTransform('PROPER')} disabled={!selectedColumn} />
          </div>
          <ToolButton icon={<Scissors size={14} />} label="Nettoyer Espaces" subtitle="Trim start/end" onClick={() => handleTransform('TRIM')} disabled={!selectedColumn} />
          <ToolButton icon={<CalendarDays size={14} />} label="Standardiser Dates" subtitle="Format ISO" onClick={onOpenSmartDate} disabled={!selectedColumn} />
          <ToolButton icon={<Calculator size={14} />} label="Calculateur Math" subtitle="Créer via formule" onClick={onOpenFormula} disabled={false} />
          <ToolButton icon={<User size={14} />} label="Découper Nom" subtitle="Prénom / NOM" onClick={onOpenName} disabled={!selectedColumn} />
          <ToolButton icon={<Phone size={14} />} label="Normaliser Tel." subtitle="Format E.164" onClick={onOpenPhone} disabled={!selectedColumn} />
          <ToolButton icon={<Mail size={14} />} label="Valider Emails" subtitle="Extraction & Check" onClick={onOpenEmail} disabled={!selectedColumn} />
          <ToolButton icon={<Banknote size={14} />} label="Normaliser Monnaie" subtitle="Conversion numérique" onClick={onOpenCurrency} disabled={!selectedColumn} />
          <ToolButton icon={<Ruler size={14} />} label="Convertir Unités" subtitle="Metric / Imperial" onClick={onOpenUnit} disabled={!selectedColumn} />
          <ToolButton icon={<ShieldCheck size={14} />} label="Anonymiser (PII)" subtitle="Remplacer par *****" onClick={() => executeMutation(`UPDATE current_dataset SET "${selectedColumn}" = '*****'`, `Anonymisation de ${selectedColumn}`)} disabled={!selectedColumn} />
        </div>
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Intelligence</h4>
          <ToolButton icon={<Sparkles size={14} />} label="Normalisation Avancée" subtitle="Timezone, Geo, Fuzzy" onClick={() => openNormalization()} />
          <ToolButton icon={<Bot size={14} />} label="Appel à un Ami" subtitle="Requête IA Sécurisée" onClick={() => setIsSmartQueryOpen(true)} />
          <ToolButton icon={<GitBranch size={14} />} label="Logique SI/ALORS" subtitle="Catégorisation" onClick={onOpenLogic} disabled={false} />
          <ToolButton icon={<Sigma size={14} />} label="Assistant DAX" subtitle="Mesures PowerBI" onClick={onOpenDAX} disabled={false} />
        </div>
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Structure</h4>
          <ToolButton icon={<Merge size={14} />} label="Jointure Magique" subtitle="Croiser fichiers" onClick={onOpenJoin} disabled={false} />
          <ToolButton icon={<CalendarDays size={14} />} label="Calendrier PowerBI" subtitle="Date Dimension" onClick={onOpenCalendar} disabled={false} />
          <ToolButton icon={<ListCollapse size={14} />} label="Dépivoter (Long)" subtitle="Melt / Unpivot" onClick={onOpenUnpivot} disabled={false} />
          <ToolButton icon={<Regex size={14} />} label="Extraire par Regex" subtitle="Extraction pattern" onClick={onOpenRegex} disabled={!selectedColumn} />
          <ToolButton icon={<SplitSquareHorizontal size={14} />} label="Découper Colonne" subtitle="Par délimiteur" onClick={onOpenSplit} disabled={!selectedColumn} />
          <ToolButton icon={<CopyX size={14} />} label="Dédoublonnage Avancé" subtitle="Unicité multi-cols" onClick={onOpenDedup} disabled={false} />
          <ToolButton icon={<ArrowDownUp size={14} />} label="Comparer Fichiers" subtitle="Diff V1 vs V2" onClick={() => setIsDiffOpen(true)} />
          <ToolButton icon={<Eraser size={14} />} label="Nettoyer Nulls" subtitle="Remplace par ''" disabled={!selectedColumn} onClick={() => executeMutation(`UPDATE current_dataset SET "${selectedColumn}" = '' WHERE "${selectedColumn}" IS NULL`, `Suppression des NULLs: ${selectedColumn}`)} />
          <ToolButton icon={<Trash2 size={14} />} label="Supprimer Colonne" variant="danger" onClick={handleDeleteColumn} disabled={!selectedColumn} />
        </div>
        <div className="space-y-2">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-subtle ml-1">Legacy (Grasse)</h4>
          <ToolButton icon={<Settings2 size={14} />} label="Gestionnaire Schéma" subtitle="Renommer & Ordonner" onClick={onOpenSchema} disabled={false} />
          <ToolButton icon={<Wand2 size={14} />} label="Réparer Encodage" onClick={onOpenMojibake} disabled={!selectedColumn} />
          <ToolButton icon={<ShieldCheck size={14} />} label="Valider AS400" onClick={handleAS400Check} />
          <ToolButton icon={<Monitor size={14} />} label="Green Screen" onClick={onOpenFixed} disabled={false} />
        </div>
      </div>
    </aside>
  );
};

interface ToolButtonProps { icon: React.ReactNode; label: string; subtitle?: string; onClick?: () => void; disabled?: boolean; variant?: 'default' | 'danger'; }
const ToolButton: React.FC<ToolButtonProps> = ({ icon, label, subtitle, onClick, disabled, variant = 'default' }) => {
  return (
    <button onClick={onClick} disabled={disabled} className={clsx("flex items-center gap-3 p-2.5 rounded-lg border transition-all w-full text-left group relative overflow-hidden focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none", disabled ? "opacity-50 cursor-not-allowed bg-surface-dark border-border-dark" : variant === 'danger' ? "bg-red-500/5 border-red-500/20 hover:bg-red-500/10 hover:border-red-500 text-red-400" : "bg-surface-active border-border-dark hover:border-primary hover:bg-surface-active/80 text-white")}>
      <div className={clsx("transition-colors", disabled ? "text-subtle" : variant === 'danger' ? "text-red-400" : "text-text-muted group-hover:text-primary")}>{icon}</div>
      <div className="flex flex-col min-w-0"><span className="text-[11px] font-bold truncate">{label}</span>{subtitle && <span className="text-[9px] text-subtle truncate">{subtitle}</span>}</div>
    </button>
  );
};

export default Toolbox;