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
