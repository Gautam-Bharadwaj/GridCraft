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
