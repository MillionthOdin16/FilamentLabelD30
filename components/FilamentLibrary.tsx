import React, { useState, useMemo } from 'react';
import { HistoryEntry, FilamentData } from '../types';
import { Search, Clock, Trash2, ArrowRight, Package, Calendar, X } from 'lucide-react';

// Constants
const MAX_MATERIAL_BADGES = 6;

interface FilamentLibraryProps {
  history: HistoryEntry[];
  onSelect: (entry: HistoryEntry) => void;
  onDelete?: (id: string) => void;
  maxDisplay?: number;
}

const FilamentLibrary: React.FC<FilamentLibraryProps> = ({ 
  history, 
  onSelect, 
  onDelete,
  maxDisplay = 5 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showAll, setShowAll] = useState(false);

  // Filter history based on search
  const filteredHistory = useMemo(() => {
    if (!searchQuery.trim()) return history;
    const query = searchQuery.toLowerCase();
    return history.filter(entry => 
      entry.data.brand.toLowerCase().includes(query) ||
      entry.data.material.toLowerCase().includes(query) ||
      entry.data.colorName.toLowerCase().includes(query)
    );
  }, [history, searchQuery]);

  // Group by material type
  const groupedByMaterial = useMemo(() => {
    const groups: Record<string, HistoryEntry[]> = {};
    filteredHistory.forEach(entry => {
      const material = entry.data.material.toUpperCase();
      if (!groups[material]) groups[material] = [];
      groups[material].push(entry);
    });
    return groups;
  }, [filteredHistory]);

  const displayedHistory = showAll ? filteredHistory : filteredHistory.slice(0, maxDisplay);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getMaterialBadgeColor = (material: string) => {
    const m = material.toLowerCase();
    if (m.includes('pla')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (m.includes('petg')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (m.includes('abs') || m.includes('asa')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (m.includes('tpu')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (m.includes('nylon')) return 'bg-red-500/20 text-red-400 border-red-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  if (history.length === 0) return null;

  return (
    <div className="w-full space-y-3">
      {/* Header with Search */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-gray-500">
          <Package size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Filament Library</h3>
          <span className="text-[10px] bg-gray-800 px-1.5 py-0.5 rounded-full">{history.length}</span>
        </div>
        
        {history.length > 3 && (
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search..."
              className="w-full bg-gray-900 border border-gray-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-white placeholder-gray-600 focus:border-cyan-500 outline-none"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-600 hover:text-white"
              >
                <X size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Material Type Pills (when not searching) */}
      {!searchQuery && Object.keys(groupedByMaterial).length > 1 && (
        <div className="flex flex-wrap gap-1">
          {Object.entries(groupedByMaterial).slice(0, MAX_MATERIAL_BADGES).map(([material, entries]: [string, HistoryEntry[]]) => (
            <span 
              key={material}
              className={`text-[9px] px-2 py-0.5 rounded-full border ${getMaterialBadgeColor(material)}`}
            >
              {material} ({entries.length})
            </span>
          ))}
        </div>
      )}

      {/* History List */}
      <div className="space-y-2">
        {displayedHistory.map((entry) => (
          <div 
            key={entry.id}
            className="group bg-gray-900 hover:bg-gray-850 border border-gray-800 rounded-xl flex items-center transition-all overflow-hidden"
          >
            {/* Color Swatch */}
            <div 
              className="w-12 h-full min-h-[60px] flex-shrink-0"
              style={{ backgroundColor: entry.data.colorHex || '#444' }}
            />
            
            {/* Info */}
            <button 
              onClick={() => onSelect(entry)}
              className="flex-1 p-3 text-left flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-white text-sm">{entry.data.brand}</span>
                  <span className={`text-[9px] px-1.5 py-0.5 rounded border ${getMaterialBadgeColor(entry.data.material)}`}>
                    {entry.data.material}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  <span>{entry.data.colorName}</span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    {formatDate(entry.timestamp)}
                  </span>
                </div>
              </div>
              <ArrowRight size={16} className="text-gray-600 group-hover:text-cyan-400 transition-colors" />
            </button>

            {/* Delete Button */}
            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete ${entry.data.brand} ${entry.data.material} (${entry.data.colorName})?\n\nThis cannot be undone.`)) {
                    onDelete(entry.id);
                  }
                }}
                className="p-3 text-gray-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                title="Delete label"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Show More / Less */}
      {filteredHistory.length > maxDisplay && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full py-2 text-xs text-gray-500 hover:text-cyan-400 transition-colors text-center"
        >
          {showAll ? 'Show less' : `Show all ${filteredHistory.length} filaments`}
        </button>
      )}

      {/* No Results */}
      {searchQuery && filteredHistory.length === 0 && (
        <div className="text-center py-4 text-gray-600 text-xs">
          No filaments matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default FilamentLibrary;
