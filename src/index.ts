import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { startDbListener } from './services/db-listener.service.js';
import { initializeSocket } from './services/socket.service.js';

const app = express();
const httpServer = createServer(app);

// CORS configuration - allow multiple frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  ...(process.env.FRONTEND_URL?.split(',') || []),
  ...(process.env.MAIN_FRONTEND_URL?.split(',') || []),
].filter(Boolean).map(url => url.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false);
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api', routes);

// Error handling
app.use(errorHandler);

// Start server
const PORT = process.env.PORT || 3001;

// Initialize Socket.IO
initializeSocket(httpServer, allowedOrigins);

httpServer.listen(PORT, async () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);
  console.log(`Socket.IO enabled for real-time updates`);

  // Start database listener for real-time updates
  await startDbListener();
});

export default app;
