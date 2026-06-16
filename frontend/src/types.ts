// Shared TypeScript interfaces between components

export interface BlockState {
  ownerId: string | null;
  ownerName: string | null;
  color: string | null;
  claimedAt: number | null;
}

export type GridMap = Record<number, BlockState>;

export interface OnlineUser {
  id: string;
  username: string;
  color: string;
}

export interface LeaderboardEntry {
  username: string;
  color: string;
  score: number;
}

export interface ActivityLog {
  id: string;
  text: string;
  color?: string;
  timestamp: number;
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

// WebSocket message types
export type WSMessage =
  | { type: 'INITIAL_STATE'; payload: {
      userId: string;
      username: string;
      color: string;
      grid: GridMap;
      onlineCount: number;
      users: OnlineUser[];
      leaderboard: LeaderboardEntry[];
    };
  }
  | { type: 'BLOCK_UPDATE'; payload: {
      blockId: number;
      ownerId: string;
      ownerName: string;
      color: string;
      claimedAt: number;
    };
  }
  | { type: 'LEADERBOARD_UPDATE'; payload: { leaderboard: LeaderboardEntry[] } }
  | { type: 'USER_JOIN';    payload: { id: string; username: string; color: string; onlineCount: number } }
  | { type: 'USER_LEAVE';   payload: { id: string; username: string; onlineCount: number } }
  | { type: 'USER_UPDATED'; payload: { id: string; username: string; color: string } }
  | { type: 'COOLDOWN_ERR'; payload: { cooldownRemainingMs: number } }
  | { type: 'PONG' }
  | { type: 'ERR'; payload: { message: string } };
