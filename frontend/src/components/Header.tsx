import React, { useState } from 'react';
import { Users, Pencil, Check, Wifi, WifiOff, Loader2 } from 'lucide-react';

const COLORS = [
  '#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6',
  '#ec4899', '#06b6d4', '#f97316', '#84cc16', '#a855f7',
  '#14b8a6', '#fb7185',
];

interface HeaderProps {
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  onlineCount: number;
  username: string;
  color: string;
  onUpdateProfile: (username: string, color: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  connectionStatus,
  onlineCount,
  username,
  color,
  onUpdateProfile,
}) => {
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [draftName, setDraftName] = useState(username);
  const [draftColor, setDraftColor] = useState(color);

  const handleOpen = () => {
    setDraftName(username);
    setDraftColor(color);
    setPopoverOpen(true);
  };

  const handleSave = () => {
    const trimmed = draftName.trim();
    if (!trimmed) return;
    onUpdateProfile(trimmed, draftColor);
    setPopoverOpen(false);
  };

  const StatusIcon = {
    connected: <Wifi size={11} />,
    disconnected: <WifiOff size={11} />,
    connecting: <Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} />,
  }[connectionStatus];

  const statusLabel = {
    connected: 'Live',
    disconnected: 'Offline',
    connecting: 'Connecting',
  }[connectionStatus];

  return (
    <header className="header">
      {/* ── Logo ── */}
      <div className="header-logo">
        {/* SVG grid icon */}
        <div className="logo-mark">
          <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect width="28" height="28" rx="6" fill="#22c55e" fillOpacity="0.12" />
            {/* 3×3 grid of colored squares */}
            <rect x="4" y="4"  width="7" height="7" rx="1.5" fill="#22c55e" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" fill="#3b82f6" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" fill="#f59e0b" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" fill="#8b5cf6" />
            <rect x="22" y="4"  width="2.5" height="7"  rx="1" fill="rgba(255,255,255,0.15)" />
            <rect x="4" y="22"  width="7"   height="2.5" rx="1" fill="rgba(255,255,255,0.15)" />
            <rect x="13" y="22" width="7"   height="2.5" rx="1" fill="rgba(255,255,255,0.1)" />
            <rect x="22" y="13" width="2.5" height="7"   rx="1" fill="rgba(255,255,255,0.08)" />
          </svg>
        </div>
        <span className="logo-name">GRID<em>CRAFT</em></span>
        <span className="header-tag">BETA</span>
      </div>

      <div className="header-spacer" />

      <div className="header-actions">
        {/* Online counter */}
        <div className="header-pill">
          <div className="live-dot" />
          <strong>{onlineCount}</strong>
          <span>online</span>
        </div>

        {/* Connection status */}
        <div className={`conn-badge ${connectionStatus}`}>
          <span className="conn-dot" />
          {StatusIcon}
          <span>{statusLabel}</span>
        </div>

        {/* Profile button */}
        <button
          id="profile-btn"
          className="user-profile-btn"
          onClick={handleOpen}
          aria-label="Edit profile"
          aria-expanded={popoverOpen}
        >
          <div
            className="user-avatar"
            style={{
              background: color,
              boxShadow: `0 0 10px ${color}60, inset 0 0 0 1px rgba(255,255,255,0.15)`,
            }}
            aria-hidden="true"
          >
            {username.slice(0, 2).toUpperCase()}
          </div>
          <span style={{ maxWidth: 80, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {username}
          </span>
          <Pencil size={11} className="edit-icon" />
        </button>
      </div>

      {/* ── Profile Popover ── */}
      {popoverOpen && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 150 }}
            onClick={() => setPopoverOpen(false)}
            aria-hidden="true"
          />
          <div className="profile-popover" role="dialog" aria-label="Edit profile">
            <div className="popover-title">Edit Profile</div>

            {/* Preview row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-3)', borderRadius: 'var(--r-md)', border: '1px solid var(--bd-0)' }}>
              <div
                className="user-avatar"
                style={{ width: 36, height: 36, fontSize: '0.72rem', background: draftColor, boxShadow: `0 0 12px ${draftColor}50` }}
              >
                {draftName.slice(0, 2).toUpperCase() || '??'}
              </div>
              <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--t-0)' }}>
                {draftName || 'Your name…'}
              </span>
            </div>

            <div className="input-group">
              <label className="input-label" htmlFor="username-input">Username</label>
              <input
                id="username-input"
                type="text"
                className="text-input"
                value={draftName}
                maxLength={18}
                placeholder="Enter username…"
                onChange={(e) => setDraftName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                autoFocus
              />
            </div>

            <div className="input-group">
              <div className="input-label">Your Color</div>
              <div className="color-swatches">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    className={`color-swatch${draftColor === c ? ' selected' : ''}`}
                    style={{ background: c }}
                    onClick={() => setDraftColor(c)}
                    aria-label={`Select color ${c}`}
                    aria-pressed={draftColor === c}
                  />
                ))}
              </div>
            </div>

            <button className="btn-save" onClick={handleSave}>
              <Check size={14} aria-hidden="true" />
              Save Changes
            </button>
          </div>
        </>
      )}
    </header>
  );
};

export default Header;
