import { useEffect, useRef } from 'react';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, isOpen }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scannerRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      // Stop scanner when closed
      if (scannerRef.current) {
        scannerRef.current.stop?.();
        scannerRef.current = null;
      }
      return;
    }

    if (!videoRef.current) return;

    // Dynamically import to avoid SSR issues
    import('react-qr-scanner').then(({ default: QrScanner }) => {
      try {
        const scanner = new QrScanner(
          videoRef.current!,
          (result: any) => {
            onScan(result.data);
          },
          {
            onDecodeError: () => {
              // Silently ignore errors
            },
            preferredCamera: 'environment',
            highlightCodeOutline: true,
            highlightScanRegion: true,
            maxScansPerSecond: 5,
          },
        );

        scanner
          .start()
          .then(() => {
            scannerRef.current = scanner;
          })
          .catch((err: any) => {
            console.error('QR Scanner failed to start:', err);
          });
      } catch (err) {
        console.error('Failed to initialize QR Scanner:', err);
      }
    });

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop?.();
        scannerRef.current = null;
      }
    };
  }, [isOpen, onScan]);

  return (
    <div className="w-full space-y-3">
      {isOpen && (
        <div className="relative bg-black rounded-lg overflow-hidden aspect-square max-w-md mx-auto shadow-lg">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ display: 'block' }}
            playsInline
            autoPlay
            muted
          />

          {/* Scanner frame overlay */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              {/* Main frame border */}
              <div className="absolute inset-0 border-4 border-green-500 rounded-lg opacity-80"></div>

              {/* Corner brackets */}
              <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-green-400"></div>
              <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-green-400"></div>
              <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-green-400"></div>
              <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-green-400"></div>

              {/* Scanning line animation */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-b from-green-400 to-transparent animate-pulse"></div>
            </div>
          </div>

          {/* Instructions overlay */}
          <div className="absolute inset-0 flex flex-col items-center justify-between pointer-events-none">
            <div className="pt-4">
              <p className="text-white text-sm font-medium drop-shadow-lg bg-black bg-opacity-40 px-4 py-2 rounded">
                📱 Position QR code in frame
              </p>
            </div>
            <div className="pb-4">
              <p className="text-green-400 text-xs drop-shadow-lg bg-black bg-opacity-40 px-4 py-2 rounded">
                ✓ Scanning...
              </p>
            </div>
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      )}
    </div>
  );
}
