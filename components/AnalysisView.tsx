
import React, { useRef, useEffect, useState } from 'react';
import { Scan, Cpu, Database, Search, CheckCircle2, Wifi, Zap, Terminal, Copy, Eye, Target, Brain, Sparkles } from 'lucide-react';
import { useToast } from './ToastProvider';

interface AnalysisViewProps {
  imageSrc: string;
  logs: {text: string, icon?: any, color?: string}[];
  boxes: {label: string, rect: number[]}[];
}

// Constants
const ESTIMATED_TOTAL_OPERATIONS = 15;

// Helper function to detect processing stage from log content
const detectProcessingStage = (logs: {text: string}[]): string => {
  if (logs.length === 0) return 'Initializing';
  
  const lastLog = logs[logs.length - 1].text.toLowerCase();
  
  if (lastLog.includes('scan') || lastLog.includes('ocr') || lastLog.includes('text')) {
    return 'Scanning Text';
  } else if (lastLog.includes('color') || lastLog.includes('analyze')) {
    return 'Analyzing Color';
  } else if (lastLog.includes('search') || lastLog.includes('grounding') || lastLog.includes('web')) {
    return 'Web Search';
  } else if (lastLog.includes('validat') || lastLog.includes('confirm')) {
    return 'Validating';
  } else if (lastLog.includes('complet') || lastLog.includes('done') || lastLog.includes('finish')) {
    return 'Complete';
  } else if (lastLog.includes('detect') || lastLog.includes('region')) {
    return 'Detecting Regions';
  }
  
  return 'Processing';
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ imageSrc, logs, boxes }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { success } = useToast();
  const [processingStage, setProcessingStage] = useState<string>('Initializing');

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [logs]);

  // Update processing stage based on log content
  useEffect(() => {
    setProcessingStage(detectProcessingStage(logs));
  }, [logs]);

  const handleCopy = () => {
      const text = logs.map(l => l.text).join('\n');
      navigator.clipboard.writeText(text);
      success("Logs Copied", "Debug data copied to clipboard");
  };

  // Get icon for current stage
  const getStageIcon = () => {
    switch (processingStage) {
      case 'Scanning Text': return <Eye className="animate-pulse" />;
      case 'Detecting Regions': return <Target className="animate-pulse" />;
      case 'Analyzing Color': return <Sparkles className="animate-pulse" />;
      case 'Web Search': return <Search className="animate-pulse" />;
      case 'Validating': return <CheckCircle2 className="animate-pulse" />;
      case 'Complete': return <CheckCircle2 />;
      default: return <Brain className="animate-pulse" />;
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
        <div className="flex justify-between items-start mb-8">
           <div>
             <h2 className="text-2xl font-black tracking-widest text-cyan-500 animate-pulse">ANALYZING</h2>
             <p className="text-xs font-mono text-cyan-800">GEMINI VISION // REAL-TIME</p>
           </div>
           <div className="text-right">
             <div className="flex items-center gap-3 justify-end">
               <div className="text-cyan-400 animate-pulse">
                 {getStageIcon()}
               </div>
               <div className="text-2xl font-black font-mono text-white">
                  {processingStage.toUpperCase()}
               </div>
             </div>
             <div className="text-xs text-cyan-600 font-bold mt-1">
               {logs.length} operations • {boxes.length} regions
             </div>
           </div>
        </div>

        {/* Central Scanner Visual */}
        <div className="flex-1 relative flex items-center justify-center mb-8">
            <div className="relative w-full max-w-sm aspect-square border-2 border-cyan-500/30 rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/20 bg-black/50 backdrop-blur-md">
                <img src={imageSrc} className="w-full h-full object-cover" alt="Target" />
                
                {/* Animated scan line with enhanced glow */}
                <div className="scan-line"></div>
                
                {/* Corner Markers with pulse */}
                <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-cyan-400 animate-pulse"></div>
                <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-cyan-400 animate-pulse" style={{animationDelay: '0.1s'}}></div>
                <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-cyan-400 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-cyan-400 animate-pulse" style={{animationDelay: '0.3s'}}></div>

                {/* Progress overlay showing processing percentage */}
                {logs.length > 0 && (
                  <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-cyan-500/30">
                    {Math.min(100, Math.floor((logs.length / ESTIMATED_TOTAL_OPERATIONS) * 100))}% COMPLETE
                  </div>
                )}

                {/* Real-time Bounding Boxes with enhanced styling and animations */}
                {boxes.map((box, i) => {
                    // Gemini 0-1000 scale: [ymin, xmin, ymax, xmax]
                    const [ymin, xmin, ymax, xmax] = box.rect;
                    const top = ymin / 10 + '%';
                    const left = xmin / 10 + '%';
                    const width = (xmax - xmin) / 10 + '%';
                    const height = (ymax - ymin) / 10 + '%';
                    
                    // Color variations for different boxes
                    const colorSchemes = [
                      { border: 'border-yellow-400/80', bg: 'bg-yellow-400/10', label: 'bg-yellow-400', shadow: 'rgba(251, 191, 36, 0.3)' },
                      { border: 'border-green-400/80', bg: 'bg-green-400/10', label: 'bg-green-400', shadow: 'rgba(74, 222, 128, 0.3)' },
                      { border: 'border-blue-400/80', bg: 'bg-blue-400/10', label: 'bg-blue-400', shadow: 'rgba(96, 165, 250, 0.3)' },
                      { border: 'border-purple-400/80', bg: 'bg-purple-400/10', label: 'bg-purple-400', shadow: 'rgba(192, 132, 252, 0.3)' },
                      { border: 'border-pink-400/80', bg: 'bg-pink-400/10', label: 'bg-pink-400', shadow: 'rgba(244, 114, 182, 0.3)' },
                    ];
                    const colorScheme = colorSchemes[i % colorSchemes.length];

                    return (
                        <div
                            key={i}
                            className={`absolute border-2 ${colorScheme.border} ${colorScheme.bg} animate-fade-in-scale`}
                            style={{ 
                              top, 
                              left, 
                              width, 
                              height,
                              animationDelay: `${i * 0.1}s`,
                              boxShadow: `0 0 20px ${colorScheme.shadow}`
                            }}
                        >
                            <div className={`absolute -top-5 left-0 text-[9px] ${colorScheme.label} text-black px-1.5 py-0.5 font-bold uppercase tracking-wider rounded-t-sm shadow-lg animate-pulse`}>
                                {box.label}
                            </div>
                            {/* Corner accents for bounding boxes */}
                            <div className={`absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 ${colorScheme.border}`}></div>
                            <div className={`absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 ${colorScheme.border}`}></div>
                            <div className={`absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 ${colorScheme.border}`}></div>
                            <div className={`absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 ${colorScheme.border}`}></div>
                        </div>
                    );
                })}
            </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-black/90 border border-gray-800 rounded-lg p-4 font-mono text-xs h-56 overflow-hidden shadow-xl backdrop-blur-md flex flex-col">
           <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" style={{animationDelay: '0.1s'}}></div>
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" style={{animationDelay: '0.2s'}}></div>
                <span className="text-cyan-500 ml-2 font-bold tracking-wider flex items-center gap-2">
                    <Terminal size={12} /> NEURAL ENGINE LOG
                </span>
              </div>
              <button onClick={handleCopy} className="text-gray-500 hover:text-white transition-colors" title="Copy Logs">
                  <Copy size={12} />
              </button>
           </div>
           <div ref={scrollRef} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
               {logs.length === 0 && (
                   <div className="text-gray-600 italic py-2 flex items-center gap-2">
                     <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse"></div>
                     Waiting for data stream...
                   </div>
               )}
               {logs.map((log, i) => {
                   const color = log.color || 'text-cyan-400';
                   // Add icon indicators for special log types
                   let icon = null;
                   const text = log.text.toLowerCase();
                   if (text.includes('detect') || text.includes('found')) {
                     icon = <Target size={10} className="text-green-400" />;
                   } else if (text.includes('search') || text.includes('web')) {
                     icon = <Search size={10} className="text-blue-400" />;
                   } else if (text.includes('validat') || text.includes('confirm')) {
                     icon = <CheckCircle2 size={10} className="text-green-400" />;
                   } else if (text.includes('scan') || text.includes('analyz')) {
                     icon = <Eye size={10} className="text-yellow-400" />;
                   }
                   
                   return (
                       <div key={i} className="flex items-start gap-2 py-1.5 animate-fade-in border-b border-white/5 last:border-0">
                           <span className="text-gray-600 shrink-0 text-[10px]">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                           {icon && <span className="shrink-0 mt-0.5">{icon}</span>}
                           <span className={`${color} opacity-90 break-words flex-1`}>{log.text}</span>
                       </div>
                   )
               })}
           </div>
        </div>

      </div>
    </div>
  );
};

export default AnalysisView;
