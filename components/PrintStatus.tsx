import React from 'react';
import { Bluetooth, CheckCircle2, Printer, Loader2, AlertCircle, Info, Zap } from 'lucide-react';

export type PrintStep = 'idle' | 'connecting' | 'fetching' | 'checking' | 'printing' | 'success' | 'error';

interface PrintStatusProps {
  step: PrintStep;
  message: string;
  copies?: number;
  currentCopy?: number;
}

const STEPS: { id: PrintStep; label: string; icon: React.ElementType }[] = [
  { id: 'connecting', label: 'Connect', icon: Bluetooth },
  { id: 'fetching', label: 'Setup', icon: Info },
  { id: 'checking', label: 'Check', icon: Zap },
  { id: 'printing', label: 'Print', icon: Printer },
];

const PrintStatus: React.FC<PrintStatusProps> = ({ step, message, copies = 1, currentCopy = 1 }) => {
  if (step === 'idle') return null;

  const getStepIndex = () => {
    const idx = STEPS.findIndex(s => s.id === step);
    return idx >= 0 ? idx : -1;
  };

  const currentStepIndex = getStepIndex();
  const isSuccess = step === 'success';
  const isError = step === 'error';

  if (isSuccess) {
    return (
      <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-5 backdrop-blur-md animate-fade-in-scale relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-500/20 to-transparent animate-pulse-slow"></div>
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="relative">
            {/* Success ring animation */}
            <div className="absolute inset-0 rounded-full bg-green-500/30 animate-success-ring" />
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center animate-success-pop shadow-lg shadow-green-900/50">
              <CheckCircle2 size={28} className="text-white" />
            </div>
          </div>
          <div className="flex-1">
            {/* Use message if generic, otherwise default */}
            <div className="text-green-300 font-bold text-base flex items-center gap-2">
              {message || 'Print Complete!'}
            </div>
            <div className="text-green-200/60 text-xs mt-1 flex items-center gap-2">
              {copies > 1 ? `${copies} labels printed successfully` : 'Label printed successfully'}
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 backdrop-blur-md animate-fade-in-scale relative overflow-hidden">
        {/* Animated background */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-500/10 to-transparent"></div>
        
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border-2 border-red-500/50 shadow-lg shadow-red-900/30">
            <AlertCircle size={24} className="text-red-400 animate-pulse" />
          </div>
          <div className="flex-1">
            <div className="text-red-300 font-bold text-sm flex items-center gap-2">
              Print Failed
              <span className="text-[9px] bg-red-900/50 text-red-300 px-2 py-0.5 rounded-full">ERROR</span>
            </div>
            <div className="text-red-200/70 text-xs mt-1 line-clamp-2 leading-relaxed">{message}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-5 backdrop-blur-md animate-fade-in-scale relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-500/10 animate-pulse-slow"></div>
      
      <div className="relative z-10">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-5">
          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            const isActive = idx === currentStepIndex;
            const isCompleted = idx < currentStepIndex;
            
            return (
              <React.Fragment key={s.id}>
                <div className="flex flex-col items-center gap-1.5">
                  <div className={`
                    w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 relative
                    ${isCompleted ? 'bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg shadow-green-900/30' : ''}
                    ${isActive ? 'bg-gradient-to-br from-cyan-500 to-blue-600 text-white scale-110 shadow-xl shadow-cyan-500/50' : ''}
                    ${!isCompleted && !isActive ? 'bg-gray-800 text-gray-500 border border-gray-700' : ''}
                  `}>
                    {isActive && (
                      <div className="absolute inset-0 rounded-full border-2 border-cyan-400 animate-ping opacity-75"></div>
                    )}
                    {isCompleted ? (
                      <CheckCircle2 size={18} className="animate-appear-pop" />
                    ) : isActive ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Icon size={16} />
                    )}
                  </div>
                  <span className={`text-[9px] font-bold uppercase tracking-wider transition-colors ${
                    isActive ? 'text-cyan-300' : isCompleted ? 'text-green-300' : 'text-gray-600'
                  }`}>
                    {s.label}
                  </span>
                </div>
                
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-1 mx-2 rounded-full overflow-hidden bg-gray-800/50 relative">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        idx < currentStepIndex ? 'bg-gradient-to-r from-green-500 to-green-400' : 'bg-transparent'
                      }`}
                      style={{ width: idx < currentStepIndex ? '100%' : '0%' }}
                    />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Status Message */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-3 flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
          <span className="text-cyan-100 text-sm font-medium flex-1">{message}</span>
          {copies > 1 && step === 'printing' && (
            <span className="text-cyan-300 text-xs font-mono bg-cyan-900/30 px-2 py-1 rounded">
              {currentCopy}/{copies}
            </span>
          )}
        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-1.5 bg-gray-800/80 rounded-full overflow-hidden shadow-inner">
          <div 
            className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 rounded-full transition-all duration-500 progress-bar-animated relative"
            style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-shimmer"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintStatus;
