import React from 'react';
import { Keyboard, X } from 'lucide-react';

interface KeyboardShortcutsProps {
  onClose: () => void;
}

const KeyboardShortcuts: React.FC<KeyboardShortcutsProps> = ({ onClose }) => {

  const shortcuts = [
    { keys: ['Ctrl', 'K'], description: 'Open camera scanner' },
    { keys: ['Ctrl', 'P'], description: 'Print label' },
    { keys: ['Esc'], description: 'Cancel / Go home' },
    { keys: ['Ctrl', '1'], description: 'Switch to Editor tab' },
    { keys: ['Ctrl', '2'], description: 'Switch to Batch tab' },
    { keys: ['Ctrl', '3'], description: 'Switch to Templates tab' },
    { keys: ['Ctrl', '4'], description: 'Switch to Analytics tab' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl max-w-md w-full mx-4 animate-smooth-scale-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-900/30 rounded-lg flex items-center justify-center">
              <Keyboard size={20} className="text-cyan-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Keyboard Shortcuts</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-white transition-colors p-2 rounded-lg hover:bg-gray-800 focus-ring"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
          {shortcuts.map((shortcut, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors stagger-item"
              style={{ animationDelay: `${index * 0.05}s` }}
            >
              <span className="text-sm text-gray-300">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && <span className="text-gray-600 mx-1">+</span>}
                    <kbd className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-xs font-mono text-cyan-400 shadow-sm">
                      {key}
                    </kbd>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-gray-800/30 border-t border-gray-800 text-center">
          <p className="text-xs text-gray-500">
            Press <kbd className="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs font-mono text-cyan-400">?</kbd> or <kbd className="px-2 py-0.5 bg-gray-900 border border-gray-700 rounded text-xs font-mono text-cyan-400">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcuts;
