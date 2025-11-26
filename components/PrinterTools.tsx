
import React, { useState } from 'react';
import { ArrowDown, Zap, Wrench, AlertCircle } from 'lucide-react';
import { connectPrinter, feedPaper } from '../services/printerService';

const PrinterTools: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState('');
  const [isError, setIsError] = useState(false);

  const handleAction = async (action: 'feed' | 'test') => {
    setLoading(true);
    setMsg('Connecting...');
    setIsError(false);
    try {
      const device = await connectPrinter();
      if (action === 'feed') {
          setMsg('Feeding paper...');
          await feedPaper(device);
      }
      setMsg('Done!');
      setTimeout(() => setMsg(''), 2000);
    } catch (e: any) {
        setIsError(true);
        const errLower = e.message?.toLowerCase() || '';
        if (e.name === 'SecurityError' || errLower.includes('permissions policy') || errLower.includes('disallowed')) {
            setMsg('Blocked: Open in new tab');
        } else {
            setMsg(e.message?.substring(0, 25) || "Failed");
        }
        setTimeout(() => { setMsg(''); setIsError(false); }, 4000);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mt-4">
        <div className="flex items-center gap-2 mb-3 text-cyan-400">
            <Wrench size={16} />
            <h3 className="text-xs font-bold uppercase tracking-wider">Printer Toolkit</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
            <button 
                onClick={() => handleAction('feed')}
                disabled={loading}
                className="bg-gray-800 hover:bg-gray-700 p-3 rounded-lg flex flex-col items-center gap-2 transition-colors active:scale-95"
            >
                <ArrowDown size={20} className="text-gray-400" />
                <span className="text-xs font-bold text-gray-300">Feed Paper</span>
            </button>
            <div className={`
                p-3 rounded-lg flex flex-col items-center justify-center gap-2 border border-dashed transition-all
                ${isError ? 'bg-red-900/20 border-red-700' : 'bg-gray-800/50 border-gray-700'}
            `}>
                {isError ? <AlertCircle size={16} className="text-red-400" /> : null}
                <span className={`text-[10px] text-center font-bold ${isError ? 'text-red-400' : 'text-gray-500'}`}>
                    {msg || "Align spool or check density"}
                </span>
            </div>
        </div>
    </div>
  );
};

export default PrinterTools;
