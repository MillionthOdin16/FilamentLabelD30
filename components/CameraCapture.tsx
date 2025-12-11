import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, Zap, ZapOff, ZoomIn, ZoomOut } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (imageSrc: string) => void;
  onCancel: () => void;
  onScanCode?: (code: string) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, onCancel, onScanCode }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string>('');

  const [zoom, setZoom] = useState(1);
  const [torch, setTorch] = useState(false);
  const [capabilities, setCapabilities] = useState<MediaTrackCapabilities | null>(null);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // QR / Barcode Detection
  useEffect(() => {
    if (!onScanCode || !('BarcodeDetector' in window)) return;

    const interval = setInterval(async () => {
       if (videoRef.current && videoRef.current.readyState === 4) {
          try {
             // @ts-ignore - Experimental API
             const detector = new window.BarcodeDetector({ formats: ['qr_code', 'data_matrix', 'aztec'] });
             const codes = await detector.detect(videoRef.current);
             if (codes.length > 0) {
                 const code = codes[0].rawValue;
                 if (code) onScanCode(code);
             }
          } catch (e) {
             // Silently fail or log if needed
          }
       }
    }, 500);

    return () => clearInterval(interval);
  }, [onScanCode]);

  const startCamera = async () => {
    try {
      const constraints = {
        video: {
          facingMode: 'environment', // Use back camera on mobile
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      const track = mediaStream.getVideoTracks()[0];
      if (track && track.getCapabilities) {
          try {
            setCapabilities(track.getCapabilities());
          } catch(e) { console.warn("Caps error", e); }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      let errorMsg = "Unable to access camera.";

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorMsg = "Camera permission denied. To enable:\n\n1. Click the camera icon in your browser's address bar\n2. Select 'Allow' for camera access\n3. Reload the page\n\nOr use the 'Gallery' option to upload a photo instead.";
      } else if (err.name === 'NotFoundError') {
        errorMsg = "No camera found on this device.\n\nYou can still use the 'Gallery' option to upload a photo or enter data manually.";
      } else if (err.name === 'NotReadableError') {
        errorMsg = "Camera is in use by another application.\n\nClose other apps using the camera and try again, or use the 'Gallery' option.";
      } else {
        errorMsg = `Camera error: ${err.message || 'Unknown'}\n\nTry the 'Gallery' option or enter data manually.`;
      }

      setError(errorMsg);
    }
  };

  const handleZoom = (val: number) => {
      setZoom(val);
      if (stream) {
          const track = stream.getVideoTracks()[0];
          // @ts-ignore - advanced constraints
          track.applyConstraints({ advanced: [{ zoom: val }] }).catch(e => console.log(e));
      }
  };

  const toggleTorch = () => {
      const newTorch = !torch;
      setTorch(newTorch);
      if (stream) {
          const track = stream.getVideoTracks()[0];
          // @ts-ignore - torch constraint
          track.applyConstraints({ advanced: [{ torch: newTorch }] }).catch(e => {
              console.log(e);
              setTorch(!newTorch); // Revert if failed
          });
      }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');
      
      if (context) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageSrc = canvas.toDataURL('image/jpeg', 0.85);
        stopCamera();
        onCapture(imageSrc);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      {error ? (
        <div className="text-red-500 p-6 text-center">
          <p className="text-xl mb-4">{error}</p>
          <button 
            onClick={onCancel}
            className="px-6 py-2 bg-gray-800 rounded-lg text-white"
          >
            Go Back
          </button>
        </div>
      ) : (
        <>
          <div className="relative w-full h-full flex flex-col">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            
            {/* Overlay UI */}
            <div className="absolute top-0 left-0 w-full p-6 flex justify-between items-start bg-gradient-to-b from-black/70 to-transparent z-10">
              <button onClick={onCancel} className="p-2 rounded-full bg-black/40 text-white backdrop-blur-md">
                <X size={24} />
              </button>

              <div className="flex gap-4">
                {/* Torch Toggle */}
                {/* @ts-ignore - torch capability check */}
                {capabilities && capabilities.torch && (
                    <button
                        onClick={toggleTorch}
                        className={`p-2 rounded-full backdrop-blur-md transition-all ${torch ? 'bg-yellow-500 text-black' : 'bg-black/40 text-white'}`}
                    >
                        {torch ? <Zap size={24} fill="currentColor" /> : <ZapOff size={24} />}
                    </button>
                )}

                {onScanCode && 'BarcodeDetector' in window && (
                    <div className="bg-black/50 backdrop-blur-md border border-cyan-500/30 px-3 py-1.5 rounded-full flex items-center gap-2 h-10">
                        <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                        <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wide">Smart Scan</span>
                    </div>
                )}
              </div>
            </div>

            {/* Zoom Controls */}
            {/* @ts-ignore - zoom capability check */}
            {capabilities && capabilities.zoom && (
                <div className="absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-4 bg-black/30 backdrop-blur-md p-2 rounded-full z-10">
                    <button onClick={() => handleZoom(Math.min((capabilities as any).zoom.max, zoom + 0.5))} className="text-white p-1"><ZoomIn size={20} /></button>
                    <div className="h-32 w-1 relative bg-gray-600 rounded-full">
                        <div
                            className="absolute bottom-0 left-0 w-full bg-cyan-400 rounded-full transition-all"
                            style={{ height: `${((zoom - (capabilities as any).zoom.min) / ((capabilities as any).zoom.max - (capabilities as any).zoom.min)) * 100}%` }}
                        />
                    </div>
                    <button onClick={() => handleZoom(Math.max((capabilities as any).zoom.min, zoom - 0.5))} className="text-white p-1"><ZoomOut size={20} /></button>
                </div>
            )}

            <div className="absolute bottom-0 left-0 w-full p-8 flex justify-center items-center bg-gradient-to-t from-black/80 to-transparent z-10">
               <button 
                onClick={takePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center bg-white/20 active:bg-white/50 transition-all shadow-lg shadow-cyan-500/20"
               >
                 <div className="w-16 h-16 bg-white rounded-full"></div>
               </button>
            </div>
            
            {/* Hidden canvas for processing */}
            <canvas ref={canvasRef} className="hidden" />
          </div>
        </>
      )}
    </div>
  );
};

export default CameraCapture;