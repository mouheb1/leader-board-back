import { Server as SocketIOServer } from 'socket.io';
import type { Server } from 'http';
import { getLeaderboard } from './team.service.js';

let io: SocketIOServer | null = null;

export function initializeSocket(httpServer: Server, allowedOrigins: string[]): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: allowedOrigins,
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', async (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // Send initial leaderboard data
    try {
      const leaderboard = await getLeaderboard();
      socket.emit('leaderboard:update', leaderboard);
      console.log('[Socket] Sent initial leaderboard to client');
    } catch (error) {
      console.error('[Socket] Error sending initial leaderboard:', error);
    }

    socket.on('disconnect', () => {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[Socket] Socket.IO initialized');
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

export function getClientCount(): number {
  if (!io) return 0;
  return io.sockets.sockets.size;
}

export async function broadcastLeaderboard(): Promise<void> {
  if (!io) {
    console.log('[Socket] Socket.IO not initialized');
    return;
  }

  const clientCount = io.sockets.sockets.size;
  if (clientCount === 0) {
    console.log('[Socket] No clients connected, skipping broadcast');
    return;
  }

  try {
    const leaderboard = await getLeaderboard();
    io.emit('leaderboard:update', leaderboard);
    console.log(`[Socket] Broadcast to ${clientCount} clients`);
  } catch (error) {
    console.error('[Socket] Error broadcasting:', error);
  }
}
