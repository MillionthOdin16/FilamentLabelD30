
import React, { useMemo } from 'react';
import { Scan, Cpu, Database, Search, CheckCircle2, Wifi, Zap, Terminal, Eye, Brain, Sparkles, Target } from 'lucide-react';

interface AnalysisViewProps {
  imageSrc: string;
  logs: {text: string, icon?: any, color?: string, category?: string}[];
  boxes: {label: string, rect: number[]}[];
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ imageSrc, logs, boxes }) => {
  // Auto-scroll logic could be added here if needed, but flex-col-reverse handles it.
  
  // Calculate analysis progress and phases
  const analysisPhases = useMemo(() => {
    const phases = {
      scanning: logs.some(l => l.category === 'scan' || l.text.toLowerCase().includes('scanning')),
      detection: logs.some(l => l.category === 'detect' || l.text.toLowerCase().includes('detected')),
      search: logs.some(l => l.category === 'search' || l.text.toLowerCase().includes('search')),
      validation: logs.some(l => l.category === 'validate' || l.text.toLowerCase().includes('confirming')),
      complete: logs.some(l => l.category === 'complete' || l.text.toLowerCase().includes('complete'))
    };
    
    const completedCount = Object.values(phases).filter(Boolean).length;
    const progress = (completedCount / 5) * 100;
    
    return { phases, progress };
  }, [logs]);
  
  // Get icon for log category
  const getLogIcon = (category?: string) => {
    switch(category) {
      case 'scan': return Eye;
      case 'detect': return Target;
      case 'search': return Search;
      case 'validate': return Brain;
      case 'complete': return CheckCircle2;
      default: return Zap;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-hidden">
      
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img src={imageSrc} className="w-full h-full object-cover opacity-30 blur-sm scale-110" alt="Scanning" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/80 to-gray-950"></div>
        <div className="absolute inset-0 scan-grid opacity-20"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full p-6">
        
        {/* Header HUD */}
        <div className="flex justify-between items-start mb-6">
           <div>
             <h2 className="text-2xl font-black tracking-widest text-cyan-500 animate-pulse">ANALYZING</h2>
             <p className="text-xs font-mono text-cyan-800">GEMINI VISION // REAL-TIME</p>
           </div>
           <div className="text-right">
             <div className="text-4xl font-black font-mono text-white animate-pulse">
                {logs.length > 0 ? 'PROCESSING' : 'CONNECTING'}
             </div>
             <div className="text-xs text-cyan-600 font-bold">LIVE FEED</div>
           </div>
        </div>
        
        {/* Progress Bar and Phase Indicators */}
        <div className="mb-6 space-y-3">
          {/* Progress Bar */}
          <div className="relative w-full h-2 bg-gray-800/50 rounded-full overflow-hidden backdrop-blur-sm">
            <div 
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-500 ease-out rounded-full"
              style={{ width: `${analysisPhases.progress}%` }}
            >
              <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
            </div>
          </div>
          
          {/* Phase Indicators */}
          <div className="flex justify-between items-center gap-2">
            <div className={`flex items-center gap-1.5 text-xs font-bold ${analysisPhases.phases.scanning ? 'text-cyan-400' : 'text-gray-600'}`}>
              <Eye size={14} className={analysisPhases.phases.scanning ? 'animate-pulse' : ''} />
              <span>SCAN</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${analysisPhases.phases.detection ? 'text-green-400' : 'text-gray-600'}`}>
              <Target size={14} className={analysisPhases.phases.detection ? 'animate-pulse' : ''} />
              <span>DETECT</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${analysisPhases.phases.search ? 'text-purple-400' : 'text-gray-600'}`}>
              <Search size={14} className={analysisPhases.phases.search ? 'animate-pulse' : ''} />
              <span>SEARCH</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${analysisPhases.phases.validation ? 'text-yellow-400' : 'text-gray-600'}`}>
              <Brain size={14} className={analysisPhases.phases.validation ? 'animate-pulse' : ''} />
              <span>VALIDATE</span>
            </div>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${analysisPhases.phases.complete ? 'text-emerald-400' : 'text-gray-600'}`}>
              <CheckCircle2 size={14} className={analysisPhases.phases.complete ? 'animate-pulse' : ''} />
              <span>COMPLETE</span>
            </div>
          </div>
        </div>

        {/* Central Scanner Visual */}
        <div className="flex-1 relative flex items-center justify-center mb-6">
            <div className="relative w-full max-w-sm aspect-square border-2 border-cyan-500/30 rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/20 bg-black/50 backdrop-blur-md">
                <img src={imageSrc} className="w-full h-full object-cover" alt="Target" />
                <div className="scan-line"></div>
                
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400"></div>

                {/* Real-time Bounding Boxes */}
                {boxes.map((box, i) => {
                    // Gemini 0-1000 scale: [ymin, xmin, ymax, xmax]
                    const [ymin, xmin, ymax, xmax] = box.rect;
                    const top = ymin / 10 + '%';
                    const left = xmin / 10 + '%';
                    const width = (xmax - xmin) / 10 + '%';
                    const height = (ymax - ymin) / 10 + '%';

                    return (
                        <div
                            key={i}
                            className="absolute border-2 border-yellow-400/80 bg-yellow-400/10 animate-fade-in-scale"
                            style={{ top, left, width, height }}
                        >
                            <div className="absolute -top-4 left-0 text-[9px] bg-yellow-400 text-black px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-t-sm shadow-lg">
                                {box.label}
                            </div>
                        </div>
                    );
                })}
                
                {/* Detection Counter Badge */}
                {boxes.length > 0 && (
                  <div className="absolute top-2 right-2 bg-yellow-400/90 text-black px-2 py-1 rounded-md text-xs font-bold flex items-center gap-1 shadow-lg">
                    <Sparkles size={12} />
                    <span>{boxes.length} DETECTED</span>
                  </div>
                )}
            </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-black/90 border border-gray-800 rounded-lg p-4 font-mono text-xs h-52 overflow-hidden shadow-xl backdrop-blur-md flex flex-col">
           <div className="flex items-center gap-2 border-b border-gray-800 pb-2 mb-2 shrink-0">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{animationDelay: '0.1s'}}></div>
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
              <span className="text-cyan-500 ml-2 font-bold tracking-wider flex items-center gap-2">
                  <Terminal size={12} /> NEURAL ENGINE LOG
              </span>
              {logs.length > 0 && (
                <span className="ml-auto text-gray-600 text-[10px]">{logs.length} events</span>
              )}
           </div>
           <div className="flex flex-col-reverse flex-1 overflow-y-auto custom-scrollbar">
               {logs.slice().reverse().map((log, i) => {
                   const Icon = getLogIcon(log.category);
                   const color = log.color || 'text-cyan-400';
                   return (
                       <div key={i} className="flex items-start gap-2 py-1.5 animate-fade-in border-b border-white/5 last:border-0 group hover:bg-white/5 transition-colors">
                           <Icon size={12} className={`${color} shrink-0 mt-0.5 group-hover:scale-110 transition-transform`} />
                           <span className="text-gray-600 shrink-0 text-[10px]">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                           <span className={`${color} opacity-90 break-words leading-relaxed`}>{log.text}</span>
                       </div>
                   )
               })}
               {logs.length === 0 && (
                   <div className="text-gray-600 italic py-2 flex items-center gap-2">
                     <Zap size={12} className="animate-pulse" />
                     Waiting for data stream...
                   </div>
               )}
           </div>
        </div>

      </div>
    </div>
  );
};

export default AnalysisView;
