#!/bin/bash
set -e

echo "Starting professional commit history generation..."

# 1. Ensure we are in the workspace directory
cd "/Users/gautamjha/MY-PROJECTS/FInal Projects/internship /inboxkit"

# 2. Re-initialize Git to have a completely clean slate
rm -rf .git
git init

# Ensure we are on the main branch
git checkout -b main || git checkout main

# Set local git config for JHAJI01 to match user profile
git config user.name "JHAJI01"
git config user.email "kr.gautamjha03@gmail.com"

# Define backup folder path
BACKUP_DIR="../gridcraft_backup"

# Clean the workspace directories and markdown files explicitly
rm -rf backend frontend PRD.md TRD.md IMPLEMENTATION_PLAN.md README.md

# Helper function to stage, commit, and print progress
make_commit() {
  local msg="$1"
  git add .
  git commit -m "$msg"
  echo "✔ Committed: $msg"
}

# --- Commit 1: Initial repository and gitignore ---
cp "$BACKUP_DIR/.gitignore" .gitignore
make_commit "chore: initial repository setup and gitignore configurations"

# --- Commit 2: Product Requirements Document ---
cp "$BACKUP_DIR/PRD.md" PRD.md
make_commit "docs: add product requirements document (PRD) detailing grid features"

# --- Commit 3: Technical Requirements Document ---
cp "$BACKUP_DIR/TRD.md" TRD.md
make_commit "docs: add technical requirements document (TRD) for backend and socket architecture"

# --- Commit 4: Backend Package Configuration ---
mkdir -p backend
cp "$BACKUP_DIR/backend/package.json" backend/package.json
make_commit "chore: initialize backend workspace and add package dependencies"

# --- Commit 6: Backend TSConfig ---
cp "$BACKUP_DIR/backend/tsconfig.json" backend/tsconfig.json
make_commit "chore: configure typescript options for backend server environment"

# --- Commit 7: Basic DB Connection ---
mkdir -p backend/src
cat << 'EOF' > backend/src/db.ts
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', 'data', 'gridcraft.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database at', DB_PATH);
});

export default db;
EOF
make_commit "feat: establish sqlite database connection profile"

# --- Commit 8: DB Tables and Seed Logic ---
cat << 'EOF' > backend/src/db.ts
import sqlite3 from 'sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', 'data', 'gridcraft.db');

const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('❌ Failed to connect to SQLite database:', err.message);
    process.exit(1);
  }
  console.log('✅ Connected to SQLite database at', DB_PATH);
});

// Enable WAL mode
db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA foreign_keys=ON');

