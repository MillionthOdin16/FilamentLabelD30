
import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QrScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onCancel: () => void;
}

const QrScanner: React.FC<QrScannerProps> = ({ onScanSuccess, onCancel }) => {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: 250 },
      false
    );

    scanner.render(onScanSuccess, (error) => {
      // ignore errors
    });

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear();
      }
    };
  }, [onScanSuccess]);

  return (
    <div className="flex flex-col items-center gap-4">
      <div id="qr-reader" className="w-full" />
      <button
        onClick={onCancel}
        className="mt-4 px-6 py-2 bg-gray-700 text-white font-bold rounded-lg hover:bg-gray-600 transition-colors"
      >
        Cancel
      </button>
    </div>
  );
};

export default QrScanner;
