
import React, { useRef, useEffect, useState } from 'react';
import { Scan, Cpu, Database, Search, CheckCircle2, Wifi, Zap, Terminal, Copy, Eye, Target, Brain, Sparkles } from 'lucide-react';
import { useToast } from './ToastProvider';
import { FilamentData } from '../types';

interface AnalysisViewProps {
  imageSrc: string;
  logs: {text: string, icon?: any, color?: string}[];
  boxes: {label: string, rect: number[]}[];
  onComplete?: (summary: string) => void; // Callback to pass analysis summary
  detectedData?: Partial<FilamentData>; // Real-time detected data
}

// Constants
const ESTIMATED_TOTAL_OPERATIONS = 15;
const MIN_SUBSTANTIVE_TEXT_LENGTH = 15;

// Helper function to validate and sanitize hex color
function isValidHexColor(hex: string): boolean {
  return /^#[A-Fa-f0-9]{6}$/.test(hex);
}

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

// Helper function to score the quality of a finding
const scoreFinding = (text: string): number => {
  const lowerText = text.toLowerCase();
  let score = 0;
  
  // High-value content - specific data extractions
  if (lowerText.includes('detected brand:') || lowerText.includes('detected material:')) score += 10;
  if (lowerText.includes('detected color name:') || lowerText.includes('detected color:')) score += 9;
  if (lowerText.includes('hex code:') || /#[0-9a-fA-F]{6}/.test(text)) score += 8;
  if (lowerText.includes('temperature range:') || /\d+[-–]\d+°?c/i.test(text)) score += 8;
  if (lowerText.includes('detected diameter') || lowerText.includes('detected weight')) score += 7;
  if (lowerText.includes('detected feature:') || lowerText.includes('texture')) score += 6;
  
  // INCREASED penalties for process metadata (not actual findings)
  if (lowerText.includes('search results for')) score -= 12; // These are process descriptions, not findings
  if (lowerText.includes('search results confirm') || lowerText.includes('search results also')) score -= 8;
  if (lowerText.includes('confirming')) score -= 10; // Process step, not a finding
  if (lowerText.includes('performing') || lowerText.includes('initiating') || lowerText.includes('conducting')) score -= 10;
  if (lowerText.includes('search for') && !lowerText.includes('results')) score -= 8;
  if (lowerText.includes('identifying potential alternatives')) score -= 15;
  if (lowerText.includes('found manufacturer') || lowerText.includes('other brands offering')) score -= 12;
  
  // Slight boost for confirmations that include actual data
  if (lowerText.includes('confirm') && (/#[0-9a-fA-F]{6}/.test(text) || /\d+[-–]\d+/.test(text))) score += 2;
  
  // Length bonus (but not too long - likely verbose process descriptions)
  if (text.length > 40 && text.length < 120) score += 2;
  if (text.length > 150) score -= 5; // Very likely process metadata
  
  return Math.max(0, score);
};

// Helper function to check if a log entry is a key finding
const isKeyFinding = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  
  // Must contain one of these action words OR specific data patterns
  const hasActionWord = lowerText.includes('detected') || 
                        lowerText.includes('found') || 
                        lowerText.includes('identified') || 
                        lowerText.includes('extracted') ||
                        lowerText.includes('hex code');
  
  // Also match specific data patterns (brand, material, color, temps, etc.)
  const hasDataPattern = /(?:brand|material|color|nozzle|bed|temp|weight|diameter|spool|feature)[\s:]+/i.test(text);
  
  // Skip generic progress messages
  const isGenericMessage = lowerText.includes('scanning') || 
                           lowerText.includes('analyzing') || 
                           lowerText.includes('initializing') ||
                           lowerText.includes('initiating') ||
                           lowerText.includes('performing') ||
                           lowerText.includes('validating') ||
                           lowerText.includes('identifying potential') ||
                           lowerText.includes('finalizing');
  
  // Must be substantive and have a positive score
  const isSubstantive = text.length > MIN_SUBSTANTIVE_TEXT_LENGTH;
  const hasValue = scoreFinding(text) > 3;
  
  return isSubstantive && (hasActionWord || hasDataPattern) && !isGenericMessage && hasValue;
};

const AnalysisView: React.FC<AnalysisViewProps> = ({ imageSrc, logs, boxes, onComplete, detectedData }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { success } = useToast();
  const [processingStage, setProcessingStage] = useState<string>('Initializing');
  const [keySummary, setKeySummary] = useState<string[]>([]); // Track key findings
  const processedLogsCount = useRef(0); // Track how many logs we've processed

  useEffect(() => {
      if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
  }, [logs]);

  // Update processing stage based on log content
  useEffect(() => {
    setProcessingStage(detectProcessingStage(logs));
  }, [logs]);

  // Extract key findings from logs - accumulate and score
  useEffect(() => {
    // Only process new logs
    if (logs.length <= processedLogsCount.current) return;
    
    const newFindings: string[] = [];
    
    // Process only new logs since last check
    for (let i = processedLogsCount.current; i < logs.length; i++) {
      const log = logs[i];
      if (isKeyFinding(log.text)) {
        newFindings.push(log.text);
      }
    }
    
    processedLogsCount.current = logs.length;
    
    if (newFindings.length > 0) {
      setKeySummary(prev => {
        // Accumulate findings, don't replace
        const allFindings = [...prev, ...newFindings];
        
        // Remove duplicates
        const uniqueFindings = Array.from(new Set(allFindings));
        
        // Score and sort all findings
        const scoredFindings = uniqueFindings.map(finding => ({
          text: finding,
          score: scoreFinding(finding)
        }));
        
        // Keep top 8 findings sorted by score
        return scoredFindings
          .sort((a, b) => b.score - a.score)
          .slice(0, 8)
          .map(f => f.text);
      });
    }
  }, [logs.length]); // Only trigger when new logs arrive
  
  // Pass summary to parent when analysis completes
  useEffect(() => {
    if (onComplete && processingStage === 'Complete' && keySummary.length > 0) {
      onComplete(keySummary.join('. '));
    }
  }, [processingStage, keySummary, onComplete]);

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
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col overflow-auto">
      
      {/* Background Image with Overlay */}
      <div className="fixed inset-0 z-0">
        <img src={imageSrc} className="w-full h-full object-cover opacity-20 blur-sm scale-110" alt="Scanning" />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950 via-gray-950/90 to-gray-950"></div>
      </div>

      {/* Main Content - Scrollable */}
      <div className="relative z-10 flex flex-col min-h-full p-4 md:p-6 space-y-4">
        
        {/* Compact Header */}
        <div className="flex justify-between items-center flex-wrap gap-2">
           <div>
             <h2 className="text-xl md:text-2xl font-black tracking-wide text-cyan-500">ANALYZING</h2>
             <p className="text-[10px] md:text-xs font-mono text-cyan-700">GEMINI VISION</p>
           </div>
           <div className="text-right">
             <div className="flex items-center gap-2 justify-end">
               <div className="text-cyan-400 animate-pulse">
                 {getStageIcon()}
               </div>
               <div className="text-sm md:text-xl font-bold font-mono text-white">
                  {processingStage.toUpperCase()}
               </div>
             </div>
             <div className="text-[10px] md:text-xs text-cyan-600 font-bold mt-0.5">
               {logs.length} ops • {boxes.length} regions
             </div>
           </div>
        </div>

        {/* Image Preview - Compact */}
        <div className="relative w-full max-w-md mx-auto aspect-square border-2 border-cyan-500/30 rounded-lg overflow-hidden shadow-xl bg-black/50">
            <img src={imageSrc} className="w-full h-full object-cover" alt="Target" />
            
            {/* Simplified scan line */}
            <div className="scan-line"></div>
            
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400"></div>
            <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400"></div>
            <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400"></div>
            <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400"></div>

            {/* Progress Badge */}
            {logs.length > 0 && (
              <div className="absolute top-2 right-2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-mono text-cyan-400 border border-cyan-500/50">
                {Math.min(100, Math.floor((logs.length / ESTIMATED_TOTAL_OPERATIONS) * 100))}%
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

        {/* Live Detected Data Panel - Simplified and Compact */}
        {detectedData && Object.keys(detectedData).length > 0 && (
          <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Zap size={12} className="text-green-400" />
              <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-green-400">Detected</h3>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {detectedData.brand && (
                <div className="bg-black/40 rounded px-2 py-1">
                  <div className="text-[9px] text-gray-500 uppercase">Brand</div>
                  <div className="text-green-300 font-medium truncate">{detectedData.brand}</div>
                </div>
              )}
              {detectedData.material && (
                <div className="bg-black/40 rounded px-2 py-1">
                  <div className="text-[9px] text-gray-500 uppercase">Material</div>
                  <div className="text-green-300 font-medium truncate">{detectedData.material}</div>
                </div>
              )}
              {detectedData.colorName && (
                <div className="bg-black/40 rounded px-2 py-1">
                  <div className="text-[9px] text-gray-500 uppercase">Color</div>
                  <div className="text-green-300 font-medium flex items-center gap-1">
                    {detectedData.colorHex && isValidHexColor(detectedData.colorHex) && (
                      <div className="w-3 h-3 rounded-sm border border-white/20 shrink-0" style={{backgroundColor: detectedData.colorHex}}></div>
                    )}
                    <span className="truncate">{detectedData.colorName}</span>
                  </div>
                </div>
              )}
              {detectedData.minTemp && detectedData.maxTemp && (
                <div className="bg-black/40 rounded px-2 py-1">
                  <div className="text-[9px] text-gray-500 uppercase">Nozzle</div>
                  <div className="text-green-300 font-medium">{detectedData.minTemp}-{detectedData.maxTemp}°C</div>
                </div>
              )}
              {detectedData.bedTempMin && detectedData.bedTempMax && (
                <div className="bg-black/40 rounded px-2 py-1">
                  <div className="text-[9px] text-gray-500 uppercase">Bed</div>
                  <div className="text-green-300 font-medium">{detectedData.bedTempMin}-{detectedData.bedTempMax}°C</div>
                </div>
              )}
              {detectedData.weight && (
                <div className="bg-black/40 rounded px-2 py-1">
                  <div className="text-[9px] text-gray-500 uppercase">Weight</div>
                  <div className="text-green-300 font-medium">{detectedData.weight}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Key Findings Summary - Shows best findings */}
        {keySummary.length > 0 && (
          <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-700/50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-cyan-400" />
              <h3 className="text-[10px] md:text-xs font-bold uppercase tracking-wide text-cyan-400">Key Findings</h3>
              <span className="ml-auto text-[9px] text-cyan-600">{keySummary.length}</span>
            </div>
            <div className="space-y-1">
              {keySummary.slice(0, 5).map((finding, i) => (
                <div key={i} className="text-[10px] md:text-xs text-gray-300 flex items-start gap-1.5">
                  <span className="text-cyan-500 shrink-0 text-xs">•</span>
                  <span className="leading-relaxed">{finding}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Terminal Output - Compact and Scrollable */}
        <div className="bg-black/90 border border-gray-800 rounded-lg p-3 font-mono text-xs overflow-hidden shadow-xl flex flex-col" style={{minHeight: '200px', maxHeight: '300px'}}>
           <div className="flex items-center justify-between border-b border-gray-800 pb-2 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <span className="text-cyan-500 font-bold text-[10px] md:text-xs flex items-center gap-1.5">
                    <Terminal size={10} /> LOG
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 text-[9px] md:text-[10px]">{logs.length}</span>
                <button onClick={handleCopy} className="text-gray-400 hover:text-white transition-colors p-1 hover:bg-gray-800 rounded" title="Copy">
                    <Copy size={12} />
                </button>
              </div>
           </div>
           <div ref={scrollRef} className="flex flex-col flex-1 overflow-y-auto custom-scrollbar">
               {logs.length === 0 && (
                   <div className="text-gray-600 italic py-2 text-[10px]">
                     Waiting...
                   </div>
               )}
               {logs.map((log, i) => {
                   const color = log.color || 'text-cyan-400';
                   let icon = null;
                   const text = log.text.toLowerCase();
                   if (text.includes('detect') || text.includes('found')) {
                     icon = <Target size={8} className="text-green-400" />;
                   } else if (text.includes('search') || text.includes('web')) {
                     icon = <Search size={8} className="text-blue-400" />;
                   } else if (text.includes('validat') || text.includes('confirm')) {
                     icon = <CheckCircle2 size={8} className="text-green-400" />;
                   } else if (text.includes('scan') || text.includes('analyz')) {
                     icon = <Eye size={8} className="text-yellow-400" />;
                   }
                   
                   return (
                       <div key={i} className="flex items-start gap-1.5 py-1 border-b border-white/5 last:border-0">
                           <span className="text-gray-600 shrink-0 text-[10px]">[{new Date().toLocaleTimeString().split(' ')[0]}]</span>
                           {icon && <span className="shrink-0">{icon}</span>}
                           <span className={`${color} opacity-90 break-words flex-1 text-[10px] md:text-xs leading-relaxed`}>{log.text}</span>
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
