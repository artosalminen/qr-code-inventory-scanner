import { Server as HTTPServer } from 'http';
import { Socket as ServerSocket, Server } from 'socket.io';

let io: Server;

export function initializeSocket(httpServer: HTTPServer): Server {
  if (io) {
    return io;
  }

  io = new Server(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
      credentials: true,
    },
  });

  io.on('connection', (socket: ServerSocket) => {
    socket.on('join_project', (data: { projectId: string }) => {
      socket.join(`project-${data.projectId}`);
    });

    socket.on('leave_project', (data: { projectId: string }) => {
      socket.leave(`project-${data.projectId}`);
    });

    socket.on('disconnect', () => {
      // User disconnected
    });
  });

  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
}
