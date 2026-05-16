import { NextApiRequest, NextApiResponse } from 'next';
import { initializeSocket } from '@/lib/socket';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const socketServer = (res.socket as any)?.server;
  if (!socketServer?.io) {
    console.log('Initializing Socket.io...');
    if (socketServer) {
      initializeSocket(socketServer);
      socketServer.io = true;
    }
  }
  res.end();
}
