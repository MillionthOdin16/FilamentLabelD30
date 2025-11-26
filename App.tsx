
import React, { useState, useEffect, useRef } from 'react';
import { Camera, Printer, RotateCcw, PenTool, Loader2, Info, Bluetooth, Ruler, History, ArrowRight, Battery, BatteryFull, BatteryLow, BatteryMedium, ExternalLink, AlertTriangle, Eye, X, Download, Upload, Image as ImageIcon, Edit3, CheckCircle2, Sparkles, Package } from 'lucide-react';
import { AppState, FilamentData, LABEL_PRESETS, LabelPreset, PrintSettings, HistoryEntry, LabelTheme, PrinterInfo } from './types';
import { analyzeFilamentImage } from './services/geminiService';
import { connectPrinter, printLabel, getBatteryLevel, getDeviceDetails, checkPrinterStatus } from './services/printerService';
import CameraCapture from './components/CameraCapture';
import LabelEditor from './components/LabelEditor';
import LabelCanvas from './components/LabelCanvas';
import AnalysisView from './components/AnalysisView';
import PrinterTools from './components/PrinterTools';
import PrintStatus, { PrintStep } from './components/PrintStatus';
import SuccessView from './components/SuccessView';
import FilamentLibrary from './components/FilamentLibrary';

const DEFAULT_DATA: FilamentData = {
  brand: 'GENERIC',
  material: 'PLA',
  colorName: 'White',
  colorHex: '#FFFFFF',
  minTemp: 200,
  maxTemp: 220,
  bedTempMin: 50,
  bedTempMax: 60,
  weight: '1kg',
  notes: '',
  hygroscopy: 'low',
  source: 'Manual Entry'
};

