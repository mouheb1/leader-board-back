import pg from 'pg';
import { broadcastLeaderboard } from './sse.service.js';
const { Client } = pg;
let client = null;
let isConnected = false;
let reconnectTimeout = null;
function handleNotification(msg) {
    console.log('[DB Listener] Received notification on channel:', msg.channel);
    if (msg.channel === 'team_score_updates' && msg.payload) {
        try {
            const payload = JSON.parse(msg.payload);
            console.log(`[DB Listener] Score change: "${payload.name}" ${payload.old_score} → ${payload.new_score}`);
            // Broadcast updated leaderboard to all SSE clients
            broadcastLeaderboard();
        }
        catch (error) {
            console.error('[DB Listener] Error parsing payload:', error);
        }
    }
}
async function connect() {
    if (isConnected || client) {
        console.log('[DB Listener] Already connected');
        return;
    }
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error('[DB Listener] DATABASE_URL not set');
        return;
    }
    console.log('[DB Listener] Connecting to PostgreSQL...');
    client = new Client({ connectionString });
    client.on('notification', handleNotification);
    client.on('error', (err) => {
        console.error('[DB Listener] Database error:', err.message);
        isConnected = false;
        scheduleReconnect();
    });
    client.on('end', () => {
        console.log('[DB Listener] Connection ended');
        isConnected = false;
        client = null;
        scheduleReconnect();
    });
    try {
        await client.connect();
        isConnected = true;
        console.log('[DB Listener] Connected to PostgreSQL');
        await client.query('LISTEN team_score_updates');
        console.log('[DB Listener] Listening for team_score_updates');
    }
    catch (error) {
        console.error('[DB Listener] Connection error:', error);
        isConnected = false;
        client = null;
        scheduleReconnect();
    }
}
function scheduleReconnect() {
    if (reconnectTimeout)
        return;
    console.log('[DB Listener] Reconnecting in 5 seconds...');
    reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connect();
    }, 5000);
}
export async function startDbListener() {
    console.log('[DB Listener] Starting...');
    await connect();
}
export async function stopDbListener() {
    console.log('[DB Listener] Stopping...');
    if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
        reconnectTimeout = null;
    }
    if (client) {
        try {
            await client.query('UNLISTEN team_score_updates');
            await client.end();
        }
        catch (error) {
            console.error('[DB Listener] Error stopping:', error);
        }
        client = null;
        isConnected = false;
    }
}
//# sourceMappingURL=db-listener.service.js.map