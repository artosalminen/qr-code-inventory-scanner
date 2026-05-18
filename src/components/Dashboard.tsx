import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import axios from 'axios';
import { Box, BoxState, BoxStateHistory, ProjectUser } from '@/types';
import RealtimeSync from './RealtimeSync';

interface DashboardProps {
  projectId: string;
}

const stateColors: Record<BoxState, string> = {
  received: 'bg-blue-900 border-blue-500 hover:bg-blue-800',
  in_use: 'bg-yellow-900 border-yellow-500 hover:bg-yellow-800',
  ready_for_checkout: 'bg-orange-900 border-orange-500 hover:bg-orange-800',
  departed: 'bg-green-900 border-green-500 hover:bg-green-800',
};

const stateLabels: Record<BoxState, string> = {
  received: 'Received',
  in_use: 'In Use',
  ready_for_checkout: 'Ready for Checkout',
  departed: 'Departed',
};

interface BoxWithState extends Box {
  currentState?: BoxState;
  stateHistory?: BoxStateHistory[];
}

export default function Dashboard({ projectId }: DashboardProps) {
  const { data: session } = useSession();
  const [boxes, setBoxes] = useState<BoxWithState[]>([]);
  const [selectedBox, setSelectedBox] = useState<BoxWithState | null>(null);
  const [history, setHistory] = useState<BoxStateHistory[]>([]);
  const [filterState, setFilterState] = useState<BoxState | 'all'>('all');
  const [userRole, setUserRole] = useState<string | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editState, setEditState] = useState<BoxState>('received');
  const [editCondition, setEditCondition] = useState('ok');
  const [editNotes, setEditNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [editError, setEditError] = useState('');


  useEffect(() => {
    fetchBoxes();
    if (session?.user?.email) {
      fetchProjectRole();
    }
  }, [projectId, session]);

  async function fetchBoxes() {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}/boxes`);
      setBoxes(
        data.map((box: any) => ({
          ...box,
          currentState: (box.stateHistory?.[0]?.state || 'received') as BoxState,
        })),
      );
    } catch (error) {
      console.error('Failed to fetch boxes:', error);
    }
  }

  async function fetchProjectRole() {
    try {
      const { data } = await axios.get(`/api/projects/${projectId}`);
      const currentUserProject = data.projectUsers?.find(
        (pu: ProjectUser) => pu.userId === session?.user?.email,
      );
      setUserRole(currentUserProject?.role || null);
    } catch (error) {
      console.error('Failed to fetch project role:', error);
    }
  }

  async function handleSelectBox(box: BoxWithState) {
    setSelectedBox(box);
    try {
      const { data } = await axios.get(`/api/boxes/${box.id}`);
      setHistory(data.stateHistory || []);
    } catch (error) {
      console.error('Failed to fetch box history:', error);
    }
  }


  function handleOpenEdit() {
    setEditState((selectedBox?.currentState || 'received') as BoxState);
    setEditCondition(history[0]?.condition ?? 'ok');
    setEditNotes('');
    setEditError('');
    setEditModalOpen(true);
  }

  async function handleSaveEdit() {
    if (!selectedBox || isSaving) return;
    setIsSaving(true);
    setEditError('');
    try {
      await axios.post(`/api/boxes/${selectedBox.id}/state-override`, {
        newState: editState,
        condition: editCondition,
        notes: editNotes || undefined,
      });
      setEditModalOpen(false);
      fetchBoxes();
      handleSelectBox(selectedBox);
    } catch (error: any) {
      setEditError(error.response?.data?.error || 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  }

  function handleBoxStateChanged(payload: any) {
    // Update box list to reflect new state
    setBoxes((prev) =>
      prev.map((b) =>
        b.id === payload.boxId ? { ...b, currentState: payload.newState as BoxState } : b,
      ),
    );
    // Update selected box if it was changed
    if (selectedBox?.id === payload.boxId) {
      setSelectedBox((prev) =>
        prev ? { ...prev, currentState: payload.newState as BoxState } : null,
      );
    }
  }

  const stats = {
    total: boxes.length,
    received: boxes.filter((b) => b.currentState === 'received').length,
    inUse: boxes.filter((b) => b.currentState === 'in_use').length,
    readyForCheckout: boxes.filter((b) => b.currentState === 'ready_for_checkout').length,
    departed: boxes.filter((b) => b.currentState === 'departed').length,
  };

  const filteredBoxes =
    filterState === 'all' ? boxes : boxes.filter((b) => b.currentState === filterState);

  return (
    <>
      <RealtimeSync projectId={projectId} onBoxStateChanged={handleBoxStateChanged} />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <div className="bg-slate-800 border border-slate-700 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Total</div>
          <div className="text-2xl sm:text-4xl font-bold text-slate-50 mt-2">{stats.total}</div>
        </div>
        <div className="bg-slate-800 border border-blue-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Received</div>
          <div className="text-2xl sm:text-4xl font-bold text-blue-400 mt-2">{stats.received}</div>
        </div>
        <div className="bg-slate-800 border border-yellow-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">In Use</div>
          <div className="text-2xl sm:text-4xl font-bold text-yellow-400 mt-2">{stats.inUse}</div>
        </div>
        <div className="bg-slate-800 border border-green-500 p-4 sm:p-6 rounded-lg">
          <div className="text-slate-400 text-xs sm:text-sm">Departed</div>
          <div className="text-2xl sm:text-4xl font-bold text-green-400 mt-2">{stats.departed}</div>
        </div>
      </div>

      {/* Filter Buttons */}
      <div className="mb-6 flex gap-2 flex-wrap">
        {(['all', 'received', 'in_use', 'ready_for_checkout', 'departed'] as const).map((state) => (
          <button
            key={state}
            onClick={() => setFilterState(state)}
            className={`px-3 sm:px-4 py-2 rounded-lg font-medium transition text-sm sm:text-base ${
              filterState === state
                ? 'bg-blue-600 text-white'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-600'
            }`}
          >
            {state === 'all' ? 'All' : stateLabels[state]}
          </button>
        ))}
      </div>

      {/* Boxes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-24 sm:mb-0">
        {filteredBoxes.map((box) => {
          const currentState = (box.currentState || 'received') as BoxState;
          return (
            <button
              key={box.id}
              onClick={() => handleSelectBox(box)}
              className={`p-4 sm:p-6 rounded-lg border-2 cursor-pointer transition active:scale-95 text-left ${
                stateColors[currentState]
              } ${
                selectedBox?.id === box.id ? 'ring-2 ring-blue-400 bg-opacity-20' : ''
              }`}
            >
              <div className="font-bold text-sm sm:text-base truncate text-slate-50">
                {box.qrCode}
              </div>
              <div className="text-xs sm:text-sm text-slate-300 mt-1">{box.label || '-'}</div>
              <div className="mt-3 text-sm sm:text-base font-medium text-slate-50">
                {stateLabels[currentState]}
              </div>
            </button>
          );
        })}
      </div>

      {/* Bottom Sheet - Box Details */}
      {selectedBox && (
        <div className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-600 max-h-[60vh] sm:max-h-[50vh] overflow-y-auto rounded-t-lg sm:rounded-t-xl z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-lg sm:text-2xl font-bold text-slate-50">
                  {selectedBox.label || 'Unlabeled'}
                </h3>
                <p className="text-slate-400 text-sm mt-1">{selectedBox.qrCode}</p>
              </div>
              <div className="flex items-center gap-1">
                {userRole && ['admin', 'inventory_management'].includes(userRole) && (
                  <button
                    onClick={handleOpenEdit}
                    className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
                    title="Edit box"
                  >
                    ✏️
                  </button>
                )}
                <button
                  onClick={() => setSelectedBox(null)}
                  className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="space-y-4">

              {/* History */}
              <div className="space-y-3">
                <h4 className="font-semibold text-slate-200 text-sm">State History</h4>
                {history.length > 0 ? (
                  history.map((h) => (
                    <div key={h.id} className="bg-slate-700 border border-slate-600 p-4 rounded-lg">
                      <div className="font-medium text-slate-50">{stateLabels[h.state as BoxState]}</div>
                      <div className="text-xs text-slate-400 mt-1">
                        {new Date(h.createdAt).toLocaleString()}
                      </div>
                      {h.notes && <div className="mt-2 text-slate-300 text-sm">{h.notes}</div>}
                      {h.condition && (
                        <div className="text-xs font-medium text-slate-400 mt-1">
                          Condition: {h.condition}
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-slate-400 text-sm">No history available</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile overlay when details open */}
      {selectedBox && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30 sm:hidden"
          onClick={() => setSelectedBox(null)}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 z-50"
            onClick={() => setEditModalOpen(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl">
              <div className="flex items-center justify-between p-6 border-b border-slate-700">
                <h2 className="text-lg font-bold text-slate-50">
                  Edit — {selectedBox?.label || selectedBox?.qrCode}
                </h2>
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
                >
                  ✕
                </button>
              </div>
              <div className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">State</label>
                  <select
                    value={editState}
                    onChange={(e) => setEditState(e.target.value as BoxState)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="received">Received</option>
                    <option value="in_use">In Use</option>
                    <option value="ready_for_checkout">Ready for Checkout</option>
                    <option value="departed">Departed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Condition</label>
                  <div className="flex gap-3">
                    {[
                      { value: 'ok', label: '✓ OK' },
                      { value: 'damaged', label: '⚠️ Damaged' },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setEditCondition(opt.value)}
                        className={`flex-1 px-4 py-2 rounded-lg font-medium transition text-sm ${
                          editCondition === opt.value
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Notes (optional)</label>
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-700 border border-slate-600 text-slate-50 rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    rows={3}
                    placeholder="Describe the change..."
                  />
                </div>
                {editError && (
                  <p className="text-sm text-red-400 bg-red-950 border border-red-800 rounded-lg px-3 py-2">
                    {editError}
                  </p>
                )}
              </div>
              <div className="flex gap-3 p-6 pt-0">
                <button
                  onClick={() => setEditModalOpen(false)}
                  className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-lg font-medium transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={isSaving}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition"
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
