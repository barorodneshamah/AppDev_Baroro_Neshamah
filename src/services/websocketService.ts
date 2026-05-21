import { store } from '../store';
import { addNotification } from '../app/reducers/notifications';

const WS_URL = 'ws://192.168.254.138:9090';

let socket: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectDelay = 2000;
let activeToken: string | null = null;
let connecting = false;

const clearTimer = () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
};

const scheduleReconnect = () => {
  clearTimer();

  reconnectTimer = setTimeout(() => {
    if (activeToken) {
      connect(activeToken);
    }
  }, Math.min(reconnectDelay, 30000));

  reconnectDelay = Math.min(reconnectDelay * 2, 30000);
};

export const connect = (token: string): void => {
  if (!token || connecting) return;

  activeToken = token;
  connecting = true;

  if (socket) {
    socket.close();
    socket = null;
  }

  socket = new WebSocket(
    `${WS_URL}?token=${encodeURIComponent(token)}`
  );

  socket.onopen = () => {
    connecting = false;
    reconnectDelay = 2000;
    console.log('[WS] connected');
  };

  socket.onmessage = (event) => {
    console.log('[WS] message:', event.data);

    try {
      const msg = JSON.parse(event.data as string);

      store.dispatch(
        addNotification({
          id: String(msg.id ?? Date.now()),
          title: msg.title ?? 'Notification',
          body: msg.body ?? msg.message ?? '',
          type: msg.type ?? 'general',
          read: false,
          createdAt: msg.createdAt ?? new Date().toISOString(),
        })
      );
    } catch {
      console.log('[WS] invalid message');
    }
  };

  socket.onclose = (e) => {
    connecting = false;
    socket = null;

    console.log('[WS] closed:', e.code);

    if (activeToken && e.code !== 1000) {
      scheduleReconnect();
    }
  };

  socket.onerror = (error) => {
    connecting = false;
    console.log('[WS] error:', error);
  };
};

export const disconnect = (): void => {
  activeToken = null;
  connecting = false;
  reconnectDelay = 2000;

  clearTimer();

  if (socket) {
    socket.close(1000, 'logout');
    socket = null;
  }

  console.log('[WS] disconnected');
};

export const sendMessage = (data: object): void => {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
  } else {
    console.log('[WS] not connected');
  }
};

// Injects a notification directly into Redux — no WS server needed.
// Use this to test the notification UI pipeline end-to-end.
export const simulateNotification = (payload: {
  title: string;
  body: string;
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
  console.log('[WS] simulated notification:', payload.title);
};