import React, { useState } from 'react';
import { ArrowDown, Zap, Wrench, AlertCircle, Settings, Gauge, AlignCenter, ScanLine } from 'lucide-react';
import { connectPrinter, feedPaper, sendCalibrationPattern } from '../services/printerService';
import { PrintSettings } from '../types';

interface PrinterToolsProps {
    settings: PrintSettings;
    onSettingsChange: (settings: PrintSettings) => void;
}

const PrinterTools: React.FC<PrinterToolsProps> = ({ settings, onSettingsChange }) => {
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState('');
    const [isError, setIsError] = useState(false);

    const handleAction = async (action: 'feed' | 'calibrate') => {
        setLoading(true);
        setMsg('Connecting...');
        setIsError(false);
        try {
            const device = await connectPrinter();
            if (action === 'feed') {
                setMsg('Feeding paper...');
                await feedPaper(device);
            } else if (action === 'calibrate') {
                setMsg('Printing test pattern...');
                await sendCalibrationPattern(device, 40); // Default 40mm width
            }
            setMsg('Done!');
            setTimeout(() => setMsg(''), 2000);
        } catch (e: any) {
            setIsError(true);
            const errLower = e.message?.toLowerCase() || '';
            if (e.name === 'SecurityError' || errLower.includes('permissions policy') || errLower.includes('disallowed')) {
                setMsg('Blocked: Open in new tab');
            } else {
                setMsg(e.message?.substring(0, 25) || "Failed");
            }
            setTimeout(() => { setMsg(''); setIsError(false); }, 4000);
        } finally {
            setLoading(false);
        }
    };

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
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
                <button
                    onClick={() => handleAction('feed')}
                    disabled={loading}
                    className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg flex flex-col items-center gap-2 transition-colors active:scale-95 border border-gray-700"
                >
                    <ArrowDown size={20} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-300">Feed Paper</span>
                </button>

                <button
                    onClick={() => handleAction('calibrate')}
                    disabled={loading}
                    className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg flex flex-col items-center gap-2 transition-colors active:scale-95 border border-gray-700"
                >
                    <Settings size={20} className="text-gray-400" />
                    <span className="text-xs font-bold text-gray-300">Test Print</span>
                </button>
            </div>

            {/* Status Message */}
            {(msg || isError) && (
                <div className={`
                p-2 rounded-lg flex items-center justify-center gap-2 border border-dashed transition-all
                ${isError ? 'bg-red-900/20 border-red-700' : 'bg-gray-800/50 border-gray-700'}
            `}>
                    {isError ? <AlertCircle size={14} className="text-red-400" /> : null}
                    <span className={`text-[10px] font-bold ${isError ? 'text-red-400' : 'text-gray-500'}`}>
                        {msg}
                    </span>
                </div>
            )}
        </div>
    );
};

export default PrinterTools;
