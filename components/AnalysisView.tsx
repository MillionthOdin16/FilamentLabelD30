
import React, { useRef, useEffect, useState } from 'react';
import { Scan, Search, CheckCircle2, Zap, Terminal, Copy, Eye, Target, Brain, Sparkles, AlertCircle, Globe } from 'lucide-react';
import { useToast } from './ToastProvider';
import { FilamentData } from '../types';

interface AnalysisViewProps {
  imageSrc: string;
  logs: {text: string, icon?: any, color?: string}[];
  boxes: {label: string, rect: number[]}[];
  onComplete?: (summary: string) => void;
  detectedData?: Partial<FilamentData>;
}

// Helper function to validate and sanitize hex color
function isValidHexColor(hex: string): boolean {
  return /^#[A-Fa-f0-9]{6}$/.test(hex);
}

// Helper function to detect processing stage from log content
const detectProcessingStage = (logs: {text: string}[]): string => {
  if (logs.length === 0) return 'Initializing';
  const lastLog = logs[logs.length - 1].text.toLowerCase();
  
  if (lastLog.includes('scan') || lastLog.includes('ocr')) return 'Reading Label';
  if (lastLog.includes('color') || lastLog.includes('analyze')) return 'Analyzing Color';
  if (lastLog.includes('search') || lastLog.includes('grounding')) return 'Checking Database';
  if (lastLog.includes('validat') || lastLog.includes('confirm')) return 'Verifying';
  if (lastLog.includes('complet') || lastLog.includes('done')) return 'Complete';
  if (lastLog.includes('detect') || lastLog.includes('region')) return 'Scanning Regions';
  
  return 'Processing';
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ imageSrc, logs, boxes, onComplete, detectedData }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { success } = useToast();
  const [processingStage, setProcessingStage] = useState<string>('Initializing');

  // Auto-scroll logs
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [logs]);

  useEffect(() => {
    setProcessingStage(detectProcessingStage(logs));
  }, [logs]);

  // Pass summary on complete
  useEffect(() => {
    if (onComplete && processingStage === 'Complete') {
      // Find the last summary-like log
      const summaryLog = logs.findLast(l => l.text.length > 50 && !l.text.includes('LOG:'))?.text;
      if (summaryLog) onComplete(summaryLog);
    }
  }, [processingStage, logs, onComplete]);

  const handleCopy = () => {
      const text = logs.map(l => l.text).join('\n');
      navigator.clipboard.writeText(text);
      success("Logs Copied", "Debug data copied to clipboard");
  };

  const getStageIcon = () => {
    switch (processingStage) {
      case 'Reading Label': return <Eye className="animate-pulse text-cyan-400" />;
      case 'Scanning Regions': return <Scan className="animate-pulse text-purple-400" />;
      case 'Analyzing Color': return <Sparkles className="animate-pulse text-yellow-400" />;
      case 'Checking Database': return <Globe className="animate-pulse text-blue-400" />;
      case 'Verifying': return <CheckCircle2 className="animate-pulse text-green-400" />;
      case 'Complete': return <CheckCircle2 className="text-green-500" />;
      default: return <Brain className="animate-pulse text-cyan-500" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-hidden">
      
      {/* Background with parallax-like effect */}
      <div className="fixed inset-0 z-0">
        <img
            src={imageSrc}
            className="w-full h-full object-cover opacity-20 blur-md scale-110 animate-pulse-slow"
            alt="Scanning Background"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/80 to-gray-950"></div>

        {/* Animated Grid Overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)]"></div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 flex flex-col h-full p-6 max-w-lg mx-auto w-full">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6 animate-fade-in-down">
           <div>
             <h2 className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
                 NEURAL SCAN
             </h2>
             <div className="flex items-center gap-2 mt-1">
                 <div className="w-2 h-2 rounded-full bg-cyan-500 animate-ping"></div>
                 <p className="text-xs font-mono text-cyan-600 font-bold uppercase tracking-widest">
                     Gemini 2.5 Flash Processing
                 </p>
             </div>
           </div>

           <div className="flex flex-col items-end">
             <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur border border-gray-800 px-3 py-1.5 rounded-full shadow-lg">
               {getStageIcon()}
               <span className="text-xs font-bold font-mono text-gray-200 uppercase tracking-wide">
                  {processingStage}
               </span>
             </div>
           </div>
        </div>

        {/* Central Visualization Area */}
        <div className="relative flex-1 flex flex-col items-center justify-start gap-6">
            
            {/* Image Preview with Bounding Boxes */}
            <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl border-2 border-cyan-500/30 overflow-hidden shadow-2xl shadow-cyan-900/20 group animate-fade-in-scale">
                <img src={imageSrc} className="w-full h-full object-cover" alt="Target" />

                {/* Scanning Beam */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent w-full h-full animate-scan-y pointer-events-none"></div>

                {/* Bounding Boxes */}
                {boxes.map((box, i) => {
                    const [ymin, xmin, ymax, xmax] = box.rect;
                    return (
                        <div
                            key={i}
                            className="absolute border-2 border-cyan-400/80 bg-cyan-400/10 shadow-[0_0_15px_rgba(34,211,238,0.4)] animate-appear-pop"
                            style={{ 
                              top: `${ymin/10}%`,
                              left: `${xmin/10}%`,
                              width: `${(xmax-xmin)/10}%`,
                              height: `${(ymax-ymin)/10}%`,
                              animationDelay: `${i * 100}ms`
                            }}
                        >
                            <div className="absolute -top-4 left-0 text-[8px] bg-cyan-500 text-black px-1 font-bold uppercase rounded-t-sm">
                                {box.label}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Real-time Data Cards */}
            <div className="w-full grid grid-cols-2 gap-3 animate-fade-in-up" style={{animationDelay: '0.2s'}}>

                {/* Brand Card */}
                <div className={`
                    p-3 rounded-xl border transition-all duration-500
                    ${detectedData?.brand
                        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-cyan-500/50 shadow-lg shadow-cyan-900/20 translate-y-0 opacity-100'
                        : 'bg-gray-900/30 border-gray-800/50 opacity-50'}
                `}>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                        <Target size={10} className={detectedData?.brand ? "text-cyan-400" : "text-gray-600"} />
                        Brand
                    </div>
                    <div className={`font-bold truncate ${detectedData?.brand ? "text-white text-lg" : "text-gray-700 text-sm italic"}`}>
                        {detectedData?.brand || "Detecting..."}
                    </div>
                </div>

                {/* Material Card */}
                <div className={`
                    p-3 rounded-xl border transition-all duration-500 delay-75
                    ${detectedData?.material
                        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-purple-500/50 shadow-lg shadow-purple-900/20 translate-y-0 opacity-100'
                        : 'bg-gray-900/30 border-gray-800/50 opacity-50'}
                `}>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                        <Zap size={10} className={detectedData?.material ? "text-purple-400" : "text-gray-600"} />
                        Material
                    </div>
                    <div className={`font-bold truncate ${detectedData?.material ? "text-white text-lg" : "text-gray-700 text-sm italic"}`}>
                        {detectedData?.material || "Scanning..."}
                    </div>
                </div>

                {/* Color Card */}
                <div className={`
                    p-3 rounded-xl border transition-all duration-500 delay-100 col-span-2
                    ${detectedData?.colorName
                        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/50 shadow-lg shadow-yellow-900/20 translate-y-0 opacity-100'
                        : 'bg-gray-900/30 border-gray-800/50 opacity-50'}
                `}>
                    <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                        <Sparkles size={10} className={detectedData?.colorName ? "text-yellow-400" : "text-gray-600"} />
                        Color & Specs
                    </div>
                    <div className="flex items-center justify-between">
                         <div className={`font-bold flex items-center gap-2 ${detectedData?.colorName ? "text-white" : "text-gray-700 italic"}`}>
                            {detectedData?.colorHex && isValidHexColor(detectedData.colorHex) && (
                                <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm" style={{backgroundColor: detectedData.colorHex}}></div>
                            )}
                            {detectedData?.colorName || "Analyzing..."}
                        </div>

                        {detectedData?.minTemp && (
                            <div className="text-xs font-mono text-gray-400 bg-black/40 px-2 py-1 rounded">
                                {detectedData.minTemp}-{detectedData.maxTemp}°C
                            </div>
                        )}
                    </div>
                </div>

            </div>

        </div>

        {/* Logs Terminal */}
        <div className="mt-auto pt-6">
            <div className="bg-black/80 backdrop-blur-md border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col h-40 animate-fade-in-up delay-200">
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <Terminal size={12} className="text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">System Logs</span>
                    </div>
                    <button onClick={handleCopy} className="text-gray-600 hover:text-white transition-colors">
                        <Copy size={12} />
                    </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-1.5 custom-scrollbar">
                    {logs.map((log, i) => (
                        <div key={i} className={`flex items-start gap-2 ${log.color || 'text-cyan-400/80'}`}>
                            <span className="text-gray-700 shrink-0 select-none">{'>'}</span>
                            <span className="leading-relaxed break-words opacity-90">{log.text}</span>
                        </div>
                    ))}
                    <div className="animate-pulse text-cyan-500/50">_</div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AnalysisView;
