/**
 * WebSocket test server — simulates the backend sending a notification.
 *
 * Usage:
 *   node scripts/test-ws-server.js
 *
 * The server listens on port 9090 (matches WS_URL in websocketService.ts).
 * As soon as the mobile app connects it sends the test payload, then echoes
 * every message the app sends back so sendMessage() can be verified too.
 *
 * Requires the `ws` package:
 *   npm install --save-dev ws
 */

const { WebSocketServer } = require('ws');

const PORT = 9090;
const wss  = new WebSocketServer({ port: PORT });

const TEST_PAYLOAD = {
  id:        `test-${Date.now()}`,
  title:     'Test WebSocket',
  body:      'This is a live notification',
  type:      'booking',
  createdAt: new Date().toISOString(),
};

console.log(`[WS Server] listening on ws://0.0.0.0:${PORT}`);
console.log('[WS Server] waiting for app to connect...\n');

wss.on('connection', (ws, req) => {
  const ip    = req.socket.remoteAddress;
  const token = new URL(req.url, `ws://localhost`).searchParams.get('token');
  console.log(`[WS Server] client connected from ${ip}`);
  console.log(`[WS Server] token: ${token ? token.slice(0, 30) + '...' : '(none)'}\n`);

  // Send test notification 500 ms after connect
  setTimeout(() => {
    const msg = JSON.stringify(TEST_PAYLOAD);
    ws.send(msg);
    console.log('[WS Server] → sent:', msg, '\n');
  }, 500);

  // Echo any message back (tests sendMessage from the app)
  ws.on('message', (data) => {
    console.log('[WS Server] ← received from app:', data.toString());
    ws.send(data.toString()); // echo back
    console.log('[WS Server] → echoed back\n');
  });

  ws.on('close', (code) => {
    console.log(`[WS Server] client disconnected (code ${code})`);
  });
});