import { Router } from 'express';
import type { Request, Response } from 'express';
import { addClient, removeClient, getClientCount } from '../services/sse.service.js';
import { getLeaderboard } from '../services/team.service.js';

const router = Router();

// SSE endpoint for leaderboard updates
router.get('/leaderboard', async (req: Request, res: Response) => {
  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Set CORS header to the requesting origin (cors middleware handles validation)
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }

  // Prevent response buffering
  res.flushHeaders();

  // Add client to the list
  addClient(res);

  // Send initial leaderboard data
  try {
    const leaderboard = await getLeaderboard();
    res.write(`data: ${JSON.stringify(leaderboard)}\n\n`);
    console.log('[SSE] Sent initial leaderboard to client');
  } catch (error) {
    console.error('[SSE] Error sending initial leaderboard:', error);
  }

  // Handle client disconnect
  req.on('close', () => {
    removeClient(res);
  });
});

// Debug endpoint to check SSE status
router.get('/status', (_req: Request, res: Response) => {
  res.json({
    connectedClients: getClientCount(),
  });
});

export default router;
