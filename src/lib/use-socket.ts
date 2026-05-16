import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

let socketInstance: Socket | null = null;

export function useSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    if (!socketInstance) {
      socketInstance = io(process.env.NEXT_PUBLIC_SOCKET_URL || '', {
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        reconnectionAttempts: 5,
      });
    }

    setSocket(socketInstance);

    return () => {
      // Don't disconnect on component unmount
    };
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
