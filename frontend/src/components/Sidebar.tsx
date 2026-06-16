import React from 'react';
import { OnlineUser } from '../types';

interface SidebarProps {
  onlineUsers: OnlineUser[];
  onlineCount: number;
}

export default function Sidebar({ onlineUsers, onlineCount }: SidebarProps) {
  return (
    <div className="sidebar">
      <div className="sidebar-section">
        <h3>Online Users ({onlineCount})</h3>
        <div className="user-list">
          {onlineUsers.map(u => (
            <div key={u.id} className="user-item">
              <span className="color-dot" style={{ backgroundColor: u.color }} />
              <span>{u.username}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
