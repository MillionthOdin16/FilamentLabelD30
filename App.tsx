import React, { useState, useEffect, useRef } from 'react';
import { Camera, Printer, RotateCcw, PenTool, Loader2, Info, Bluetooth, Ruler, History, ArrowRight, Battery, BatteryFull, BatteryLow, BatteryMedium, ExternalLink, AlertTriangle, Eye, X, Download, Upload, Image as ImageIcon, Edit3, CheckCircle2, Sparkles, Package, Layout, BarChart3, Layers, PlusCircle, Scan } from 'lucide-react';
import { AppState, FilamentData, LABEL_PRESETS, LabelPreset, PrintSettings, HistoryEntry, LabelTheme, PrinterInfo, PrintJob, LabelTemplate } from './types';
import { analyzeFilamentImage } from './services/geminiService';
import { connectPrinter, printLabel, getBatteryLevel, getDeviceDetails, checkPrinterStatus, addConnectionListener, removeConnectionListener, getConnectedDevice } from './services/printerService';
import CameraCapture from './components/CameraCapture';
import LabelEditor from './components/LabelEditor';
import LabelCanvas from './components/LabelCanvas';
import AnalysisView from './components/AnalysisView';
import PrinterTools from './components/PrinterTools';
import PrintStatus, { PrintStep } from './components/PrintStatus';
import SuccessView from './components/SuccessView';
import FilamentLibrary from './components/FilamentLibrary';
import PrinterStatusModal from './components/PrinterStatusModal';
import BatchGenerator from './components/BatchGenerator';
import AnalyticsDashboard from './components/AnalyticsDashboard';
import TemplateGallery from './components/TemplateGallery';

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
  visibleFields: { brand: true, weight: true, notes: true, date: false, source: false },
  speed: 3,
  labelType: 'gap'
};

