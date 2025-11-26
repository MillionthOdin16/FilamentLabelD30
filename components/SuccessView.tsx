import React from 'react';
import { CheckCircle2, Printer, RotateCcw, Download } from 'lucide-react';
import { FilamentData } from '../types';

interface SuccessViewProps {
  data: FilamentData;
  copies: number;
  onPrintMore: () => void;
  onNewLabel: () => void;
  onDownload: () => void;
}

const SuccessView: React.FC<SuccessViewProps> = ({ 
  data, 
  copies, 
  onPrintMore, 
  onNewLabel,
  onDownload 
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-12 animate-fade-in">
      {/* Success Icon with Animation */}
      <div className="relative mb-8">
        {/* Animated rings */}
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-500/20 animate-ping" style={{ animationDuration: '2s' }} />
        <div className="absolute inset-0 w-24 h-24 rounded-full bg-green-500/10 animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.5s' }} />
        
        {/* Main icon */}
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-green-500/30 animate-success-pop">
          <CheckCircle2 size={48} className="text-white" strokeWidth={2.5} />
        </div>
      </div>

      {/* Success Message */}
      <h2 className="text-2xl font-black text-white mb-2">Print Complete!</h2>
      <p className="text-gray-400 text-center mb-2">
        {copies > 1 
          ? `${copies} labels have been sent to your printer`
          : 'Your label has been sent to the printer'
        }
      </p>
      
      {/* Label Summary */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 mb-8 w-full max-w-xs">
        <div className="flex items-center gap-3">
          <div 
            className="w-10 h-10 rounded-lg border-2 border-gray-700"
            style={{ backgroundColor: data.colorHex || '#ffffff' }}
          />
          <div className="flex-1">
            <div className="font-bold text-white">{data.brand} {data.material}</div>
            <div className="text-xs text-gray-500">{data.colorName} • {data.weight}</div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <button
          onClick={onPrintMore}
          className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-cyan-500/20"
        >
          <Printer size={18} />
          Print More Copies
        </button>
        
        <div className="flex gap-3">
          <button
            onClick={onDownload}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition-all text-sm"
          >
            <Download size={16} />
            Save
          </button>
          <button
            onClick={onNewLabel}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-xl font-bold transition-all text-sm"
          >
            <RotateCcw size={16} />
            New Label
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessView;
