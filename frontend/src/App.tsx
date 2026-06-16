import React, { useState, useCallback, useRef, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Header from './components/Header';
import Grid from './components/Grid';
import Sidebar from './components/Sidebar';
import { WSMessage, GridMap, LeaderboardEntry, OnlineUser, ActivityLog, Toast } from './types';
import { v4 as uuidv4 } from 'uuid';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';
import './index.css';

const COLORS = [
  '#22c55e','#3b82f6','#f59e0b','#ef4444','#8b5cf6',
  '#ec4899','#06b6d4','#f97316','#84cc16','#a855f7',
  '#14b8a6','#fb7185',
];

const COOLDOWN_MS = 1500;

// ── Loading preview cells ────────────────────────────────────────────────────
const PREVIEW_COLORS = [
  '#22c55e', '#3b82f6', null, '#f59e0b', null,
  null, '#8b5cf6', null, '#ef4444', null,
  '#06b6d4', null, '#22c55e', null, '#f97316',
  null, '#a855f7', null, null, '#3b82f6',
  '#ec4899', null, null, '#14b8a6', null,
];

function App() {
  const [ready,      setReady]      = useState(false);
  const [connStatus, setConnStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [myId,       setMyId]       = useState('');
  const [username,   setUsername]   = useState('');
  const [color,      setColor]      = useState(COLORS[0]);
  const [grid,       setGrid]       = useState<GridMap>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [onlineUsers,  setOnlineUsers]  = useState<OnlineUser[]>([]);
  const [onlineCount,  setOnlineCount]  = useState(0);
  const [activityLog,  setActivityLog]  = useState<ActivityLog[]>([]);
  const [toasts,       setToasts]       = useState<Toast[]>([]);
  const [cooldownUntil, setCooldownUntil] = useState(0);

  const sendRef = useRef<(data: object) => void>(() => {});

  // ── Helpers ─────────────────────────────────────────────────────────────────
  const addActivity = useCallback((text: string, actColor?: string) => {
    setActivityLog(prev => {
      const next = [...prev, { id: uuidv4(), text, color: actColor, timestamp: Date.now() }];
      return next.slice(-80);
    });
  }, []);

  const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = uuidv4();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  }, []);

  // ── WS Message Handler ───────────────────────────────────────────────────────
  const handleMessage = useCallback((msg: WSMessage) => {
    switch (msg.type) {

      case 'INITIAL_STATE': {
        const { userId, username: name, color: c, grid: g, leaderboard: lb, users, onlineCount: oc } = msg.payload;
        setMyId(userId);
        setUsername(name);
        setColor(c);
        setGrid(g);
        setLeaderboard(lb);
        setOnlineUsers(users);
        setOnlineCount(oc);
        setReady(true);
        break;
      }

      case 'BLOCK_UPDATE': {
        const { blockId, ownerId, ownerName, color: bc, claimedAt } = msg.payload;
        setGrid(prev => ({ ...prev, [blockId]: { ownerId, ownerName, color: bc, claimedAt } }));
        addActivity(`${ownerName} claimed block #${blockId}`, bc);
        break;
      }

      case 'LEADERBOARD_UPDATE':
        setLeaderboard(msg.payload.leaderboard);
        break;

      case 'USER_JOIN':
        setOnlineCount(msg.payload.onlineCount);
        setOnlineUsers(prev => {
          if (prev.find(u => u.id === msg.payload.id)) return prev;
          return [...prev, { id: msg.payload.id, username: msg.payload.username, color: msg.payload.color }];
        });
        addActivity(`${msg.payload.username} joined the grid`, msg.payload.color);
        break;

      case 'USER_LEAVE':
        setOnlineCount(msg.payload.onlineCount);
        setOnlineUsers(prev => prev.filter(u => u.id !== msg.payload.id));
        addActivity(`${msg.payload.username} left`, 'var(--t-3)');
        break;

      case 'USER_UPDATED': {
        const { id, username: newName, color: newColor } = msg.payload;
        setOnlineUsers(prev => prev.map(u => u.id === id ? { ...u, username: newName, color: newColor } : u));
        setGrid(prev => {
          const updated = { ...prev };
          for (const key of Object.keys(updated)) {
            if (updated[+key]?.ownerId === id) {
              updated[+key] = { ...updated[+key], ownerName: newName, color: newColor };
            }
          }
          return updated;
        });
        break;
      }

      case 'COOLDOWN_ERR':
        setCooldownUntil(Date.now() + (msg.payload.cooldownRemainingMs ?? COOLDOWN_MS));
        addToast('Cooldown active — wait a moment', 'error');
        break;

      case 'ERR':
        addToast(msg.payload.message, 'error');
        break;

      default: break;
    }
  }, [addActivity, addToast]);

  const { send } = useWebSocket({
    onMessage: handleMessage,
    onOpen:  () => { setConnStatus('connected');    addToast('Connected to GridCraft!', 'success'); },
    onClose: () => { setConnStatus('disconnected'); },
    onError: () => { setConnStatus('disconnected'); },
  });

  useEffect(() => { sendRef.current = send; }, [send]);

  // ── Profile update ───────────────────────────────────────────────────────────
  const handleUpdateProfile = useCallback((newUsername: string, newColor: string) => {
    setUsername(newUsername);
    setColor(newColor);
    sendRef.current({ type: 'UPDATE_PROFILE', payload: { username: newUsername, color: newColor } });
    addToast('Profile updated!', 'success');
  }, [addToast]);

  // ── Claim block ──────────────────────────────────────────────────────────────
  const handleClaim = useCallback((blockId: number) => {
    if (Date.now() < cooldownUntil) return;
    const now = Date.now();
    setGrid(prev => ({
      ...prev,
      [blockId]: { ownerId: myId, ownerName: username, color, claimedAt: now },
    }));
    setCooldownUntil(now + COOLDOWN_MS);
    sendRef.current({ type: 'CLAIM_BLOCK', payload: { blockId } });
  }, [cooldownUntil, myId, username, color]);

  // ── Loading screen ───────────────────────────────────────────────────────────
  if (!ready) {
    return (
      <div className="loading-screen" role="status" aria-label="Connecting to GridCraft">
        {/* Mini grid preview */}
        <div className="loading-grid-preview" aria-hidden="true">
          {PREVIEW_COLORS.map((c, i) => (
            <div
              key={i}
              className="loading-grid-cell"
              style={c ? { background: c, boxShadow: `0 0 6px ${c}60` } : undefined}
            />
          ))}
        </div>

        <div className="loading-logo">GridCraft</div>

        <div className="loading-status">
          {connStatus === 'connecting' ? 'Connecting to server…' : 'Reconnecting…'}
        </div>

        <div className="loading-bar-wrap" aria-hidden="true">
          <div className="loading-bar-fill" />
        </div>
      </div>
    );
  }

  // ── Toast icon helper ────────────────────────────────────────────────────────
  const toastIcon = (type: Toast['type']) => {
    if (type === 'success') return <CheckCircle2 size={14} className="toast-icon" />;
    if (type === 'error')   return <AlertCircle  size={14} className="toast-icon" />;
    return <Info size={14} className="toast-icon" />;
  };

  return (
    <div className="app">
      <Header
        connectionStatus={connStatus}
        onlineCount={onlineCount}
        username={username}
        color={color}
        onUpdateProfile={handleUpdateProfile}
      />

      <div className="app-body">
        <Grid
          grid={grid}
          myId={myId}
          onClaim={handleClaim}
          cooldownUntil={cooldownUntil}
        />
        <Sidebar
          leaderboard={leaderboard}
          onlineUsers={onlineUsers}
          activityLog={activityLog}
          myId={myId}
          username={username}
          color={color}
          grid={grid}
          cooldownUntil={cooldownUntil}
        />
      </div>

      {/* Toast container */}
      <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`} role="alert">
            {toastIcon(t.type)}
            <span className="toast-msg">{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