type Tab = 'editor' | 'batch' | 'templates' | 'analytics';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(AppState.HOME);
  const [activeTab, setActiveTab] = useState<Tab>('editor');
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
  const [isConnected, setIsConnected] = useState(false);
  const [showPrinterStatus, setShowPrinterStatus] = useState(false);

  // Batch Printing State
  const [batchQueue, setBatchQueue] = useState<PrintJob[]>([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState<number>(-1);
  const [batchCanvas, setBatchCanvas] = useState<HTMLCanvasElement | null>(null);
  const [isBatchPrinting, setIsBatchPrinting] = useState(false);
  const [batchOverrideSize, setBatchOverrideSize] = useState<LabelPreset | null>(null);
  const [sessionSelectedIds, setSessionSelectedIds] = useState<Set<string>>(new Set());
  const [lastBatchQueue, setLastBatchQueue] = useState<PrintJob[] | null>(null);
  const [lastBatchOverrideSizeId, setLastBatchOverrideSizeId] = useState<string | undefined>(undefined);

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

    // Bluetooth Listeners
    const listener = (connected: boolean) => {
      setIsConnected(connected);
      if (connected) {
        // Auto-fetch details if reconnected
        const device = getConnectedDevice();
        if (device) {
           getBatteryLevel(device).then(setBatteryLevel);
           getDeviceDetails(device).then(setPrinterInfo);
        }
      } else {
        setBatteryLevel(null);
      }
    };
    addConnectionListener(listener);

    return () => {
      removeConnectionListener(listener);
    };
  }, []);

  const saveToHistory = (data: FilamentData) => {
    const newEntry: HistoryEntry = { id: Date.now().toString(), timestamp: Date.now(), data: data };
    const newHistory = [newEntry, ...history].slice(0, 50); // Keep last 50
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
    setActiveTab('editor');
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
    performPrint(previewCanvas, printSettings);
  };

  const performPrint = async (canvas: HTMLCanvasElement, settings: PrintSettings, isBatchItem = false) => {
    setIsProcessing(true);
    if (!isBatchItem) {
      setPrintStep('connecting');
      setStatusMsg(isConnected ? 'Using connected printer...' : 'Searching for printer...');
      setErrorMsg(null);
      setShowSuccess(false);
    }

    try {
      const device = await connectPrinter();

      // Only fetch details if we don't have them or it's the first print
      if ((!printerInfo || !isBatchItem) && !isBatchPrinting) {
        if (!isBatchItem) {
          setPrintStep('fetching');
          setStatusMsg('Reading device information...');
        }
        const [battery, details] = await Promise.all([
          getBatteryLevel(device),
          getDeviceDetails(device)
        ]);
        if (battery !== null) setBatteryLevel(battery);
        if (details) setPrinterInfo(details);
      }

      if (!isBatchItem) {
        setPrintStep('checking');
        setStatusMsg('Verifying printer status...');
        const status = await checkPrinterStatus(device);
        if (status === 'paper_out') throw new Error("Printer reports: Out of Paper");
        if (status === 'cover_open') throw new Error("Printer reports: Cover Open");
      }

      if (!isBatchItem) {
        setPrintStep('printing');
        setStatusMsg(settings.copies > 1
          ? `Sending ${settings.copies} labels to printer...`
          : 'Sending label to printer...'
        );
      }

      await printLabel(device, canvas, settings);

      if (!isBatchItem) {
        setPrintStep('success');
        setStatusMsg('Print complete!');
        setShowSuccess(true);
        setState(AppState.PRINTING_SUCCESS);

        // Save if new and in editor mode
        if (activeTab === 'editor') {
          if (history.length === 0 || JSON.stringify(history[0].data) !== JSON.stringify(filamentData)) {
            saveToHistory(filamentData);
          }
        }

        setTimeout(() => {
          setPrintStep('idle');
          setStatusMsg('');
        }, 3000);
      }

    } catch (err: any) {
      console.error("Print Error:", err);
      if (!isBatchItem) setPrintStep('error');

      const msg = err.message?.toLowerCase() || '';
      const isSecurityError = err.name === 'SecurityError' ||
        msg.includes('permissions policy') ||
        msg.includes('disallowed') ||
        msg.includes('bluetooth');

      if (isSecurityError) {
        setErrorMsg("BLOCKED: Bluetooth access is restricted in this view. You must open the app in a new tab to print.");
        setStatusMsg("Bluetooth blocked by browser");
      } else if (err.name === 'NotFoundError') {
        if (!isBatchItem) {
          setPrintStep('idle');
          setStatusMsg('');
        }
      } else {
        setErrorMsg(err.message || "Printing failed. Check connection.");
        setStatusMsg(err.message || "Print failed");
        // Re-throw for batch handler
        if (isBatchItem) throw err;
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Batch Processing Effect
  useEffect(() => {
    const processBatchItem = async () => {
      // We need both the index to be valid AND the canvas to be ready (not null)
      // We also check if we are actually in batch printing mode
      if (isBatchPrinting && currentBatchIndex >= 0 && currentBatchIndex < batchQueue.length && batchCanvas) {

        const job = batchQueue[currentBatchIndex];

        // Small delay to ensure canvas is painted
        await new Promise(r => setTimeout(r, 500));

        try {
          // Update status for the user
          setPrintStep('printing');
          setStatusMsg(`Printing ${currentBatchIndex + 1}/${batchQueue.length}: ${job.label.brand} ${job.label.material}`);

          // Print!
          await performPrint(batchCanvas, job.settings, true);

          // Move to next or finish
          if (currentBatchIndex < batchQueue.length - 1) {
            // Reset canvas to force a re-render for the next item
            setBatchCanvas(null);
            setCurrentBatchIndex(prev => prev + 1);
          } else {
            // Done
            setIsBatchPrinting(false);
            setPrintStep('success');
            setStatusMsg('Batch Complete!');
            setShowSuccess(true);
            setBatchQueue([]);
            setCurrentBatchIndex(-1);
          }
        } catch (e: any) {
          console.error("Batch failed", e);
          setIsBatchPrinting(false);
          setErrorMsg(`Batch failed at item ${currentBatchIndex + 1}: ${e.message}`);
          setPrintStep('error');
        }
      }
    };

    processBatchItem();
  }, [currentBatchIndex, batchCanvas, isBatchPrinting, batchQueue]);

  const handleBatchPrint = async (jobs: PrintJob[], overrideSizeId?: string) => {
    if (jobs.length === 0) return;

    // Save for retry capability
    setLastBatchQueue(jobs);
    setLastBatchOverrideSizeId(overrideSizeId);

    if (overrideSizeId && overrideSizeId !== 'default') {
        const preset = LABEL_PRESETS.find(p => p.id === overrideSizeId);
        setBatchOverrideSize(preset || null);
    } else {
        setBatchOverrideSize(null);
    }

    setBatchQueue(jobs);
    setCurrentBatchIndex(0);
    setIsBatchPrinting(true);
    setPrintStep('connecting'); // Initial status
    setStatusMsg('Starting batch print...');
  };

  const handleReprintLastBatch = () => {
      if (lastBatchQueue) {
          handleBatchPrint(lastBatchQueue, lastBatchOverrideSizeId);
      }
  };

  const handleAddToBatch = () => {
      // Add current filament to batch history locally but don't clear form
      // Manual saveToHistory logic to get the ID
      const historyId = Date.now().toString();
      const newEntry: HistoryEntry = { id: historyId, timestamp: Date.now(), data: filamentData };
      const newHistory = [newEntry, ...history].slice(0, 50); // Keep last 50
      setHistory(newHistory);
      localStorage.setItem('filament_history', JSON.stringify(newHistory));

      // Auto-select this item for the next batch
      setSessionSelectedIds(prev => new Set(prev).add(historyId));

      // Also, visually feedback
      setStatusMsg("Added to Batch History");
      setPrintStep('success'); // Re-use success visual temporarily
      setTimeout(() => {
          setPrintStep('idle');
          setStatusMsg('');
      }, 1500);
  };

  const handleSelectTemplate = (template: LabelTemplate) => {
    const newSettings = { ...printSettings };

    // Map template category/tags to themes
    if (template.category === 'minimal') newSettings.theme = LabelTheme.MINIMAL;
    else if (template.category === 'detailed') newSettings.theme = LabelTheme.TECHNICAL;
    else if (template.category === 'brand') newSettings.theme = LabelTheme.BOLD;
    else if (template.category === 'grid') newSettings.theme = LabelTheme.MODERN;
    else if (template.tags.includes('maintenance')) newSettings.theme = LabelTheme.MAINTENANCE;
    else newSettings.theme = LabelTheme.SWATCH;

    setPrintSettings(newSettings);
    setActiveTab('editor');

    // Show a temporary success message
    setPrintStep('success');
    setStatusMsg(`Applied template: ${template.name}`);
    setTimeout(() => {
      setPrintStep('idle');
      setStatusMsg('');
    }, 2000);
  };

  const handlePrintMore = () => {
    setShowSuccess(false);
    setPrintStep('idle');
  };

  const handleScanAnother = () => {
    setShowSuccess(false);
    setPrintStep('idle');
    handleStartCapture();
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
    setActiveTab('editor');
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

  const labelListRef = useRef<HTMLDivElement>(null);

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
              {isConnected && (
                  <span className="text-[9px] bg-green-900/40 text-green-400 px-1 rounded border border-green-800/50 flex items-center gap-1">
                      <Bluetooth size={8} /> Connected
                  </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPrinterStatus(true)}
            className="hover:scale-105 transition-transform"
          >
            {renderBattery()}
          </button>
          {state !== AppState.HOME && (
            <button onClick={resetFlow} className="p-2 bg-gray-800 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white">
              <RotateCcw size={20} />
            </button>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      {state !== AppState.HOME && state !== AppState.CAMERA && state !== AppState.ANALYZING && (
        <div className="sticky top-[88px] z-30 bg-gray-950 border-b border-gray-800 px-4">
          <div className="flex gap-4 overflow-x-auto no-scrollbar max-w-xl mx-auto">
            {[
              { id: 'editor', label: 'Editor', icon: Edit3 },
              { id: 'batch', label: 'Batch', icon: Layers },
              { id: 'templates', label: 'Templates', icon: Layout },
              { id: 'analytics', label: 'Analytics', icon: BarChart3 },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`
                              flex items-center gap-2 py-3 px-1 border-b-2 transition-colors whitespace-nowrap relative
                              ${activeTab === tab.id
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-gray-500 hover:text-gray-300'}
                          `}
              >
                <tab.icon size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">{tab.label}</span>
                {tab.id === 'batch' && sessionSelectedIds.size > 0 && (
                    <span className="absolute top-1 right-[-4px] bg-cyan-600 text-white text-[9px] w-4 h-4 flex items-center justify-center rounded-full font-bold">
                        {sessionSelectedIds.size}
                    </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-xl mx-auto p-6 pb-40">
        <PrinterStatusModal
            isOpen={showPrinterStatus}
            onClose={() => setShowPrinterStatus(false)}
            printerInfo={printerInfo}
            batteryLevel={batteryLevel}
            isConnected={isConnected}
        />

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
          <div className="flex flex-col space-y-6 mt-2 animate-fade-in">

            {/* Status Card */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-4 flex items-center justify-between shadow-lg">
                <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        {isConnected ? (
                            <span className="flex items-center gap-2 text-green-400"><CheckCircle2 size={16} /> Printer Ready</span>
                        ) : (
                            <span className="flex items-center gap-2 text-gray-400"><Printer size={16} /> Printer Disconnected</span>
                        )}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                        {printerInfo?.model || 'No device connected'} {batteryLevel !== null && `• ${batteryLevel}% Battery`}
                    </p>
                </div>
                <button
                    onClick={() => { if (!isConnected) connectPrinter().catch(console.error); }}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${isConnected ? 'bg-green-900/20 text-green-400 cursor-default' : 'bg-cyan-600 hover:bg-cyan-500 text-white'}`}
                >
                    {isConnected ? 'Connected' : 'Connect'}
                </button>
            </div>

            {/* Quick Actions Grid */}
            <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleStartCapture}
                  className="col-span-2 group relative flex items-center justify-between p-6 rounded-3xl bg-gradient-to-br from-gray-900 to-gray-800 border border-gray-800 hover:border-cyan-500/50 transition-all duration-300 shadow-xl overflow-hidden"
                >
                  <div className="absolute inset-0 bg-cyan-500/5 group-hover:bg-cyan-500/10 transition-all"></div>
                  <div className="relative z-10 flex flex-col items-start gap-1">
                    <span className="text-2xl font-black text-white">Scan Label</span>
                    <span className="text-xs text-gray-400">Identify filament via camera</span>
                  </div>
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Camera size={24} className="text-cyan-400" />
                  </div>
                </button>

                <button
                    onClick={handleManualEntry}
                    className="p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:bg-gray-800 transition-all flex flex-col gap-2 items-start"
                >
                    <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                        <Edit3 size={16} className="text-cyan-400" />
                    </div>
                    <span className="font-bold text-sm text-gray-200">Manual Entry</span>
                </button>

                <div className="relative">
                    <input
                        type="file"
                        ref={fileInputRef}
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileUpload}
                    />
                    <button
                        onClick={triggerFileUpload}
                        className="w-full h-full p-4 rounded-2xl bg-gray-900 border border-gray-800 hover:bg-gray-800 transition-all flex flex-col gap-2 items-start"
                    >
                        <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                            <ImageIcon size={16} className="text-purple-400" />
                        </div>
                        <span className="font-bold text-sm text-gray-200">From Gallery</span>
                    </button>
                </div>
            </div>

            {/* Recent Activity */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">Recent Labels</h3>
                    {history.length > 0 && (
                        <button onClick={() => { setActiveTab('batch'); setState(AppState.EDITING); }} className="text-xs text-cyan-400 hover:text-cyan-300">
                            View All
                        </button>
                    )}
                </div>

                {history.length > 0 ? (
                    <FilamentLibrary
                        history={history}
                        onSelect={loadFromHistory}
                        onDelete={deleteFromHistory}
                        maxDisplay={3}
                    />
                ) : (
                    <div className="text-center py-8 bg-gray-900/50 rounded-2xl border border-dashed border-gray-800">
                        <p className="text-gray-500 text-xs">No recent labels found.</p>
                        <p className="text-gray-600 text-[10px] mt-1">Scan your first spool to get started!</p>
                    </div>
                )}
            </div>
          </div>
        )}

        {state === AppState.CAMERA && <CameraCapture onCapture={handleImageCaptured} onCancel={() => setState(AppState.HOME)} />}
        {state === AppState.ANALYZING && capturedImage && <AnalysisView imageSrc={capturedImage} />}

        {(state === AppState.EDITING || state === AppState.PRINTING_SUCCESS) && (
          <div className="space-y-6 animate-fade-in-up relative">

            {/* --- EDITOR TAB --- */}
            {activeTab === 'editor' && (
              <>
                {/* --- LIVE PREVIEW SECTION (First & Sticky) --- */}
                <section className="flex flex-col items-center gap-2 sticky top-[136px] z-20 bg-gray-950 py-4 -mx-6 px-6 border-b border-gray-800 shadow-2xl mb-4 transition-all duration-300">
                  <div className="p-1 bg-white rounded shadow-2xl mt-4 max-w-full">
                    <LabelCanvas
                      data={filamentData} settings={printSettings} widthMm={selectedLabel.widthMm} heightMm={selectedLabel.heightMm}
                      onCanvasReady={setPreviewCanvas}
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
                  <div ref={labelListRef} className="flex flex-wrap justify-center gap-3 pb-4 px-1">
                    {LABEL_PRESETS.map((preset) => (
                      <button
                        id={`label-${preset.id}`}
                        key={preset.id}
                        onClick={() => setSelectedLabel(preset)}
                        className={`
                            w-[30%] min-w-[100px] p-2 rounded-xl border transition-all duration-200
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
                    onConfirm={() => { }}
                    onDownload={handleDownloadPng}
                  />

                  {/* Add To Batch Button */}
                   <button
                    onClick={handleAddToBatch}
                    className="w-full mt-4 py-3 bg-gray-800 border border-gray-700 hover:bg-gray-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <PlusCircle size={20} className="text-cyan-400" />
                    <span>Add to Batch Queue</span>
                  </button>

                </section>

                <PrinterTools settings={printSettings} onSettingsChange={setPrintSettings} />
              </>
            )}

            {/* --- BATCH TAB --- */}
            {activeTab === 'batch' && (
              <BatchGenerator
                history={history}
                onPrintBatch={handleBatchPrint}
                initialSelectedIds={sessionSelectedIds}
                onSelectionChange={setSessionSelectedIds}
                onRequestScan={handleStartCapture}
              />
            )}

            {/* --- TEMPLATES TAB --- */}
            {activeTab === 'templates' && (
              <TemplateGallery onSelectTemplate={handleSelectTemplate} />
            )}

            {/* --- ANALYTICS TAB --- */}
            {activeTab === 'analytics' && (
              <AnalyticsDashboard history={history} />
            )}

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

        {/* Retry/Reprint Batch Action (Only visible after batch completion) */}
        {showSuccess && state === AppState.PRINTING_SUCCESS && lastBatchQueue && !isBatchPrinting && (
             <div className="fixed bottom-36 left-1/2 transform -translate-x-1/2 z-50">
                 <button
                    onClick={handleReprintLastBatch}
                    className="bg-gray-800 border border-gray-700 text-gray-300 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 hover:bg-gray-700 hover:text-white transition-colors text-xs font-bold uppercase"
                >
                    <RotateCcw size={14} />
                    <span>Reprint Batch</span>
                </button>
            </div>
        )}

        {/* Custom Scan Another Action in Success View */}
        {showSuccess && state === AppState.PRINTING_SUCCESS && (
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-50">
                 <button
                    onClick={handleScanAnother}
                    className="bg-gray-800 border border-gray-700 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 hover:bg-gray-700 transition-colors"
                >
                    <Scan size={18} className="text-cyan-400" />
                    <span className="font-bold text-sm">Scan Another</span>
                </button>
            </div>
        )}

      </main>

      {(state === AppState.EDITING || state === AppState.PRINTING_SUCCESS) && !showSuccess && activeTab === 'editor' && (
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
                  ${isProcessing ? 'bg-gray-800 text-gray-500 cursor-not-allowed' :
                    (filamentData.confidence !== undefined && filamentData.confidence < 80)
                    ? 'bg-gradient-to-r from-orange-500 to-red-600 text-white hover:from-orange-400 hover:to-red-500'
                    : 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white hover:from-cyan-400 hover:to-blue-500'}
                `}
              >
                {(filamentData.confidence !== undefined && filamentData.confidence < 80) ? <AlertTriangle size={24} /> : <Printer size={24} />}
                {(filamentData.confidence !== undefined && filamentData.confidence < 80 && isConnected) ? 'VERIFY & PRINT' : (isConnected ? 'PRINT LABEL' : 'CONNECT & PRINT')}
                {printSettings.copies > 1 && (
                  <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">×{printSettings.copies}</span>
                )}
              </button>
            )}
          </div>
        </div>
      )}
      {/* Batch Progress Modal */}
      {isBatchPrinting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-gray-900 border border-gray-700 p-8 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-6">
            <div className="w-16 h-16 mx-auto bg-cyan-900/30 rounded-full flex items-center justify-center animate-pulse">
              <Printer size={32} className="text-cyan-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Printing Batch...</h3>
              <p className="text-gray-400 text-sm mt-1">
                Label {currentBatchIndex + 1} of {batchQueue.length}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-gray-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-cyan-500 h-full transition-all duration-500 ease-out"
                style={{ width: `${((currentBatchIndex) / batchQueue.length) * 100}%` }}
              ></div>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg text-left">
              <p className="text-xs text-gray-500 uppercase font-bold mb-1">Current Label</p>
              <p className="text-white font-bold">{batchQueue[currentBatchIndex]?.label.brand}</p>
              <p className="text-cyan-400 text-sm">{batchQueue[currentBatchIndex]?.label.material}</p>
            </div>

            <button
              onClick={() => setIsBatchPrinting(false)}
              className="text-red-400 hover:text-red-300 text-sm font-bold"
            >
              Cancel Batch
            </button>
          </div>
        </div>
      )}

      {/* Hidden Batch Canvas Renderer */}
      <div className="fixed top-0 left-0 opacity-0 pointer-events-none -z-50 overflow-hidden w-1 h-1">
        {isBatchPrinting && currentBatchIndex >= 0 && batchQueue[currentBatchIndex] && (
          <LabelCanvas
            key={`batch-${currentBatchIndex}`} // Force re-mount
            data={batchQueue[currentBatchIndex].label}
            settings={batchQueue[currentBatchIndex].settings}
            widthMm={batchOverrideSize ? batchOverrideSize.widthMm : selectedLabel.widthMm}
            heightMm={batchOverrideSize ? batchOverrideSize.heightMm : selectedLabel.heightMm}
            onCanvasReady={setBatchCanvas}
            scale={2} // High res for print
          />
        )}
      </div>
    </div>
  );
};

export default App;
