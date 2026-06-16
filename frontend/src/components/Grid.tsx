import React, { useRef, useState, useCallback, useEffect, memo } from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';
import { BlockState, GridMap } from '../types';

const GRID_COLS = 40;
const GRID_ROWS = 40;
const GRID_SIZE = GRID_COLS * GRID_ROWS;
const CELL_SIZE = 20;
const GAP = 2;
const COOLDOWN_MS = 1500;

// ─── Cell ─────────────────────────────────────────────────────────────────────
interface CellProps {
  id: number;
  block: BlockState | undefined;
  myId: string;
  justClaimed: boolean;
  onClaim: (id: number) => void;
  onHover: (id: number | null, x: number, y: number, block: BlockState | undefined) => void;
}

const Cell = memo<CellProps>(({ id, block, myId, justClaimed, onClaim, onHover }) => {
  const isMine    = block?.ownerId === myId;
  const isClaimed = !!block?.ownerId;

  let classes = 'cell';
  if (isClaimed)    classes += ' claimed';
  if (isMine)       classes += ' mine';
  if (justClaimed)  classes += ' just-claimed';

  return (
    <div
      className={classes}
      style={isClaimed ? { backgroundColor: block!.color ?? undefined } : undefined}
      onClick={() => onClaim(id)}
      onMouseEnter={(e) => onHover(id, e.clientX, e.clientY, block)}
      onMouseLeave={() => onHover(null, 0, 0, undefined)}
      role="button"
      tabIndex={-1}
      aria-label={isClaimed ? `Block ${id} owned by ${block!.ownerName}` : `Block ${id} — unclaimed`}
    />
  );
});

Cell.displayName = 'Cell';

// ─── Grid ─────────────────────────────────────────────────────────────────────
interface GridProps {
  grid: GridMap;
  myId: string;
  onClaim: (blockId: number) => void;
  cooldownUntil: number;
}

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  block: BlockState | undefined;
  blockId: number | null;
}

