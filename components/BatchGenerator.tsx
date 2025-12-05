import React, { useState } from 'react';
import { HistoryEntry, FilamentData, PrintJob, LABEL_PRESETS, LabelPreset } from '../types';
import { generateBatchJobs, BatchGenerationOptions, generateBatchReport } from '../services/batchGeneratorService';
import { Check, Printer, Settings, AlertCircle, FileText, Clock, ArrowRight, Ruler } from 'lucide-react';
import LabelThumbnail from './LabelThumbnail';
import LabelCanvas from './LabelCanvas';

interface BatchGeneratorProps {
    history: HistoryEntry[];
    onPrintBatch: (jobs: PrintJob[], overrideSizeId?: string) => Promise<void>;
    initialSelectedIds?: Set<string>;
    onSelectionChange?: (ids: Set<string>) => void;
    onRequestScan?: () => void;
}

const BatchGenerator: React.FC<BatchGeneratorProps> = ({ history, onPrintBatch, initialSelectedIds, onSelectionChange, onRequestScan }) => {
    const [localSelectedIds, setLocalSelectedIds] = useState<Set<string>>(new Set());

    // Use prop if available, otherwise local state
    const selectedIds = initialSelectedIds || localSelectedIds;
    const setSelectedIds = onSelectionChange || setLocalSelectedIds;

    const [options, setOptions] = useState<BatchGenerationOptions>({
        optimizeOrder: true,
        autoRecommendSettings: true,
        includeQrCodes: false,
        addTimeStamps: true,
        skipDuplicates: false
    });
    const [overrideSize, setOverrideSize] = useState<string>('default'); // 'default' or preset ID
    const [generatedJobs, setGeneratedJobs] = useState<PrintJob[]>([]);
    const [report, setReport] = useState<string>('');
    const [isPrinting, setIsPrinting] = useState(false);

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const selectAll = () => {
        if (selectedIds.size === history.length) setSelectedIds(new Set());
        else setSelectedIds(new Set(history.map(h => h.id)));
    };

    const selectToday = () => {
        const today = new Date().setHours(0,0,0,0);
        const todayIds = history
            .filter(h => new Date(h.timestamp).setHours(0,0,0,0) === today)
            .map(h => h.id);

        // Add to existing selection or replace? Let's add for better UX
        const newSet = new Set(selectedIds);
        todayIds.forEach(id => newSet.add(id));
        setSelectedIds(newSet);
    };

    const handleGenerate = () => {
        const selectedFilaments = history
            .filter(h => selectedIds.has(h.id))
            .map(h => h.data);

        if (selectedFilaments.length === 0) return;

        const result = generateBatchJobs(selectedFilaments, history, options);

        setGeneratedJobs(result.jobs);
        setReport(generateBatchReport(result));
    };

    const handlePrint = async () => {
        if (generatedJobs.length === 0) return;

        setIsPrinting(true);
        try {
            // Pass the generated jobs AND the optional override size to App.tsx
            await onPrintBatch(generatedJobs, overrideSize);
        } catch (e) {
            console.error("Batch print failed", e);
        } finally {
            setIsPrinting(false);
        }
    };

    // Helper to find preset name
    const getPresetName = (id: string) => LABEL_PRESETS.find(p => p.id === id)?.name || id;

    return (
        <div className="space-y-6">
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Printer className="text-cyan-400" /> Batch Generator
                    </h2>
                    <div className="flex gap-2">
                        <button
                            onClick={selectToday}
                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-cyan-400 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors"
                        >
                            Select Today
                        </button>
                        <button
                            onClick={selectAll}
                            className="text-[10px] bg-gray-800 hover:bg-gray-700 text-cyan-400 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-colors"
                        >
                            {selectedIds.size === history.length && history.length > 0 ? 'Deselect All' : 'Select All'}
                        </button>
                    </div>
                </div>

                {/* History Selection List */}
                <div className="max-h-96 overflow-y-auto space-y-2 mb-4 pr-2 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 text-sm flex flex-col items-center gap-3">
                            <p>No history available to select from.</p>
                            {onRequestScan && (
                                <button
                                    onClick={onRequestScan}
                                    className="bg-gray-800 hover:bg-gray-700 text-cyan-400 px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-all"
                                >
                                    Scan New Item
                                </button>
                            )}
                        </div>
                    ) : (
                        history.map(entry => (
                            <div
                                key={entry.id}
                                onClick={() => toggleSelection(entry.id)}
                                className={`p-2 rounded-lg border cursor-pointer transition-all flex items-center gap-3 relative overflow-hidden group
                                    ${selectedIds.has(entry.id)
                                        ? 'bg-cyan-900/20 border-cyan-500/50'
                                        : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'}
                                `}
                            >
                                {/* Selection Checkbox */}
                                <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-all z-10
                                    ${selectedIds.has(entry.id) ? 'bg-cyan-500 border-none' : 'border-2 border-gray-600 bg-gray-900/50'}
                                `}>
                                    {selectedIds.has(entry.id) && <Check size={14} className="text-black stroke-[3px]" />}
                                </div>

                                {/* Thumbnail */}
                                <div className="flex-shrink-0">
                                    <LabelThumbnail data={entry.data} size={48} />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline">
                                        <span className="font-bold text-sm text-white truncate">{entry.data.brand}</span>
                                        <span className="text-[10px] text-gray-500 flex-shrink-0">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                        <span className="font-black text-cyan-400 bg-cyan-900/20 px-1 rounded">{entry.data.material}</span>
                                        <span className="truncate">{entry.data.colorName}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                 {/* Global Settings Override */}
                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center gap-2 mb-2 text-cyan-400">
                        <Ruler size={14} />
                        <span className="text-xs font-bold uppercase">Batch Label Size</span>
                    </div>
                     <select
                        value={overrideSize}
                        onChange={(e) => setOverrideSize(e.target.value)}
                        className="w-full bg-gray-700 text-white text-xs rounded p-2 border border-gray-600 outline-none focus:border-cyan-500"
                    >
                        <option value="default">Use Auto Recommendation</option>
                        {LABEL_PRESETS.map(p => (
                             <option key={p.id} value={p.id}>{p.name} ({p.widthMm}x{p.heightMm}mm)</option>
                        ))}
                    </select>
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-gray-800/30 rounded-lg border border-gray-700/50">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white transition-colors">
                        <input
                            type="checkbox"
                            checked={options.optimizeOrder}
                            onChange={e => setOptions({ ...options, optimizeOrder: e.target.checked })}
                            className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-0 w-4 h-4"
                        />
                        <span>Optimize Order</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white transition-colors">
                        <input
                            type="checkbox"
                            checked={options.autoRecommendSettings}
                            disabled={overrideSize !== 'default'}
                            onChange={e => setOptions({ ...options, autoRecommendSettings: e.target.checked })}
                            className={`rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-0 w-4 h-4 ${overrideSize !== 'default' ? 'opacity-50' : ''}`}
                        />
                        <span>AI Smart Settings</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer hover:text-white transition-colors">
                        <input
                            type="checkbox"
                            checked={options.includeQrCodes}
                            onChange={e => setOptions({ ...options, includeQrCodes: e.target.checked })}
                            className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-0 w-4 h-4"
                        />
                        <span>Include QR Codes</span>
                    </label>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={selectedIds.size === 0}
                    className={`w-full py-3 font-bold rounded-lg transition-all flex items-center justify-center gap-2
                        ${selectedIds.size === 0
                            ? 'bg-gray-800 text-gray-600 cursor-not-allowed border border-gray-700'
                            : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-900/20 transform active:scale-[0.98]'
                        }
                    `}
                >
                    <Settings size={18} />
                    Generate Batch ({selectedIds.size})
                </button>
            </div>

            {/* Results Preview */}
            {generatedJobs.length > 0 && (
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 animate-in fade-in slide-in-from-bottom-4">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <FileText size={16} className="text-green-400" /> Preview
                        </h3>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock size={12} /> ~{Math.round(generatedJobs.reduce((acc, j) => acc + j.estimatedTime, 0) / 60)} min
                        </span>
                    </div>

                    {/* Summary Report */}
                    <pre className="bg-gray-950 p-3 rounded-lg text-[10px] text-gray-400 font-mono overflow-x-auto mb-4 border border-gray-800 max-h-32">
                        {report}
                    </pre>

                    {/* Visual Grid Preview */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4 max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                        {generatedJobs.map((job, idx) => {
                            // Determine display width based on job settings or override
                            // We use the LabelCanvas directly here but scaled down
                            // The widthMm in job.settings might not be set if it depends on global override?
                            // BatchGenerator logic for overrides happens in onPrintBatch (App.tsx), but
                            // generatedJobs here are raw from generator service.
                            // If we have an overrideSize locally, we should use it for the preview.

                            let widthMm = 40; // Fallback
                            let heightMm = 30;

                            if (overrideSize !== 'default') {
                                const preset = LABEL_PRESETS.find(p => p.id === overrideSize);
                                if (preset) { widthMm = preset.widthMm; heightMm = preset.heightMm; }
                            } else {
                                // Try to guess from settings (not strictly stored yet) or use default
                                // Ideally generatedJobs should carry this info.
                                // For now, we use standard preview size.
                            }

                            return (
                                <div key={job.id} className="relative bg-white rounded-lg overflow-hidden border border-gray-700 shadow-sm flex flex-col">
                                    <div className="flex-1 flex items-center justify-center p-2 bg-gray-100 min-h-[80px]">
                                        <div className="pointer-events-none transform origin-center">
                                            <LabelCanvas
                                                data={job.label}
                                                settings={job.settings}
                                                widthMm={widthMm}
                                                heightMm={heightMm}
                                                scale={0.3} // Small preview
                                            />
                                        </div>
                                    </div>
                                    <div className="bg-gray-800 p-1.5 text-center">
                                        <div className="text-[10px] text-white font-bold truncate">
                                            {job.label.brand}
                                        </div>
                                        <div className="text-[9px] text-gray-400 truncate">
                                            {job.label.material} • #{idx + 1}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {overrideSize !== 'default' && (
                        <div className="mb-4 p-2 bg-yellow-900/20 border border-yellow-700/50 rounded flex items-center gap-2 text-xs text-yellow-500">
                            <AlertCircle size={14} />
                            <span>Ensure printer is loaded with <b>{getPresetName(overrideSize)}</b> labels.</span>
                        </div>
                    )}

                    <button
                        onClick={handlePrint}
                        disabled={isPrinting}
                        className="w-full py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-800 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {isPrinting ? (
                            <>Printing... <span className="animate-pulse">...</span></>
                        ) : (
                            <>Print {generatedJobs.length} Labels <ArrowRight size={18} /></>
                        )}
                    </button>
                </div>
            )}
        </div>
    );
};

export default BatchGenerator;
