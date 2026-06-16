import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  initGridState,
  addUser,
  removeUser,
  updateUserMeta,
  claimBlockInMemory,
  computeLeaderboard,
  getOnlineUsersList,
  serializeGrid,
  onlineUsers,
  GRID_SIZE,
} from './state';
import { initializeDB, getAllBlocks, upsertUser, claimBlock } from './db';

// ─── Server Setup ────────────────────────────────────────────────────────────

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// ─── Broadcast Helper ────────────────────────────────────────────────────────

function broadcast(data: object, excludeId?: string): void {
  const message = JSON.stringify(data);
  for (const [id, user] of onlineUsers) {
    if (id === excludeId) continue;
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(message);
    }
  }
}

function broadcastAll(data: object): void {
  broadcast(data, undefined);
}

function sendTo(ws: WebSocket, data: object): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

// ─── Adjective + Noun Random Name Generator ──────────────────────────────────

const ADJECTIVES = ['Neon', 'Cyber', 'Solar', 'Hyper', 'Void', 'Astral', 'Pixel', 'Ghost', 'Nova', 'Dark', 'Chrono', 'Echo', 'Vortex', 'Storm'];
const NOUNS = ['Knight', 'Wolf', 'Sprite', 'Phantom', 'Drake', 'Wraith', 'Hawk', 'Comet', 'Cipher', 'Blade', 'Titan', 'Shard', 'Pulse', 'Flux'];
const COLORS = ['#FF007F', '#00FFCC', '#7C3AED', '#F59E0B', '#06B6D4', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#F97316', '#84CC16'];

function randomName(): string {
  const a = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const n = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  return `${a}${n}`;
}

function randomColor(): string {
  return COLORS[Math.floor(Math.random() * COLORS.length)];
}

// ─── WebSocket Connection Handler ────────────────────────────────────────────

wss.on('connection', (ws: WebSocket) => {
  const userId = uuidv4();
  const username = randomName();
  const color = randomColor();

  console.log(`🔌 New connection: ${username} (${userId})`);

  // Register user in memory
  addUser({
    id: userId,
    username,
    color,
    ws,
    lastClaimAt: 0,
  });

  // Persist user to DB (fire and forget)
  upsertUser(userId, username, color).catch(console.error);

  // Send initial state to new user
  sendTo(ws, {
    type: 'INITIAL_STATE',
    payload: {
      userId,
      username,
      color,
      grid: serializeGrid(),
      onlineCount: onlineUsers.size,
      users: getOnlineUsersList(),
      leaderboard: computeLeaderboard(),
    },
  });

  // Notify all others of new user
  broadcast(
    {
      type: 'USER_JOIN',
      payload: { id: userId, username, color, onlineCount: onlineUsers.size },
    },
    userId
  );

  // ─── Message Handler ─────────────────────────────────────────────────────

  ws.on('message', (rawData: Buffer) => {
    let msg: { type: string; payload?: Record<string, unknown> };
    try {
      msg = JSON.parse(rawData.toString());
    } catch {
      return;
    }

    const user = onlineUsers.get(userId);
    if (!user) return;

    switch (msg.type) {
      // ── Ping / Pong ────────────────────────────────────────────────────────
      case 'PING':
        sendTo(ws, { type: 'PONG' });
        break;

      // ── Update Profile ─────────────────────────────────────────────────────
      case 'UPDATE_PROFILE': {
        const newUsername = (msg.payload?.username as string | undefined) ?? user.username;
        const newColor = (msg.payload?.color as string | undefined) ?? user.color;

        updateUserMeta(userId, newUsername, newColor);
        upsertUser(userId, newUsername, newColor).catch(console.error);

        // Broadcast updated user info and leaderboard to everyone
        broadcastAll({
          type: 'USER_UPDATED',
          payload: { id: userId, username: newUsername, color: newColor },
        });

        // Also broadcast leaderboard refresh
        broadcastAll({
          type: 'LEADERBOARD_UPDATE',
          payload: { leaderboard: computeLeaderboard() },
        });
        break;
      }

      // ── Claim Block ────────────────────────────────────────────────────────
      case 'CLAIM_BLOCK': {
        const blockId = msg.payload?.blockId as number | undefined;
        if (blockId === undefined || blockId < 0 || blockId >= GRID_SIZE) {
          sendTo(ws, { type: 'ERR', payload: { message: 'Invalid block ID' } });
          return;
        }

        const now = Date.now();
        const result = claimBlockInMemory(userId, blockId, user.username, user.color, now);

        if (!result.success) {
          sendTo(ws, {
            type: 'COOLDOWN_ERR',
            payload: { cooldownRemainingMs: result.cooldownRemainingMs },
          });
          return;
        }

        // Persist to DB asynchronously (does NOT block the event loop)
        claimBlock(blockId, userId, now).catch(console.error);

        // Broadcast block update to ALL users
        broadcastAll({
          type: 'BLOCK_UPDATE',
          payload: {
            blockId,
            ownerId: userId,
            ownerName: user.username,
            color: user.color,
            claimedAt: now,
          },
        });

        // Broadcast refreshed leaderboard to ALL users
        broadcastAll({
          type: 'LEADERBOARD_UPDATE',
          payload: { leaderboard: computeLeaderboard() },
        });

        console.log(`🟦 ${user.username} claimed block #${blockId}`);
        break;
      }

      default:
        break;
    }
  });

  // ─── Disconnect Handler ───────────────────────────────────────────────────

  ws.on('close', () => {
    console.log(`🔌 Disconnected: ${username} (${userId})`);
    removeUser(userId);
    broadcastAll({
      type: 'USER_LEAVE',
      payload: { id: userId, username, onlineCount: onlineUsers.size },
    });
  });

  ws.on('error', (err) => {
    console.error(`⚠️  WebSocket error for ${username}:`, err.message);
    removeUser(userId);
  });
});

// ─── REST API Endpoints ───────────────────────────────────────────────────────

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', connections: onlineUsers.size, blocks: GRID_SIZE });
});

// Get leaderboard
app.get('/api/leaderboard', (_req, res) => {
  res.json({ leaderboard: computeLeaderboard() });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

async function start() {
  try {
    await initializeDB(GRID_SIZE);
    const blocks = await getAllBlocks();
    initGridState(blocks);

    server.listen(PORT, () => {
      console.log(`\n🚀 GridCraft backend running!`);
      console.log(`   HTTP  → http://localhost:${PORT}`);
      console.log(`   WS    → ws://localhost:${PORT}`);
      console.log(`   Grid  → ${GRID_SIZE} blocks ready\n`);
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
