import React, { useState } from 'react';
import { HistoryEntry, FilamentData, PrintJob } from '../types';
import { generateBatchJobs, BatchGenerationOptions, generateBatchReport } from '../services/batchGeneratorService';
import { Check, Printer, Settings, AlertCircle, FileText, Clock, ArrowRight } from 'lucide-react';

interface BatchGeneratorProps {
    history: HistoryEntry[];
    onPrintBatch: (jobs: PrintJob[]) => Promise<void>;
}

const BatchGenerator: React.FC<BatchGeneratorProps> = ({ history, onPrintBatch }) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [options, setOptions] = useState<BatchGenerationOptions>({
        optimizeOrder: true,
        autoRecommendSettings: true,
        includeQrCodes: false,
        addTimeStamps: true,
        skipDuplicates: false
    });
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
            await onPrintBatch(generatedJobs);
        } catch (e) {
            console.error("Batch print failed", e);
        } finally {
            setIsPrinting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Printer className="text-cyan-400" /> Batch Generator
                    </h2>
                    <button
                        onClick={selectAll}
                        className="text-xs text-cyan-400 hover:text-cyan-300 font-bold uppercase"
                    >
                        {selectedIds.size === history.length ? 'Deselect All' : 'Select All'}
                    </button>
                </div>

                {/* History Selection List */}
                <div className="max-h-60 overflow-y-auto space-y-2 mb-4 pr-2 custom-scrollbar">
                    {history.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 text-sm">No history available to select from.</div>
                    ) : (
                        history.map(entry => (
                            <div
                                key={entry.id}
                                onClick={() => toggleSelection(entry.id)}
                                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3
                  ${selectedIds.has(entry.id)
                                        ? 'bg-cyan-900/20 border-cyan-500/50'
                                        : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800'}
                `}
                            >
                                <div className={`w-4 h-4 rounded border flex items-center justify-center
                  ${selectedIds.has(entry.id) ? 'bg-cyan-500 border-cyan-500' : 'border-gray-500'}
                `}>
                                    {selectedIds.has(entry.id) && <Check size={10} className="text-black" />}
                                </div>
                                <div className="flex-1">
                                    <div className="flex justify-between">
                                        <span className="font-bold text-sm text-white">{entry.data.brand}</span>
                                        <span className="text-xs text-gray-400">{new Date(entry.timestamp).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                        <span className="font-mono text-cyan-300">{entry.data.material}</span>
                                        <span>•</span>
                                        <span>{entry.data.colorName}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Options */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={options.optimizeOrder}
                            onChange={e => setOptions({ ...options, optimizeOrder: e.target.checked })}
                            className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-0"
                        />
                        Optimize Order (Save Paper)
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={options.autoRecommendSettings}
                            onChange={e => setOptions({ ...options, autoRecommendSettings: e.target.checked })}
                            className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-0"
                        />
                        AI Smart Settings
                    </label>
                    <label className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={options.includeQrCodes}
                            onChange={e => setOptions({ ...options, includeQrCodes: e.target.checked })}
                            className="rounded bg-gray-700 border-gray-600 text-cyan-500 focus:ring-0"
                        />
                        Include QR Codes
                    </label>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={selectedIds.size === 0}
                    className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold rounded-lg transition-colors flex items-center justify-center gap-2"
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

                    <pre className="bg-gray-950 p-3 rounded-lg text-[10px] text-gray-400 font-mono overflow-x-auto mb-4 border border-gray-800">
                        {report}
                    </pre>

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
