import React, { useState, useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { Phone, X, Loader2, Globe } from 'lucide-react';
import parsePhoneNumber, { CountryCode } from 'libphonenumber-js';
import { initDuckDB } from '../services/duckdb';

interface PhoneStandardizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhoneStandardizerModal: React.FC<PhoneStandardizerModalProps> = ({ isOpen, onClose }) => {
  const { selectedColumn, executeMutation, fetchRows, queryResult } = useDataStore();
  const [country, setCountry] = useState<CountryCode>('FR');
  const [isProcessing, setIsProcessing] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && selectedColumn) {
      loadPreview();
    }
  }, [isOpen, selectedColumn, country]);

  const loadPreview = async () => {
    if (!selectedColumn) return;
    const rows = await fetchRows(5);
    const formatted = rows.map(r => {
      const val = String(r[selectedColumn] || '');
      try {
        const parsed = parsePhoneNumber(val, country);
        return parsed ? parsed.format('E.164') : val;
      } catch { return val; }
    });
    setPreview(formatted);
  };

  const handleApply = async () => {
    if (!selectedColumn) return;
    setIsProcessing(true);
    try {
      const res = await queryResult(`SELECT DISTINCT "${selectedColumn}" as val FROM current_dataset WHERE "${selectedColumn}" IS NOT NULL`);
      const uniqueValues = res.map(r => String(r.val));
      const mappings: { old: string, new: string }[] = [];
      uniqueValues.forEach(val => {
        try {
          const parsed = parsePhoneNumber(val, country);
          if (parsed && parsed.isValid()) {
            const formatted = parsed.format('E.164');
            if (formatted !== val) {
              // Optimization: Don't SQL escape here, we will use JSON
              mappings.push({ old: val, new: formatted });
            }
          }
        } catch {}
      });

      if (mappings.length === 0) {
        onClose();
        return;
      }

      const { db } = await initDuckDB();
      if (!db) throw new Error("Database not ready");

      const mappingFileName = `phone_mappings_${Date.now()}.json`;
      const jsonContent = JSON.stringify(mappings);
      await db.registerFileText(mappingFileName, jsonContent);

      const sql = `
        CREATE TABLE phone_mappings_temp AS SELECT * FROM read_json_auto('${mappingFileName}');
        UPDATE current_dataset
        SET "${selectedColumn}" = phone_mappings_temp.new
        FROM phone_mappings_temp
        WHERE current_dataset."${selectedColumn}" = phone_mappings_temp.old;
        DROP TABLE phone_mappings_temp;
      `;

      await executeMutation(sql, `Normalisation téléphones (${mappings.length} numéros)`);
      onClose();
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la normalisation.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !selectedColumn) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-surface-active rounded-xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden">
        <div className="p-4 border-b border-surface-active bg-background-dark/50 flex justify-between items-center"><h2 className="text-lg font-bold text-white flex items-center gap-2"><Phone size={20} className="text-primary" />Normalisation Téléphone</h2><button onClick={onClose} className="text-text-muted hover:text-white"><X size={20} /></button></div>
        <div className="p-6 space-y-6">
          <div className="space-y-2"><label className="text-[10px] font-black uppercase text-text-muted flex items-center gap-2"><Globe size={12} />Pays par Défaut</label><select value={country} onChange={e => setCountry(e.target.value as CountryCode)} className="w-full bg-background-dark border border-border-dark rounded-lg p-2 text-sm text-white focus:border-primary outline-none"><option value="FR">France (+33)</option><option value="US">USA (+1)</option><option value="GB">UK (+44)</option><option value="DE">Allemagne (+49)</option><option value="CH">Suisse (+41)</option><option value="ES">Espagne (+34)</option></select></div>
          <div className="space-y-3"><h3 className="text-[10px] font-bold uppercase tracking-widest text-subtle">Aperçu (E.164)</h3><div className="bg-background-dark/50 rounded-xl border border-border-dark divide-y divide-border-dark/50 overflow-hidden font-mono">{preview.map((p, i) => (<div key={i} className="p-2 flex items-center justify-between text-[10px]"><span className="text-text-muted italic truncate max-w-[80px]">...</span><span className="bg-primary/10 text-primary px-2 py-1 rounded border border-primary/20 font-bold">{p}</span></div>))}</div></div>
          <div className="p-4 rounded-xl bg-surface-active/30 border border-border-dark text-[11px] text-text-muted leading-relaxed">Formatage standard <strong className="text-white">+XXYYYYYYYYY</strong>. <br/>Les numéros invalides ou vides ne seront pas modifiés.</div>
        </div>
        <div className="p-4 border-t border-surface-active bg-surface-dark flex justify-end gap-3"><button onClick={onClose} className="px-4 py-2 rounded-lg text-text-muted font-bold text-xs uppercase tracking-widest">ANNULER</button><button disabled={isProcessing} onClick={handleApply} className="px-6 py-2 rounded-lg bg-primary hover:bg-primary-dim text-background-dark font-black text-xs shadow-lg flex items-center gap-2 transition-all">{isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Phone size={14} />}NORMALISER</button></div>
      </div>
    </div>
  );
};
