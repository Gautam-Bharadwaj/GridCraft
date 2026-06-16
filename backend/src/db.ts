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
