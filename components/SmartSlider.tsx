import React from 'react';

interface SmartSliderProps {
    value: number;
    onChange: (val: number) => void;
    min: number;
    max: number;
    safeMin?: number;
    safeMax?: number;
    label: string;
    unit?: string;
}

const SmartSlider: React.FC<SmartSliderProps> = ({ value, onChange, min, max, safeMin, safeMax, label, unit = '' }) => {
    // Calculate safe zone percentage
    const getPercent = (val: number) => Math.max(0, Math.min(100, ((val - min) / (max - min)) * 100));

    const safeStart = safeMin ? getPercent(safeMin) : 0;
    const safeWidth = (safeMin && safeMax) ? getPercent(safeMax) - safeStart : 0;

    let thumbColor = 'border-gray-400 bg-white';
    let valueColor = 'text-gray-400';

    if (safeMin && safeMax) {
        if (value < safeMin) {
             thumbColor = 'border-cyan-400 bg-cyan-50 shadow-cyan-500/20';
             valueColor = 'text-cyan-400';
        } else if (value > safeMax) {
             thumbColor = 'border-red-500 bg-red-50 shadow-red-500/20';
             valueColor = 'text-red-400';
        } else {
             thumbColor = 'border-green-500 bg-green-50 shadow-green-500/20';
             valueColor = 'text-green-400';
        }
    } else {
        thumbColor = 'border-cyan-500 bg-white';
        valueColor = 'text-cyan-400';
    }

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-2">
                <label className="text-xs text-gray-400 uppercase font-bold tracking-wider">{label}</label>
                <div className={`bg-gray-800 rounded px-2 py-0.5 text-xs font-mono border border-gray-700 font-bold min-w-[3rem] text-center ${valueColor}`}>
                    {value}{unit}
                </div>
            </div>

            <div className="relative h-6 flex items-center group">
                {/* Track */}
                <div className="absolute w-full h-1.5 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                    {/* Safe Zone Indicator */}
                    {safeWidth > 0 && (
                        <div
                            className="absolute h-full bg-gradient-to-r from-green-600 to-green-400 opacity-50"
                            style={{ left: `${safeStart}%`, width: `${safeWidth}%` }}
                        />
                    )}
                </div>

                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="absolute w-full h-full opacity-0 cursor-pointer z-10"
                />

                {/* Custom Thumb (Visual Only - follows value) */}
                <div
                    className={`absolute w-4 h-4 rounded-full shadow-md border-2 pointer-events-none transition-all duration-75 ease-out group-hover:scale-110 ${thumbColor}`}
                    style={{ left: `calc(${getPercent(value)}% - 8px)` }}
                />
            </div>

            {safeMin && safeMax && (
                <div className="flex justify-between text-[9px] text-gray-600 px-1 mt-1 font-mono">
                    <span>{min}</span>
                    <span className="text-green-600/70">{safeMin}-{safeMax} (Rec.)</span>
                    <span>{max}</span>
                </div>
            )}
        </div>
    );
};

export default SmartSlider;
