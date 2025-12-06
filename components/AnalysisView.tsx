
import React, { useRef, useEffect } from 'react';
import { Scan, Cpu, Database, Search, CheckCircle2, Wifi, Zap, Terminal, Copy } from 'lucide-react';
import { useToast } from './ToastProvider';

interface AnalysisViewProps {
  imageSrc: string;
  logs: {text: string, icon?: any, color?: string}[];
  boxes: {label: string, rect: number[]}[];
}

const AnalysisView: React.FC<AnalysisViewProps> = ({ imageSrc, logs, boxes }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { success } = useToast();

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [logs]);

  const handleCopy = () => {
      const text = logs.map(l => l.text).join('\n');
      navigator.clipboard.writeText(text);
      success("Logs Copied", "Debug data copied to clipboard");
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
        <div className="flex justify-between items-start mb-12">
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

        {/* Central Scanner Visual */}
        <div className="flex-1 relative flex items-center justify-center mb-12">
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
            </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-black/90 border border-gray-800 rounded-lg p-4 font-mono text-xs h-48 overflow-hidden shadow-xl backdrop-blur-md flex flex-col">
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
                   <div className="text-gray-600 italic py-2">Waiting for data stream...</div>
               )}
               {logs.map((log, i) => {
                   const color = log.color || 'text-cyan-400';
                   return (
                       <div key={i} className="flex items-start gap-3 py-1.5 animate-fade-in border-b border-white/5 last:border-0">
                           <span className="text-gray-600 shrink-0">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                           <span className={`${color} opacity-90 break-words`}>{log.text}</span>
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
