import React, { useRef, useEffect } from 'react';
import { GridMap } from '../types';

interface GridProps {
  grid: GridMap;
  onClaimBlock: (blockId: number) => void;
  myId: string;
}

export default function Grid({ grid, onClaimBlock }: GridProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#0a0a0c';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = '#1e1e24';
    ctx.lineWidth = 1;

    const size = 20;
    for (let i = 0; i < 40; i++) {
      for (let j = 0; j < 40; j++) {
        const id = i * 40 + j;
        const cell = grid[id];
        ctx.fillStyle = cell ? cell.color : '#000000';
        ctx.fillRect(j * size, i * size, size, size);
        ctx.strokeRect(j * size, i * size, size, size);
      }
    }
  }, [grid]);

  return (
    <div className="grid-container">
      <canvas ref={canvasRef} width={800} height={800} style={{ border: '1px solid #333' }} />
    </div>
  );
}
