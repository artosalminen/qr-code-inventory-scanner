import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import axios from 'axios';
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

      setLastMessage(`✓ ${data.box.label || 'Box'} - ${data.newState}`);
      setNotes('');
      setCondition('ok');
      setScannerOpen(false);

      // Reset for next scan
      setTimeout(() => {
        setScannerOpen(true);
      }, 1000);
    } catch (error: any) {
      const message = error.response?.data?.error || 'Scan failed';
      setLastMessage(`✗ ${message}`);
    } finally {
      setIsProcessing(false);
    }
  }

  if (status === 'loading') {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <header className="bg-white p-4 shadow">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Scanner</h1>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-2 border rounded"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Scan Mode</label>
            <div className="flex gap-2 flex-wrap">
              {(['check_in', 'activate', 'return', 'check_out'] as ScanAction[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setScanMode(mode)}
                  className={`px-4 py-2 rounded font-medium ${
                    scanMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {mode.replace(/_/g, ' ').toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {['check_in', 'check_out'].includes(scanMode) && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="ok">OK</option>
                <option value="damaged">Damaged</option>
              </select>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={2}
              placeholder="Optional notes..."
            />
          </div>

          {lastMessage && (
            <div className={`p-3 mb-4 rounded font-medium ${lastMessage.startsWith('✓') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {lastMessage}
            </div>
          )}

          {scannerOpen && <QRScanner isOpen={scannerOpen} onScan={handleScan} />}

          <button
            onClick={() => setScannerOpen(!scannerOpen)}
            className="w-full mt-4 px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700"
          >
            {scannerOpen ? 'Close Scanner' : 'Open Scanner'}
          </button>
        </div>
      </main>
    </div>
  );
}
