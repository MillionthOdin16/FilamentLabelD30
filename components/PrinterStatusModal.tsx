import React from 'react';
import { Battery, BatteryFull, BatteryLow, BatteryMedium, Bluetooth, Printer, X, Activity, Cpu } from 'lucide-react';
import { PrinterInfo } from '../types';

interface PrinterStatusModalProps {
    isOpen: boolean;
    onClose: () => void;
    printerInfo: Partial<PrinterInfo> | null;
    batteryLevel: number | null;
    isConnected: boolean;
}

const PrinterStatusModal: React.FC<PrinterStatusModalProps> = ({
    isOpen, onClose, printerInfo, batteryLevel, isConnected
}) => {
    if (!isOpen) return null;

    let BatteryIcon = Battery;
    let batteryColor = 'text-gray-400';
    if (batteryLevel !== null) {
        if (batteryLevel > 75) { BatteryIcon = BatteryFull; batteryColor = 'text-green-400'; }
        else if (batteryLevel > 30) { BatteryIcon = BatteryMedium; batteryColor = 'text-yellow-400'; }
        else { BatteryIcon = BatteryLow; batteryColor = 'text-red-400'; }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-xs relative overflow-hidden">

                {/* Header */}
                <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/50">
                    <h3 className="font-bold text-white flex items-center gap-2">
                        <Printer size={18} className="text-cyan-400" />
                        Printer Status
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
                        <X size={18} />
                    </button>
                </div>

                <div className="p-5 space-y-6">
                    {/* Connection Status */}
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${isConnected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                            <Bluetooth size={24} />
                        </div>
                        <div>
                            <div className="text-sm font-bold text-white">
                                {isConnected ? 'Connected' : 'Disconnected'}
                            </div>
                            <div className="text-xs text-gray-500">
                                {printerInfo?.name || 'Unknown Device'}
                            </div>
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                            <div className="flex items-center gap-2 text-gray-400 mb-1">
                                <BatteryIcon size={14} className={batteryColor} />
                                <span className="text-[10px] font-bold uppercase">Battery</span>
                            </div>
                            <div className={`text-lg font-mono font-bold ${batteryColor}`}>
                                {batteryLevel !== null ? `${batteryLevel}%` : '--'}
                            </div>
                        </div>

                        <div className="bg-gray-800/50 p-3 rounded-xl border border-gray-700/50">
                            <div className="flex items-center gap-2 text-gray-400 mb-1">
                                <Activity size={14} />
                                <span className="text-[10px] font-bold uppercase">Status</span>
                            </div>
                            <div className="text-lg font-bold text-white">
                                {isConnected ? 'Ready' : 'Offline'}
                            </div>
                        </div>

                        <div className="col-span-2 bg-gray-800/30 p-3 rounded-xl border border-gray-700/30 flex justify-between items-center">
                             <div className="flex items-center gap-2 text-gray-500">
                                <Cpu size={14} />
                                <span className="text-[10px] font-bold uppercase">Model / Firmware</span>
                             </div>
                             <div className="text-xs font-mono text-gray-300 text-right">
                                {printerInfo?.model || 'Unknown'} <br/>
                                <span className="text-gray-600">v{printerInfo?.firmware || '1.0'}</span>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PrinterStatusModal;
