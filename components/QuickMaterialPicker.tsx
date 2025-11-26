import React, { useState } from 'react';
import { MATERIAL_PRESETS, MaterialPreset, FilamentData } from '../types';
import { Zap, ChevronRight, Info, Thermometer, Droplets, AlertTriangle } from 'lucide-react';

interface QuickMaterialPickerProps {
  onSelect: (preset: MaterialPreset) => void;
  currentMaterial?: string;
}

const QuickMaterialPicker: React.FC<QuickMaterialPickerProps> = ({ onSelect, currentMaterial }) => {
  const [expanded, setExpanded] = useState(false);
  const [hoveredPreset, setHoveredPreset] = useState<MaterialPreset | null>(null);

  // Show first 5 popular materials in compact view
  const popularMaterials = MATERIAL_PRESETS.slice(0, 5);
  const moreMaterials = MATERIAL_PRESETS.slice(5);

  const getHygroscopyColor = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'high': return 'text-red-400';
    }
  };

  const getHygroscopyIcon = (level: 'low' | 'medium' | 'high') => {
    switch (level) {
      case 'low': return '💧';
      case 'medium': return '💧💧';
      case 'high': return '💧💧💧';
    }
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-2">
        <Zap size={14} className="text-yellow-400" />
        <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Quick Material</span>
      </div>
      
      {/* Popular Materials Row */}
      <div className="flex flex-wrap gap-2 mb-2">
        {popularMaterials.map((preset) => (
          <button
            key={preset.id}
            onClick={() => onSelect(preset)}
            onMouseEnter={() => setHoveredPreset(preset)}
            onMouseLeave={() => setHoveredPreset(null)}
            className={`
              px-3 py-1.5 rounded-lg text-xs font-bold transition-all
              ${currentMaterial?.toLowerCase() === preset.material.toLowerCase()
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
              }
            `}
          >
            {preset.material}
          </button>
        ))}
        
        {!expanded && moreMaterials.length > 0 && (
          <button
            onClick={() => setExpanded(true)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-gray-900 text-gray-500 hover:text-cyan-400 border border-gray-800 flex items-center gap-1 transition-colors"
          >
            +{moreMaterials.length} more
            <ChevronRight size={12} />
          </button>
        )}
      </div>

      {/* Expanded Materials */}
      {expanded && (
        <div className="flex flex-wrap gap-2 mb-2 animate-fade-in">
          {moreMaterials.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelect(preset)}
              onMouseEnter={() => setHoveredPreset(preset)}
              onMouseLeave={() => setHoveredPreset(null)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-bold transition-all
                ${currentMaterial?.toLowerCase() === preset.material.toLowerCase()
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
                }
              `}
            >
              {preset.material}
            </button>
          ))}
          <button
            onClick={() => setExpanded(false)}
            className="px-2 py-1.5 rounded-lg text-xs text-gray-600 hover:text-gray-400 transition-colors"
          >
            Show less
          </button>
        </div>
      )}

      {/* Tooltip for hovered material */}
      {hoveredPreset && (
        <div className="mt-2 p-3 bg-gray-900 rounded-lg border border-gray-700 animate-fade-in text-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-white">{hoveredPreset.material}</span>
            <span className={`flex items-center gap-1 ${getHygroscopyColor(hoveredPreset.hygroscopy)}`}>
              <Droplets size={12} />
              {hoveredPreset.hygroscopy}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-gray-400 mb-2">
            <div className="flex items-center gap-1">
              <Thermometer size={12} className="text-cyan-400" />
              <span>Nozzle: {hoveredPreset.minTemp}-{hoveredPreset.maxTemp}°C</span>
            </div>
            <div className="flex items-center gap-1">
              <Thermometer size={12} className="text-red-400" />
              <span>Bed: {hoveredPreset.bedTempMin}-{hoveredPreset.bedTempMax}°C</span>
            </div>
          </div>
          {hoveredPreset.tips && (
            <div className="flex items-start gap-2 text-gray-500 bg-gray-800/50 p-2 rounded">
              <Info size={12} className="mt-0.5 shrink-0 text-cyan-500" />
              <span>{hoveredPreset.tips}</span>
            </div>
          )}
          {hoveredPreset.hygroscopy === 'high' && (
            <div className="flex items-center gap-2 text-yellow-500 mt-2">
              <AlertTriangle size={12} />
              <span className="text-[10px]">Requires drying before use</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default QuickMaterialPicker;
