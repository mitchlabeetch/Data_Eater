import React, { useEffect, useState } from 'react';
import { useDataStore } from '../stores/dataStore';
import { useMascotStore } from '../stores/mascotStore';
import { MASCOT_STATES } from '../lib/constants';
import { ShieldAlert, ShieldCheck } from 'lucide-react';

interface HealthDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HealthDashboardModal: React.FC<HealthDashboardModalProps> = ({ isOpen, onClose }) => {
  const { healthReport, fileMeta, columns, rawQuery } = useDataStore();
  const setMascot = useMascotStore((s) => s.setMascot);
  const [securityIssues, setSecurityIssues] = useState<string[]>([]);

  if (!isOpen) return null;

  // Loading/Error State
  if (!healthReport || !healthReport.issues || !healthReport.as400Report) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-surface-dark border border-surface-active rounded-xl shadow-2xl p-8 flex flex-col items-center gap-4">
           <span className="material-symbols-outlined text-primary text-4xl animate-spin">autorenew</span>
           <p className="text-white font-bold">Analyse de santé en cours...</p>
           <button onClick={onClose} className="text-xs text-text-muted hover:text-white underline">Annuler</button>
        </div>
      </div>
    );
  }

  const { overallScore, issues, as400Report, columnHealth, rowCount } = healthReport;

  // Mascot Reaction based on score
  useEffect(() => {
    if (overallScore < 50) {
      setMascot(MASCOT_STATES.INDIGESTION, "Ouh là... C'est indigeste ce fichier !");
    } else if (overallScore < 80) {
      setMascot(MASCOT_STATES.DETECTIVE, "Pas mal, mais il y a du ménage à faire.");
    } else {
      setMascot(MASCOT_STATES.COOKING, "Miam ! Des données de qualité chef !");
    }
  }, [overallScore, setMascot]);

  // Security Scan (Simple Heuristics inspired by scan4secrets)
  useEffect(() => {
    if (!isOpen) return;
    
    let isMounted = true;

    const performScan = async () => {
      const foundIssues: string[] = [];

      // 1. Column Name Check
      columns.forEach(col => {
        const lower = col.name.toLowerCase();
        if (lower.includes('password') || lower.includes('secret') || lower.includes('token') || lower.includes('api_key') || lower.includes('apikey')) {
          foundIssues.push(`Colonne sensible détectée (Nom) : ${col.name}`);
        }
      });

      // 2. Value Pattern Check
      try {
        const stringCols = columns.filter(c => c.type === 'VARCHAR').map(c => c.name);

        if (stringCols.length > 0) {
          // Fetch a sample of data to inspect values
          // We select only string columns to optimize
          const colsSql = stringCols.map(c => `"${c}"`).join(', ');
          const sampleRows = await rawQuery(`SELECT ${colsSql} FROM current_dataset LIMIT 50`);

          const patterns = [
            { name: 'AWS Access Key', regex: /(A3T[A-Z0-9]|AKIA|AGPA|AIDA|AROA|AIPA|ANPA|ANVA|ASIA)[A-Z0-9]{16}/ },
            { name: 'Google API Key', regex: /AIza[0-9A-Za-z\-_]{35}/ },
            { name: 'Private Key', regex: /-----BEGIN [A-Z ]+ PRIVATE KEY-----/ },
            { name: 'Stripe Key', regex: /sk_live_[0-9a-zA-Z]{24}/ },
            { name: 'Slack Token', regex: /xox[baprs]-([0-9a-zA-Z]{10,48})?/ },
            { name: 'Generic Secret', regex: /(api_key|apikey|secret|password|token)\s*[:=]\s*['"][a-zA-Z0-9\-_]{16,}['"]/i } // Basic assignment detection in content
          ];

          const valueIssues = new Set<string>();

          for (const row of sampleRows) {
            for (const colName of stringCols) {
              const val = String(row[colName] || '');
              if (val.length < 8) continue; // Skip short strings

              for (const pat of patterns) {
                if (pat.regex.test(val)) {
                  valueIssues.add(`Donnée sensible détectée (${pat.name}) dans : ${colName}`);
                }
              }
            }
          }

          foundIssues.push(...Array.from(valueIssues));
        }
      } catch (e) {
        console.error("Security value scan failed", e);
      }

      if (isMounted) {
        setSecurityIssues(foundIssues);
      }
    };

    performScan();

    return () => {
      isMounted = false;
    };
  }, [isOpen, columns, rawQuery]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-primary';
    if (score >= 50) return 'text-warning';
    return 'text-error';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-surface-active rounded-xl shadow-2xl w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-surface-active flex justify-between items-center bg-background-dark/50">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">monitor_heart</span>
              Bulletin de Santé : {fileMeta?.name}
            </h2>
            <p className="text-sm text-text-muted mt-1">
              Analyse complète de {rowCount.toLocaleString()} lignes
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-text-muted uppercase tracking-wider">Score Global</div>
              <div className={`text-3xl font-black ${getScoreColor(overallScore)}`}>
                {overallScore}%
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 hover:bg-surface-active rounded-lg transition-colors text-text-muted hover:text-white"
              aria-label="Fermer le bulletin de santé"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Top Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Critical Issues */}
            <div className="bg-background-dark p-4 rounded-lg border border-surface-active">
              <h3 className="text-sm font-bold text-text-muted mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-error text-lg">error</span>
                Problèmes Critiques ({issues.critical.length})
              </h3>
              {issues.critical.length > 0 ? (
                <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {issues.critical.map((err, i) => (
                    <li key={i} className="text-xs text-error bg-error/10 p-2 rounded border border-error/20">
                      {err}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  Aucun problème critique
                </div>
              )}
            </div>

            {/* Security Issues (New) */}
            <div className="bg-background-dark p-4 rounded-lg border border-surface-active">
              <h3 className="text-sm font-bold text-text-muted mb-3 flex items-center gap-2">
                {securityIssues.length > 0 ? <ShieldAlert size={18} className="text-orange-500" /> : <ShieldCheck size={18} className="text-primary" />}
                Sécurité & Secrets
              </h3>
              {securityIssues.length > 0 ? (
                <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {securityIssues.map((issue, i) => (
                    <li key={i} className="text-xs text-orange-400 bg-orange-500/10 p-2 rounded border border-orange-500/20">
                      {issue}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-primary flex items-center gap-2">
                  <span className="material-symbols-outlined">check_circle</span>
                  Rien à signaler
                </div>
              )}
            </div>

            {/* AS400 Status */}
            <div className="bg-background-dark p-4 rounded-lg border border-surface-active">
              <h3 className="text-sm font-bold text-text-muted mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-warning text-lg">dns</span>
                Compatibilité AS400
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-subtle">En-têtes (Max 30 chars)</span>
                  <span className={as400Report.headers.valid ? "text-primary material-symbols-outlined text-lg" : "text-error material-symbols-outlined text-lg"}>
                    {as400Report.headers.valid ? 'check' : 'close'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-subtle">Encodage (Win-1252)</span>
                  <span className={as400Report.encoding.valid ? "text-primary material-symbols-outlined text-lg" : "text-error material-symbols-outlined text-lg"}>
                    {as400Report.encoding.valid ? 'check' : 'close'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-text-subtle">Structure (Pas de sauts)</span>
                  <span className={as400Report.structure.valid ? "text-primary material-symbols-outlined text-lg" : "text-error material-symbols-outlined text-lg"}>
                    {as400Report.structure.valid ? 'check' : 'close'}
                  </span>
                </div>
              </div>
            </div>

            {/* Warnings */}
            <div className="bg-background-dark p-4 rounded-lg border border-surface-active">
              <h3 className="text-sm font-bold text-text-muted mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-warning text-lg">warning</span>
                Avertissements ({issues.warning.length})
              </h3>
              {issues.warning.length > 0 ? (
                <ul className="space-y-2 max-h-32 overflow-y-auto custom-scrollbar">
                  {issues.warning.map((warn, i) => (
                    <li key={i} className="text-xs text-warning bg-warning/10 p-2 rounded border border-warning/20">
                      {warn}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-text-subtle italic">Rien à signaler.</div>
              )}
            </div>
          </div>

          {/* Column Health Table */}
          <div className="bg-background-dark rounded-lg border border-surface-active overflow-hidden">
            <div className="px-4 py-3 border-b border-surface-active bg-surface-dark/50 flex justify-between items-center">
              <h3 className="font-bold text-white">Détail par Colonne</h3>
              <span className="text-xs text-text-muted">{Object.keys(columnHealth).length} colonnes analysées</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-xs text-text-muted border-b border-surface-active">
                    <th className="p-3 font-medium">Nom</th>
                    <th className="p-3 font-medium">Type Détecté</th>
                    <th className="p-3 font-medium">Remplissage</th>
                    <th className="p-3 font-medium">Unicité</th>
                    <th className="p-3 font-medium text-right">Score</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {Object.values(columnHealth).map((col) => (
                    <tr key={col.name} className="border-b border-surface-active/50 hover:bg-surface-active/30 transition-colors">
                      <td className="p-3 font-mono text-white">{col.name}</td>
                      <td className="p-3">
                        <span className="px-2 py-1 rounded bg-surface-active text-xs text-text-muted font-mono">
                          {col.type}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <div className="w-24 h-2 bg-surface-active rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${col.nullPercent > 50 ? 'bg-error' : col.nullPercent > 0 ? 'bg-warning' : 'bg-primary'}`} 
                              style={{ width: `${100 - col.nullPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-text-muted">{(100 - col.nullPercent).toFixed(1)}%</span>
                        </div>
                      </td>
                      <td className="p-3 text-text-subtle">
                        {col.uniqueCount.toLocaleString()} uniques
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-bold ${getScoreColor(col.score)}`}>
                          {col.score}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-surface-active bg-surface-dark flex justify-end gap-3">
           <button 
             onClick={onClose}
             className="px-4 py-2 rounded-lg bg-surface-active hover:bg-surface-active/80 text-white font-medium transition-all"
           >
             Fermer
           </button>
           <button 
             className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-dim text-black font-bold transition-all flex items-center gap-2"
           >
             <span className="material-symbols-outlined text-lg">cleaning_services</span>
             Nettoyage Automatique (Bientôt)
           </button>
        </div>

      </div>
    </div>
  );
};
