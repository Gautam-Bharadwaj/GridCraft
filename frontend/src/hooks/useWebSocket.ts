import { useEffect, useRef, useCallback } from 'react';
import { WSMessage } from '../types';

interface UseWebSocketOptions {
  onMessage: (msg: WSMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: () => void;
}

const WS_URL = `ws://localhost:4000`;

export function useWebSocket({ onMessage, onOpen, onClose, onError }: UseWebSocketOptions) {
  const wsRef = useRef<WebSocket | null>(null);

  const connect = useCallback(() => {
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => onOpen?.();
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data) as WSMessage;
        onMessage(msg);
      } catch {}
    };
    ws.onclose = () => {
      setTimeout(connect, 2000);
    };
    ws.onerror = () => ws.close();
  }, [onMessage, onOpen, onClose, onError]);

  useEffect(() => {
    connect();
    return () => wsRef.current?.close();
  }, [connect]);

  const send = useCallback((data: object) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(data));
    }
  }, []);

  return { send };
}
