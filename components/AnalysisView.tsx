
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

// Define key fields for confidence calculation
const CONFIDENCE_FIELDS: (keyof FilamentData)[] = [
  'brand', 'material', 'colorName', 'colorHex', 'minTemp', 'maxTemp', 'weight'
];

// Calculate confidence based on detected fields
const calculateConfidence = (data: Partial<FilamentData>): number => {
  const detected = CONFIDENCE_FIELDS.filter(field => {
    const value = data[field];
    return value !== undefined && value !== null && value !== '';
  });
  return Math.round((detected.length / CONFIDENCE_FIELDS.length) * 100);
};

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
  const [showConfidence, setShowConfidence] = useState(false);
  
  const confidence = calculateConfidence(detectedData || {});

  // Auto-scroll logs
  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [logs]);

  useEffect(() => {
    setProcessingStage(detectProcessingStage(logs));
  }, [logs]);

  useEffect(() => {
    // Show confidence meter after some data is detected
    if (confidence > 0) {
      const timer = setTimeout(() => setShowConfidence(true), 500);
      return () => clearTimeout(timer);
    }
  }, [confidence]);

  // Pass summary on complete
  useEffect(() => {
    if (onComplete && processingStage === 'Complete') {
      // Find the last summary-like log
      // Polyfill findLast
      const summaryLog = [...logs].reverse().find(l => l.text.length > 50 && !l.text.includes('LOG:'))?.text;
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

           <div className="flex flex-col items-end gap-2">
             <div className="flex items-center gap-2 bg-gray-900/80 backdrop-blur border border-gray-800 px-3 py-1.5 rounded-full shadow-lg">
               {getStageIcon()}
               <span className="text-xs font-bold font-mono text-gray-200 uppercase tracking-wide">
                  {processingStage}
               </span>
             </div>
             
             {/* Confidence Meter */}
             {showConfidence && confidence > 0 && (
               <div className="bg-gray-900/80 backdrop-blur border border-gray-800 px-3 py-1.5 rounded-full shadow-lg animate-fade-in-down">
                 <div className="flex items-center gap-2">
                   <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                     <div 
                       className={`h-full rounded-full transition-all duration-500 ${
                         confidence >= 80 ? 'bg-green-500' : 
                         confidence >= 50 ? 'bg-yellow-500' : 
                         'bg-orange-500'
                       }`}
                       style={{ width: `${confidence}%` }}
                     ></div>
                   </div>
                   <span className={`text-[10px] font-bold font-mono ${
                     confidence >= 80 ? 'text-green-400' : 
                     confidence >= 50 ? 'text-yellow-400' : 
                     'text-orange-400'
                   }`}>
                     {confidence}%
                   </span>
                 </div>
               </div>
             )}
           </div>
        </div>

        {/* Central Visualization Area */}
        <div className="relative flex-1 flex flex-col items-center justify-start gap-4">
            
            {/* Image Preview with Bounding Boxes */}
            <div className="relative w-full max-w-xs aspect-square rounded-2xl border-2 border-cyan-500/30 overflow-hidden shadow-2xl shadow-cyan-900/20 group animate-fade-in-scale">
                <img src={imageSrc} className="w-full h-full object-cover" alt="Target" />

                {/* Scanning Beam */}
                <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/20 to-transparent w-full h-full animate-scan-y pointer-events-none"></div>

                {/* Corner Markers */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-cyan-400/60"></div>
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-cyan-400/60"></div>
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-cyan-400/60"></div>
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-cyan-400/60"></div>

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
                            <div className="absolute -top-5 left-0 text-[8px] bg-cyan-500 text-black px-1.5 py-0.5 font-bold uppercase rounded shadow-lg">
                                {box.label}
                            </div>
                        </div>
                    );
                })}
                
                {/* Detection Count Badge */}
                {boxes.length > 0 && (
                    <div className="absolute top-3 right-3 bg-cyan-500 text-black px-2 py-1 rounded-full text-[10px] font-bold shadow-lg animate-appear-pop">
                        {boxes.length} {boxes.length === 1 ? 'region' : 'regions'}
                    </div>
                )}
            </div>

            {/* Real-time Data Cards */}
            <div className="w-full grid grid-cols-2 gap-3 animate-fade-in-up" style={{animationDelay: '0.2s'}}>

                {/* Brand Card */}
                <div className={`
                    p-3 rounded-xl border transition-all duration-500 relative overflow-hidden
                    ${detectedData?.brand
                        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-cyan-500/50 shadow-lg shadow-cyan-900/20 translate-y-0 opacity-100'
                        : 'bg-gray-900/30 border-gray-800/50 opacity-50'}
                `}>
                    {detectedData?.brand && (
                        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/10 to-transparent animate-pulse-slow"></div>
                    )}
                    <div className="relative z-10">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                            <Target size={10} className={detectedData?.brand ? "text-cyan-400" : "text-gray-600"} />
                            Brand
                            {detectedData?.brand && (
                                <CheckCircle2 size={10} className="text-green-400 ml-auto animate-appear-pop" />
                            )}
                        </div>
                        <div className={`font-bold truncate ${detectedData?.brand ? "text-white text-lg" : "text-gray-700 text-sm italic"}`}>
                            {detectedData?.brand || "Detecting..."}
                        </div>
                    </div>
                </div>

                {/* Material Card */}
                <div className={`
                    p-3 rounded-xl border transition-all duration-500 delay-75 relative overflow-hidden
                    ${detectedData?.material
                        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-purple-500/50 shadow-lg shadow-purple-900/20 translate-y-0 opacity-100'
                        : 'bg-gray-900/30 border-gray-800/50 opacity-50'}
                `}>
                    {detectedData?.material && (
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-transparent animate-pulse-slow"></div>
                    )}
                    <div className="relative z-10">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                            <Zap size={10} className={detectedData?.material ? "text-purple-400" : "text-gray-600"} />
                            Material
                            {detectedData?.material && (
                                <CheckCircle2 size={10} className="text-green-400 ml-auto animate-appear-pop" />
                            )}
                        </div>
                        <div className={`font-bold truncate ${detectedData?.material ? "text-white text-lg" : "text-gray-700 text-sm italic"}`}>
                            {detectedData?.material || "Scanning..."}
                        </div>
                    </div>
                </div>

                {/* Color Card */}
                <div className={`
                    p-3 rounded-xl border transition-all duration-500 delay-100 col-span-2 relative overflow-hidden
                    ${detectedData?.colorName
                        ? 'bg-gradient-to-br from-gray-900 to-gray-800 border-yellow-500/50 shadow-lg shadow-yellow-900/20 translate-y-0 opacity-100'
                        : 'bg-gray-900/30 border-gray-800/50 opacity-50'}
                `}>
                    {detectedData?.colorName && (
                        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 to-transparent animate-pulse-slow"></div>
                    )}
                    <div className="relative z-10">
                        <div className="text-[10px] text-gray-500 uppercase font-bold mb-1 flex items-center gap-1">
                            <Sparkles size={10} className={detectedData?.colorName ? "text-yellow-400" : "text-gray-600"} />
                            Color & Specs
                            {detectedData?.colorName && (
                                <CheckCircle2 size={10} className="text-green-400 ml-auto animate-appear-pop" />
                            )}
                        </div>
                        <div className="flex items-center justify-between">
                             <div className={`font-bold flex items-center gap-2 ${detectedData?.colorName ? "text-white" : "text-gray-700 italic"}`}>
                                {detectedData?.colorHex && isValidHexColor(detectedData.colorHex) && (
                                    <div className="w-4 h-4 rounded-full border border-white/20 shadow-sm animate-appear-pop" style={{backgroundColor: detectedData.colorHex}}></div>
                                )}
                                {detectedData?.colorName || "Analyzing..."}
                            </div>

                            {detectedData?.minTemp && (
                                <div className="text-xs font-mono text-gray-400 bg-black/40 px-2 py-1 rounded animate-appear-pop">
                                    {detectedData.minTemp}-{detectedData.maxTemp}°C
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Additional Data Grid - Expanded */}
                <div className="col-span-2 grid grid-cols-2 gap-2 animate-fade-in-up" style={{animationDelay: '0.4s'}}>
                    {/* Weight */}
                    {detectedData?.weight && (
                        <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">Weight</div>
                                <div className="text-sm font-bold text-cyan-400">{detectedData.weight}</div>
                            </div>
                        </div>
                    )}
                    
                    {/* Bed Temp */}
                    {detectedData?.bedTempMin && (
                        <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">Bed Temp</div>
                                <div className="text-sm font-bold text-orange-400">
                                    {detectedData.bedTempMin}-{detectedData.bedTempMax}°C
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Hygroscopy */}
                    {detectedData?.hygroscopy && (
                        <div className={`p-2 rounded-lg bg-gray-900/50 border relative overflow-hidden group ${
                            detectedData.hygroscopy === 'high' ? 'border-red-900/50' : 
                            detectedData.hygroscopy === 'medium' ? 'border-yellow-900/50' : 
                            'border-green-900/50'
                        }`}>
                            <div className={`absolute inset-0 bg-gradient-to-r to-transparent opacity-0 group-hover:opacity-100 transition-opacity ${
                                detectedData.hygroscopy === 'high' ? 'from-red-500/5' : 
                                detectedData.hygroscopy === 'medium' ? 'from-yellow-500/5' : 
                                'from-green-500/5'
                            }`}></div>
                            <div className="relative z-10">
                                <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">Moisture</div>
                                <div className={`text-sm font-bold capitalize ${
                                    detectedData.hygroscopy === 'high' ? 'text-red-400' : 
                                    detectedData.hygroscopy === 'medium' ? 'text-yellow-400' : 
                                    'text-green-400'
                                }`}>
                                    {detectedData.hygroscopy}
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Source */}
                    {detectedData?.source && (
                        <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5">Source</div>
                                <div className="text-xs font-bold text-purple-400 truncate">{detectedData.source}</div>
                            </div>
                        </div>
                    )}
                    
                    {/* Confidence Score */}
                    {detectedData?.confidence !== undefined && detectedData.confidence > 0 && (
                        <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800 relative overflow-hidden group col-span-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="text-[9px] text-gray-600 uppercase font-bold mb-1 flex items-center justify-between">
                                    <span>Detection Confidence</span>
                                    <span className={`${
                                        detectedData.confidence >= 80 ? 'text-green-400' : 
                                        detectedData.confidence >= 60 ? 'text-yellow-400' : 
                                        'text-orange-400'
                                    }`}>{detectedData.confidence}%</span>
                                </div>
                                <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full transition-all duration-500 ${
                                            detectedData.confidence >= 80 ? 'bg-gradient-to-r from-green-500 to-green-400' : 
                                            detectedData.confidence >= 60 ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' : 
                                            'bg-gradient-to-r from-orange-500 to-orange-400'
                                        }`}
                                        style={{ width: `${detectedData.confidence}%` }}
                                    ></div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    {/* Reference URL */}
                    {detectedData?.referenceUrl && (
                        <div className="p-2 rounded-lg bg-gray-900/50 border border-gray-800 relative overflow-hidden group col-span-2">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="text-[9px] text-gray-600 uppercase font-bold mb-0.5 flex items-center gap-1">
                                    <Globe size={10} className="text-indigo-400" />
                                    Reference
                                </div>
                                <div className="text-xs text-indigo-400 truncate">{detectedData.referenceUrl}</div>
                            </div>
                        </div>
                    )}
                </div>
                
                {/* Notes Section */}
                {detectedData?.notes && detectedData.notes.length > 0 && (
                    <div className="col-span-2 animate-fade-in-up" style={{animationDelay: '0.5s'}}>
                        <div className="p-3 rounded-lg bg-gray-900/50 border border-gray-800 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            <div className="relative z-10">
                                <div className="text-[9px] text-gray-500 uppercase font-bold mb-1.5 flex items-center gap-1">
                                    <AlertCircle size={10} className="text-blue-400" />
                                    Additional Info & Tips
                                </div>
                                <div className="text-xs text-gray-300 leading-relaxed max-h-20 overflow-y-auto custom-scrollbar">
                                    {detectedData.notes}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>

        </div>

        {/* Logs Terminal */}
        <div className="mt-auto pt-6">
            <div className="bg-black/80 backdrop-blur-md border border-gray-800 rounded-xl overflow-hidden shadow-2xl flex flex-col animate-fade-in-up delay-200" style={{height: logs.length > 10 ? '200px' : '160px'}}>
                <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900/50">
                    <div className="flex items-center gap-2">
                        <Terminal size={12} className="text-gray-500" />
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Processing Stream</span>
                        <span className="text-[9px] bg-cyan-900/30 text-cyan-400 px-1.5 py-0.5 rounded-full">{logs.length}</span>
                    </div>
                    <button onClick={handleCopy} className="text-gray-600 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded" title="Copy logs">
                        <Copy size={12} />
                    </button>
                </div>

                <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 font-mono text-[10px] space-y-1 custom-scrollbar">
                    {logs.map((log, i) => {
                        const logLower = log.text.toLowerCase();
                        const isImportant = logLower.includes('detected') || 
                                          logLower.includes('found') ||
                                          logLower.includes('complete');
                        const isError = logLower.includes('error') || 
                                       logLower.includes('failed');
                        const isWarning = logLower.includes('warning');
                        
                        return (
                            <div 
                                key={i} 
                                className={`flex items-start gap-2 transition-all duration-200 hover:bg-gray-800/30 px-1 py-0.5 rounded ${
                                    isError ? 'text-red-400' : 
                                    isWarning ? 'text-yellow-400' :
                                    isImportant ? 'text-green-400' :
                                    log.color || 'text-cyan-400/80'
                                }`}
                            >
                                <span className={`shrink-0 select-none ${isImportant ? 'text-green-600' : 'text-gray-700'}`}>
                                    {isImportant ? '✓' : isError ? '✗' : isWarning ? '⚠' : '>'}
                                </span>
                                <span className="leading-relaxed break-words opacity-90 flex-1">
                                    {log.text}
                                </span>
                                {isImportant && (
                                    <div className="w-1 h-1 rounded-full bg-green-400 animate-pulse shrink-0 mt-1.5"></div>
                                )}
                            </div>
                        );
                    })}
                    <div className="flex items-center gap-2 text-cyan-500/50">
                        <span className="animate-pulse">_</span>
                        <span className="text-[8px] text-gray-600">PROCESSING</span>
                    </div>
                </div>
            </div>
        </div>

      </div>
    </div>
  );
};

export default AnalysisView;