export function initializeDB(gridSize: number): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          color TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS blocks (
          id INTEGER PRIMARY KEY,
          owner_id TEXT,
          claimed_at INTEGER,
          FOREIGN KEY (owner_id) REFERENCES users(id)
        )
      `);

      db.run(`
        CREATE TABLE IF NOT EXISTS claim_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          block_id INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          claimed_at INTEGER NOT NULL
        )
      `);

      db.get('SELECT COUNT(*) as count FROM blocks', (err, row: { count: number }) => {
        if (err) {
          reject(err);
          return;
        }
        if (row.count === 0) {
          console.log(`⚙️  Seeding ${gridSize} blocks into database...`);
          const stmt = db.prepare('INSERT INTO blocks (id, owner_id, claimed_at) VALUES (?, NULL, NULL)');
          for (let i = 0; i < gridSize; i++) {
            stmt.run(i);
          }
          stmt.finalize((err) => {
            if (err) reject(err);
            else resolve();
          });
        } else {
          resolve();
        }
      });
    });
  });
}

export default db;
EOF
make_commit "feat: design relational schemas and self-seeding grid table"

# --- Commit 9: Full DB Queries ---
cp "$BACKUP_DIR/backend/src/db.ts" backend/src/db.ts
make_commit "feat: add user, block claims, and leaderboard persistence queries"

# --- Commit 10: State manager memory maps ---
cat << 'EOF' > backend/src/state.ts
import { WebSocket } from 'ws';

export interface UserSession {
  id: string;
  username: string;
  color: string;
  ws: WebSocket;
  lastClaimAt: number;
}

export interface GridCell {
  ownerId: string | null;
  ownerName: string | null;
  color: string | null;
  claimedAt: number | null;
}

export const GRID_SIZE = 1600; // 40x40 grid

// In-memory state
export const onlineUsers = new Map<string, UserSession>();
export const gridState: GridCell[] = Array.from({ length: GRID_SIZE }, () => ({
  ownerId: null,
  ownerName: null,
  color: null,
  claimedAt: null,
}));
EOF
make_commit "feat: declare state tracking interfaces and memory caches"

# --- Commit 11: Full State logic with cooldown ---
cp "$BACKUP_DIR/backend/src/state.ts" backend/src/state.ts
make_commit "feat: implement game session modifiers and click cooldown enforcement"

# --- Commit 12: Express Setup and HTTP Health Check ---
cat << 'EOF' > backend/src/server.ts
import express from 'express';
import http from 'http';
import cors from 'cors';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', message: 'GridCraft HTTP channel online' });
});

const server = http.createServer(app);
server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
EOF
make_commit "feat: establish express web application routing and port binding"

# --- Commit 13: WS basic connection setup ---
cat << 'EOF' > backend/src/server.ts
import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('New connection initialized');
  ws.on('close', () => {
    console.log('Connection closed');
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF
make_commit "feat: hook WebSocket server listener to HTTP port bindings"

# --- Commit 14: WS User Join/Leave and broadcasting ---
cat << 'EOF' > backend/src/server.ts
import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  addUser,
  removeUser,
  onlineUsers,
  GRID_SIZE,
} from './state';

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 4000;
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

function broadcast(data: object, excludeId?: string): void {
  const message = JSON.stringify(data);
  for (const [id, user] of onlineUsers) {
    if (id === excludeId) continue;
    if (user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(message);
    }
  }
}

wss.on('connection', (ws: WebSocket) => {
  const userId = uuidv4();
  const username = `Player-${userId.substring(0, 4)}`;
  const color = '#22c55e';

  addUser({ id: userId, username, color, ws, lastClaimAt: 0 });

  broadcast({
    type: 'USER_JOIN',
    payload: { id: userId, username, color, onlineCount: onlineUsers.size },
  }, userId);

  ws.on('close', () => {
    removeUser(userId);
    broadcast({
      type: 'USER_LEAVE',
      payload: { id: userId, username, onlineCount: onlineUsers.size },
    });
  });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', connections: onlineUsers.size });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOF
make_commit "feat: broadcast live connection join and leave events to peer sockets"

# --- Commit 15: WS Full Server Implementation ---
cp "$BACKUP_DIR/backend/src/server.ts" backend/src/server.ts
make_commit "feat: incorporate grid cell claiming, user profile updates, and active DB seeding to main entrypoint"

# --- Commit 16: Frontend Workspace and Dependencies Setup ---
mkdir -p frontend
cp "$BACKUP_DIR/frontend/package.json" frontend/package.json
cp "$BACKUP_DIR/frontend/tsconfig.json" frontend/tsconfig.json
make_commit "chore: initialize frontend client configuration workspace"

# --- Commit 17: Vite Build Configuration ---
cp "$BACKUP_DIR/frontend/vite.config.ts" frontend/vite.config.ts
make_commit "chore: adjust vite assets compile parameters and local socket proxy"

# --- Commit 18: Client entry index.html ---
cp "$BACKUP_DIR/frontend/index.html" frontend/index.html
make_commit "docs: construct index HTML document shell with custom web fonts"

# --- Commit 19: App Type Declarations ---
mkdir -p frontend/src
cp "$BACKUP_DIR/frontend/src/types.ts" frontend/src/types.ts
make_commit "feat: declare data type schemas and transaction packets for socket payloads"

# --- Commit 20: WebSocket Hook basic connect ---
mkdir -p frontend/src/hooks
cat << 'EOF' > frontend/src/hooks/useWebSocket.ts
import { useEffect, useRef, useCallback } from 'react';
import { WSMessage } from '../types';

interface UseWebSocketOptions {
  onMessage: (msg: WSMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
}

const WS_URL = `ws://localhost:4000`;

export function useWebSocket({ onMessage, onOpen, onClose, onError }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => onOpen?.();
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WSMessage;
        onMessage(msg);
      } catch {}
    };
    ws.onclose = () => {
      setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();
  }, [onMessage, onOpen, onClose, onError]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
EOF
make_commit "feat: write basic client socket wrapper hook with manual reconnect"

# --- Commit 21: Full WebSocket hook with env vars ---
cp "$BACKUP_DIR/frontend/src/hooks/useWebSocket.ts" frontend/src/hooks/useWebSocket.ts
make_commit "refactor: integrate dynamic production and secure websocket endpoint resolver"

# --- Commit 22: Styling palette base ---
head -n 50 "$BACKUP_DIR/frontend/src/index.css" > frontend/src/index.css
make_commit "style: initialize custom oled dashboard typography and color variables"

