import React, { useState, useEffect } from 'react';
import { useWebSocket } from './hooks/useWebSocket';
import Header from './components/Header';
import Grid from './components/Grid';
import Sidebar from './components/Sidebar';
import { GridMap, LeaderboardEntry, OnlineUser } from './types';
import './index.css';

export default function App() {
  const [ready, setReady] = useState(false);
  const [grid, setGrid] = useState<GridMap>({});
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  const { send } = useWebSocket({
    onMessage: (msg) => {
      if (msg.type === 'INITIAL_STATE') {
        setGrid(msg.payload.grid);
        setLeaderboard(msg.payload.leaderboard);
        setOnlineUsers(msg.payload.users);
        setOnlineCount(msg.payload.onlineCount);
        setReady(true);
      }
    }
  });

  return (
    <div className="app-container">
      <Header connectionStatus="connected" />
      <div className="main-content">
        <Grid grid={grid} onClaimBlock={(id) => send({ type: 'CLAIM_BLOCK', payload: { blockId: id } })} myId="test" />
        <Sidebar onlineUsers={onlineUsers} onlineCount={onlineCount} leaderboard={leaderboard} activityLog={[]} />
      </div>
    </div>
  );
}
