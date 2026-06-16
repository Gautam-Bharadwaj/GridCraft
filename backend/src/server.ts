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
