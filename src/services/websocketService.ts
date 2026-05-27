// src/services/websocketService.ts
//
// WebSocket client for La Casa Gaudencia real-time notifications.
// Connects to the Node.js WS server that runs alongside the Symfony API.
//
// Protocol:
//  • Client → server: JSON { type: 'ping' }           (keepalive)
//  • Server → client: JSON { id, type, title, body, createdAt, data? }
//    – type = 'system'   : connection handshakes (not shown as notification)
//    – type = 'pong'     : keepalive reply        (ignored silently)
//    – anything else     : dispatched as in-app notification

import { store }         from '../store';
import { addNotification } from '../app/reducers/notifications';
import { setWsConnected, setWsReconnecting } from '../app/reducers/wsStatus';
import API_BASE_URL      from '../config/api.config';

// Derive WS URL from the HTTP API URL — same host, port 9090
// e.g. http://192.168.254.138:8000  →  ws://192.168.254.138:9090
const WS_URL = API_BASE_URL
  .replace(/^https/, 'wss')
  .replace(/^http/,  'ws')
  .replace(/:\d+$/, ':9090');
const WS_STATUS_URL = API_BASE_URL.replace(/:\d+$/, ':9090/status');

let socket:         WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let pingTimer:      ReturnType<typeof setInterval> | null = null;
let reconnectDelay  = 2_000;   // starts at 2 s, doubles up to 30 s
let activeToken:    string | null = null;
let connecting      = false;
let serverAvailable = true;
let warnedOffline   = false;

// ── Internal helpers ──────────────────────────────────────────────────────────

const normalizeNotificationType = (rawType?: unknown): string => {
  const type = String(rawType ?? '').toLowerCase();
  if (type.startsWith('payment')) return 'payment';
  if (type.startsWith('reservation') || type.startsWith('booking')) return 'reservation';
  if (type.startsWith('message') || type.startsWith('contact')) return 'message';
  return type || 'general';
};

const clearTimers = () => {
  if (reconnectTimer) { clearTimeout(reconnectTimer);  reconnectTimer = null; }
  if (pingTimer)      { clearInterval(pingTimer);       pingTimer      = null; }
};

const scheduleReconnect = () => {
  clearTimers();
  store.dispatch(setWsReconnecting());
  reconnectTimer = setTimeout(() => {
    if (activeToken) connect(activeToken);
  }, Math.min(reconnectDelay, 30_000));
  reconnectDelay = Math.min(reconnectDelay * 2, 30_000);
};

const startPing = (ws: WebSocket) => {
  pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'ping' }));
    }
  }, 25_000);
};

const checkServerAvailable = async (): Promise<boolean> => {
  try {
    const response = await Promise.race([
      fetch(WS_STATUS_URL),
      new Promise<Response>((_, reject) => {
        setTimeout(() => reject(new Error('WebSocket status timeout')), 1_500);
      }),
    ]);
    return response.ok;
  } catch {
    return false;
  }
};

// ── Public API ────────────────────────────────────────────────────────────────

export const connect = async (token: string): Promise<void> => {
  if (!token || connecting) return;

  activeToken = token;
  connecting  = true;

  serverAvailable = await checkServerAvailable();
  if (!serverAvailable) {
    connecting = false;
    store.dispatch(setWsConnected(false));
    if (!warnedOffline) {
      console.warn(`[WS] Server unavailable at ${WS_STATUS_URL}. Using notification poller fallback.`);
      warnedOffline = true;
    }
    return;
  }
  warnedOffline = false;
  
  if (socket) {
    socket.onclose = null; // prevent scheduleReconnect from firing
    socket.close();
    socket = null;
  }

  clearTimers();

  socket = new WebSocket(`${WS_URL}?token=${encodeURIComponent(token)}`);

  socket.onopen = () => {
    connecting     = false;
    reconnectDelay = 2_000;
    console.log('[WS] Connected to', WS_URL);
    store.dispatch(setWsConnected(true));
    startPing(socket!);
  };

  socket.onmessage = (event: any) => {
    try {
      const msg = JSON.parse(event.data as string);

      // System / pong messages update state but don't create a notification
      if (msg.type === 'system' || msg.type === 'pong') {
        if (msg.type === 'system') {
          console.log('[WS] Server:', msg.body);
        }
        return;
      }

      store.dispatch(
        addNotification({
          id:        String(msg.id ?? Date.now()),
          title:     msg.title   ?? 'Notification',
          body:      msg.body    ?? msg.message ?? '',
          type:      normalizeNotificationType(msg.type ?? msg.data?.type),
          read:      false,
          createdAt: msg.createdAt ?? new Date().toISOString(),
          data:      msg.data,
        }),
      );
    } catch {
      console.warn('[WS] Received non-JSON message:', event.data);
    }
  };

  socket.onclose = (event: any) => {
    connecting = false;
    socket     = null;
    clearTimers();

    store.dispatch(setWsConnected(false));
    console.log(`[WS] Disconnected (code ${event.code})`);

    // 1000 = normal close (logout), 4001 = unauthorized — don't reconnect
    if (activeToken && serverAvailable && event.code !== 1000 && event.code !== 4001) {
      console.log(`[WS] Reconnecting in ${Math.min(reconnectDelay, 30_000) / 1000}s…`);
      scheduleReconnect();
    }
  };

  socket.onerror = () => {
    // onclose fires after onerror — reconnect is handled there
    connecting = false;
    console.warn('[WS] Connection error');
  };
};

export const disconnect = (): void => {
  activeToken    = null;
  connecting     = false;
  reconnectDelay = 2_000;
  clearTimers();

  if (socket) {
    socket.onclose = null; // suppress reconnect
    socket.close(1000, 'logout');
    socket = null;
  }

  store.dispatch(setWsConnected(false));
  console.log('[WS] Disconnected (logout)');
};

/** Send any JSON payload to the server (fire-and-forget). */
export const sendMessage = (data: object): void => {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  } else {
    console.warn('[WS] Cannot send — not connected');
  }
};

export const simulateNotification = (payload: {
  title: string;
  body:  string;
  type?: string;
}): void => {
  store.dispatch(
    addNotification({
      id:        `sim-${Date.now()}`,
      title:     payload.title,
      body:      payload.body,
      type:      payload.type ?? 'general',
      read:      false,
      createdAt: new Date().toISOString(),
    }),
  );
  console.log('[WS] Simulated notification:', payload.title);
};
