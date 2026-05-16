import { NextApiRequest, NextApiResponse } from 'next';
import { initializeSocket } from '@/lib/socket';

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!res.socket.server.io) {
    console.log('Initializing Socket.io...');
    const httpServer = res.socket.server as any;
    initializeSocket(httpServer);
    res.socket.server.io = true;
  }
  res.end();
}
