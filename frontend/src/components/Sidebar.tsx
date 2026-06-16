import React, { useEffect, useState } from 'react';
import { Trophy, Activity, Users2, Zap, CheckCircle2, Clock } from 'lucide-react';
import { LeaderboardEntry, OnlineUser, ActivityLog, GridMap } from '../types';

interface SidebarProps {
  leaderboard: LeaderboardEntry[];
  onlineUsers: OnlineUser[];
  activityLog: ActivityLog[];
  myId: string;
  username: string;
  color: string;
  grid: GridMap;
  cooldownUntil: number;
}

const COOLDOWN_MS = 1500;

// ── Live cooldown ticker ─────────────────────────────────────────────────────
function useCooldownMs(cooldownUntil: number) {
  const [remaining, setRemaining] = useState(0);
  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, cooldownUntil - Date.now()));
    tick();
    const id = setInterval(tick, 80);
    return () => clearInterval(id);
  }, [cooldownUntil]);
  return remaining;
}

// ── Timestamp helper ─────────────────────────────────────────────────────────
function relativeTime(ts: number) {
  const diff = Date.now() - ts;
  if (diff < 5000)  return 'now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s`;
  return `${Math.floor(diff / 60000)}m`;
}

const Sidebar: React.FC<SidebarProps> = ({
  leaderboard,
  onlineUsers,
  activityLog,
  myId,
  username,
  color,
  grid,
  cooldownUntil,
}) => {
  const cooldownRemaining = useCooldownMs(cooldownUntil);
  const isOnCooldown = cooldownRemaining > 0;

  const myScore = Object.values(grid).filter(b => b?.ownerId === myId).length;
  const myRank  = leaderboard.findIndex(e => e.username === username) + 1;
  const [, tick] = useState(0);

  // Re-render timestamps every 10s
  useEffect(() => {
    const id = setInterval(() => tick(n => n + 1), 10000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside className="sidebar" aria-label="Game sidebar">

      {/* ── My Stats ── */}
      <section className="sidebar-section">
        <div className="section-header">
          <div className="section-title">
            <Zap size={11} aria-hidden="true" />
            My Stats
          </div>
          {myRank > 0 && <span className="section-badge">#{myRank}</span>}
        </div>

        {/* Identity card */}
        <div className="my-identity-row">
          <div
            className="my-avatar-large"
            style={{
              background: color,
              boxShadow: `0 0 16px ${color}50, inset 0 0 0 1px rgba(255,255,255,0.15)`,
            }}
            aria-hidden="true"
          >
            {username.slice(0, 2).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="my-name">{username}</div>
            <div className="my-rank-label">
              {myRank > 0 ? `Ranked #${myRank} of ${leaderboard.length}` : 'Not yet ranked'}
            </div>
          </div>
        </div>

        {/* Mini stat cards */}
        <div className="mini-stats">
          <div className="mini-stat">
            <div className="mini-stat-label">Blocks</div>
            <div className="mini-stat-value">{myScore}</div>
          </div>
          <div className="mini-stat">
            <div className="mini-stat-label">Rank</div>
            <div className="mini-stat-value" style={{ color: myRank > 0 ? 'var(--c-gold)' : 'var(--t-3)' }}>
              {myRank > 0 ? `#${myRank}` : '—'}
            </div>
          </div>
        </div>

        {/* Click ready row */}
        <div className="ready-row">
          <span className="ready-label">Click status</span>
          {isOnCooldown ? (
            <span className="ready-no">
              {(cooldownRemaining / 1000).toFixed(1)}s
            </span>
          ) : (
            <span className="ready-yes">
              <CheckCircle2 size={11} aria-hidden="true" />
              Ready
            </span>
          )}
        </div>
      </section>

      {/* ── Leaderboard ── */}
      <section className="sidebar-section">
        <div className="section-header">
          <div className="section-title">
            <Trophy size={11} aria-hidden="true" />
            Leaderboard
          </div>
          {leaderboard.length > 0 && (
            <span className="section-badge">{leaderboard.length}</span>
          )}
        </div>

        {leaderboard.length === 0 ? (
          <div className="lb-empty">No claims yet — be first!</div>
        ) : (
          <div className="lb-list" role="list">
            {leaderboard.map((entry, idx) => {
              const rankClass = idx === 0 ? 'r1' : idx === 1 ? 'r2' : idx === 2 ? 'r3' : '';
              const isMe = entry.username === username;
              return (
                <div
                  key={entry.username}
                  className="lb-row"
                  role="listitem"
                  style={isMe ? {
                    background: `${entry.color}12`,
                    border: `1px solid ${entry.color}25`,
                    borderRadius: 'var(--r-md)',
                  } : undefined}
                >
                  <span className={`lb-rank ${rankClass}`}>
                    {idx < 3
                      ? ['①','②','③'][idx]
                      : idx + 1
                    }
                  </span>
                  {/* Colored vertical bar */}
                  <div
                    className="lb-color-bar"
                    style={{ background: entry.color, boxShadow: `0 0 6px ${entry.color}60` }}
                  />
                  <div className="lb-info">
                    <div className="lb-name" style={{ color: isMe ? entry.color : 'var(--t-0)' }}>
                      {entry.username}
                      {isMe && <span style={{ color: 'var(--t-3)', fontWeight: 400 }}> (you)</span>}
                    </div>
                    <div className="lb-sub">{entry.score} blocks</div>
                  </div>
                  <span className="lb-score">{entry.score}</span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ── Online Players ── */}
      <section className="sidebar-section">
        <div className="section-header">
          <div className="section-title">
            <Users2 size={11} aria-hidden="true" />
            Players
          </div>
          <span className="section-badge">{onlineUsers.length}</span>
        </div>

        <div className="online-list" role="list">
          {onlineUsers.slice(0, 12).map((u) => (
            <div key={u.id} className="online-user-row" role="listitem">
              <div
                className="online-dot"
                style={{ background: u.color, boxShadow: `0 0 5px ${u.color}` }}
              />
              <span className={`online-name${u.id === myId ? ' me' : ''}`}
                style={u.id === myId ? { color: u.color } : undefined}
              >
                {u.username}
              </span>
              {u.id === myId && <span className="online-you-badge">you</span>}
            </div>
          ))}
          {onlineUsers.length > 12 && (
            <div className="online-more">+{onlineUsers.length - 12} more players</div>
          )}
        </div>
      </section>

      {/* ── Live Activity ── */}
      <section className="sidebar-section" style={{ flex: 1 }}>
        <div className="section-header">
          <div className="section-title">
            <Activity size={11} aria-hidden="true" />
            Live Feed
          </div>
        </div>

        <div className="activity-feed" role="log" aria-live="polite" aria-label="Activity feed">
          {activityLog.length === 0 ? (
            <div className="feed-empty">Activity will appear here…</div>
          ) : (
            [...activityLog].reverse().map((log) => {
              const parts = log.text.split(' ');
              const actor = parts[0];
              const rest  = parts.slice(1).join(' ');
              return (
                <div key={log.id} className="activity-item">
                  <div
                    className="activity-dot"
                    style={{ background: log.color ?? 'var(--t-3)' }}
                  />
                  <div className="activity-text">
                    <strong style={{ color: log.color ?? 'var(--t-1)' }}>{actor}</strong>
                    {' '}{rest}
                  </div>
                  {log.timestamp && (
                    <span className="activity-time">{relativeTime(log.timestamp)}</span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>
    </aside>
  );
};

export default Sidebar;
