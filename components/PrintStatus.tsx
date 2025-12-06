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
      <div className="bg-green-500/10 border border-green-500/50 rounded-xl p-4 backdrop-blur-md animate-fade-in-scale">
        <div className="flex items-center gap-4">
          <div className="relative">
            {/* Success ring animation */}
            <div className="absolute inset-0 rounded-full bg-green-500/30 animate-success-ring" />
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center animate-success-pop">
              <CheckCircle2 size={24} className="text-white" />
            </div>
          </div>
          <div className="flex-1">
            {/* Use message if generic, otherwise default */}
            <div className="text-green-400 font-bold text-sm">{message || 'Print Complete!'}</div>
            <div className="text-green-200/70 text-xs mt-0.5">
              {copies > 1 ? `${copies} labels processed` : 'Operation successful'}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/50 rounded-xl p-4 backdrop-blur-md animate-fade-in-scale">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center border border-red-500/50">
            <AlertCircle size={24} className="text-red-400" />
          </div>
          <div className="flex-1">
            <div className="text-red-400 font-bold text-sm">Print Failed</div>
            <div className="text-red-200/70 text-xs mt-0.5 line-clamp-2">{message}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 backdrop-blur-md animate-fade-in-scale">
      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-4">
        {STEPS.map((s, idx) => {
          const Icon = s.icon;
          const isActive = idx === currentStepIndex;
          const isCompleted = idx < currentStepIndex;
          
          return (
            <React.Fragment key={s.id}>
              <div className="flex flex-col items-center gap-1">
                <div className={`
                  w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                  ${isCompleted ? 'bg-green-500 text-white' : ''}
                  ${isActive ? 'bg-cyan-500 text-white scale-110 shadow-lg shadow-cyan-500/50' : ''}
                  ${!isCompleted && !isActive ? 'bg-gray-800 text-gray-500' : ''}
                `}>
                  {isCompleted ? (
                    <CheckCircle2 size={16} />
                  ) : isActive ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Icon size={14} />
                  )}
                </div>
                <span className={`text-[9px] font-bold uppercase tracking-wider ${
                  isActive ? 'text-cyan-400' : isCompleted ? 'text-green-400' : 'text-gray-600'
                }`}>
                  {s.label}
                </span>
              </div>
              
              {idx < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 rounded transition-all duration-500 ${
                  idx < currentStepIndex ? 'bg-green-500' : 'bg-gray-800'
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status Message */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-cyan-200 text-sm font-medium flex-1">{message}</span>
        {copies > 1 && step === 'printing' && (
          <span className="text-cyan-400/70 text-xs font-mono">
            {currentCopy}/{copies}
          </span>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mt-3 h-1 bg-gray-800 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full transition-all duration-500 progress-bar-animated"
          style={{ width: `${((currentStepIndex + 1) / STEPS.length) * 100}%` }}
        />
      </div>
    </div>
  );
};

export default PrintStatus;
