import { useEffect, useCallback, useState, useMemo, lazy, Suspense } from "react";
import Sidebar from "./components/Sidebar";
import Toolbox from "./components/Toolbox";
import { useDataStore } from "./stores/dataStore";
import { useViewStore } from "./stores/viewStore";
import { useMascotStore } from "./stores/mascotStore";
import { MASCOT_STATES } from "./lib/constants";
import { useDropzone } from 'react-dropzone';
import { Upload, Search, Filter, Save, FileOutput, Shield, Loader2, LogOut, Terminal, Map as MapIcon, LayoutGrid, Zap } from "lucide-react";
import clsx from "clsx";
import "@glideapps/glide-data-grid/dist/index.css";
import { DataEditor, GridCell, GridCellKind, GridColumn, Item, Theme, GridSelection, CompactSelection } from "@glideapps/glide-data-grid";

// Lazy load heavy modal components to improve initial load time
const ExportModal = lazy(() => import("./components/ExportModal"));
const FAQPage = lazy(() => import("./components/FAQPage"));
const FilterModal = lazy(() => import("./components/FilterModal"));
const NormalizationModal = lazy(() => import("./components/NormalizationModal"));
const HealthDashboardModal = lazy(() => import("./components/HealthDashboardModal").then(module => ({ default: module.HealthDashboardModal })));
const DataVizModal = lazy(() => import("./components/DataVizModal").then(module => ({ default: module.DataVizModal })));
const SplitModal = lazy(() => import("./components/SplitModal").then(module => ({ default: module.SplitModal })));
const SQLConsoleModal = lazy(() => import("./components/SQLConsoleModal").then(module => ({ default: module.SQLConsoleModal })));
const GeoMapModal = lazy(() => import("./components/GeoMapModal").then(module => ({ default: module.GeoMapModal })));
const MagicJoinModal = lazy(() => import("./components/MagicJoinModal").then(module => ({ default: module.MagicJoinModal })));
const PivotModal = lazy(() => import("./components/PivotModal").then(module => ({ default: module.PivotModal })));
const UnpivotModal = lazy(() => import("./components/UnpivotModal").then(module => ({ default: module.UnpivotModal })));
const RegexExtractorModal = lazy(() => import("./components/RegexExtractorModal").then(module => ({ default: module.RegexExtractorModal })));
const FormulaModal = lazy(() => import("./components/FormulaModal").then(module => ({ default: module.FormulaModal })));
const ConditionalLogicModal = lazy(() => import("./components/ConditionalLogicModal").then(module => ({ default: module.ConditionalLogicModal })));
const DeduplicateModal = lazy(() => import("./components/DeduplicateModal").then(module => ({ default: module.DeduplicateModal })));
const SmartDateModal = lazy(() => import("./components/SmartDateModal").then(module => ({ default: module.SmartDateModal })));
const NameSplitterModal = lazy(() => import("./components/NameSplitterModal").then(module => ({ default: module.NameSplitterModal })));
const PhoneStandardizerModal = lazy(() => import("./components/PhoneStandardizerModal").then(module => ({ default: module.PhoneStandardizerModal })));
const EmailValidatorModal = lazy(() => import("./components/EmailValidatorModal").then(module => ({ default: module.EmailValidatorModal })));
const CurrencyNormalizerModal = lazy(() => import("./components/CurrencyNormalizerModal").then(module => ({ default: module.CurrencyNormalizerModal })));
const UnitConverterModal = lazy(() => import("./components/UnitConverterModal").then(module => ({ default: module.UnitConverterModal })));
const MojibakeModal = lazy(() => import("./components/MojibakeModal").then(module => ({ default: module.MojibakeModal })));
const SchemaManagerModal = lazy(() => import("./components/SchemaManagerModal").then(module => ({ default: module.SchemaManagerModal })));
const FixedWidthModal = lazy(() => import("./components/FixedWidthModal").then(module => ({ default: module.FixedWidthModal })));
const DateDimensionModal = lazy(() => import("./components/DateDimensionModal").then(module => ({ default: module.DateDimensionModal })));
const DAXModal = lazy(() => import("./components/DAXModal").then(module => ({ default: module.DAXModal })));

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
    setSort,
    hasUnsavedChanges,
    resetData,
    restoreSession
  } = useDataStore();
  const { openFilter, isNormalizationOpen, closeNormalization, isFilterOpen } = useViewStore();
  const { setMascot, resetMascot } = useMascotStore();

  const [gridSelection, setGridSelection] = useState<GridSelection | null>(null);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isFAQOpen, setIsFAQOpen] = useState(false);
  const [isHealthOpen, setIsHealthOpen] = useState(false);
  const [isVizOpen, setIsVizOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);
  const [isSQLOpen, setIsSQLOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [isJoinOpen, setIsJoinOpen] = useState(false);
  const [isPivotOpen, setIsPivotOpen] = useState(false);
  const [isUnpivotOpen, setIsUnpivotOpen] = useState(false);
  const [isRegexOpen, setIsRegexOpen] = useState(false);
  const [isFormulaOpen, setIsFormulaOpen] = useState(false);
  const [isLogicOpen, setIsLogicOpen] = useState(false);
  const [isDedupOpen, setIsDedupOpen] = useState(false);
  const [isSmartDateOpen, setIsSmartDateOpen] = useState(false);
  const [isNameOpen, setIsNameOpen] = useState(false);
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
  const [isCurrencyOpen, setIsCurrencyOpen] = useState(false);
  const [isUnitOpen, setIsUnitOpen] = useState(false);
  const [isMojibakeOpen, setIsMojibakeOpen] = useState(false);
  const [isSchemaOpen, setIsSchemaOpen] = useState(false);
  const [isFixedOpen, setIsFixedOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isDAXOpen, setIsDAXOpen] = useState(false);
  const [isRestoreOpen, setIsRestoreOpen] = useState(false);

  const openModal = (setter: (v: boolean) => void, msg: string) => {
    setMascot(MASCOT_STATES.COOKING, msg);
    setter(true);
    resetMascot(5000); 
  };

  useEffect(() => {
    initializeEngine();
    restoreSession().then(found => {
      if (found) {
        setMascot(MASCOT_STATES.DETECTIVE, "J'ai retrouvé votre session précédente !");
        setIsRestoreOpen(true);
      }
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        const setters = [
          setIsExportOpen, setIsFAQOpen, setIsHealthOpen, setIsVizOpen, setIsSplitOpen,
          setIsSQLOpen, setIsMapOpen, setIsJoinOpen, setIsPivotOpen, setIsUnpivotOpen,
          setIsRegexOpen, setIsFormulaOpen, setIsLogicOpen, setIsDedupOpen, setIsSmartDateOpen,
          setIsNameOpen, setIsPhoneOpen, setIsEmailOpen, setIsCurrencyOpen, setIsUnitOpen,
          setIsMojibakeOpen, setIsSchemaOpen, setIsFixedOpen, setIsCalendarOpen, setIsDAXOpen,
          setIsRestoreOpen
        ];
        setters.forEach(s => s(false));
        resetMascot(1000);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [initializeEngine, restoreSession, setMascot, resetMascot]);

  // Sync external column selection to grid selection
  useEffect(() => {
    if (selectedColumn) {
      const colIndex = columns.findIndex(c => c.name === selectedColumn);
      if (colIndex >= 0) {
        setGridSelection({
          columns:CompactSelection.empty().add(colIndex),
          rows: CompactSelection.empty(),
          current: undefined
        });
      }
    } else {
        setGridSelection(null);
    }
  }, [selectedColumn, columns]);

  const handleQuit = async () => {
    if (hasUnsavedChanges) {
      if (!confirm("Attention : vous avez effectué des modifications sur ce fichier sans exporter la nouvelle version. Êtes-vous sûre de vouloir quitter la gestion de ce fichier ?")) {
        return;
      }
    }
    await resetData();
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'application/pdf') {
        alert("⚠️ Module PDF/OCR non activé.\n\nPour traiter des PDFs (factures, scans), l'intégration avec un service comme 'Parsr' ou 'Unstructured' est requise.\n\nVeuillez convertir en CSV/Excel pour le moment.");
        return;
      }
      loadFile(file);
    }
  }, [loadFile]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/json': ['.json'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    noClick: !!fileMeta 
  });

  const hasGeo = columns.some(c => /lat|lon|longitude|latitude/i.test(c.name));

  // Glide Data Grid Setup
  const gridColumns: GridColumn[] = useMemo(() => columns.map(c => ({
    title: c.name,
    id: c.name,
    width: 150
  })), [columns]);

  const getCellContent = useCallback((cell: Item): GridCell => {
    const [col, row] = cell;
    const colDef = columns[col];
    const rowData = rows[row];
    const data = rowData ? rowData[colDef.name] : undefined;

    if (colDef.type.includes('INT') || colDef.type.includes('DOUBLE') || colDef.type.includes('DECIMAL')) {
      return {
        kind: GridCellKind.Number,
        allowOverlay: true,
        data: data !== null && data !== undefined ? Number(data) : undefined,
        displayData: data !== null && data !== undefined ? String(data) : "",
      };
    } else if (colDef.type.includes('BOOL')) {
       return {
         kind: GridCellKind.Boolean,
         allowOverlay: false,
         data: Boolean(data),
       };
    } else {
      return {
        kind: GridCellKind.Text,
        allowOverlay: true,
        data: data !== null && data !== undefined ? String(data) : "",
        displayData: data !== null && data !== undefined ? String(data) : "",
      };
    }
  }, [columns, rows]);

  const theme: Partial<Theme> = {
    accentColor: "#39FF14",
    accentLight: "rgba(57, 255, 20, 0.2)",
    textDark: "#ffffff",
    textMedium: "#a0a0a0",
    textLight: "#606060",
    textBubble: "#ffffff",
    bgIconHeader: "#a0a0a0",
    fgIconHeader: "#ffffff",
    textHeader: "#a0a0a0",
    textHeaderSelected: "#ffffff",
    bgCell: "#1a1a1a",
    bgCellMedium: "#252525",
    bgHeader: "#252525",
    bgHeaderHasFocus: "#333333",
    bgHeaderHovered: "#333333",
    bgBubble: "#333333",
    bgBubbleSelected: "#39FF14",
    borderColor: "#333333",
    drilldownBorder: "#39FF14",
    linkColor: "#39FF14",
    cellHorizontalPadding: 10,
    cellVerticalPadding: 10,
    headerIconSize: 18,
    baseFontStyle: "12px 'JetBrains Mono', monospace",
    headerFontStyle: "12px 'JetBrains Mono', monospace",
    editorFontSize: "13px",
    lineHeight: 1.4,
  };

  const handleQuickScan = () => {
    openModal(() => {}, "Scan rapide (QSV style) bientôt disponible !");
    // This connects to the qsv/xan inspiration
  };

  return (
    <div className="h-screen w-screen flex flex-col bg-background-dark text-white overflow-hidden font-display">
      <header className="h-16 border-b border-border-dark flex items-center justify-between px-6 bg-background-dark/50 backdrop-blur-md z-20">
        <div className="flex items-center gap-4">
          <div className="size-10 bg-surface-active p-1 rounded-lg border border-border-dark flex items-center justify-center overflow-hidden">
            <img src="/DE_ICON.png" alt="Data Eater Icon" className="w-full h-full object-contain" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight flex items-center gap-2">
              DATA EATER <span className="text-[10px] font-normal text-text-muted border border-border-dark px-2 py-0.5 rounded-full">v1.5</span>
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
          {fileMeta && (
             <button
                onClick={handleQuickScan}
                className="flex items-center gap-2 px-3 h-9 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-sm font-bold transition-all border border-primary/30"
                title="Scan Rapide (Inspiré par qsv)"
             >
                <Zap size={16} />
                Quick Scan
             </button>
          )}
          <button 
            onClick={() => openModal(setIsExportOpen, "Préparation de l'export...")}
            className="flex items-center gap-2 px-4 h-9 bg-border-dark hover:bg-surface-active rounded-lg text-sm font-bold transition-all border border-transparent hover:border-text-muted"
          >
            <FileOutput size={16} />
            Exporter
          </button>
          <button 
            onClick={() => openModal(setIsExportOpen, "Sauvegarde rapide...")}
            className="flex items-center gap-2 px-4 h-9 bg-primary hover:bg-primary-dim text-background-dark rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(57,255,20,0.3)]"
          >
            <Save size={16} />
            Sauvegarder
          </button>
        </div>
      </header>

      <Suspense fallback={null}>
        <ExportModal isOpen={isExportOpen} onClose={() => setIsExportOpen(false)} />
        <FAQPage isOpen={isFAQOpen} onClose={() => setIsFAQOpen(false)} />
        {isFilterOpen && <FilterModal />}
        <NormalizationModal isOpen={isNormalizationOpen} onClose={closeNormalization} />
        <HealthDashboardModal isOpen={isHealthOpen} onClose={() => setIsHealthOpen(false)} />
        <DataVizModal isOpen={isVizOpen} onClose={() => setIsVizOpen(false)} />
        <SplitModal isOpen={isSplitOpen} onClose={() => setIsSplitOpen(false)} />
        <SQLConsoleModal isOpen={isSQLOpen} onClose={() => setIsSQLOpen(false)} />
        <GeoMapModal isOpen={isMapOpen} onClose={() => setIsMapOpen(false)} />
        <MagicJoinModal isOpen={isJoinOpen} onClose={() => setIsJoinOpen(false)} />
        <PivotModal isOpen={isPivotOpen} onClose={() => setIsPivotOpen(false)} />
        <UnpivotModal isOpen={isUnpivotOpen} onClose={() => setIsUnpivotOpen(false)} />
        <RegexExtractorModal isOpen={isRegexOpen} onClose={() => setIsRegexOpen(false)} />
        <FormulaModal isOpen={isFormulaOpen} onClose={() => setIsFormulaOpen(false)} />
        <ConditionalLogicModal isOpen={isLogicOpen} onClose={() => setIsLogicOpen(false)} />
        <DeduplicateModal isOpen={isDedupOpen} onClose={() => setIsDedupOpen(false)} />
        <SmartDateModal isOpen={isSmartDateOpen} onClose={() => setIsSmartDateOpen(false)} />
        <NameSplitterModal isOpen={isNameOpen} onClose={() => setIsNameOpen(false)} />
        <PhoneStandardizerModal isOpen={isPhoneOpen} onClose={() => setIsPhoneOpen(false)} />
        <EmailValidatorModal isOpen={isEmailOpen} onClose={() => setIsEmailOpen(false)} />
        <CurrencyNormalizerModal isOpen={isCurrencyOpen} onClose={() => setIsCurrencyOpen(false)} />
        <UnitConverterModal isOpen={isUnitOpen} onClose={() => setIsUnitOpen(false)} />
        <MojibakeModal isOpen={isMojibakeOpen} onClose={() => setIsMojibakeOpen(false)} />
        <SchemaManagerModal isOpen={isSchemaOpen} onClose={() => setIsSchemaOpen(false)} />
        <FixedWidthModal isOpen={isFixedOpen} onClose={() => setIsFixedOpen(false)} />
        <DateDimensionModal isOpen={isCalendarOpen} onClose={() => setIsCalendarOpen(false)} />
        <DAXModal isOpen={isDAXOpen} onClose={() => setIsDAXOpen(false)} />
      </Suspense>

      {isRestoreOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-surface-dark border-2 border-primary/30 p-8 rounded-2xl shadow-[0_0_50px_rgba(19,236,91,0.2)] max-w-sm w-full text-center space-y-6">
            <div className="size-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary animate-bounce">
              <Upload size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black uppercase tracking-tight text-white italic">Reprendre le travail ?</h2>
              <p className="text-sm text-text-muted"> Une recette de nettoyage a été trouvée pour <br/><span className="text-primary font-mono font-bold break-all">{fileMeta?.name}</span></p>
            </div>
            <div className="flex flex-col gap-3">
              <button onClick={() => setIsRestoreOpen(false)} className="w-full h-12 bg-primary text-background-dark rounded-xl font-black text-sm uppercase tracking-widest hover:scale-105 transition-all">Continuer</button>
              <button onClick={() => { resetData(); setIsRestoreOpen(false); }} className="w-full h-12 bg-transparent border border-border-dark text-subtle rounded-xl font-bold text-xs uppercase hover:text-white transition-colors">Effacer & Nouveau</button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <Sidebar onOpenFAQ={() => openModal(setIsFAQOpen, "Je consulte le manuel...")} onOpenHealth={() => openModal(setIsHealthOpen, "Diagnostic complet en cours...")} onOpenViz={() => openModal(setIsVizOpen, "Génération des graphiques...")} />
        <main className="flex-1 flex flex-col bg-background-dark relative min-w-0">
          <div className="h-14 border-b border-border-dark flex items-center justify-between px-6 bg-background-dark/30 shrink-0">
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher (SQL)..."
                  aria-label="Rechercher dans les données (SQL)"
                  className="bg-surface-dark border border-border-dark rounded-md h-8 pl-9 pr-4 text-xs w-64 focus:outline-none focus:border-primary transition-colors placeholder:text-subtle"
                />
              </div>
              <button onClick={openFilter} className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-white transition-colors">
                <Filter size={14} /> Filtres
              </button>
              <button onClick={() => openModal(setIsSQLOpen, "Ouverture de la console SQL...")} className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-white transition-colors">
                <Terminal size={14} /> SQL
              </button>
              <button onClick={() => openModal(setIsPivotOpen, "Préparation du tableau croisé...")} className="flex items-center gap-1.5 text-xs font-bold text-text-muted hover:text-white transition-colors">
                <LayoutGrid size={14} /> Pivot
              </button>
              {hasGeo && (
                <button onClick={() => openModal(setIsMapOpen, "Génération de la carte...")} className="flex items-center gap-1.5 text-xs font-bold text-primary hover:text-primary-dim transition-colors animate-in fade-in zoom-in duration-500">
                  <MapIcon size={14} /> Carte
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-[10px] uppercase font-bold text-subtle tracking-widest">
              <Shield size={12} className="text-primary" /> Chiffrement Local
            </div>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden relative">
            {isLoading && (
              <div className="absolute inset-0 z-50 bg-background-dark/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                <Loader2 size={48} className="text-primary animate-spin" />
                <p className="text-white font-bold text-lg animate-pulse">Digestion en cours...</p>
              </div>
            )}
            {!fileMeta ? (
              <div {...getRootProps()} className={clsx("flex-1 flex flex-col items-center justify-center p-12 transition-colors cursor-pointer m-12 rounded-3xl relative overflow-hidden", isDragActive ? "bg-primary/5" : "hover:bg-surface-dark/30")}>
                <input {...getInputProps()} />
                <div className="max-w-md text-center space-y-8 z-10 pointer-events-none">
                  <div className={clsx("size-24 rounded-2xl flex items-center justify-center mx-auto transition-colors", isDragActive ? "text-primary bg-primary/20" : "bg-surface-dark text-subtle")}>
                    <Upload size={48} />
                  </div>
                  <div className="space-y-3">
                    <h2 className="text-3xl font-black uppercase italic">{isDragActive ? "MIAM ! Lâchez ici" : "Prêt à Digérer"}</h2>
                    <p className="text-text-muted text-base font-medium max-w-sm mx-auto">Déposez vos fichiers CSV ou exports AS400 pour lancer l'analyse locale sécurisée.</p>
                  </div>
                  <div className="pt-4">
                    <button className="px-10 h-14 bg-primary text-background-dark rounded-2xl font-black text-sm uppercase tracking-widest shadow-[0_0_20px_rgba(19,236,91,0.2)] hover:shadow-[0_0_30px_rgba(19,236,91,0.4)] hover:scale-105 transition-all">Sélectionner un Fichier</button>
                  </div>
                </div>
                <div className={clsx("absolute inset-0 border-2 border-dashed rounded-3xl transition-colors duration-300", isDragActive ? "border-primary shadow-[inset_0_0_40px_rgba(19,236,91,0.1)]" : "border-border-dark")} />
              </div>
            ) : (
              <div className="flex-1 overflow-hidden relative" style={{ isolation: 'isolate' }}>
                <DataEditor
                  theme={theme}
                  columns={gridColumns}
                  rows={rows.length}
                  getCellContent={getCellContent}
                  onHeaderClicked={(col) => {
                    const c = gridColumns[col];
                    if (c) {
                      selectColumn(c.title);
                      setSort(c.title);
                    }
                  }}
                  rowMarkers="number"
                  gridSelection={gridSelection || undefined}
                  onGridSelectionChange={(newSelection) => {
                    setGridSelection(newSelection);
                    if (newSelection?.columns.toArray().length > 0) {
                        const colIndex = newSelection.columns.first();
                        if (colIndex !== undefined && columns[colIndex]) {
                            selectColumn(columns[colIndex].name);
                        }
                    }
                  }}
                  smoothScrollX
                  smoothScrollY
                  verticalBorder={false}
                  width="100%"
                  height="100%"
                />
              </div>
            )}
          </div>
          
          <footer className="h-8 border-t border-border-dark bg-background-dark flex items-center justify-between px-4 text-[10px] font-medium text-subtle uppercase tracking-widest shrink-0">
             <div className="flex gap-4">
               <span>{fileMeta ? fileMeta.name : "Aucun fichier"}</span>
               <span>{rowCount.toLocaleString()} Lignes</span>
               {selectedColumn && <span className="text-primary">Colonne: {selectedColumn}</span>}
             </div>
             <div className="flex items-center gap-2">
               <div className={clsx("size-1.5 rounded-full animate-pulse", isReady ? "bg-primary" : "bg-red-500")} /> Moteur DuckDB {isReady ? "Prêt" : "Non initialisé"}
             </div>
          </footer>
        </main>
        <Toolbox 
          onOpenSplit={() => openModal(setIsSplitOpen, "Configuration de la découpe...")}
          onOpenJoin={() => openModal(setIsJoinOpen, "Préparation de la jointure...")}
          onOpenUnpivot={() => openModal(setIsUnpivotOpen, "Analyse de la structure...")}
          onOpenRegex={() => openModal(setIsRegexOpen, "Chargement du moteur Regex...")}
          onOpenFormula={() => openModal(setIsFormulaOpen, "Calculatrice prête !")}
          onOpenLogic={() => openModal(setIsLogicOpen, "Logique booléenne activée.")}
          onOpenDedup={() => openModal(setIsDedupOpen, "Recherche de doublons...")}
          onOpenSmartDate={() => openModal(setIsSmartDateOpen, "Analyse des formats de date...")}
          onOpenName={() => openModal(setIsNameOpen, "Détection des noms...")}
          onOpenPhone={() => openModal(setIsPhoneOpen, "Chargement de l'annuaire...")}
          onOpenEmail={() => openModal(setIsEmailOpen, "Vérification des protocoles...")}
          onOpenCurrency={() => openModal(setIsCurrencyOpen, "Taux de change... (blague)")}
          onOpenUnit={() => openModal(setIsUnitOpen, "Calibration des mesures...")}
          onOpenMojibake={() => openModal(setIsMojibakeOpen, "Décodage des hiéroglyphes...")}
          onOpenSchema={() => openModal(setIsSchemaOpen, "Gestion des noms et de l'ordre...")}
          onOpenFixed={() => openModal(setIsFixedOpen, "Calibrage de l'écran vert...")}
          onOpenCalendar={() => openModal(setIsCalendarOpen, "Génération du temps...")}
          onOpenDAX={() => openModal(setIsDAXOpen, "Rédaction des mesures...")}
        />
      </div>
    </div>
  );
}

export default App;
