import React, { useState, useEffect } from 'react';
import { useDataStore } from '../stores/dataStore';
import { ExportOptions } from '../services/exportService';

interface ExportPreviewProps {
  options: ExportOptions;
}

export const ExportPreview: React.FC<ExportPreviewProps> = ({ options }) => {
  const { fetchRows, columns } = useDataStore();
  const [previewText, setPreviewText] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    generatePreview();
  }, [options]);

  const generatePreview = async () => {
    setLoading(true);
    const sampleRows = await fetchRows(5); // Only 5 rows for preview
    
    let text = '';
    if (options.format === 'csv') {
      const delim = options.delimiter || ',';
      const colNames = columns.map(c => c.name);
      
      if (options.includeHeaders) {
        text += colNames.join(delim) + '\n';
      }
      
      sampleRows.forEach(row => {
        text += colNames.map(col => {
          const val = row[col];
          if (val === null || val === undefined) return '';
          const str = String(val);
          // Simple escaping simulation
          return str.includes(delim) || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str;
        }).join(delim) + '\n';
      });
    } else if (options.format === 'json') {
      text = JSON.stringify(sampleRows, null, 2);
    } else if (options.format === 'pbip_theme') {
      text = JSON.stringify({
        "name": "Data Eater Neon",
        "dataColors": ["#13ec5b", "#0fa640", "#9db9a6", "..."],
        "visualStyles": { "*": { "*": { "background": [{ "color": { "solid": { "color": "#1a1a1a" } } }] } } }
      }, null, 2);
    } else if (options.format === 'xlsx') {
      text = "[Aperçu binaire indisponible pour Excel]\nStructure: " + columns.length + " colonnes, 5 premières lignes simulées.";
    }

    setPreviewText(text);
    setLoading(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-1">
        <label className="text-[10px] font-bold uppercase text-subtle tracking-widest italic">Aperçu du Flux (Top 5)</label>
        {options.encoding === 'windows-1252' && (
          <span className="text-[9px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/30">
            Mode AS400 (CP1252)
          </span>
        )}
      </div>
      
      <div className="bg-background-dark/80 border border-border-dark rounded-lg p-3 h-32 overflow-hidden relative">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background-dark/50">
            <span className="text-xs text-primary animate-pulse font-mono">Génération...</span>
          </div>
        ) : (
          <pre className="text-[10px] font-mono text-text-muted leading-relaxed whitespace-pre overflow-auto h-full custom-scrollbar selection:bg-primary selection:text-background-dark">
            {previewText}
          </pre>
        )}
        
        {/* Shadow Overlay for Fade Out */}
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-background-dark/80 to-transparent pointer-events-none" />
      </div>
    </div>
  );
};
