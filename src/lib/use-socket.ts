import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;
let initCalled = false;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    async function init() {
      try {
        if (!initCalled) {
          initCalled = true;
          await fetch('/api/socket');
        }
        if (!socketInstance) {
          socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            // Stop after 3 attempts — avoids console spam on Vercel/serverless
            reconnectionAttempts: 3,
          });
          socketInstance.on('connect_error', () => {
            // Real-time unavailable — app continues with manual refresh
          });
        }
        setSocket(socketInstance);
      } catch {
        // Socket unavailable — dashboard works without real-time
      }
    }
    init();
  }, []);

  return socket;
}

export function useProjectSocket(projectId: string | null) {
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!socket || !projectId) {
      return;
    }

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('join_project', { projectId });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.emit('join_project', { projectId });

    return () => {
      if (projectId) {
        socket.emit('leave_project', { projectId });
      }
    };
  }, [socket, projectId]);

  return { socket, isConnected };
}
