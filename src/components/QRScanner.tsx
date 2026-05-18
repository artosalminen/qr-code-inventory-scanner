import { useEffect, useRef } from 'react';
import { useTranslations } from 'next-intl';

interface QRScannerProps {
  onScan: (qrCode: string) => void;
  isOpen: boolean;
}

export default function QRScanner({ onScan, isOpen }: QRScannerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scannerRef = useRef<any>(null);
  const t = useTranslations('scanner');

  useEffect(() => {
    if (!isOpen || !containerRef.current) {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {}).finally(() => { scannerRef.current = null; });
      }
      return;
    }

    const initScanner = async () => {
      try {
        const { Html5QrcodeScanner } = await import('html5-qrcode');
        const scanner = new Html5QrcodeScanner(
          containerRef.current!.id,
          { fps: 10, qrbox: { width: 250, height: 250 }, disableFlip: false, rememberLastUsedCamera: true, supportedScanTypes: [] },
          false,
        );
        scannerRef.current = scanner;
        scanner.render(
          (decodedText: string) => { onScan(decodedText); scanner.clear().catch(() => {}); scannerRef.current = null; },
          (_errorMessage: string) => {},
        );
      } catch (error) {
        console.error('Failed to initialize QR scanner:', error);
      }
    };

    initScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {}).finally(() => { scannerRef.current = null; });
      }
    };
  }, [isOpen, onScan]);

  if (!isOpen) return null;

  return (
    <div className="w-full space-y-4">
      <div
        ref={containerRef}
        id="qr-scanner-container"
        className="bg-black rounded-lg overflow-hidden shadow-lg"
        style={{ minHeight: '400px' }}
      />
      <div className="text-center">
        <p className="text-slate-300 text-sm">📱 {t('pointCamera')}</p>
      </div>
    </div>
  );
}
