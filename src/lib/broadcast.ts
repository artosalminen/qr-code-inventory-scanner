import { getIO } from './socket';
import { BoxState } from '@/types';

export interface BoxStateChangedPayload {
  boxId: string;
  newState: BoxState;
  user: {
    id: string;
    name: string;
    email: string;
  };
  timestamp: Date;
  condition?: string;
  installationUser?: {
    id: string;
    name: string;
  };
  notes?: string;
}

export function broadcastBoxStateChanged(
  projectId: string,
  payload: BoxStateChangedPayload,
): void {
  try {
    const io = getIO();
    io.to(`project-${projectId}`).emit('box_state_changed', payload);
  } catch (error) {
    console.error('Failed to broadcast box state change:', error);
  }
}

export function broadcastBoxScanned(
  projectId: string,
  data: {
    boxId: string;
    label: string;
    qrCode: string;
    timestamp: Date;
  },
): void {
  try {
    const io = getIO();
    io.to(`project-${projectId}`).emit('box_scanned', data);
  } catch (error) {
    console.error('Failed to broadcast box scan:', error);
  }
}
