import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onClose: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  useEffect(() => {
    if (toast.duration !== Infinity) {
      const timer = setTimeout(() => {
        onClose(toast.id);
      }, toast.duration || 3000);
      return () => clearTimeout(timer);
    }
  }, [toast, onClose]);

  const icons = {
    success: <CheckCircle size={20} className="text-green-400" />,
    error: <AlertCircle size={20} className="text-red-400" />,
    warning: <AlertTriangle size={20} className="text-yellow-400" />,
    info: <Info size={20} className="text-blue-400" />
  };

  const borders = {
    success: 'border-green-500/50 bg-green-900/20',
    error: 'border-red-500/50 bg-red-900/20',
    warning: 'border-yellow-500/50 bg-yellow-900/20',
    info: 'border-blue-500/50 bg-blue-900/20'
  };

  return (
    <div className={`
      pointer-events-auto
      flex w-full max-w-sm overflow-hidden rounded-lg border shadow-lg backdrop-blur-md
      animate-in slide-in-from-right-full fade-in duration-300
      ${borders[toast.type]}
    `}>
      <div className="p-4 flex items-start gap-3 w-full">
        <div className="flex-shrink-0 mt-0.5">
          {icons[toast.type]}
        </div>
        <div className="flex-1 w-0">
          <p className="text-sm font-bold text-white leading-5">
            {toast.title}
          </p>
          {toast.message && (
            <p className="mt-1 text-xs text-gray-300 leading-4">
              {toast.message}
            </p>
          )}
        </div>
        <div className="flex-shrink-0 ml-4 flex">
          <button
            onClick={() => onClose(toast.id)}
            className="inline-flex text-gray-400 hover:text-white focus:outline-none"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;
