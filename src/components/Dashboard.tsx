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
                {box.label || 'Unlabeled'}
              </div>
              <div className="text-xs sm:text-sm text-slate-300 mt-1">{box.qrCode}</div>
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
              <button
                onClick={() => setSelectedBox(null)}
                className="p-2 text-slate-400 hover:text-slate-50 hover:bg-slate-700 rounded-lg transition"
              >
                ✕
              </button>
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
    </>
  );
}
