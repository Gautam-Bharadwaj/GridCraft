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

// Enable WAL mode for better concurrent read performance
db.run('PRAGMA journal_mode=WAL');
db.run('PRAGMA foreign_keys=ON');

export function initializeDB(gridSize: number): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id TEXT PRIMARY KEY,
          username TEXT NOT NULL,
          color TEXT NOT NULL,
          created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000)
        )
      `);

      // Blocks table
      db.run(`
        CREATE TABLE IF NOT EXISTS blocks (
          id INTEGER PRIMARY KEY,
          owner_id TEXT,
          claimed_at INTEGER,
          FOREIGN KEY (owner_id) REFERENCES users(id)
        )
      `);

      // Claim history table
      db.run(`
        CREATE TABLE IF NOT EXISTS claim_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          block_id INTEGER NOT NULL,
          user_id TEXT NOT NULL,
          claimed_at INTEGER NOT NULL
        )
      `);

      // Seed blocks table if empty
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
            else {
              console.log(`✅ ${gridSize} blocks seeded successfully`);
              resolve();
            }
          });
        } else {
          resolve();
        }
      });
    });
  });
}

export interface BlockRow {
  id: number;
  owner_id: string | null;
  claimed_at: number | null;
  username?: string;
  color?: string;
}

export function getAllBlocks(): Promise<BlockRow[]> {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT b.id, b.owner_id, b.claimed_at, u.username, u.color
      FROM blocks b
      LEFT JOIN users u ON b.owner_id = u.id
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as BlockRow[]);
    });
  });
}

export function upsertUser(id: string, username: string, color: string): Promise<void> {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO users (id, username, color) VALUES (?, ?, ?) ON CONFLICT(id) DO UPDATE SET username=excluded.username, color=excluded.color',
      [id, username, color],
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

export function claimBlock(blockId: number, userId: string, claimedAt: number): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run('BEGIN TRANSACTION');
      db.run(
        'UPDATE blocks SET owner_id = ?, claimed_at = ? WHERE id = ?',
        [userId, claimedAt, blockId],
        (err) => {
          if (err) {
            db.run('ROLLBACK');
            reject(err);
            return;
          }
          db.run(
            'INSERT INTO claim_history (block_id, user_id, claimed_at) VALUES (?, ?, ?)',
            [blockId, userId, claimedAt],
            (err2) => {
              if (err2) {
                db.run('ROLLBACK');
                reject(err2);
              } else {
                db.run('COMMIT', resolve);
              }
            }
          );
        }
      );
    });
  });
}

export function getLeaderboard(): Promise<{ username: string; color: string; score: number }[]> {
  return new Promise((resolve, reject) => {
    db.all(`
      SELECT u.username, u.color, COUNT(b.id) as score
      FROM users u
      INNER JOIN blocks b ON b.owner_id = u.id
      GROUP BY u.id
      ORDER BY score DESC
      LIMIT 10
    `, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as { username: string; color: string; score: number }[]);
    });
  });
}

export default db;
