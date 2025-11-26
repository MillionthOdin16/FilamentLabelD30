
import React, { useEffect, useState } from 'react';
import { Scan, Cpu, Database, Search, CheckCircle2, Wifi, Zap } from 'lucide-react';

interface AnalysisViewProps {
  imageSrc: string;
}

const LOG_STEPS = [
  { text: "INITIALIZING OPTICAL SCAN...", icon: Scan, color: "text-blue-400" },
  { text: "ISOLATING LABEL REGION...", icon: Zap, color: "text-cyan-400" },
  { text: "READING SPOOL QR/BARCODE...", icon: Search, color: "text-cyan-300" },
  { text: "EXTRACTING BRAND TEXT...", icon: Database, color: "text-purple-400" },
  { text: "DETECTING MATERIAL (PLA/PETG)...", icon: Cpu, color: "text-pink-400" },
  { text: "CROSS-REFERENCING VENDOR DB...", icon: Wifi, color: "text-emerald-400" },
  { text: "VERIFYING SLICER PROFILES...", icon: Database, color: "text-yellow-400" },
  { text: "FORMATTING LABEL DATA...", icon: CheckCircle2, color: "text-green-400" },
];

const AnalysisView: React.FC<AnalysisViewProps> = ({ imageSrc }) => {
  const [logIndex, setLogIndex] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    // Animate Logs using an index counter to avoid array state race conditions
    const logInterval = setInterval(() => {
      setLogIndex(prev => {
        if (prev < LOG_STEPS.length) return prev + 1;
        return prev;
      });
    }, 450); // Slightly slower for readability

    // Animate Progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 98) return 99;
        return prev + Math.floor(Math.random() * 5) + 1;
      });
    }, 150);

    return () => {
      clearInterval(logInterval);
      clearInterval(progressInterval);
    };
  }, []);

  // Derived state for display
  const visibleLogs = LOG_STEPS.slice(0, logIndex);

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
             <p className="text-xs font-mono text-cyan-800">FILAMENT-ID // V3.0</p>
           </div>
           <div className="text-right">
             <div className="text-4xl font-black font-mono text-white">{progress}%</div>
             <div className="text-xs text-cyan-600 font-bold">MATCH PROBABILITY</div>
           </div>
        </div>

        {/* Central Scanner Visual */}
        <div className="flex-1 relative flex items-center justify-center mb-12">
            <div className="relative w-64 h-64 border-2 border-cyan-500/30 rounded-lg overflow-hidden shadow-2xl shadow-cyan-500/20 bg-black/50 backdrop-blur-md">
                <img src={imageSrc} className="w-full h-full object-cover" alt="Target" />
                <div className="scan-line"></div>
                
                {/* Corner Markers */}
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>

                {/* Simulated Detection Rects */}
                <div className="absolute top-1/3 left-1/4 w-32 h-8 border border-yellow-400/60 bg-yellow-400/10 animate-pulse">
                    <div className="absolute -top-3 left-0 text-[8px] bg-yellow-400 text-black px-1 font-bold">DETECTED: BRAND</div>
                </div>
            </div>
        </div>

        {/* Terminal Output */}
        <div className="bg-black/80 border border-gray-800 rounded-lg p-4 font-mono text-xs h-48 overflow-hidden shadow-xl backdrop-blur-md">
           <div className="flex items-center gap-2 border-b border-gray-800 pb-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500"></div>
              <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-500 ml-2">DATA STREAM</span>
           </div>
           <div className="flex flex-col-reverse h-full overflow-hidden">
               {visibleLogs.slice().reverse().map((log, i) => {
                   if (!log) return null;
                   const Icon = log.icon;
                   return (
                       <div key={i} className="flex items-center gap-3 py-1 animate-fade-in-up">
                           {Icon && <Icon size={12} className={log.color} />}
                           <span className={`${log.color} opacity-80`}>{log.text}</span>
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
