import dynamic from 'next/dynamic';
import { useState } from 'react';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isOpen: boolean;
}

// Dynamically import to avoid SSR issues
const QrScannerComponent = dynamic(
  () => import('react-qr-scanner').then((mod) => mod.QrScanner),
  { ssr: false, loading: () => <div className="h-80 bg-slate-700 animate-pulse rounded-lg" /> },
);

export default function QRScanner({ onScan, isOpen }: QRScannerProps) {
  const [error, setError] = useState<string | null>(null);

  const handleDecode = (result: any) => {
    if (result?.text) {
      onScan(result.text);
    }
  };

  const handleError = (error: any) => {
    // Suppress permission and other non-critical errors
    if (error?.name !== 'NotAllowedError' && error?.name !== 'NotFoundError') {
      console.error('QR Scanner error:', error);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="w-full space-y-3">
      {error && (
        <div className="bg-red-900 border border-red-600 text-red-200 p-4 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="relative bg-black rounded-lg overflow-hidden aspect-square max-w-md mx-auto shadow-lg">
        <QrScannerComponent
          onDecode={handleDecode}
          onError={handleError}
          constraints={{
            audio: false,
            video: {
              facingMode: 'environment', // Use back camera on mobile
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          }}
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
      </div>
    </div>
  );
}
