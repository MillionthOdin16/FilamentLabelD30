
import React, { useState } from 'react';
import { FilamentData, PrintSettings, LabelTheme, MATERIAL_PRESETS, MaterialPreset } from '../types';
import { Copy, QrCode, Sun, Moon, Minus, Plus, Palette, Calendar, Layers, Sparkles, Droplets, Download, Link, Eye, EyeOff, AlertTriangle, ChevronDown, CheckCircle2, Thermometer, Weight, Type, Grid3X3, Zap, FileText, MessageSquare, CalendarPlus } from 'lucide-react';
import QuickMaterialPicker from './QuickMaterialPicker';
import SmartSlider from './SmartSlider';

// Theme descriptions for better UX
const THEME_INFO: Record<LabelTheme, { icon: React.ElementType; description: string }> = {
  [LabelTheme.SWATCH]: { icon: Layers, description: 'QR + full details' },
  [LabelTheme.MINIMAL]: { icon: FileText, description: 'Clean & simple' },
  [LabelTheme.TECHNICAL]: { icon: Grid3X3, description: 'Grid layout' },
  [LabelTheme.BOLD]: { icon: Zap, description: 'Large material' },
  [LabelTheme.MODERN]: { icon: Palette, description: 'Color accent' },
  [LabelTheme.MAINTENANCE]: { icon: Droplets, description: 'With checkboxes' },
};

interface LabelEditorProps {
  data: FilamentData;
  settings: PrintSettings;
  onChange: (newData: FilamentData) => void;
  onSettingsChange: (newSettings: PrintSettings) => void;
  onConfirm: () => void;
  onDownload?: () => void;
}

