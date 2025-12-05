import React, { useState, useMemo } from 'react';
import { HistoryEntry } from '../types';
import { generateAnalytics, searchHistory, SearchFilters } from '../services/analyticsService';
import { BarChart3, PieChart, Search, Filter, TrendingUp, AlertTriangle, Sparkles, Calendar, Download } from 'lucide-react';
import { useToast } from './ToastProvider';

interface AnalyticsDashboardProps {
    history: HistoryEntry[];
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ history }) => {
    const { success } = useToast();
    const [query, setQuery] = useState('');
    const [filters, setFilters] = useState<SearchFilters>({});

    const analytics = useMemo(() => generateAnalytics(history), [history]);
    const searchResults = useMemo(() => searchHistory(history, query, filters), [history, query, filters]);

    const handleExport = () => {
        const csvHeader = 'Date,Brand,Material,Color,Weight,MinTemp,MaxTemp,Notes\n';
        const csvRows = history.map(h => {
            const d = h.data;
            const date = new Date(h.timestamp).toISOString().split('T')[0];
            const notes = d.notes ? `"${d.notes.replace(/"/g, '""')}"` : '';
            return `${date},${d.brand},${d.material},${d.colorName},${d.weight},${d.minTemp},${d.maxTemp},${notes}`;
        }).join('\n');

        const blob = new Blob([csvHeader + csvRows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `filament-history-${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        success("Exported History", "CSV file downloaded");
    };

    const renderBarChart = (data: Map<string, number>, title: string, color: string) => {
        const max = Math.max(...Array.from(data.values()));
        const sorted = Array.from(data.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);

        return (
            <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 shadow-lg hover:border-gray-600 transition-colors">
                <h3 className="text-xs font-bold uppercase text-gray-400 mb-3 flex items-center gap-2">
                    <BarChart3 size={14} /> {title}
                </h3>
                <div className="space-y-2">
                    {sorted.map(([label, count]) => (
                        <div key={label} className="flex items-center gap-2 text-xs">
                            <span className="w-20 truncate text-gray-300 font-medium">{label}</span>
                            <div className="flex-1 h-2 bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${color} transition-all duration-1000 ease-out`}
                                    style={{ width: `${(count / max) * 100}%` }}
                                />
                            </div>
                            <span className="w-6 text-right text-gray-500">{count}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 animate-fade-in-up">

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
                    <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">Total Labels</div>
                    <div className="text-2xl font-bold text-white">{analytics.totalLabels}</div>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
                    <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">Unique Materials</div>
                    <div className="text-2xl font-bold text-cyan-400">{analytics.uniqueMaterials}</div>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
                    <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">Top Brand</div>
                    <div className="text-sm font-bold text-white truncate" title={analytics.mostPrintedBrand}>{analytics.mostPrintedBrand || '-'}</div>
                </div>
                <div className="bg-gray-900 p-3 rounded-xl border border-gray-800">
                    <div className="text-gray-400 text-[10px] font-bold uppercase mb-1">Avg / Week</div>
                    <div className="text-2xl font-bold text-green-400">{analytics.averageLabelsPerWeek}</div>
                </div>
            </div>

            {/* Insights Section */}
            {analytics.insights.length > 0 && (
                <div className="bg-gradient-to-br from-indigo-900/30 to-purple-900/30 p-4 rounded-xl border border-indigo-500/30">
                    <h3 className="text-sm font-bold text-indigo-200 mb-3 flex items-center gap-2">
                        <Sparkles size={16} className="text-indigo-400" /> AI Insights
                    </h3>
                    <div className="space-y-2">
                        {analytics.insights.map((insight, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-indigo-100/80">
                                <span className="mt-0.5">•</span>
                                <span>{insight}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderBarChart(analytics.materialDistribution, 'Top Materials', 'bg-cyan-500')}
                {renderBarChart(analytics.brandDistribution, 'Top Brands', 'bg-purple-500')}
            </div>

            {/* Search & History List */}
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800">
                <div className="flex items-center gap-3 mb-4">
                    <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search history..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            className="w-full bg-gray-950 border border-gray-700 rounded-lg py-2 pl-9 pr-4 text-sm text-white focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <button className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400">
                        <Filter size={18} />
                    </button>
                    <button
                        onClick={handleExport}
                        className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-cyan-400"
                        title="Export CSV"
                    >
                        <Download size={18} />
                    </button>
                </div>

                <div className="space-y-2 max-h-80 overflow-y-auto custom-scrollbar pr-2">
                    {searchResults.entries.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 text-sm">No matching records found.</div>
                    ) : (
                        searchResults.entries.map(entry => (
                            <div key={entry.id} className="p-3 bg-gray-800/30 rounded-lg border border-gray-800 flex justify-between items-center group hover:bg-gray-800 transition-colors">
                                <div>
                                    <div className="font-bold text-sm text-white group-hover:text-cyan-400 transition-colors">
                                        {entry.data.brand} {entry.data.material}
                                    </div>
                                    <div className="text-xs text-gray-500 flex items-center gap-2">
                                        <span>{entry.data.colorName}</span>
                                        <span>•</span>
                                        <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(entry.timestamp).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-xs font-mono text-gray-400">{entry.data.weight}</div>
                                    <div className="text-[10px] text-gray-600">{entry.data.minTemp}-{entry.data.maxTemp}°C</div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default AnalyticsDashboard;
