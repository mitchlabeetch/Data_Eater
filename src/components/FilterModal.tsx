import React, { useEffect } from 'react';
import { useViewStore } from '../stores/viewStore';
import RuleBuilder from './RuleBuilder';
import { X, Filter, Plus, Check, Star, Trash2 } from 'lucide-react';
import clsx from 'clsx';

const FilterModal: React.FC = () => {
  const { isFilterOpen, closeFilter, rules, addRule, applyRules, clearRules, favorites, loadFavorite, deleteFavorite } = useViewStore();
  const [showFavs, setShowFavs] = React.useState(false);

  // Close on Escape
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeFilter();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [closeFilter]);

  if (!isFilterOpen) return null;

  const isValid = rules.every(r => r.column && (['is_empty', 'is_not_empty'].includes(r.operator) || r.value));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-surface-dark border border-border-dark w-full max-w-3xl rounded-xl shadow-2xl flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-border-dark bg-background-dark/50 rounded-t-xl">
          <div className="flex items-center gap-3 text-primary">
             <div className="p-2 rounded-lg bg-primary/20">
               <Filter size={20} />
             </div>
             <div>
               <h2 className="text-lg font-bold text-white">Filtres Avancés</h2>
               <p className="text-xs text-text-muted">Définissez vos règles d'inclusion/exclusion</p>
             </div>
          </div>
          
          <div className="flex items-center gap-2">
            
            {/* Favorites Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setShowFavs(!showFavs)}
                className={clsx("p-2 rounded-lg transition-colors", showFavs ? "bg-primary text-background-dark" : "hover:bg-surface-active text-text-muted hover:text-white")}
                title="Mes Favoris"
                aria-label="Afficher les favoris"
                aria-expanded={showFavs}
              >
                <Star size={18} />
              </button>
              
              {showFavs && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-surface-dark border border-border-dark rounded-xl shadow-xl p-2 z-50 animate-in zoom-in-95 duration-100">
                  <h4 className="px-2 py-1 text-[10px] font-bold uppercase text-subtle tracking-wider mb-1">Favoris Enregistrés</h4>
                  {favorites.length === 0 ? (
                    <p className="px-2 py-4 text-xs text-center text-text-muted italic">Aucun favori enregistré.</p>
                  ) : (
                    <div className="space-y-1">
                      {favorites.map(fav => (
                        <div key={fav.id} className="flex items-center justify-between group px-2 py-1.5 hover:bg-surface-active rounded-lg transition-colors">
                          <button onClick={() => { loadFavorite(fav.id); setShowFavs(false); }} className="text-xs font-medium text-white flex-1 text-left truncate">
                            {fav.name}
                          </button>
                          <button
                            onClick={() => deleteFavorite(fav.id)}
                            className="text-subtle hover:text-red-400 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                            aria-label={`Supprimer le favori ${fav.name}`}
                            title="Supprimer"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={clearRules}
              className="p-2 rounded-lg hover:bg-surface-active text-text-muted hover:text-white transition-colors"
              title="Tout Effacer"
              aria-label="Effacer tous les filtres"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={closeFilter}
              className="p-2 rounded-lg hover:bg-surface-active text-text-muted hover:text-white transition-colors"
              title="Fermer"
              aria-label="Fermer la fenêtre"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Rules List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-background-dark/30">
          {rules.length === 0 ? (
            <div className="h-40 border-2 border-dashed border-border-dark rounded-xl flex flex-col items-center justify-center text-subtle gap-3">
              <Filter size={32} className="opacity-20" />
              <p className="text-sm font-medium">Aucun filtre actif</p>
              <button onClick={addRule} className="text-primary text-xs font-bold uppercase tracking-wider hover:underline">
                + Ajouter une première règle
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {rules.map((rule, idx) => (
                <RuleBuilder key={rule.id} rule={rule} index={idx} />
              ))}
              <button 
                onClick={addRule}
                className="w-full py-3 border-2 border-dashed border-border-dark rounded-xl text-subtle hover:text-primary hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider"
              >
                <Plus size={14} /> Ajouter une règle
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border-dark flex justify-between items-center bg-surface-active/30 rounded-b-xl">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <div className={clsx("size-2 rounded-full", isValid ? "bg-primary" : "bg-red-500 animate-pulse")} />
            {isValid ? "Prêt à appliquer" : "Champs manquants ou invalides"}
          </div>
          
          <div className="flex gap-3">
            <button 
              onClick={closeFilter}
              className="px-4 py-2 bg-transparent hover:bg-surface-active text-text-muted hover:text-white rounded-lg text-sm font-bold transition-colors"
            >
              Annuler
            </button>
            <button 
              onClick={applyRules}
              disabled={!isValid}
              className="px-6 py-2 bg-primary hover:bg-primary-dim text-background-dark rounded-lg text-sm font-bold shadow-[0_0_15px_rgba(19,236,91,0.3)] transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check size={16} />
              Valider les Filtres
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default FilterModal;
