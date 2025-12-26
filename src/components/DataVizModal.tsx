import React, { useState, useEffect } from 'react';
import { 
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  LineChart, Line, ComposedChart, Scatter, ScatterChart, Legend
} from 'recharts';
import { useDataStore } from '../stores/dataStore';
import { query } from '../services/duckdb';
import { BarChart3, PieChart as PieIcon, LineChart as LineIcon, Target, Activity, Cloud, CalendarClock, AlertTriangle, Spline } from 'lucide-react';
import clsx from 'clsx';

interface DataVizModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const COLORS = ['#13ec5b', '#0fa640', '#9db9a6', '#55695e', '#28392e', '#1c2a21'];

export const DataVizModal: React.FC<DataVizModalProps> = ({ isOpen, onClose }) => {
  const { selectedColumn, columnStats, columns } = useDataStore();
  const [vizData, setVizData] = useState<any[]>([]);
  const [vizType, setVizType] = useState<'AUTO' | 'PIE' | 'BAR' | 'LINE' | 'BULLET' | 'HISTOGRAM' | 'WORD_CLOUD' | 'TIMELINE' | 'OUTLIERS' | 'DUAL_KPI'>('AUTO');
  const [secondaryColumn, setSecondaryColumn] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && selectedColumn) {
      loadSpecializedData();
    }
  }, [isOpen, selectedColumn, vizType, secondaryColumn]);

  const loadSpecializedData = async () => {
    if (!selectedColumn) return;
    setLoading(true);
    
    const colDef = columns.find(c => c.name === selectedColumn);
    const type = colDef?.type.toUpperCase() || '';
    const isNumeric = type.includes('INT') || type.includes('DOUBLE') || type.includes('DECIMAL');
    const isDate = type.includes('DATE') || type.includes('TIMESTAMP');

    try {
      if (vizType === 'DUAL_KPI' && secondaryColumn) {
        // Group by selectedColumn (X), Measure 1 = Count, Measure 2 = Sum/Avg of secondary
        const sql = `
          SELECT 
            "${selectedColumn}" as name,
            COUNT(*) as val1,
            SUM("${secondaryColumn}") as val2
          FROM current_dataset
          WHERE "${selectedColumn}" IS NOT NULL
          GROUP BY 1
          ORDER BY val1 DESC
          LIMIT 50
        `;
        const res = await query(sql);
        setVizData(res);
      } else if (vizType === 'HISTOGRAM' && isNumeric) {
        const statsSql = `SELECT MIN("${selectedColumn}") as min_val, MAX("${selectedColumn}") as max_val FROM current_dataset`;
        const stats = await query(statsSql);
        const min = Number(stats[0].min_val);
        const max = Number(stats[0].max_val);
        const range = max - min;
        const binSize = range / 20 || 1;

        const sql = `
          SELECT 
            floor(("${selectedColumn}" - ${min}) / ${binSize}) * ${binSize} + ${min} as bin,
            COUNT(*) as count 
          FROM current_dataset 
          WHERE "${selectedColumn}" IS NOT NULL 
          GROUP BY bin 
          ORDER BY bin ASC
        `;
        const res = await query(sql);
        setVizData(res.map(r => ({ name: Number(r.bin).toFixed(2), value: r.count })));
      } else if (vizType === 'OUTLIERS' && isNumeric) {
        // Z-Score calculation
        const sql = `
          WITH stats AS (
            SELECT AVG("${selectedColumn}") as mean, STDDEV("${selectedColumn}") as sd FROM current_dataset
          )
          SELECT 
            "${selectedColumn}" as val,
            ("${selectedColumn}" - mean) / NULLIF(sd, 0) as z_score
          FROM current_dataset, stats
          WHERE "${selectedColumn}" IS NOT NULL
          ORDER BY ABS(z_score) DESC
          LIMIT 200
        `;
        const res = await query(sql);
        setVizData(res.map((r, i) => ({ x: i, y: r.val, z: r.z_score, isOutlier: Math.abs(r.z_score) > 2 })));
      } else if ((vizType === 'TIMELINE' || isDate) && (vizType !== 'AUTO')) {
        const sql = `
          SELECT "${selectedColumn}"::TIMESTAMP as ts
          FROM current_dataset 
          WHERE "${selectedColumn}" IS NOT NULL 
          ORDER BY ts ASC 
          LIMIT 500
        `;
        const res = await query(sql);
        // Map to scatter plot: X = Date, Y = Time of day (hours)
        setVizData(res.map(r => {
          const d = new Date(r.ts);
          return { 
            x: d.getTime(), 
            y: d.getHours() + d.getMinutes()/60,
            date: d.toLocaleDateString(),
            time: d.toLocaleTimeString() 
          };
        }));
      } else if (vizType === 'WORD_CLOUD') {
        const sql = `
          SELECT "${selectedColumn}" as text, COUNT(*) as count 
          FROM current_dataset 
          WHERE "${selectedColumn}" IS NOT NULL AND "${selectedColumn}" != ''
          GROUP BY text 
          ORDER BY count DESC 
          LIMIT 50
        `;
        const res = await query(sql);
        setVizData(res.map(r => ({ text: String(r.text), value: Number(r.count) })));
      } else if (isDate) { // Fallback for auto date
         const sql = `
          SELECT "${selectedColumn}"::DATE as date, COUNT(*) as count 
          FROM current_dataset 
          WHERE "${selectedColumn}" IS NOT NULL 
          GROUP BY date 
          ORDER BY date ASC 
          LIMIT 100
        `;
        const res = await query(sql);
        setVizData(res.map(r => ({ name: r.date, value: r.count })));
        if (vizType === 'AUTO') setVizType('LINE');
      } else {
        const data = columnStats?.topValues?.map(v => ({ 
          name: v.value || '(Vide)', 
          value: v.count,
          target: Math.floor(v.count * (1 + Math.random() * 0.5))
        })) || [];
        setVizData(data);
        if (vizType === 'AUTO') setVizType(columnStats?.sum !== undefined ? 'BAR' : 'PIE');
      }
    } catch (e) {
      console.error("Viz Query Failed", e);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !selectedColumn || !columnStats) return null;

  const colType = columns.find(c => c.name === selectedColumn)?.type.toUpperCase() || '';
  const isNumeric = colType.match(/INT|DOUBLE|DECIMAL/i);
  const isDate = colType.match(/DATE|TIMESTAMP/i);
  const numericColumns = columns.filter(c => c.type.match(/INT|DOUBLE|DECIMAL/i) && c.name !== selectedColumn);

  const renderWordCloud = () => {
    const maxVal = Math.max(...vizData.map(d => d.value));
    return (
      <div className="flex flex-wrap gap-2 content-center justify-center p-4 overflow-y-auto h-full">
        {vizData.map((item, i) => (
          <span 
            key={i} 
            className="text-primary hover:text-white transition-colors cursor-default"
            style={{ 
              fontSize: `${Math.max(10, (item.value / maxVal) * 40)}px`,
              opacity: 0.5 + (item.value / maxVal) * 0.5
            }}
            title={`${item.text}: ${item.value}`}
          >
            {item.text}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-surface-active rounded-xl shadow-2xl w-full max-w-4xl h-[650px] flex flex-col overflow-hidden">
        <div className="p-4 border-b border-surface-active flex justify-between items-center bg-background-dark/50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Analyse Visuelle</h2>
              <p className="text-xs text-text-muted font-mono">{selectedColumn}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-background-dark p-1 rounded-lg border border-border-dark">
             <button onClick={() => setVizType('BAR')} className={clsx("p-1.5 rounded transition-colors", vizType === 'BAR' ? "bg-primary text-black" : "text-text-muted hover:text-white")} title="Barres"><BarChart3 size={16} /></button>
             <button onClick={() => setVizType('LINE')} className={clsx("p-1.5 rounded transition-colors", vizType === 'LINE' ? "bg-primary text-black" : "text-text-muted hover:text-white")} title="Lignes"><LineIcon size={16} /></button>
             <button onClick={() => setVizType('PIE')} className={clsx("p-1.5 rounded transition-colors", vizType === 'PIE' ? "bg-primary text-black" : "text-text-muted hover:text-white")} title="Camembert"><PieIcon size={16} /></button>
             <button onClick={() => setVizType('BULLET')} className={clsx("p-1.5 rounded transition-colors", vizType === 'BULLET' ? "bg-primary text-black" : "text-text-muted hover:text-white")} title="Bullet (Cible)"><Target size={16} /></button>
             <button onClick={() => setVizType('WORD_CLOUD')} className={clsx("p-1.5 rounded transition-colors", vizType === 'WORD_CLOUD' ? "bg-primary text-black" : "text-text-muted hover:text-white")} title="Nuage de Mots"><Cloud size={16} /></button>
             <button onClick={() => setVizType('DUAL_KPI')} className={clsx("p-1.5 rounded transition-colors", vizType === 'DUAL_KPI' ? "bg-primary text-black" : "text-text-muted hover:text-white")} title="Dual KPI"><Spline size={16} /></button>
             {isNumeric && (
               <>
                 <button onClick={() => setVizType('HISTOGRAM')} className={clsx("p-1.5 rounded transition-colors", vizType === 'HISTOGRAM' ? "bg-primary text-black" : "text-text-muted hover:text-white")} title="Histogramme"><Activity size={16} /></button>
                 <button onClick={() => setVizType('OUTLIERS')} className={clsx("p-1.5 rounded transition-colors", vizType === 'OUTLIERS' ? "bg-primary text-black" : "text-text-muted hover:text-white")} title="Outliers (Z-Score)"><AlertTriangle size={16} /></button>
               </>
             )}
             {isDate && (
               <button onClick={() => setVizType('TIMELINE')} className={clsx("p-1.5 rounded transition-colors", vizType === 'TIMELINE' ? "bg-primary text-black" : "text-text-muted hover:text-white")} title="Timeline"><CalendarClock size={16} /></button>
             )}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface-active rounded-lg transition-colors text-text-muted hover:text-white">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {vizType === 'DUAL_KPI' && (
          <div className="p-2 bg-surface-active/20 flex items-center justify-center gap-2 border-b border-border-dark">
             <span className="text-[10px] uppercase font-bold text-text-muted">Métrique Secondaire (Somme) :</span>
             <select 
               className="bg-background-dark border border-border-dark rounded text-xs px-2 py-1 outline-none focus:border-primary text-white"
               onChange={(e) => setSecondaryColumn(e.target.value)}
               value={secondaryColumn || ''}
             >
               <option value="">-- Sélectionner une colonne numérique --</option>
               {numericColumns.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
             </select>
          </div>
        )}

        <div className="flex-1 p-8 bg-background-dark/30 relative">
          {loading && (
            <div className="absolute inset-0 z-10 bg-surface-dark/50 flex items-center justify-center">
               <span className="text-primary animate-pulse font-bold uppercase tracking-widest">Calcul des graphiques...</span>
            </div>
          )}
          <ResponsiveContainer width="100%" height="100%">
            {vizType === 'WORD_CLOUD' ? renderWordCloud() :
             vizType === 'DUAL_KPI' && secondaryColumn ? (
               <ComposedChart data={vizData}>
                 <CartesianGrid strokeDasharray="3 3" stroke="#28392e" vertical={false} />
                 <XAxis dataKey="name" stroke="#55695e" fontSize={10} />
                 <YAxis yAxisId="left" stroke="#13ec5b" fontSize={10} label={{ value: 'Count', angle: -90, position: 'insideLeft' }} />
                 <YAxis yAxisId="right" orientation="right" stroke="#9db9a6" fontSize={10} label={{ value: 'Sum', angle: 90, position: 'insideRight' }} />
                 <Tooltip contentStyle={{ backgroundColor: '#1c2a21', borderColor: '#28392e', color: '#fff' }} />
                 <Legend />
                 <Bar yAxisId="left" dataKey="val1" fill="#13ec5b" name="Nombre (Count)" barSize={20} radius={[4, 4, 0, 0]} />
                 <Line yAxisId="right" type="monotone" dataKey="val2" stroke="#ffffff" name={`Somme (${secondaryColumn})`} strokeWidth={2} />
               </ComposedChart>
             ) : vizType === 'TIMELINE' ? (
               <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#28392e" />
                  <XAxis type="number" dataKey="x" name="Date" domain={['auto', 'auto']} tickFormatter={(unix) => new Date(unix).toLocaleDateString()} stroke="#55695e" fontSize={10} />
                  <YAxis type="number" dataKey="y" name="Heure" unit="h" stroke="#55695e" fontSize={10} domain={[0, 24]} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1c2a21', borderColor: '#28392e', color: '#fff' }} labelFormatter={(x) => new Date(x).toLocaleDateString()} />
                  <Scatter name="Événements" data={vizData} fill="#13ec5b" />
               </ScatterChart>
             ) : vizType === 'OUTLIERS' ? (
               <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#28392e" />
                  <XAxis type="number" dataKey="x" name="Index" stroke="#55695e" fontSize={10} />
                  <YAxis type="number" dataKey="y" name="Valeur" stroke="#55695e" fontSize={10} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: '#1c2a21', borderColor: '#28392e', color: '#fff' }} />
                  <Scatter name="Normal" data={vizData.filter(d => !d.isOutlier)} fill="#55695e" shape="circle" />
                  <Scatter name="Outliers" data={vizData.filter(d => d.isOutlier)} fill="#ef4444" shape="cross" />
               </ScatterChart>
             ) : vizType === 'LINE' ? (
              <LineChart data={vizData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#28392e" vertical={false} />
                <XAxis dataKey="name" stroke="#55695e" fontSize={10} />
                <YAxis stroke="#55695e" fontSize={10} />
                <Tooltip contentStyle={{ backgroundColor: '#1c2a21', borderColor: '#28392e', color: '#fff' }} itemStyle={{ color: '#13ec5b' }} />
                <Line type="monotone" dataKey="value" stroke="#13ec5b" strokeWidth={3} dot={{ r: 4, fill: '#13ec5b' }} activeDot={{ r: 6 }} />
              </LineChart>
            ) : vizType === 'BAR' ? (
                <BarChart data={vizData} layout="vertical" margin={{ left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#28392e" horizontal={false} />
                  <XAxis type="number" stroke="#55695e" fontSize={10} />
                  <YAxis dataKey="name" type="category" width={100} stroke="#9db9a6" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#1c2a21', borderColor: '#28392e', color: '#fff' }} itemStyle={{ color: '#13ec5b' }} />
                  <Bar dataKey="value" fill="#13ec5b" radius={[0, 4, 4, 0]} barSize={24} />
                </BarChart>
            ) : vizType === 'HISTOGRAM' ? (
                <BarChart data={vizData} barGap={0} barCategoryGap={1}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#28392e" vertical={false} />
                  <XAxis dataKey="name" stroke="#55695e" fontSize={9} interval={2} />
                  <YAxis stroke="#55695e" fontSize={10} />
                  <Tooltip contentStyle={{ backgroundColor: '#1c2a21', borderColor: '#28392e', color: '#fff' }} />
                  <Bar dataKey="value" fill="#13ec5b" name="Fréquence" />
                </BarChart>
            ) : vizType === 'BULLET' ? (
                <ComposedChart layout="vertical" data={vizData} margin={{ left: 40 }}>
                  <CartesianGrid stroke="#28392e" horizontal={false} />
                  <XAxis type="number" stroke="#55695e" fontSize={10} />
                  <YAxis dataKey="name" type="category" width={100} stroke="#9db9a6" fontSize={10} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ backgroundColor: '#1c2a21', borderColor: '#28392e', color: '#fff' }} />
                  <Bar dataKey="value" fill="#13ec5b" barSize={16} radius={[0, 4, 4, 0]} name="Actuel" />
                  <Scatter dataKey="target" fill="#ffffff" shape="wye" name="Cible" />
                </ComposedChart>
            ) : (
                <PieChart>
                  <Pie data={vizData} cx="50%" cy="50%" innerRadius={100} outerRadius={160} paddingAngle={8} dataKey="value" animationBegin={0} animationDuration={800}>
                    {vizData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="#1c2a21" strokeWidth={4} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1c2a21', borderColor: '#28392e', borderRadius: '8px', border: 'none' }} itemStyle={{ color: '#13ec5b' }} />
                </PieChart>
            )}
          </ResponsiveContainer>
        </div>

        <div className="p-4 border-t border-surface-active bg-surface-dark flex justify-between items-center text-xs text-text-muted">
           <div className="flex gap-4">
             <div className="flex items-center gap-2"><div className="size-2 rounded-full bg-primary" /><span>Échantillon: Top 100</span></div>
             <div>Type: <span className="text-white font-mono">{vizType}</span></div>
           </div>
           <div className="text-text-subtle italic">Appuyez sur ESC pour fermer</div>
        </div>
      </div>
    </div>
  );
};