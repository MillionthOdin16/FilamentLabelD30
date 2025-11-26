
import React, { useState } from 'react';
import { FilamentData, PrintSettings, LabelTheme } from '../types';
import { Copy, QrCode, Sun, Moon, Minus, Plus, Palette, Calendar, Layers, Sparkles, Droplets, Download, Link, Eye, EyeOff, AlertTriangle, ChevronDown, CheckCircle2, Thermometer, Weight, Type } from 'lucide-react';

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

  const handleChange = (key: keyof FilamentData, value: string | number | undefined) => {
    let sanitizedValue = value;
    if (typeof sanitizedValue === 'number' && isNaN(sanitizedValue)) {
      sanitizedValue = undefined;
    }

    const newData = { ...data, [key]: sanitizedValue };

    if (key === 'currentWeightGrams' || key === 'spoolWeightGrams') {
      const currentWeight = (key === 'currentWeightGrams' ? sanitizedValue : data.currentWeightGrams) as number | undefined;
      const spoolWeight = (key === 'spoolWeightGrams' ? sanitizedValue : data.spoolWeightGrams) as number | undefined;

      if (currentWeight !== undefined && spoolWeight !== undefined) {
        const remaining = currentWeight - spoolWeight;
        newData.remainingWeightGrams = Math.max(0, remaining);
      } else {
        newData.remainingWeightGrams = undefined;
      }
    }

    onChange(newData);
  };

  const parseWeight = (weightStr: string): number => {
    if (!weightStr) return 0;
    const match = weightStr.match(/(\d+)\s*(kg|g)/i);
    if (match) {
      const value = parseInt(match[1]);
      const unit = match[2].toLowerCase();
      if (unit === 'kg') {
        return value * 1000;
      }
      return value;
    }
    // a number without units is assumed to be grams
    const justNumber = weightStr.match(/\d+/);
    if (justNumber) {
        return parseInt(justNumber[0]);
    }
    return 0;
  };

  const initialWeightGrams = parseWeight(data.weight);
  const remainingPercentage = initialWeightGrams > 0 && data.remainingWeightGrams !== undefined
    ? Math.max(0, Math.min(100, (data.remainingWeightGrams / initialWeightGrams) * 100))
    : 0;

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

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <Thermometer size={12} className="text-cyan-500" />
                Nozzle Temp (°C)
            </label>
            <div className="flex items-center gap-2">
              <input 
                  type="number" 
                  value={data.minTemp} 
                  onChange={(e) => handleChange('minTemp', parseInt(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-center text-white"
              />
              <span className="text-gray-500">-</span>
              <input 
                  type="number" 
                  value={data.maxTemp} 
                  onChange={(e) => handleChange('maxTemp', parseInt(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-center text-white"
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1.5">
                <Thermometer size={12} className="text-red-400" />
                Bed Temp (°C)
            </label>
            <div className="flex items-center gap-2">
              <input 
                  type="number" 
                  value={data.bedTempMin} 
                  onChange={(e) => handleChange('bedTempMin', parseInt(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-center text-white"
              />
              <span className="text-gray-500">-</span>
              <input 
                  type="number" 
                  value={data.bedTempMax} 
                  onChange={(e) => handleChange('bedTempMax', parseInt(e.target.value))}
                  className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-center text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* --- INVENTORY TRACKING --- */}
      <div className="p-4 bg-gray-850 rounded-xl shadow-xl border border-gray-750 space-y-4">
        <div className="flex items-center gap-2 text-green-400">
          <CheckCircle2 size={16} />
          <h3 className="text-xs font-bold uppercase tracking-wider">Inventory Tracking</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Current Weight (g)</label>
            <input
              type="number"
              placeholder="e.g. 1220"
              value={data.currentWeightGrams ?? ''}
              onChange={(e) => handleChange('currentWeightGrams', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-white"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Spool Weight (g)</label>
            <input
              type="number"
              placeholder="e.g. 220"
              value={data.spoolWeightGrams ?? ''}
              onChange={(e) => handleChange('spoolWeightGrams', e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-white"
            />
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Location / Notes</label>
          <input
            type="text"
            placeholder="e.g. Shelf A, Box 3"
            value={data.location || ''}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-white"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Remaining</label>
          <div className="flex items-center gap-2">
            <div className="relative w-24">
              <input
                type="number"
                placeholder="Auto"
                disabled
                value={data.remainingWeightGrams !== undefined ? Math.round(data.remainingWeightGrams) : ''}
                className="w-full bg-gray-950 border border-gray-750 rounded p-2 text-white pr-6"
              />
              <span className="absolute right-2 top-2 text-gray-500 text-sm">g</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2.5">
                <div className="bg-green-500 h-2.5 rounded-full" style={{width: `${remainingPercentage}%`}}></div>
            </div>
            <span className="text-xs font-mono text-gray-400 w-12 text-right">{Math.round(remainingPercentage)}%</span>
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
            <div className="flex items-center gap-2 mb-2 text-gray-400">
                <Palette size={14} />
                <span className="text-xs font-bold uppercase">Label Style</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
                {[LabelTheme.SWATCH, LabelTheme.TECHNICAL, LabelTheme.BOLD, LabelTheme.MODERN, LabelTheme.MAINTENANCE].map(theme => (
                    <button
                        key={theme}
                        onClick={() => handleThemeChange(theme)}
                        className={`py-3 rounded-lg text-[10px] font-bold uppercase transition-all flex flex-col items-center justify-center gap-1 border
                            ${settings.theme === theme 
                                ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-900/40 scale-105 z-10' 
                                : 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-750 hover:border-gray-600'}
                        `}
                    >
                        {theme === LabelTheme.SWATCH && <Layers size={14} />}
                        {theme === LabelTheme.MAINTENANCE && <Droplets size={14} />}
                        {theme === LabelTheme.TECHNICAL && <Link size={14} />}
                        {theme === LabelTheme.BOLD && <Sparkles size={14} />}
                        {theme === LabelTheme.MODERN && <Palette size={14} />}
                        <span>{theme}</span>
                        {theme === LabelTheme.SWATCH && settings.theme === theme && (
                           <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-[8px] px-1 rounded-full animate-bounce">NEW</span>
                        )}
                    </button>
                ))}
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