const Grid: React.FC<GridProps> = ({ grid, myId, onClaim, cooldownUntil }) => {
  const viewportRef  = useRef<HTMLDivElement>(null);
  const [scale, setScale]   = useState(1);
  const [offset, setOffset] = useState({ x: 48, y: 48 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  const [justClaimed, setJustClaimed]   = useState<Set<number>>(new Set());
  const [cooldownProgress, setCooldownProgress] = useState(0);
  const cooldownRaf = useRef<number>(0);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false, x: 0, y: 0, block: undefined, blockId: null,
  });

  // ── Cooldown progress bar ────────────────────────────────────────────────────
  useEffect(() => {
    const animate = () => {
      const now = Date.now();
      if (now < cooldownUntil) {
        setCooldownProgress(((cooldownUntil - now) / COOLDOWN_MS) * 100);
        cooldownRaf.current = requestAnimationFrame(animate);
      } else {
        setCooldownProgress(0);
      }
    };
    cooldownRaf.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(cooldownRaf.current);
  }, [cooldownUntil]);

  const isOnCooldown = Date.now() < cooldownUntil || cooldownProgress > 0;

  // ── Claim ────────────────────────────────────────────────────────────────────
  const handleClaim = useCallback((id: number) => {
    onClaim(id);
    setJustClaimed((prev) => {
      const next = new Set(prev);
      next.add(id);
      setTimeout(() => setJustClaimed((p) => { const s = new Set(p); s.delete(id); return s; }), 600);
      return next;
    });
  }, [onClaim]);

  // ── Tooltip ──────────────────────────────────────────────────────────────────
  const handleHover = useCallback((
    id: number | null, x: number, y: number, block: BlockState | undefined,
  ) => {
    if (id === null) {
      setTooltip(t => ({ ...t, visible: false }));
    } else {
      setTooltip({ visible: true, x, y, block, blockId: id });
    }
  }, []);

  // ── Wheel Zoom ───────────────────────────────────────────────────────────────
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.07 : 0.07;
    setScale(s => Math.min(4, Math.max(0.25, s + delta)));
  }, []);

  // ── Pan ──────────────────────────────────────────────────────────────────────
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).classList.contains('cell')) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }, [offset]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setOffset({
      x: panStart.current.ox + (e.clientX - panStart.current.x),
      y: panStart.current.oy + (e.clientY - panStart.current.y),
    });
  }, [isPanning]);

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const resetView = () => { setScale(1); setOffset({ x: 48, y: 48 }); };

  // Claimed count for legend
  const claimedCount = Object.keys(grid).length;
  const pct = Math.round((claimedCount / GRID_SIZE) * 100);

  const cells = Array.from({ length: GRID_SIZE }, (_, i) => i);

  return (
    <div className="grid-container">
      <div
        ref={viewportRef}
        className={[
          'grid-viewport',
          isPanning  ? 'panning'     : '',
          isOnCooldown ? 'on-cooldown' : '',
        ].filter(Boolean).join(' ')}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          className="grid-transform-wrapper"
          style={{ transform: `translate(${offset.x}px,${offset.y}px) scale(${scale})` }}
        >
          <div
            className="grid-wrapper"
            style={{ gridTemplateColumns: `repeat(${GRID_COLS}, ${CELL_SIZE}px)`, gap: GAP }}
          >
            {cells.map((i) => (
              <Cell
                key={i}
                id={i}
                block={grid[i]}
                myId={myId}
                justClaimed={justClaimed.has(i)}
                onClaim={handleClaim}
                onHover={handleHover}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Tooltip ── */}
      {tooltip.visible && tooltip.blockId !== null && (
        <div
          className="cell-tooltip"
          style={{
            left: tooltip.x + 14,
            top:  tooltip.y + 14,
            borderLeft: `3px solid ${tooltip.block?.color ?? 'var(--bd-1)'}`,
          }}
        >
          {tooltip.block?.ownerName ? (
            <>
              <div className="tooltip-owner" style={{ color: tooltip.block.color ?? 'var(--t-0)' }}>
                {tooltip.block.ownerName}
              </div>
              <div className="tooltip-sub">Block #{tooltip.blockId}</div>
            </>
          ) : (
            <>
              <div className="tooltip-owner" style={{ color: 'var(--t-2)' }}>Unclaimed</div>
              <div className="tooltip-sub">Block #{tooltip.blockId} — click to capture</div>
            </>
          )}
        </div>
      )}

      {/* ── Cooldown bar ── */}
      {isOnCooldown && (
        <div className="cooldown-overlay">
          <span style={{ color: 'var(--t-3)' }}>Cooldown</span>
          <div className="cooldown-track">
            <div className="cooldown-fill" style={{ width: `${cooldownProgress}%` }} />
          </div>
          <span className="cooldown-time">
            {((cooldownProgress / 100) * COOLDOWN_MS / 1000).toFixed(1)}s
          </span>
        </div>
      )}

      {/* ── Map legend (bottom-left) ── */}
      <div className="map-legend">
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--bg-4)', border: '1px solid var(--bd-1)' }} />
          <span>Free</span>
        </div>
        <div className="legend-item">
          <div className="legend-dot" style={{ background: 'var(--green-500)' }} />
          <span>Owned</span>
        </div>
        <span style={{ color: 'var(--t-2)', fontWeight: 600 }}>{pct}% claimed</span>
      </div>

      {/* ── Zoom controls ── */}
      <div className="zoom-controls">
        <button
          className="zoom-btn"
          onClick={() => setScale(s => Math.min(4, s + 0.25))}
          title="Zoom in"
          aria-label="Zoom in"
        >
          <Plus size={14} />
        </button>
        <button
          className="zoom-btn"
          onClick={resetView}
          title="Reset view"
          aria-label="Reset view"
        >
          <RotateCcw size={12} />
        </button>
        <button
          className="zoom-btn"
          onClick={() => setScale(s => Math.max(0.25, s - 0.25))}
          title="Zoom out"
          aria-label="Zoom out"
        >
          <Minus size={14} />
        </button>
      </div>
    </div>
  );
};

export default Grid;
