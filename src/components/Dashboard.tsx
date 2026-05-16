import { useEffect, useState } from 'react';
import axios from 'axios';
import { Box, BoxState, BoxStateHistory } from '@/types';
import RealtimeSync from './RealtimeSync';

interface DashboardProps {
  projectId: string;
}

const stateColors: Record<BoxState, string> = {
  received: 'bg-blue-100 border-blue-300',
  in_use: 'bg-yellow-100 border-yellow-300',
  ready_for_checkout: 'bg-orange-100 border-orange-300',
  departed: 'bg-green-100 border-green-300',
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
  const [boxes, setBoxes] = useState<BoxWithState[]>([]);
  const [selectedBox, setSelectedBox] = useState<BoxWithState | null>(null);
  const [history, setHistory] = useState<BoxStateHistory[]>([]);
  const [filterState, setFilterState] = useState<BoxState | 'all'>('all');

  useEffect(() => {
    fetchBoxes();
  }, [projectId]);

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

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          <div className="text-gray-600 text-sm">Total</div>
          <div className="text-3xl font-bold">{stats.total}</div>
        </div>
        <div className="bg-blue-100 p-4 rounded shadow">
          <div className="text-gray-600 text-sm">Received</div>
          <div className="text-3xl font-bold">{stats.received}</div>
        </div>
        <div className="bg-yellow-100 p-4 rounded shadow">
          <div className="text-gray-600 text-sm">In Use</div>
          <div className="text-3xl font-bold">{stats.inUse}</div>
        </div>
        <div className="bg-green-100 p-4 rounded shadow">
          <div className="text-gray-600 text-sm">Departed</div>
          <div className="text-3xl font-bold">{stats.departed}</div>
        </div>
      </div>

      <div className="mb-4 flex gap-2 flex-wrap">
        {(['all', 'received', 'in_use', 'ready_for_checkout', 'departed'] as const).map((state) => (
          <button
            key={state}
            onClick={() => setFilterState(state)}
            className={`px-4 py-2 rounded font-medium ${
              filterState === state
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
            }`}
          >
            {state === 'all' ? 'All' : stateLabels[state]}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4">
        {filteredBoxes.map((box) => {
          const currentState = (box.currentState || 'received') as BoxState;
          return (
            <div
              key={box.id}
              onClick={() => handleSelectBox(box)}
              className={`p-4 rounded border-2 cursor-pointer transition ${stateColors[currentState]} ${
                selectedBox?.id === box.id ? 'ring-2 ring-blue-500' : ''
              }`}
            >
              <div className="font-bold text-sm truncate">{box.label || 'Unlabeled'}</div>
              <div className="text-xs text-gray-600">{box.qrCode}</div>
              <div className="mt-2 text-sm font-medium">{stateLabels[currentState]}</div>
            </div>
          );
        })}
      </div>

      {selectedBox && (
        <div className="fixed bottom-0 left-0 right-0 bg-white p-6 border-t max-h-[50vh] overflow-y-auto">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h3 className="text-lg font-bold">{selectedBox.label || 'Unlabeled'}</h3>
              <p className="text-gray-600 text-sm">{selectedBox.qrCode}</p>
            </div>
            <button onClick={() => setSelectedBox(null)} className="text-2xl">
              ×
            </button>
          </div>

          <div className="space-y-3">
            {history.length > 0 ? (
              history.map((h) => (
                <div key={h.id} className="bg-gray-100 p-3 rounded text-sm">
                  <div className="font-medium">{stateLabels[h.state as BoxState]}</div>
                  <div className="text-xs text-gray-600">
                    {new Date(h.createdAt).toLocaleString()}
                  </div>
                  {h.notes && <div className="mt-1 text-gray-700">{h.notes}</div>}
                  {h.condition && <div className="text-xs font-medium">Condition: {h.condition}</div>}
                </div>
              ))
            ) : (
              <div className="text-gray-500 text-sm">No history available</div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
