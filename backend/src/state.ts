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