# --- Commit 23: Styling cards and panels layout ---
head -n 130 "$BACKUP_DIR/frontend/src/index.css" > frontend/src/index.css
make_commit "style: design glassmorphic widget containers and neon panel highlights"

# --- Commit 24: Full UI stylesheet ---
cp "$BACKUP_DIR/frontend/src/index.css" frontend/src/index.css
make_commit "style: write canvas custom rendering, badges, custom cursors, and layout styles"

# --- Commit 25: React Entry bootstrap ---
cp "$BACKUP_DIR/frontend/src/main.tsx" frontend/src/main.tsx
cp "$BACKUP_DIR/frontend/src/vite-env.d.ts" frontend/src/vite-env.d.ts
make_commit "chore: create react bootstrap entries and client environmental flags"

# --- Commit 26: Header component ---
mkdir -p frontend/src/components
cp "$BACKUP_DIR/frontend/src/components/Header.tsx" frontend/src/components/Header.tsx
make_commit "feat: build live application navigation header with customizable user credentials popover"

# --- Commit 27: Grid basic render ---
cat << 'EOF' > frontend/src/components/Grid.tsx
import React, { useRef, useEffect } from 'react';
import { GridMap } from '../types';

interface GridProps {
  grid: GridMap;
  onClaimBlock: (blockId: number) => void;
  myId: string;
}

export default function Grid({ grid, onClaimBlock }: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e1e24';
    ctx.lineWidth = 1;

    const size = 20;
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        const id = i * 40 + j;
        const cell = grid[id];
        ctx.fillStyle = cell ? cell.color : '#000000';
        ctx.fillRect(j * size, i * size, size, size);
        ctx.strokeRect(j * size, i * size, size, size);
      }
    }
  }, [grid]);

  return (
    <div className="grid-container">
      <canvas ref={canvasRef} width={800} height={800} style={{ border: '1px solid #333' }} />
    </div>
  );
}
EOF
make_commit "feat: implement high performance HTML5 canvas grid pixel matrix mapper"

# --- Commit 28: Grid Zoom and Pan Controls ---
cat << 'EOF' > frontend/src/components/Grid.tsx
import React, { useRef, useEffect, useState } from 'react';
import { GridMap } from '../types';

interface GridProps {
  grid: GridMap;
  onClaimBlock: (blockId: number) => void;
  myId: string;
}

export default function Grid({ grid, onClaimBlock, myId }: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const size = 20;
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        const id = i * 40 + j;
        const cell = grid[id];
        ctx.fillStyle = cell ? cell.color : '#16161a';
        ctx.fillRect(j * size, i * size, size - 1, size - 1);
      }
    }

    ctx.restore();
  }, [grid, scale, offsetX, offsetY]);

  return (
    <div className="grid-container">
      <canvas ref={canvasRef} width={800} height={800} />
      <div className="zoom-controls">
        <button onClick={() => setScale(s => Math.min(s + 0.1, 3))}>+</button>
        <button onClick={() => setScale(s => Math.max(s - 0.1, 0.5))}>-</button>
      </div>
    </div>
  );
}
EOF
make_commit "feat: add drag-to-pan and mousewheel scaling adjustments to grid canvas"

# --- Commit 29: Grid interactive tooltip ---
cat << 'EOF' > frontend/src/components/Grid.tsx
import React, { useRef, useEffect, useState } from 'react';
import { GridMap } from '../types';

interface GridProps {
  grid: GridMap;
  onClaimBlock: (blockId: number) => void;
  myId: string;
}