const DEFAULT_SETTINGS: PrintSettings = {
  copies: 1,
  invert: false,
  includeQr: false,
  density: 50,
  theme: LabelTheme.SWATCH,
  marginMm: 2,
  visibleFields: { brand: true, weight: true, notes: true, date: false, source: false }
};

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.HOME);
  const [filamentData, setFilamentData] = useState<FilamentData>(DEFAULT_DATA);
  const [printSettings, setPrintSettings] = useState<PrintSettings>(DEFAULT_SETTINGS);
  const [selectedLabel, setSelectedLabel] = useState<LabelPreset>(LABEL_PRESETS[0]); // Default to 12x40mm (Index 0)
  const [previewCanvas, setPreviewCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string>('');
  const [printStep, setPrintStep] = useState<PrintStep>('idle');
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);
  const [printerInfo, setPrinterInfo] = useState<Partial<PrinterInfo> | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isIframe, setIsIframe] = useState(false);
  const [showIframeWarning, setShowIframeWarning] = useState(true);
  const [showSuccess, setShowSuccess] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load History
    const saved = localStorage.getItem('filament_history');
    if (saved) {
      try { setHistory(JSON.parse(saved)); } catch (e) { console.error("History error", e); }
    }

    // Check environment
    try {
      if (window.self !== window.top) {
        setIsIframe(true);
      }
    } catch (e) {
      setIsIframe(true);
    }
  }, []);

  const saveToHistory = (data: FilamentData) => {
    const newEntry: HistoryEntry = { id: Date.now().toString(), timestamp: Date.now(), data: data };
    const newHistory = [newEntry, ...history].slice(0, 20);
    setHistory(newHistory);
    localStorage.setItem('filament_history', JSON.stringify(newHistory));
  };

  const deleteFromHistory = (id: string) => {
    const newHistory = history.filter(entry => entry.id !== id);
    setHistory(newHistory);
    localStorage.setItem('filament_history', JSON.stringify(newHistory));
  };

  const loadFromHistory = (entry: HistoryEntry) => {
    setFilamentData({ ...entry.data, source: 'History Record', referenceUrl: undefined });
    setState(AppState.EDITING);
  };

  const handleStartCapture = () => { setState(AppState.CAMERA); setErrorMsg(null); };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        handleImageCaptured(result);
      };
      reader.readAsDataURL(file);
      // Reset input so same file can be selected again
      event.target.value = '';
    }
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleManualEntry = () => {
    setFilamentData(DEFAULT_DATA);
    setErrorMsg(null);
    setState(AppState.EDITING);
  };

  const handleImageCaptured = async (imageSrc: string) => {
    setCapturedImage(imageSrc);
    setState(AppState.ANALYZING);
    const minWaitPromise = new Promise(resolve => setTimeout(resolve, 3500));
    try {
      const [data, _] = await Promise.all([analyzeFilamentImage(imageSrc), minWaitPromise]);
      const enrichedData = { ...data, source: data.source || 'Gemini 2.5 Flash' }; 
      setFilamentData(enrichedData);
      saveToHistory(enrichedData);
      setState(AppState.EDITING);
    } catch (err: any) {
      await minWaitPromise;
      setErrorMsg("Could not analyze image automatically. Please enter details manually.");
      setFilamentData(DEFAULT_DATA);
      setState(AppState.EDITING); 
    }
  };

  const handleDownloadPng = () => {
    if (previewCanvas) {
      const link = document.createElement('a');
      link.download = `FilamentLabel-${filamentData.material}-${Date.now()}.png`;
      link.href = previewCanvas.toDataURL('image/png');
      link.click();
    }
  };

  const handlePrint = async () => {
    if (!previewCanvas) return;
    setIsProcessing(true);
    setPrintStep('connecting');
    setStatusMsg('Searching for printer...');
    setErrorMsg(null);
    setShowSuccess(false);
    
    try {
      const device = await connectPrinter();
      
      // Fetch details immediately
      setPrintStep('fetching');
      setStatusMsg('Reading device information...');
      const [battery, details] = await Promise.all([
          getBatteryLevel(device),
          getDeviceDetails(device)
      ]);
      
      if (battery !== null) setBatteryLevel(battery);
      if (details) setPrinterInfo(details);

      setPrintStep('checking');
      setStatusMsg('Verifying printer status...');
      const status = await checkPrinterStatus(device);
      if (status === 'paper_out') throw new Error("Printer reports: Out of Paper");
      if (status === 'cover_open') throw new Error("Printer reports: Cover Open");

      setPrintStep('printing');
      setStatusMsg(printSettings.copies > 1 
        ? `Sending ${printSettings.copies} labels to printer...`
        : 'Sending label to printer...'
      );
      await printLabel(device, previewCanvas, printSettings);
      
      setPrintStep('success');
      setStatusMsg('Print complete!');
      setShowSuccess(true);
      setState(AppState.PRINTING_SUCCESS);
      
      // Save if new
      if (history.length === 0 || JSON.stringify(history[0].data) !== JSON.stringify(filamentData)) {
         saveToHistory(filamentData);
      }
      
      // Reset print step after delay
      setTimeout(() => {
        setPrintStep('idle');
        setStatusMsg('');
      }, 3000);
      
    } catch (err: any) {
      console.error("Print Error:", err);
      setPrintStep('error');
      
      // Catch Permissions Policy / Security Errors
      const msg = err.message?.toLowerCase() || '';
      const isSecurityError = err.name === 'SecurityError' || 
                             msg.includes('permissions policy') || 
                             msg.includes('disallowed') ||
                             msg.includes('bluetooth');

      if (isSecurityError) {
        setErrorMsg("BLOCKED: Bluetooth access is restricted in this view. You must open the app in a new tab to print.");
        setStatusMsg("Bluetooth blocked by browser");
      } else if (err.name === 'NotFoundError') {
        setPrintStep('idle');
        setStatusMsg('');
      } else {
        setErrorMsg(err.message || "Printing failed. Check connection.");
        setStatusMsg(err.message || "Print failed");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrintMore = () => {
    setShowSuccess(false);
    setPrintStep('idle');
    // Stay in editing state, user can adjust copies and print again
  };

  const resetFlow = () => {
    setState(AppState.HOME);
    setFilamentData(DEFAULT_DATA);
    setPrintSettings(DEFAULT_SETTINGS);
    setErrorMsg(null);
    setStatusMsg('');
    setPrintStep('idle');
    setShowSuccess(false);
    setBatteryLevel(null);
    setPrinterInfo(null);
    setCapturedImage(null);
  };

  const renderBattery = () => {
      if (batteryLevel === null) return null;
      let Icon = Battery;
      let color = 'text-gray-400';
      if (batteryLevel > 75) { Icon = BatteryFull; color = 'text-green-400'; }
      else if (batteryLevel > 30) { Icon = BatteryMedium; color = 'text-yellow-400'; }
      else { Icon = BatteryLow; color = 'text-red-400'; }
      return (
          <div className={`flex items-center gap-1 ${color} text-xs font-mono border border-gray-700 px-2 py-1 rounded bg-gray-800`}>
              <Icon size={14} /> <span>{batteryLevel}%</span>
          </div>
      );
  };

  const isHttp = typeof window !== 'undefined' && (window.location.protocol === 'http:' || window.location.protocol === 'https:');

  // Helper to scroll to selected label
  const labelListRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
     if (labelListRef.current && state === AppState.EDITING) {
         // Optionally scroll selected into view
         // const selectedEl = document.getElementById(`label-${selectedLabel.id}`);
         // selectedEl?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
     }
  }, [selectedLabel, state]);

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-sans selection:bg-cyan-500/30">
      <header className="p-6 flex justify-between items-center bg-gray-900 border-b border-gray-800 sticky top-0 z-40 shadow-md backdrop-blur-sm bg-opacity-90 h-[88px]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-400 to-blue-600 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-900/20">
            <span className="font-mono font-bold text-xl text-white">Fi</span>
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight leading-none">Filament ID</h1>
            <div className="flex items-center gap-1">
                 <p className="text-[10px] text-gray-500 font-mono">PRO LABELER</p>
                 {printerInfo?.model && (
                    <span className="text-[9px] bg-cyan-900/40 text-cyan-400 px-1 rounded border border-cyan-800/50">
                        {printerInfo.model}
                    </span>
                 )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            {renderBattery()}
            {state !== AppState.HOME && (
            <button onClick={resetFlow} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white">
                <RotateCcw size={20} />
            </button>
            )}
        </div>
      </header>

      <main className="max-w-xl mx-auto p-6 pb-40">
        {/* Iframe Warning */}
        {isIframe && showIframeWarning && state === AppState.HOME && (
          <div className="mb-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-xl flex items-start gap-3 relative animate-fade-in-up">
            <AlertTriangle className="text-yellow-500 shrink-0" size={20} />
            <div className="flex-1">
              <h3 className="text-sm font-bold text-yellow-500">Preview Mode Detected</h3>
              <p className="text-xs text-yellow-200/70 mt-1">
                Bluetooth printing requires a full window. If printing fails, try opening the app directly.
              </p>
              {isHttp && (
                <a 
                  href={window.location.href}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 text-xs bg-yellow-700/30 hover:bg-yellow-700/50 text-yellow-400 px-3 py-1.5 rounded-md transition-colors font-bold flex items-center gap-2 w-fit inline-flex"
                >
                  Open Full App <ExternalLink size={12} />
                </a>
              )}
            </div>
            <button 
                onClick={() => setShowIframeWarning(false)} 
                className="text-yellow-700 hover:text-yellow-500 p-1 rounded transition-colors"
            >
                <X size={16} /> 
            </button>
          </div>
        )}

        {state === AppState.HOME && (
          <div className="flex flex-col items-center space-y-12 mt-4 animate-fade-in">
            <div className="text-center space-y-6">
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 tracking-tight">
                Scan.<br/>Label.<br/>Print.
              </h2>
              <p className="text-gray-400 max-w-xs mx-auto text-lg">
                The ultimate AI-powered labeling tool for your 3D printing filament.
              </p>
              
              <div className="flex gap-4 items-center justify-center w-full">
                  <button 
                    onClick={handleStartCapture}
                    className="group relative flex items-center justify-center w-48 h-48 rounded-3xl bg-gray-900 border border-gray-800 hover:border-cyan-500/50 transition-all duration-300 shadow-2xl hover:shadow-cyan-900/20"
                  >
                    <div className="absolute inset-0 rounded-3xl bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-all blur-xl"></div>
                    <div className="flex flex-col items-center space-y-3 relative z-10">
                      <Camera size={40} className="text-cyan-400 group-hover:scale-110 transition-transform duration-300" />
                      <span className="font-bold tracking-widest text-xs text-gray-300 group-hover:text-white">CAMERA</span>
                    </div>
                  </button>

                  <div className="flex flex-col items-center justify-center gap-2">
                      <input 
                         type="file" 
                         ref={fileInputRef} 
                         accept="image/*" 
                         className="hidden" 
                         onChange={handleFileUpload}
                      />
                      <button 
                        onClick={triggerFileUpload}
                        className="group w-24 h-24 rounded-2xl bg-gray-900 border border-gray-800 hover:border-gray-600 transition-all duration-300 flex flex-col items-center justify-center gap-2"
                      >
                         <ImageIcon size={24} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                         <span className="text-[10px] font-bold text-gray-500 uppercase">Gallery</span>
                      </button>
                      <button 
                        onClick={handleManualEntry}
                        className="group w-24 h-16 rounded-2xl bg-gray-900 border border-gray-800 hover:border-cyan-600 transition-all duration-300 flex flex-col items-center justify-center gap-1"
                      >
                         <Edit3 size={18} className="text-gray-500 group-hover:text-cyan-400 transition-colors" />
                         <span className="text-[10px] font-bold text-gray-500 group-hover:text-cyan-400 uppercase">Manual</span>
                      </button>
                  </div>
              </div>

            </div>

            {/* Filament Library */}
            {history.length > 0 && (
              <FilamentLibrary
                history={history}
                onSelect={loadFromHistory}
                onDelete={deleteFromHistory}
                maxDisplay={4}
              />
            )}
            
            <div className="text-xs text-gray-600 flex items-center gap-2 pt-8">
               <Bluetooth size={14} /> 
               <span>Supports Phomemo M110, M02, D30, Q30</span>
            </div>
          </div>
        )}

        {state === AppState.CAMERA && <CameraCapture onCapture={handleImageCaptured} onCancel={() => setState(AppState.HOME)} />}
        {state === AppState.ANALYZING && capturedImage && <AnalysisView imageSrc={capturedImage} />}

        {(state === AppState.EDITING || state === AppState.PRINTING_SUCCESS) && (
          <div className="space-y-6 animate-fade-in-up relative">
            
            {/* --- LIVE PREVIEW SECTION (First & Sticky) --- */}
            <section className="sticky top-[88px] z-30 -mx-6 px-6 py-4 bg-gray-950/80 backdrop-blur-md border-b border-gray-800 shadow-2xl flex flex-col items-center gap-2">
                 <div className="flex items-center gap-2 text-cyan-400 absolute top-2 left-6 opacity-80">
                    <Eye size={14} />
                    <span className="text-[10px] font-bold uppercase tracking-wider">Live Proof</span>
                 </div>
                 
                 <div className="p-1 bg-white rounded shadow-2xl mt-4 max-w-full">
                   <LabelCanvas 
                      data={filamentData} settings={printSettings} widthMm={selectedLabel.widthMm} heightMm={selectedLabel.heightMm}
                      onCanvasReady={setPreviewCanvas} scale={0.7}
                   />
                 </div>
                 
                 <div className="text-[10px] text-gray-500 font-mono mt-1">
                   {selectedLabel.widthMm}x{selectedLabel.heightMm}mm • {printSettings.theme}
                 </div>
            </section>

            {/* --- LABEL SIZE SELECTOR --- */}
            <section className="pt-2">
                <div className="flex items-center gap-2 mb-3 text-gray-400 px-1">
                    <Ruler size={16} />
                    <h3 className="text-xs font-bold uppercase tracking-wider">Layout Size</h3>
                </div>
                <div ref={labelListRef} className="flex gap-3 overflow-x-auto pb-4 no-scrollbar snap-x">
                {LABEL_PRESETS.map((preset) => (
                  <button
                    id={`label-${preset.id}`}
                    key={preset.id}
                    onClick={() => setSelectedLabel(preset)}
                    className={`
                      flex-shrink-0 snap-center w-28 p-2 rounded-xl border transition-all duration-200
                      flex flex-col items-center gap-2
                      ${selectedLabel.id === preset.id 
                        ? 'bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-900/20' 
                        : 'bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-800/80'}
                    `}
                  >
                    <div className={`border-2 rounded-sm transition-all ${selectedLabel.id === preset.id ? 'border-cyan-400 bg-cyan-400/20' : 'border-gray-600'}`}
                    style={{ width: `${preset.widthMm / 1.8}px`, height: `${preset.heightMm / 1.8}px` }}></div>
                    <div className="text-center leading-tight">
                      <div className={`text-xs font-bold ${selectedLabel.id === preset.id ? 'text-white' : ''}`}>{preset.name}</div>
                      <div className={`text-[9px] opacity-70 scale-90 ${preset.group === 'D30/Small' ? 'text-cyan-200' : ''}`}>
                         {preset.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </section>

            {/* --- DATA & SETTINGS EDITOR --- */}
            <section>
              <div className="flex items-center gap-2 mb-3 text-cyan-400 px-1">
                 <PenTool size={16} />
                 <h3 className="text-xs font-bold uppercase tracking-wider">Customize</h3>
              </div>
              <LabelEditor 
                data={filamentData} 
                settings={printSettings}
                onChange={setFilamentData}
                onSettingsChange={setPrintSettings}
                onConfirm={() => {}}
                onDownload={handleDownloadPng}
              />
            </section>
            
            <PrinterTools />
          </div>
        )}

        {/* Success View */}
        {showSuccess && state === AppState.PRINTING_SUCCESS && (
          <SuccessView
            data={filamentData}
            copies={printSettings.copies}
            onPrintMore={handlePrintMore}
            onNewLabel={resetFlow}
            onDownload={handleDownloadPng}
          />
        )}
      </main>

      {(state === AppState.EDITING || state === AppState.PRINTING_SUCCESS) && !showSuccess && (
        <div className="fixed bottom-0 left-0 w-full p-6 bg-gradient-to-t from-gray-950 via-gray-950 to-transparent pointer-events-none z-50">
          <div className="max-w-xl mx-auto pointer-events-auto space-y-4">
            {/* Print Status Indicator */}
            {printStep !== 'idle' && (
              <PrintStatus
                step={printStep}
                message={statusMsg}
                copies={printSettings.copies}
              />
            )}

            {/* Error Message */}
            {errorMsg && printStep === 'error' && (
              <div className="bg-red-500/10 border border-red-500/50 text-red-200 p-4 rounded-xl text-sm flex flex-col gap-2 backdrop-blur-md shadow-lg shadow-red-900/20 animate-fade-in-scale">
                <div className="flex items-center gap-2 font-bold">
                   <AlertTriangle size={18} className="shrink-0" />
                   <span>Print Error</span>
                </div>
                <p className="text-red-200/80 leading-relaxed text-xs">
                  {errorMsg}
                </p>
                {(errorMsg.includes("BLOCKED") || errorMsg.includes("new tab")) && isHttp && (
                  <a 
                    href={window.location.href}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider w-fit flex items-center gap-2 shadow-lg transition-all inline-flex"
                  >
                    Open in New Tab <ExternalLink size={14} />
                  </a>
                )}
                <button 
                  onClick={() => { setErrorMsg(null); setPrintStep('idle'); }}
                  className="mt-1 text-red-400 hover:text-red-300 text-xs font-bold self-end"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Print Button */}
            {printStep === 'idle' && !errorMsg && (
              <button
                onClick={handlePrint}
                disabled={isProcessing}
                className={`w-full py-4 rounded-xl shadow-2xl font-bold text-lg flex items-center justify-center gap-3 transition-all transform active:scale-95 glow-cyan
                  ${isProcessing ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500'}
                `}
              >
                <Printer size={24} /> 
                PRINT LABEL 
                {printSettings.copies > 1 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">×{printSettings.copies}</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
