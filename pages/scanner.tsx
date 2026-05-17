import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import QRScanner from '@/components/QRScanner';
import { Project, ScanAction } from '@/types';

export default function ScannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanAction>('check_in');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [lastMessageType, setLastMessageType] = useState<'success' | 'error'>('success');
  const [condition, setCondition] = useState('ok');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    fetchProjects();
  }, []);

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data);
      if (data.length > 0) {
        setSelectedProjectId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  async function handleScan(qrCode: string) {
    if (!selectedProjectId || isProcessing) return;

    setIsProcessing(true);
    try {
      const { data } = await axios.post('/api/boxes/scan', {
        projectId: selectedProjectId,
        qrCode,
        action: scanMode,
        condition,
        notes,
      });

      setLastMessage(`${data.box.label || 'Box'} - ${data.newState}`);
      setLastMessageType('success');
      setNotes('');
      setCondition('ok');
      setScannerOpen(false);

      setTimeout(() => {
        setScannerOpen(true);
      }, 1500);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Scan failed';
      setLastMessage(message);
      setLastMessageType('error');
    } finally {
      setIsProcessing(false);
    }
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-4">⌛</div>
            <p className="text-slate-400">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const scanModes: { value: ScanAction; label: string; icon: string }[] = [
    { value: 'check_in', label: 'Check In', icon: '📥' },
    { value: 'activate', label: 'Activate', icon: '⚡' },
    { value: 'return', label: 'Return', icon: '↩️' },
    { value: 'check_out', label: 'Check Out', icon: '📤' },
  ];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">Scanner</h1>
            <p className="text-slate-400 mt-1">Scan QR codes to manage box state</p>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-3 bg-slate-800 border border-slate-600 text-slate-50 rounded-lg hover:border-slate-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Main Scanner Card */}
        <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
          <div className="p-6 space-y-6">
            {/* Scan Mode Selection */}
            <div>
              <label className="block text-slate-200 font-semibold mb-3">Scan Mode</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {scanModes.map((mode) => (
                  <button
                    key={mode.value}
                    onClick={() => setScanMode(mode.value)}
                    className={`px-4 py-3 rounded-lg font-medium transition flex flex-col items-center gap-1 text-sm ${
                      scanMode === mode.value
                        ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                        : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }`}
                  >
                    <span className="text-xl">{mode.icon}</span>
                    <span className="hidden sm:inline">{mode.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Condition Selection */}
            {['check_in', 'check_out'].includes(scanMode) && (
              <div>
                <label className="block text-slate-200 font-semibold mb-3">Item Condition</label>
                <div className="flex gap-3">
                  {[
                    { value: 'ok', label: '✓ OK', icon: '👍' },
                    { value: 'damaged', label: '⚠️ Damaged', icon: '🔧' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCondition(opt.value)}
                      className={`flex-1 px-4 py-3 rounded-lg font-medium transition flex items-center justify-center gap-2 ${
                        condition === opt.value
                          ? 'bg-green-600 text-white'
                          : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span>{opt.icon}</span>
                      <span>{opt.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-slate-200 font-semibold mb-3">Notes (Optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={3}
                placeholder="Add any notes about this scan..."
              />
            </div>

            {/* Status Message */}
            {lastMessage && (
              <div
                className={`p-4 rounded-lg font-semibold flex items-center gap-3 transition ${
                  lastMessageType === 'success'
                    ? 'bg-green-900 border border-green-600 text-green-200'
                    : 'bg-red-900 border border-red-600 text-red-200'
                }`}
              >
                <span className="text-2xl">
                  {lastMessageType === 'success' ? '✓' : '✗'}
                </span>
                <span>{lastMessage}</span>
              </div>
            )}

            {/* QR Scanner Component */}
            {scannerOpen && (
              <div className="rounded-lg overflow-hidden border-2 border-blue-500">
                <QRScanner
                  isOpen={scannerOpen}
                  onScan={handleScan}
                />
              </div>
            )}

            {/* Scanner Toggle Button */}
            <button
              onClick={() => setScannerOpen(!scannerOpen)}
              disabled={isProcessing}
              className={`w-full px-6 py-4 rounded-lg font-semibold transition text-lg active:scale-95 flex items-center justify-center gap-2 ${
                scannerOpen
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {scannerOpen ? (
                <>
                  <span>✕</span>
                  Close Scanner
                </>
              ) : (
                <>
                  <span>📱</span>
                  Open Scanner
                </>
              )}
            </button>

            {/* Touch Hint for Mobile */}
            <div className="text-center text-xs text-slate-400 bg-slate-700 rounded-lg p-3">
              💡 Position the camera to scan QR codes
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