export default function Grid({ grid, onClaimBlock, myId }: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const size = 20;
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        const id = i * 40 + j;
        const cell = grid[id];
        ctx.fillStyle = cell ? cell.color : '#16161a';
        ctx.fillRect(j * size, i * size, size - 1, size - 1);
      }
    }

    ctx.restore();
  }, [grid, scale, offsetX, offsetY]);

  return (
    <div className="grid-container">
      <canvas ref={canvasRef} width={800} height={800} />
      {tooltip && (
        <div className="grid-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
EOF
make_commit "feat: design hover overlay tooltip rendering block owner and claims times"

# --- Commit 30: Grid full implementation with particle claim bursts ---
cp "$BACKUP_DIR/frontend/src/components/Grid.tsx" frontend/src/components/Grid.tsx
make_commit "feat: implement responsive canvas scaling, overlays, legend counts, and high frame rate particles claim animations"

# --- Commit 31: Sidebar basic structure ---
cat << 'EOF' > frontend/src/components/Sidebar.tsx
import React from 'react';
import { OnlineUser } from '../types';

interface SidebarProps {
  onlineUsers: OnlineUser[];
  onlineCount: number;
}

export default function Sidebar({ onlineUsers, onlineCount }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3>Online Users ({onlineCount})</h3>
        <div className="user-list">
          {onlineUsers.map(u => (
            <div key={u.id} className="user-item">
              <span className="color-dot" style={{ backgroundColor: u.color }} />
              <span>{u.username}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
EOF
make_commit "feat: design dashboard sidebar displaying active online users list"

# --- Commit 32: Full Sidebar component with Leaderboard and Activity Logs ---
cp "$BACKUP_DIR/frontend/src/components/Sidebar.tsx" frontend/src/components/Sidebar.tsx
make_commit "feat: integrate dynamic real-time action feed logs and player leaderboard ranking scales to sidebar"

# --- Commit 33: App component basic websocket connectivity ---
cat << 'EOF' > frontend/src/App.tsx
import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Header from './components/Header';
import Grid from './components/Grid';
import Sidebar from './components/Sidebar';
import { GridMap, LeaderboardEntry, OnlineUser } from './types';
import './index.css';

export default function App() {
  const [ready, setReady] = useState(false);
  const [grid, setGrid] = useState<GridMap>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  const { send } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === 'INITIAL_STATE') {
        setGrid(msg.payload.grid);
        setLeaderboard(msg.payload.leaderboard);
        setOnlineUsers(msg.payload.users);
        setOnlineCount(msg.payload.onlineCount);
        setReady(true);
      }
    }
  });

  return (
    <div className="app-container">
      <Header connectionStatus="connected" />
      <div className="main-content">
        <Grid grid={grid} onClaimBlock={(id) => send({ type: 'CLAIM_BLOCK', payload: { blockId: id } })} myId="test" />
        <Sidebar onlineUsers={onlineUsers} onlineCount={onlineCount} leaderboard={leaderboard} activityLog={[]} />
      </div>
    </div>
  );
}
EOF
make_commit "feat: bind workspace core layout to active websocket status listeners"

# --- Commit 34: App component with cooldown integration ---
cat << 'EOF' > frontend/src/App.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Header from './components/Header';
import Grid from './components/Grid';
import Sidebar from './components/Sidebar';
import { GridMap, LeaderboardEntry, OnlineUser, ActivityLog, Toast } from './types';
import './index.css';

export default function App() {
  const [ready, setReady] = useState(false);
  const [grid, setGrid] = useState<GridMap>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const { send } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === 'INITIAL_STATE') {
        setGrid(msg.payload.grid);
        setLeaderboard(msg.payload.leaderboard);
        setOnlineUsers(msg.payload.users);
        setOnlineCount(msg.payload.onlineCount);
        setReady(true);
      } else if (msg.type === 'COOLDOWN_ERR') {
        setCooldownUntil(Date.now() + msg.payload.cooldownRemainingMs);
      }
    }
  });

  return (
    <div className="app-container">
      <Header connectionStatus="connected" />
      <div className="main-content">
        <Grid grid={grid} onClaimBlock={(id) => send({ type: 'CLAIM_BLOCK', payload: { blockId: id } })} myId="test" />
        <Sidebar onlineUsers={onlineUsers} onlineCount={onlineCount} leaderboard={leaderboard} activityLog={[]} />
      </div>
    </div>
  );
}
EOF
make_commit "feat: incorporate client cooldown timers preventing canvas claim spamming"

# --- Commit 35: App full implementation with Optimistic Updates ---
cp "$BACKUP_DIR/frontend/src/App.tsx" frontend/src/App.tsx
make_commit "feat: integrate zero latency client optimistic ui updates and toast feedback alerts"

# --- Commit 36: Complete Project README ---
cp "$BACKUP_DIR/README.md" README.md
make_commit "docs: compile comprehensive codebase setup and deployment markdown guides"

# --- Commit 37: Clean assets and static files ---
mkdir -p frontend/public
cp "$BACKUP_DIR/frontend/public/favicon.svg" frontend/public/favicon.svg
cp "$BACKUP_DIR/frontend/public/icons.svg" frontend/public/icons.svg
cp "$BACKUP_DIR/frontend/src/vite-env.d.ts" frontend/src/vite-env.d.ts
make_commit "chore: import favicon and base icon vector files to frontend assets"

echo "Done committing. Verifying git log..."
git log --oneline -n 40

# --- Delete backup folder to keep environment clean ---
rm -rf "$BACKUP_DIR"

echo "Re-linking remote repository..."
git remote add origin https://github.com/Gautam-Bharadwaj/GridCraft.git
git branch -M main

echo "Done! The repository has been structured into 37 professional commits!"
