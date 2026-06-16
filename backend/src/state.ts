import { WebSocket } from 'ws';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Block {
  id: number;
  ownerId: string | null;
  ownerName: string | null;
  color: string | null;
  claimedAt: number | null;
}

export interface User {
  id: string;
  username: string;
  color: string;
  ws: WebSocket;
  lastClaimAt: number; // For cooldown enforcement
}

// ─── In-memory State ────────────────────────────────────────────────────────

// Grid: blockId -> Block
export const gridState: Map<number, Block> = new Map();

// Active online users: userId -> User
export const onlineUsers: Map<string, User> = new Map();

// Cooldown duration in milliseconds
export const COOLDOWN_MS = 1500;

// Grid dimensions
export const GRID_COLS = 40;
export const GRID_ROWS = 40;
export const GRID_SIZE = GRID_COLS * GRID_ROWS; // 1600 blocks

// ─── State Operations ────────────────────────────────────────────────────────

/**
 * Initialize grid in memory from database rows
 */
export function initGridState(rows: { id: number; owner_id: string | null; claimed_at: number | null; username?: string; color?: string }[]): void {
  for (const row of rows) {
    gridState.set(row.id, {
      id: row.id,
      ownerId: row.owner_id,
      ownerName: row.username ?? null,
      color: row.color ?? null,
      claimedAt: row.claimed_at,
    });
  }
  console.log(`✅ Loaded ${gridState.size} blocks into memory`);
}

/**
 * Register a new online user
 */
export function addUser(user: User): void {
  onlineUsers.set(user.id, user);
}

/**
 * Remove a user (on disconnect)
 */
export function removeUser(userId: string): void {
  onlineUsers.delete(userId);
}

/**
 * Update a user's username and color in memory
 */
export function updateUserMeta(userId: string, username: string, color: string): void {
  const user = onlineUsers.get(userId);
  if (user) {
    user.username = username;
    user.color = color;
  }
  // Also update all their claimed blocks' display names in memory
  for (const [, block] of gridState) {
    if (block.ownerId === userId) {
      block.ownerName = username;
      block.color = color;
    }
  }
}

/**
 * Attempt to claim a block. Returns true if successful, false if on cooldown.
 */
export function claimBlockInMemory(
  userId: string,
  blockId: number,
  username: string,
  color: string,
  now: number
): { success: boolean; cooldownRemainingMs?: number } {
  const user = onlineUsers.get(userId);
  if (!user) return { success: false };

  // Cooldown check
  const elapsed = now - user.lastClaimAt;
  if (elapsed < COOLDOWN_MS) {
    return { success: false, cooldownRemainingMs: COOLDOWN_MS - elapsed };
  }

  // Apply claim in memory
  gridState.set(blockId, {
    id: blockId,
    ownerId: userId,
    ownerName: username,
    color: color,
    claimedAt: now,
  });

  // Update last claim time
  user.lastClaimAt = now;

  return { success: true };
}

/**
 * Compute current leaderboard from in-memory state
 */
export function computeLeaderboard(): { username: string; color: string; score: number }[] {
  const scores = new Map<string, { username: string; color: string; score: number }>();

  for (const [, block] of gridState) {
    if (block.ownerId && block.ownerName && block.color) {
      const existing = scores.get(block.ownerId);
      if (existing) {
        existing.score++;
      } else {
        scores.set(block.ownerId, {
          username: block.ownerName,
          color: block.color,
          score: 1,
        });
      }
    }
  }

  return Array.from(scores.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);
}

/**
 * Get online users list (safe for broadcasting - no ws ref)
 */
export function getOnlineUsersList(): { id: string; username: string; color: string }[] {
  return Array.from(onlineUsers.values()).map((u) => ({
    id: u.id,
    username: u.username,
    color: u.color,
  }));
}

/**
 * Serialize full grid state for INITIAL_STATE message
 */
export function serializeGrid(): Record<number, Omit<Block, 'id'>> {
  const result: Record<number, Omit<Block, 'id'>> = {};
  for (const [id, block] of gridState) {
    result[id] = {
      ownerId: block.ownerId,
      ownerName: block.ownerName,
      color: block.color,
      claimedAt: block.claimedAt,
    };
  }
  return result;
}
