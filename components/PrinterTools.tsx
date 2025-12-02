import React, { useState } from 'react';
import { Wrench, Gauge, AlignCenter, ScanLine } from 'lucide-react';
import { PrintSettings } from '../types';

interface PrinterToolsProps {
    settings: PrintSettings;
    onSettingsChange: (settings: PrintSettings) => void;
}

const PrinterTools: React.FC<PrinterToolsProps> = ({ settings, onSettingsChange }) => {

    const updateSetting = (key: keyof PrintSettings, value: any) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mt-4 space-y-4">
            <div className="flex items-center gap-2 text-cyan-400">
                <Wrench size={16} />
                <h3 className="text-xs font-bold uppercase tracking-wider">Printer Configuration</h3>
            </div>

            {/* Advanced Settings Grid */}
            <div className="grid grid-cols-2 gap-3">

                {/* Speed Control */}
                <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-1.5 mb-2 text-gray-400">
                        <Gauge size={12} />
                        <span className="text-[10px] font-bold uppercase">Print Speed</span>
                    </div>
                    <div className="flex justify-between gap-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <button
                                key={s}
                                onClick={() => updateSetting('speed', s)}
                                className={`flex-1 h-6 rounded text-[10px] font-bold transition-colors
                                ${settings.speed === s
                                        ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-900/50'
                                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}
                            `}
                            >
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Label Type */}
                <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-1.5 mb-2 text-gray-400">
                        <ScanLine size={12} />
                        <span className="text-[10px] font-bold uppercase">Paper Type</span>
                    </div>
                    <select
                        value={settings.labelType || 'gap'}
                        onChange={(e) => updateSetting('labelType', e.target.value)}
                        className="w-full bg-gray-700 text-white text-xs rounded p-1 border border-gray-600 outline-none focus:border-cyan-500"
                    >
                        <option value="gap">Gap Label</option>
                        <option value="continuous">Continuous</option>
                        <option value="mark">Black Mark</option>
                    </select>
                </div>

                {/* Print Offset */}
                <div className="bg-gray-800/50 p-2 rounded-lg border border-gray-700 col-span-2">
                    <div className="flex items-center justify-between mb-2 text-gray-400">
                        <div className="flex items-center gap-1.5">
                            <AlignCenter size={12} className="rotate-90" />
                            <span className="text-[10px] font-bold uppercase">Vertical Offset</span>
                        </div>
                        <span className="text-[10px] font-mono text-cyan-400">{settings.printOffsetMm || 0}mm</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] text-gray-500 font-bold">-10</span>
                        <input
                            type="range"
                            min="-10"
                            max="10"
                            step="0.5"
                            value={settings.printOffsetMm || 0}
                            onChange={(e) => updateSetting('printOffsetMm', parseFloat(e.target.value))}
                            className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                        <span className="text-[9px] text-gray-500 font-bold">+10</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrinterTools;
