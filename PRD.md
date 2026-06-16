# Product Requirements Document (PRD) - Real-time Shared Grid App (GridCraft)

## 1. Overview
**GridCraft** is a real-time, interactive, multiplayer shared grid board game/app where users claim blocks, compete for grid ownership, and see updates instantly. It is similar to Reddit's `r/place` but focuses on tile/block capture dynamics, live statistics, area control, and real-time multiplayer coordination.

---

## 2. Core Features

### 2.1 The Shared Grid
- **Scale**: A grid composed of hundreds of blocks (e.g., 50x50 = 2,500 blocks, or 32x32 = 1,024 blocks).
- **Block States**:
  - **Unclaimed**: Neutral color (e.g., dark translucent grey), ready for capture.
  - **Claimed**: Owned by a specific user. Displays the user's custom color and a subtle glow or pattern.
  - **Locked/Protected**: A block captured within a certain time window cannot be recaptured immediately (temporary protection buffer).

### 2.2 Multiplayer Real-time Syncing
- All players view the same live state of the grid.
- Every click and block capture instantly broadcasts to all active users.
- Live user count counter showing how many players are online at any moment.

### 2.3 User Identity & Personalization
- Users are assigned a random, cool username (e.g., "NeonKnight", "CyberPixel") and a vibrant unique color upon entering.
- Users can customize their name and choose from a curated palette of rich, modern colors.

### 2.4 Cooldowns & Concurrency Rules (Game Mechanics)
- **Spam Prevention**: A user cooldown of $T$ seconds (e.g., 1.5s) triggers upon capturing a block. A visual progress bar on the screen indicates when the next click is ready.
- **Race Condition Prevention**: If User A and User B click the exact same block simultaneously, the server processes whoever's packet arrived first, confirms the capture, and sends a rejection/success packet.

---

## 3. UI/UX Design & Interactions

### 3.1 Styling & Theme
- **Theme**: Sleek, premium dark mode using HSL tailored colors.
- **Glassmorphism**: Translucent panels, smooth blur backdrops, soft neon borders.
- **Typography**: Modern typography (e.g., Outfit or Inter from Google Fonts).

### 3.2 Navigation & Viewport (Zoom/Pan)
- For larger grids, the viewport supports pan (drag to move) and zoom (mouse scroll or buttons) to ensure a great mobile and desktop experience.
- "Fit to screen" helper button.

### 3.3 Visual Polish & Micro-interactions
- **Grid Hover Effect**: Hovering over an unclaimed block highlights it with a neon border.
- **Capture Animation**: Capturing a block displays a brief scale-up / ripple particle effect.
- **Cooldown Overlay**: While on cooldown, the cursor changes to a timer/blocked status, and the grid becomes slightly desaturated or locked.
- **Leaderboard**: A floating real-time dashboard displaying:
  - Total blocks claimed by current user.
  - Top 5 active players by cell count.
  - Recent activity feed ticker (e.g., "System: NeonKnight captured block (12, 14)").

---

## 4. Success Metrics
- **Latency**: Block click-to-broadcast latency < 100ms for active connections.
- **Scalability**: Handles 100+ concurrent connections without server CPU bottleneck or WebSocket dropouts.
- **Error Handling**: Graceful disconnection recovery (auto-reconnect with state synchronization).
