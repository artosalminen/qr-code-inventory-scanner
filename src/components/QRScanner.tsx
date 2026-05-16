import { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, isOpen }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      if (scannerRef.current && scanning) {
        scannerRef.current.clear().catch(() => {});
        setScanning(false);
      }
      return;
    }

    const scanner = new Html5QrcodeScanner(
      'qr-reader',
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false,
    );

    scanner.render(
      (decodedText) => {
        onScan(decodedText);
        scanner.clear().catch(() => {});
        setScanning(false);
      },
      (error) => {
        // Suppress scan errors
      },
    );

    scannerRef.current = scanner;
    setScanning(true);

    return () => {
      if (scannerRef.current && scanning) {
        scannerRef.current.clear().catch(() => {});
        setScanning(false);
      }
    };
  }, [isOpen, onScan, scanning]);

  return (
    <div id="qr-reader" style={{ width: '100%', minHeight: '300px' }}>
      {/* Scanner renders here */}
    </div>
  );
}