const LabelEditor: React.FC<LabelEditorProps> = ({ 
  data, 
  settings, 
  onChange, 
  onSettingsChange,
  onConfirm,
  onDownload
}) => {
  const [showAlts, setShowAlts] = useState(false);

  const handleChange = (key: keyof FilamentData, value: string | number) => {
    onChange({ ...data, [key]: value });
  };

  const updateSetting = (key: keyof PrintSettings, value: any) => {
    onSettingsChange({ ...settings, [key]: value });
  };

  const toggleField = (field: keyof typeof settings.visibleFields) => {
      onSettingsChange({
          ...settings,
          visibleFields: { ...settings.visibleFields, [field]: !settings.visibleFields[field] }
      });
  };

  const handleThemeChange = (theme: LabelTheme) => {
      onSettingsChange({ ...settings, theme });
  };

  const handleMaterialPreset = (preset: MaterialPreset) => {
    onChange({
      ...data,
      material: preset.material,
      minTemp: preset.minTemp,
      maxTemp: preset.maxTemp,
      bedTempMin: preset.bedTempMin,
      bedTempMax: preset.bedTempMax,
      hygroscopy: preset.hygroscopy,
      // Always use preset tips if available, otherwise keep empty
      notes: preset.tips || '',
    });
  };

  return (
    <div className="w-full max-w-lg mx-auto space-y-4">
      
      {/* --- CONFIDENCE WARNING --- */}
      {data.confidence !== undefined && data.confidence < 80 && (
         <div className="bg-orange-500/10 border border-orange-500/50 p-3 rounded-xl flex items-start gap-3">
            <AlertTriangle className="text-orange-400 shrink-0" size={18} />
            <div className="w-full">
               <div className="flex justify-between items-center">
                  <span className="text-orange-200 text-xs font-bold uppercase">Low Confidence ({data.confidence}%)</span>
               </div>
               <p className="text-orange-200/70 text-xs mt-1">Please verify the details below. Data may be inaccurate.</p>
               
               {data.alternatives && data.alternatives.length > 0 && (
                   <div className="mt-2 relative">
                       <button 
                         onClick={() => setShowAlts(!showAlts)}
                         className="w-full bg-orange-500/20 hover:bg-orange-500/30 text-orange-200 text-xs py-1 px-2 rounded flex items-center justify-between"
                       >
                           <span>Did you mean...?</span>
                           <ChevronDown size={14} className={`transform transition-transform ${showAlts ? 'rotate-180' : ''}`} />
                       </button>
                       {showAlts && (
                           <div className="absolute top-full left-0 w-full bg-gray-900 border border-gray-700 mt-1 rounded-lg z-20 shadow-xl overflow-hidden">
                               {data.alternatives.map((alt, i) => (
                                   <button 
                                      key={i}
                                      onClick={() => {
                                          onChange({...data, ...alt, confidence: 100}); 
                                          setShowAlts(false);
                                      }}
                                      className="w-full text-left px-3 py-2 hover:bg-gray-800 text-xs border-b border-gray-800 last:border-0"
                                   >
                                       <div className="font-bold text-white">{alt.brand} {alt.material}</div>
                                       <div className="text-gray-500">{alt.colorName}</div>
                                   </button>
                               ))}
                           </div>
                       )}
                   </div>
               )}
            </div>
         </div>
      )}

      {/* --- QUICK MATERIAL PICKER --- */}
      <QuickMaterialPicker 
        onSelect={handleMaterialPreset}
        currentMaterial={data.material}
      />

      {/* --- DATA FORM --- */}
      <div className="p-4 bg-gray-850 rounded-xl shadow-xl border border-gray-750 relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-2 opacity-70 hover:opacity-100 transition-opacity z-10">
           {data.referenceUrl ? (
               <a href={data.referenceUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[9px] text-cyan-400 bg-cyan-950/80 px-2 py-1 rounded-full border border-cyan-800 hover:bg-cyan-900 cursor-pointer">
                  <Link size={10} />
                  <span>Source: {data.source}</span>
               </a>
           ) : (
               <div className="flex items-center gap-1 text-[10px] text-gray-500 uppercase font-bold bg-gray-900 px-2 py-1 rounded-full border border-gray-800">
                  <Sparkles size={10} />
                  <span>{data.source || 'Manual'}</span>
               </div>
           )}
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4 mt-2">
          <div className="col-span-1">
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1.5 mb-1">
                <Type size={12} className="text-cyan-500" />
                Brand
                <button onClick={() => toggleField('brand')} className="text-gray-600 hover:text-cyan-400 ml-auto">
                    {settings.visibleFields.brand ? <Eye size={12} /> : <EyeOff size={12} />}
                </button>
            </label>
            <input 
              type="text" 
              value={data.brand} 
              onChange={(e) => handleChange('brand', e.target.value)}
              className={`w-full bg-gray-950 border border-gray-750 rounded p-2 text-white focus:border-cyan-500 outline-none ${!settings.visibleFields.brand ? 'opacity-50' : ''}`}
            />
          </div>
          <div className="col-span-1">
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1.5 mb-1">
                <Layers size={12} className="text-cyan-500" />
                Material
            </label>
            <input 
              type="text" 
              value={data.material} 
              onChange={(e) => handleChange('material', e.target.value)}
              className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-white focus:border-cyan-500 outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
             <div className="col-span-2">
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                    <Palette size={12} className="text-cyan-500" />
                    Color Name
                </label>
                <div className="flex gap-2">
                    <div className="relative w-10 h-10 flex-shrink-0">
                        <input 
                            type="color" 
                            value={data.colorHex || '#ffffff'}
                            onChange={(e) => handleChange('colorHex', e.target.value)}
                            className="w-full h-full rounded border border-gray-600 shadow-inner overflow-hidden cursor-pointer p-0 opacity-0 absolute inset-0 z-10"
                        />
                        <div className="w-full h-full rounded border border-gray-600 shadow-inner" style={{backgroundColor: data.colorHex || '#fff'}}></div>
                    </div>
                    <input 
                        type="text" 
                        value={data.colorName} 
                        onChange={(e) => handleChange('colorName', e.target.value)}
                        className="flex-1 bg-gray-950 border border-gray-750 rounded p-2 text-white focus:border-cyan-500 outline-none"
                        placeholder="Color"
                    />
                </div>
             </div>
             <div>
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                    <Weight size={12} className="text-cyan-500" />
                    Weight
                </label>
                <input 
                    type="text" 
                    value={data.weight} 
                    onChange={(e) => handleChange('weight', e.target.value)}
                    className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-white focus:border-cyan-500 outline-none text-center"
                    placeholder="1kg"
                />
             </div>
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">
          <div className="space-y-4">
             <SmartSlider
                label="Nozzle Min"
                value={data.minTemp}
                onChange={(v) => handleChange('minTemp', v)}
                min={180} max={320}
                safeMin={190} safeMax={220} // Could be dynamic based on material
                unit="°C"
             />
             <SmartSlider
                label="Nozzle Max"
                value={data.maxTemp}
                onChange={(v) => handleChange('maxTemp', v)}
                min={180} max={320}
                safeMin={200} safeMax={230}
                unit="°C"
             />
          </div>
          <div className="space-y-4">
             <SmartSlider
                label="Bed Min"
                value={data.bedTempMin}
                onChange={(v) => handleChange('bedTempMin', v)}
                min={20} max={120}
                safeMin={40} safeMax={70}
                unit="°C"
             />
             <SmartSlider
                label="Bed Max"
                value={data.bedTempMax}
                onChange={(v) => handleChange('bedTempMax', v)}
                min={20} max={120}
                safeMin={50} safeMax={80}
                unit="°C"
             />
          </div>
        </div>

        {/* Notes Field */}
        <div>
          <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
              <MessageSquare size={12} className="text-cyan-500" />
              Notes / Print Tips
              <button onClick={() => toggleField('notes')} className="text-gray-600 hover:text-cyan-400 ml-auto">
                  {settings.visibleFields.notes ? <Eye size={12} /> : <EyeOff size={12} />}
              </button>
          </label>
          <textarea 
            value={data.notes || ''} 
            onChange={(e) => handleChange('notes', e.target.value)}
            placeholder="e.g., Print slower, needs enclosure, dried 4hrs..."
            rows={2}
            className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none resize-none placeholder-gray-600"
          />
        </div>

        {/* Open Date */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <CalendarPlus size={12} className="text-cyan-500" />
                Open Date
            </label>
            <input 
              type="date" 
              value={data.openDate || ''} 
              onChange={(e) => handleChange('openDate', e.target.value)}
              className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <Droplets size={12} className={`${data.hygroscopy === 'high' ? 'text-red-400' : data.hygroscopy === 'medium' ? 'text-yellow-400' : 'text-green-400'}`} />
                Hygroscopy
            </label>
            <select 
              value={data.hygroscopy || 'low'} 
              onChange={(e) => handleChange('hygroscopy', e.target.value)}
              className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-white text-sm focus:border-cyan-500 outline-none"
            >
              <option value="low">Low (PLA)</option>
              <option value="medium">Medium (PETG/ABS)</option>
              <option value="high">High (Nylon/TPU)</option>
            </select>
          </div>
        </div>
      </div>

      {/* --- PRINT CONTROLS --- */}
      <div className="p-4 bg-gray-850 rounded-xl shadow-xl border border-gray-750 space-y-4">
        
        {/* Row 1: Copies */}
        <div className="flex items-center justify-between p-2 bg-gray-900 rounded-lg border border-gray-800">
           <div className="flex items-center gap-2 text-gray-300">
             <Copy size={18} className="text-cyan-500" />
             <span className="text-sm font-bold">Copies</span>
           </div>
           <div className="flex items-center gap-3">
             <button onClick={() => updateSetting('copies', Math.max(1, settings.copies - 1))} className="p-1 hover:bg-gray-700 rounded text-cyan-500"><Minus size={20}/></button>
             <span className="font-mono text-lg font-bold w-6 text-center">{settings.copies}</span>
             <button onClick={() => updateSetting('copies', Math.min(10, settings.copies + 1))} className="p-1 hover:bg-gray-700 rounded text-cyan-500"><Plus size={20}/></button>
           </div>
        </div>

        {/* Row 2: Themes */}
        <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
            <div className="flex items-center gap-2 mb-3 text-gray-400">
                <Palette size={14} />
                <span className="text-xs font-bold uppercase">Label Style</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {[LabelTheme.SWATCH, LabelTheme.MINIMAL, LabelTheme.TECHNICAL, LabelTheme.BOLD, LabelTheme.MODERN, LabelTheme.MAINTENANCE].map(theme => {
                    const info = THEME_INFO[theme];
                    const Icon = info.icon;
                    const isSelected = settings.theme === theme;
                    
                    return (
                        <button
                            key={theme}
                            onClick={() => handleThemeChange(theme)}
                            className={`relative p-2.5 rounded-xl text-[10px] font-bold uppercase transition-all flex flex-col items-center justify-center gap-1.5 border
                                ${isSelected 
                                    ? 'bg-gradient-to-br from-cyan-600 to-blue-600 border-cyan-400 text-white shadow-lg shadow-cyan-500/30 scale-[1.02]' 
                                    : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:bg-gray-800 hover:border-gray-600 hover:text-gray-300'}
                            `}
                        >
                            <Icon size={18} className={isSelected ? 'text-white' : ''} />
                            <span className="tracking-wide">{theme}</span>
                            <span className={`text-[8px] font-normal normal-case ${isSelected ? 'text-cyan-100' : 'text-gray-500'}`}>
                                {info.description}
                            </span>
                            {theme === LabelTheme.SWATCH && isSelected && (
                               <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black text-[7px] px-1.5 py-0.5 rounded-full font-black shadow-lg" aria-label="Recommended">★</span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>

        {/* Row 3: Toggles */}
        <div className="grid grid-cols-3 gap-3">
            <button 
                onClick={() => updateSetting('invert', !settings.invert)}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all
                    ${settings.invert ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}
                `}
                >
                {settings.invert ? <Sun size={20} /> : <Moon size={20} />}
                <span className="text-[10px] font-bold uppercase">Invert</span>
            </button>

            <button 
                onClick={() => updateSetting('includeQr', !settings.includeQr)}
                disabled={settings.theme === LabelTheme.SWATCH}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all
                    ${settings.includeQr || settings.theme === LabelTheme.SWATCH ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}
                    ${settings.theme === LabelTheme.SWATCH ? 'opacity-80' : ''}
                `}
                >
                <QrCode size={20} />
                <span className="text-[10px] font-bold uppercase">{settings.theme === LabelTheme.SWATCH ? 'Auto QR' : 'Add QR'}</span>
            </button>
            
            <button 
                onClick={() => toggleField('date')}
                className={`p-3 rounded-lg border flex flex-col items-center justify-center gap-1 transition-all
                    ${settings.visibleFields.date ? 'bg-cyan-900/30 border-cyan-500 text-cyan-400' : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800'}
                `}
                >
                <Calendar size={20} />
                <span className="text-[10px] font-bold uppercase">Date</span>
            </button>
        </div>

        {/* Row 4: Sliders */}
        <div className="grid grid-cols-2 gap-3">
             <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between mb-2 text-gray-400">
                    <span className="text-xs font-bold uppercase">Margin</span>
                    <span className="text-xs font-mono">{settings.marginMm}mm</span>
                </div>
                <input 
                    type="range" min="0" max="8" step="0.5"
                    value={settings.marginMm}
                    onChange={(e) => updateSetting('marginMm', parseFloat(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
            </div>
            <div className="bg-gray-900 p-3 rounded-lg border border-gray-800">
                <div className="flex items-center justify-between mb-2 text-gray-400">
                    <span className="text-xs font-bold uppercase">Density</span>
                    <span className="text-xs font-mono">{settings.density}%</span>
                </div>
                <input 
                    type="range" min="0" max="100" 
                    value={settings.density}
                    onChange={(e) => updateSetting('density', parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                />
            </div>
        </div>
      </div>
      
      {onDownload && (
          <button 
             onClick={onDownload}
             className="w-full p-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-xl flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-400 hover:text-white transition-all"
          >
             <Download size={16} /> Save Label as Image
          </button>
      )}
    </div>
  );
};

export default LabelEditor;
