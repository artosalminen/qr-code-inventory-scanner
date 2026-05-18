import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Layout from '@/components/Layout';
import QRScanner from '@/components/QRScanner';
import { BoxState, Project, ScanAction } from '@/types';
import { useTranslations } from 'next-intl';

interface ScanHistoryEntry {
  label: string;
  qrCode: string;
  newState: BoxState;
  timestamp: Date;
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  return `${Math.floor(minutes / 60)}h ago`;
}

const stateBadgeColors: Record<BoxState, string> = {
  expected: 'bg-purple-900/50 text-purple-300 border border-purple-700',
  received: 'bg-blue-900/50 text-blue-300 border border-blue-700',
  in_use: 'bg-yellow-900/50 text-yellow-300 border border-yellow-700',
  ready_for_checkout: 'bg-orange-900/50 text-orange-300 border border-orange-700',
  departed: 'bg-green-900/50 text-green-300 border border-green-700',
};

export default function ScannerPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations('scanner');
  const tCommon = useTranslations('common');
  const tStates = useTranslations('states');

  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [scanMode, setScanMode] = useState<ScanAction>('check_in');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [lastMessage, setLastMessage] = useState('');
  const [lastMessageType, setLastMessageType] = useState<'success' | 'error'>('success');
  const [condition, setCondition] = useState('ok');
  const [notes, setNotes] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [addBoxFormOpen, setAddBoxFormOpen] = useState(false);
  const [addBoxQr, setAddBoxQr] = useState('');
  const [addBoxLabel, setAddBoxLabel] = useState('');
  const [addBoxError, setAddBoxError] = useState('');
  const [isAddingBox, setIsAddingBox] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryEntry[]>([]);
  const [pendingScanQr, setPendingScanQr] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<(File | null)[]>([null, null, null]);
  const [imagePreviewUrls, setImagePreviewUrls] = useState<(string | null)[]>([null, null, null]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [uploadWarning, setUploadWarning] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (status === 'unauthenticated') router.push('/');
  }, [status, router]);

  useEffect(() => { fetchProjects(); }, []);

  useEffect(() => {
    if (selectedProjectId) fetchProjectRole(selectedProjectId);
  }, [selectedProjectId, session]);

  useEffect(() => {
    setPendingScanQr(null);
    setAddBoxFormOpen(false);
    setAddBoxQr('');
    setAddBoxLabel('');
    setAddBoxError('');
    setLastMessage('');
  }, [selectedProjectId, scanMode]);

  // Reset to activate when role changes to installation and current mode is disabled.
  // scanMode intentionally omitted from deps — reset only needed on role change, not every mode change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (userRole === 'installation' && ['check_in', 'check_out'].includes(scanMode)) {
      setScanMode('activate');
    }
  }, [userRole]);

  async function fetchProjectRole(projectId: string) {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}`);
      const currentUserProject = data.projectUsers?.find(
        (pu: any) => pu.userId === (session?.user as any)?.id,
      );
      setUserRole(currentUserProject?.role || null);
    } catch {
      setUserRole(null);
    }
  }

  async function fetchProjects() {
    try {
      const { data } = await axios.get('/api/projects');
      setProjects(data);
      if (data.length > 0) setSelectedProjectId(data[0].id);
    } catch (error) {
      console.error('Failed to fetch projects:', error);
    }
  }

  async function handleScan(qrCode: string) {
    if (!selectedProjectId || isProcessing) return;
    setPendingScanQr(qrCode);
    setScannerOpen(false);
    setLastMessage('');
  }

  async function handleConfirmScan() {
    if (!pendingScanQr || !selectedProjectId || isProcessing) return;
    setIsProcessing(true);
    try {
      const { data } = await axios.post('/api/boxes/scan', {
        projectId: selectedProjectId,
        qrCode: pendingScanQr,
        action: scanMode,
        condition,
        notes,
      });

      const filesToUpload = pendingImages.filter((f): f is File => f !== null);
      if (filesToUpload.length > 0 && data.historyId) {
        try {
          const uploadedUrls: string[] = [];
          for (const file of filesToUpload) {
            const params = new URLSearchParams({
              filename: file.name,
              historyId: data.historyId,
              projectId: selectedProjectId,
              boxId: data.box.id,
            });
            const uploadRes = await axios.post(
              `/api/images/upload?${params}`,
              file,
              { headers: { 'Content-Type': file.type || 'application/octet-stream' } },
            );
            uploadedUrls.push(uploadRes.data.url);
          }
          await axios.patch(`/api/boxes/history/${data.historyId}/images`, {
            imageUrls: uploadedUrls,
          });
        } catch {
          setUploadWarning(t('photoUploadFailed'));
        }
      }

      setLastMessage(`${data.box.label || 'Box'} — ${tStates(data.newState)}`);
      setLastMessageType('success');
      setScanHistory((prev) =>
        [
          {
            label: data.box.label || data.box.qrCode,
            qrCode: data.box.qrCode,
            newState: data.newState as BoxState,
            timestamp: new Date(),
          },
          ...prev,
        ].slice(0, 5),
      );
      setPendingScanQr(null);
      setNotes('');
      setCondition('ok');
      resetImages();
      setTimeout(() => setScannerOpen(true), 1500);
    } catch (error: any) {
      const isNotFound = error.response?.status === 404;
      if (isNotFound && canAddBoxes) {
        setAddBoxFormOpen(true);
        setAddBoxQr(pendingScanQr);
        setAddBoxLabel('');
        setAddBoxError('');
      } else {
        setLastMessage(error.response?.data?.error || t('scanFailed'));
        setLastMessageType('error');
      }
    } finally {
      setIsProcessing(false);
    }
  }

  function handleRescan() {
    setPendingScanQr(null);
    setCondition('ok');
    setNotes('');
    setLastMessage('');
    resetImages();
    setAddBoxFormOpen(false);
    setScannerOpen(true);
  }

  async function handleAddBox() {
    if (!addBoxQr.trim() || !selectedProjectId || isAddingBox) return;
    setIsAddingBox(true);
    setAddBoxError('');
    try {
      await axios.post(`/api/projects/${selectedProjectId}/boxes`, {
        qrCode: addBoxQr.trim(),
        description: addBoxLabel.trim() || undefined,
        condition,
        notes: notes || undefined,
      });
      setLastMessage(t('boxAdded', { qr: addBoxQr.trim() }));
      setLastMessageType('success');
      setAddBoxFormOpen(false);
      setAddBoxQr('');
      setAddBoxLabel('');
      setScannerOpen(false);
      setScanHistory((prev) =>
        [
          {
            label: addBoxLabel.trim() || addBoxQr.trim(),
            qrCode: addBoxQr.trim(),
            newState: 'received' as BoxState,
            timestamp: new Date(),
          },
          ...prev,
        ].slice(0, 5),
      );
    } catch (error: any) {
      setAddBoxError(error.response?.data?.error || t('addBoxFailed'));
    } finally {
      setIsAddingBox(false);
    }
  }

  function resetImages() {
    imagePreviewUrls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
    setPendingImages([null, null, null]);
    setImagePreviewUrls([null, null, null]);
    setUploadWarning('');
  }

  function handleSlotClick(slotIndex: number) {
    setActiveSlot(slotIndex);
    fileInputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || activeSlot === null) return;
    const newImages = [...pendingImages];
    newImages[activeSlot] = file;
    setPendingImages(newImages);
    const newPreviews = [...imagePreviewUrls];
    if (newPreviews[activeSlot]) URL.revokeObjectURL(newPreviews[activeSlot]!);
    newPreviews[activeSlot] = URL.createObjectURL(file);
    setImagePreviewUrls(newPreviews);
    e.target.value = '';
    setActiveSlot(null);
  }

  function handleRemoveImage(slotIndex: number) {
    const newImages = [...pendingImages];
    const newPreviews = [...imagePreviewUrls];
    if (newPreviews[slotIndex]) URL.revokeObjectURL(newPreviews[slotIndex]!);
    newImages[slotIndex] = null;
    newPreviews[slotIndex] = null;
    setPendingImages(newImages);
    setImagePreviewUrls(newPreviews);
  }

  if (status === 'loading') {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin text-3xl mb-4">⌛</div>
            <p className="text-slate-400">{tCommon('loading')}</p>
          </div>
        </div>
      </Layout>
    );
  }

  const canAddBoxes =
    scanMode === 'check_in' && ['admin', 'inventory_management'].includes(userRole ?? '');

  const scanModes: { value: ScanAction; label: string; icon: string; disabled: boolean }[] = [
    { value: 'check_in',  label: t('checkIn'),  icon: '📥', disabled: userRole === 'installation' },
    { value: 'activate',  label: t('activate'), icon: '⚡', disabled: false },
    { value: 'return',    label: t('return'),   icon: '↩️', disabled: false },
    { value: 'check_out', label: t('checkOut'), icon: '📤', disabled: userRole === 'installation' },
  ];

  const addBoxForm = (
    <div className="bg-slate-700 border border-green-600 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-slate-50">{t('addNewBox')}</h3>
        <button onClick={() => setAddBoxFormOpen(false)} className="text-slate-400 hover:text-slate-200 transition">✕</button>
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{t('qrCodeRequired')}</label>
        <input type="text" value={addBoxQr} onChange={(e) => setAddBoxQr(e.target.value)} placeholder={t('qrCodePlaceholder')} className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div>
        <label className="block text-xs font-medium text-slate-400 mb-1">{t('descriptionOptional')}</label>
        <input type="text" value={addBoxLabel} onChange={(e) => setAddBoxLabel(e.target.value)} placeholder={t('descriptionPlaceholder')} className="w-full px-3 py-2 bg-slate-600 border border-slate-500 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-green-500" />
      </div>
      <div className="text-xs text-slate-400 bg-slate-600 rounded-lg px-3 py-2">
        {tCommon('condition')}: <span className="text-slate-200 font-medium">
          {condition === 'ok' ? tCommon('conditionOk') : tCommon('conditionDamaged')}
        </span>
        {notes && <> · {notes}</>}
      </div>
      {addBoxError && <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">{addBoxError}</p>}
      <button onClick={handleAddBox} disabled={isAddingBox || !addBoxQr.trim()} className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition active:scale-95">
        {isAddingBox ? tCommon('adding') : t('addAndCheckIn')}
      </button>
    </div>
  );

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-50">{t('title')}</h1>
            <p className="text-slate-400 mt-1">{t('subtitle')}</p>
          </div>
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-3 bg-slate-800 border border-slate-600 text-slate-50 rounded-lg hover:border-slate-500 transition focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {lastMessage && !pendingScanQr && (
          <div className={`p-4 rounded-lg font-semibold flex items-center gap-3 transition ${
            lastMessageType === 'success'
              ? 'bg-green-900 border border-green-600 text-green-200'
              : 'bg-red-900 border border-red-600 text-red-200'
          }`}>
            <span className="text-2xl">{lastMessageType === 'success' ? '✓' : '✗'}</span>
            <span>{lastMessage}</span>
          </div>
        )}

        {pendingScanQr !== null ? (
          <div className="bg-slate-800 border border-blue-600 rounded-lg overflow-hidden">
            <div className="p-6 space-y-5">
              <div>
                <h2 className="text-lg font-bold text-slate-50 mb-1">{t('confirmScan')}</h2>
                <p className="text-slate-400 text-sm">
                  {scanModes.find((m) => m.value === scanMode)?.icon}{' '}
                  {scanModes.find((m) => m.value === scanMode)?.label}
                </p>
              </div>

              <div className="bg-slate-700 rounded-lg px-4 py-3">
                <div className="text-xs text-slate-400 mb-1">{t('qrCode')}</div>
                <div className="font-mono text-slate-50 text-sm break-all">{pendingScanQr}</div>
              </div>

              {['check_in', 'check_out'].includes(scanMode) && (
                <div>
                  <label className="block text-slate-200 font-semibold mb-3">{t('itemCondition')}</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'ok', label: tCommon('conditionOk'), icon: '👍' },
                      { value: 'damaged', label: tCommon('conditionDamaged'), icon: '🔧' },
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

              <div>
                <label className="block text-slate-200 font-semibold mb-3">{t('notesOptional')}</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder={t('notesPlaceholder')}
                />
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-3">
                  {t('photosOptional')}
                </label>
                <div className="flex gap-3">
                  {[0, 1, 2].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() =>
                        imagePreviewUrls[slot]
                          ? handleRemoveImage(slot)
                          : handleSlotClick(slot)
                      }
                      className="relative w-20 h-20 rounded-lg border-2 border-dashed border-slate-500 flex items-center justify-center overflow-hidden bg-slate-700 hover:border-slate-400 transition"
                    >
                      {imagePreviewUrls[slot] ? (
                        <>
                          <img
                            src={imagePreviewUrls[slot]!}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-0 right-0 bg-red-600 text-white text-xs w-5 h-5 flex items-center justify-center rounded-bl">
                            ✕
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl text-slate-400">+</span>
                      )}
                    </button>
                  ))}
                </div>
                {uploadWarning && (
                  <p className="text-xs text-amber-400 mt-2">{uploadWarning}</p>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleFileChange}
              />

              {addBoxFormOpen && addBoxForm}

              {lastMessage && lastMessageType === 'error' && (
                <div className="p-4 rounded-lg font-semibold flex items-center gap-3 bg-red-900 border border-red-600 text-red-200">
                  <span className="text-2xl">✗</span>
                  <span>{lastMessage}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleRescan}
                  className="flex-1 px-4 py-3 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-semibold transition"
                >
                  {t('rescan')}
                </button>
                <button
                  onClick={handleConfirmScan}
                  disabled={isProcessing || addBoxFormOpen}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold transition active:scale-95"
                >
                  {isProcessing ? tCommon('processing') : tCommon('confirm')}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-slate-200 font-semibold mb-3">{t('scanMode')}</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {scanModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => !mode.disabled && setScanMode(mode.value)}
                      disabled={mode.disabled}
                      className={`px-4 py-3 rounded-lg font-medium transition flex flex-col items-center gap-1 text-sm ${
                        mode.disabled
                          ? 'opacity-50 cursor-not-allowed bg-slate-700 text-slate-500'
                          : scanMode === mode.value
                            ? 'bg-blue-600 text-white ring-2 ring-blue-400'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                      }`}
                    >
                      <span className="text-xl">{mode.icon}</span>
                      <span className="text-xs">{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {scannerOpen && (
                <div className="rounded-lg overflow-hidden border-2 border-blue-500">
                  <QRScanner isOpen={scannerOpen} onScan={handleScan} />
                </div>
              )}

              <button
                onClick={() => setScannerOpen(!scannerOpen)}
                disabled={isProcessing}
                className={`w-full px-6 py-4 rounded-lg font-semibold transition text-lg active:scale-95 flex items-center justify-center gap-2 ${
                  scannerOpen
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {scannerOpen
                  ? <><span>✕</span> {t('closeScanner')}</>
                  : <><span>📱</span> {t('openScanner')}</>}
              </button>

              {canAddBoxes && !addBoxFormOpen && (
                <button
                  onClick={() => { setAddBoxFormOpen(true); setAddBoxQr(''); setAddBoxLabel(''); setAddBoxError(''); }}
                  className="w-full px-4 py-3 bg-slate-700 hover:bg-slate-600 border border-dashed border-slate-500 text-slate-300 rounded-lg font-medium transition flex items-center justify-center gap-2"
                >
                  <span>➕</span> {t('addBoxManually')}
                </button>
              )}

              {addBoxFormOpen && addBoxForm}

              <div className="text-center text-xs text-slate-400 bg-slate-700 rounded-lg p-3">
                💡 {t('positionCamera')}
              </div>
            </div>
          </div>
        )}

        {scanHistory.length > 0 && (
          <div className="bg-slate-800 border border-slate-700 rounded-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-700">
              <h2 className="font-semibold text-slate-200 text-sm">{t('recentScans')}</h2>
            </div>
            <div className="divide-y divide-slate-700">
              {scanHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between px-5 py-3 gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-slate-50 text-sm truncate">{entry.label}</div>
                    <div className="text-xs text-slate-500 truncate">{entry.qrCode}</div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full ${stateBadgeColors[entry.newState]}`}>
                      {tStates(entry.newState)}
                    </span>
                    <span className="text-xs text-slate-500 w-16 text-right">{timeAgo(entry.timestamp)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
