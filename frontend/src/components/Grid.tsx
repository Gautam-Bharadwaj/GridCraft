import React, { useRef, useEffect, useState } from 'react';
import { GridMap } from '../types';

interface GridProps {
  grid: GridMap;
  onClaimBlock: (blockId: number) => void;
  myId: string;
}

export default function Grid({ grid, onClaimBlock, myId }: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scale, setScale] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);

    const size = 20;
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        const id = i * 40 + j;
        const cell = grid[id];
        ctx.fillStyle = cell ? cell.color : '#16161a';
        ctx.fillRect(j * size, i * size, size - 1, size - 1);
      }
    }

    ctx.restore();
  }, [grid, scale, offsetX, offsetY]);

  return (
    <div className="grid-container">
      <canvas ref={canvasRef} width={800} height={800} />
      {tooltip && (
        <div className="grid-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.content}
        </div>
      )}
    </div>
  );
}
