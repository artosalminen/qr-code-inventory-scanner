import { useEffect } from 'react';
import { useProjectSocket } from '@/lib/use-socket';
import { BoxStateChangedPayload } from '@/lib/broadcast';

interface RealtimeSyncProps {
  projectId: string;
  onBoxStateChanged?: (payload: BoxStateChangedPayload) => void;
}

export default function RealtimeSync({ projectId, onBoxStateChanged }: RealtimeSyncProps) {
  const { socket, isConnected } = useProjectSocket(projectId);

  useEffect(() => {
    if (!socket) return;

    socket.on('box_state_changed', (payload: BoxStateChangedPayload) => {
      if (onBoxStateChanged) {
        onBoxStateChanged(payload);
      }
    });

    socket.on('box_scanned', (data) => {
      console.log('Box scanned:', data);
    });

    return () => {
      socket.off('box_state_changed');
      socket.off('box_scanned');
    };
  }, [socket, onBoxStateChanged]);

  return null; // Silent component for event handling
}
