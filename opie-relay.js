#!/usr/bin/env node
/**
 * Opie Gateway Relay Server v3
 * Full power bridge: Vercel (serverless) ↔ OpenClaw gateway (WebSocket)
 * 
 * Features:
 * - Device identity + Ed25519 signing for operator.admin scope
 * - Proper chat event streaming (state: delta → final)
 * - Full gateway method access via WS
 * - SSE streaming responses
 */

const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const GATEWAY_URL = 'ws://localhost:19001';
const GATEWAY_TOKEN = 'a3ab72184283a6c817a967b4d665efe73b2485bb6770c67c';
const RELAY_PORT = 19100;
const MAIN_SESSION = 'agent:main:main';

// ── Load device identity ────────────────────────────────────────────────────

function loadDeviceIdentity() {
  const idPath = path.join(process.env.HOME || '/root', '.openclaw', 'identity', 'device.json');
  const raw = fs.readFileSync(idPath, 'utf8');
  return JSON.parse(raw);
}

function base64UrlEncode(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function publicKeyRawBase64Url(publicKeyPem) {
  const key = crypto.createPublicKey(publicKeyPem);
  const spki = key.export({ type: 'spki', format: 'der' });
  const raw = spki.slice(-32); // Ed25519 SPKI is 44 bytes: 12-byte header + 32-byte raw key
  return base64UrlEncode(raw);
}

function signPayload(privateKeyPem, payload) {
  const key = crypto.createPrivateKey(privateKeyPem);
  const sig = crypto.sign(null, Buffer.from(payload, 'utf8'), key);
  return base64UrlEncode(sig);
}

function buildDeviceAuthPayloadV3(params) {
  const scopes = params.scopes.join(',');
  const token = params.token || '';
  const platform = params.platform || 'linux';
  const deviceFamily = params.deviceFamily || '';
  return [
    'v3',
    params.deviceId,
    params.clientId,
    params.clientMode,
    params.role,
    scopes,
    String(params.signedAtMs),
    token,
    params.nonce,
    platform,
    deviceFamily,
  ].join('|');
}

const deviceIdentity = loadDeviceIdentity();
console.log('[relay] Device ID:', deviceIdentity.deviceId.slice(0, 16) + '...');

// ── Gateway WS Client ────────────────────────────────────────────────────────

class GatewayClient {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.pending = new Map();
    this.eventListeners = new Map();
    this.connectResolvers = [];
  }

  connect() {
    return new Promise((resolve, reject) => {
      if (this.connected) return resolve();
      this.connectResolvers.push({ resolve, reject });
      if (this.ws) return;
      this._doConnect();
    });
  }

  _doConnect() {
    console.log('[relay] Connecting to gateway...');
    this.ws = new WebSocket(GATEWAY_URL);

    this.ws.on('open', () => console.log('[relay] WS open'));

    this.ws.on('message', (data) => {
      let msg;
      try { msg = JSON.parse(data.toString()); } catch { return; }

      // Challenge → authenticate with device identity
      if (msg.type === 'event' && msg.event === 'connect.challenge') {
        const nonce = msg.payload?.nonce || '';
        console.log('[relay] Got challenge, authenticating with device identity...');

        const role = 'operator';
        const scopes = ['operator.admin', 'operator.read', 'operator.write', 'operator.approvals', 'operator.pairing'];
        const signedAtMs = Date.now();
        const clientId = 'cli';
        const clientMode = 'cli';

        // Build and sign the auth payload
        const payload = buildDeviceAuthPayloadV3({
          deviceId: deviceIdentity.deviceId,
          clientId,
          clientMode,
          role,
          scopes,
          signedAtMs,
          token: GATEWAY_TOKEN,
          nonce,
          platform: 'linux',
          deviceFamily: '',
        });

        const signature = signPayload(deviceIdentity.privateKeyPem, payload);
        const publicKeyRaw = publicKeyRawBase64Url(deviceIdentity.publicKeyPem);

        this._request('connect', {
          minProtocol: 3,
          maxProtocol: 3,
          client: {
            id: clientId,
            version: '2026.3.18',
            platform: 'linux',
            mode: clientMode,
            displayName: 'Opie Relay',
          },
          caps: [],
          auth: { token: GATEWAY_TOKEN },
          role,
          scopes,
          device: {
            id: deviceIdentity.deviceId,
            publicKey: publicKeyRaw,
            signature,
            signedAt: signedAtMs,
            nonce,
          },
        }).then((result) => {
          console.log('[relay] ✅ Connected! Scopes: admin+read+write+approvals+pairing');
          this.connected = true;
          this.connectResolvers.forEach(r => r.resolve());
          this.connectResolvers = [];
        }).catch((err) => {
          console.error('[relay] ❌ Auth failed:', err.message);
          this.connectResolvers.forEach(r => r.reject(err));
          this.connectResolvers = [];
        });
      }

      // Response to pending request
      if (msg.type === 'res' && msg.id) {
        const pending = this.pending.get(msg.id);
        if (pending) {
          clearTimeout(pending.timeout);
          this.pending.delete(msg.id);
          if (msg.ok === false) pending.reject(new Error(msg.error?.message || 'gateway error'));
          else pending.resolve(msg.result);
        }
      }

      // Events
      if (msg.type === 'event') {
        const listeners = this.eventListeners.get(msg.event) || [];
        listeners.forEach(fn => fn(msg.payload));
        const allListeners = this.eventListeners.get('*') || [];
        allListeners.forEach(fn => fn(msg));
      }
    });

    this.ws.on('close', (code, reason) => {
      console.log('[relay] WS closed:', code);
      this.connected = false;
      this.ws = null;
      setTimeout(() => this._doConnect(), 2000);
    });

    this.ws.on('error', (err) => console.error('[relay] WS error:', err.message));
  }

  _request(method, params, timeoutMs = 30000) {
    return new Promise((resolve, reject) => {
      const id = crypto.randomUUID();
      const frame = { type: 'req', id, method, params };
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`Gateway timeout: ${method}`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      this.ws.send(JSON.stringify(frame));
    });
  }

  async request(method, params, timeoutMs) {
    await this.connect();
    return this._request(method, params, timeoutMs);
  }

  on(event, fn) {
    if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
    this.eventListeners.get(event).push(fn);
    return () => {
      const arr = this.eventListeners.get(event) || [];
      const idx = arr.indexOf(fn);
      if (idx !== -1) arr.splice(idx, 1);
    };
  }
}

const gw = new GatewayClient();
gw.connect().catch(err => console.error('[relay] Initial connect failed:', err.message));

// ── Chat streaming via gateway events ────────────────────────────────────────

async function streamAgentChat(message, sessionKey, timeoutMs = 90000) {
  await gw.connect();

  const idempotencyKey = crypto.randomUUID();
  let runId = idempotencyKey;

  // Send message to agent session
  const sendResp = await gw.request('agent', {
    message,
    sessionKey,
    idempotencyKey,
    deliver: false,
    channel: 'webchat',
  }, 15000);

  if (sendResp?.runId) runId = sendResp.runId;
  console.log('[relay] Agent run started:', runId.slice(0, 8) + '...');

  // Collect streaming chat events: state "delta" → "final"
  const chunks = [];
  let done = false;
  let finalText = '';

  const unsub = gw.on('chat', (payload) => {
    // Chat event: { runId, sessionKey, seq, state, message: { role, content, timestamp } }
    if (!payload) return;
    if (payload.state === 'delta' && payload.message?.content?.[0]?.type === 'text') {
      const text = payload.message.content[0].text;
      if (text) chunks.push(text);
    }
    if (payload.state === 'final' && payload.message?.content?.[0]?.type === 'text') {
      finalText = payload.message.content[0].text;
      done = true;
    }
  });

  // Wait for agent.wait to complete
  const waitPromise = gw.request('agent.wait', { runId, timeoutMs }, timeoutMs + 5000)
    .catch(() => {}) // Ignore timeout errors
    .finally(() => unsub());

  // Yield chunks as they arrive
  const yieldChunks = async () => {
    const maxWait = Date.now() + timeoutMs;
    while (Date.now() < maxWait) {
      if (done) {
        // Return final text (more reliable than streamed deltas)
        return finalText || chunks.join('');
      }
      if (chunks.length > 0) {
        const text = chunks.join('');
        chunks.length = 0; // Clear processed
        return text;
      }
      await new Promise(r => setTimeout(r, 50));
    }
    unsub();
    return finalText || chunks.join('');
  };

  // Wait for agent to finish OR timeout
  await Promise.race([
    waitPromise,
    new Promise(r => setTimeout(r, timeoutMs))
  ]);

  const result = await yieldChunks();
  return { text: result, streamed: true };
}

// ── HTTP Relay ──────────────────────────────────────────────────────────────

function readBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', d => (body += d.toString()));
    req.on('end', () => resolve(body));
  });
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const url = new URL(req.url, `http://localhost:${RELAY_PORT}`);

  // Health check
  if (url.pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, connected: gw.connected, ts: Date.now() }));
    return;
  }

  // Chat endpoint
  if (url.pathname === '/chat' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const { message, sessionKey, stream, timeoutMs } = body;
    if (!message) { res.writeHead(400); res.end('message required'); return; }

    try {
      if (stream === true) {
        // SSE streaming
        res.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        });

        await gw.connect();
        const idempotencyKey = crypto.randomUUID();
        let runId = idempotencyKey;

        const sendResp = await gw.request('agent', {
          message,
          sessionKey: sessionKey || MAIN_SESSION,
          idempotencyKey,
          deliver: false,
          channel: 'webchat',
        }, 15000);
        if (sendResp?.runId) runId = sendResp.runId;

        let hasContent = false;
        const unsub = gw.on('chat', (payload) => {
          if (payload?.state === 'delta' && payload.message?.content?.[0]?.text) {
            hasContent = true;
            res.write(`data: ${JSON.stringify({ delta: payload.message.content[0].text })}\n\n`);
          }
          if (payload?.state === 'final') {
            res.write('data: [DONE]\n\n');
            res.end();
          }
        });

        // Timeout fallback
        const timeout = setTimeout(async () => {
          unsub();
          if (!hasContent) {
            try {
              const result = await streamAgentChat(message, sessionKey || MAIN_SESSION, 45000);
              res.write(`data: ${JSON.stringify({ delta: result.text })}\n\n`);
            } catch (e) {
              res.write(`data: ${JSON.stringify({ error: e.message })}\n\n`);
            }
          }
          res.write('data: [DONE]\n\n');
          res.end();
        }, timeoutMs || 90000);

        // Also do agent.wait for proper completion
        gw.request('agent.wait', { runId, timeoutMs: timeoutMs || 90000 }, (timeoutMs || 90000) + 5000)
          .catch(() => {})
          .finally(() => clearTimeout(timeout));
      } else {
        // Non-streaming JSON response
        const result = await streamAgentChat(message, sessionKey || MAIN_SESSION, timeoutMs || 90000);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, text: result.text }));
      }
    } catch (err) {
      console.error('[relay] Chat error:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // Direct gateway method call (any WS method)
  if (url.pathname === '/gateway' && req.method === 'POST') {
    const body = JSON.parse(await readBody(req));
    const { method, params, timeoutMs } = body;
    if (!method) { res.writeHead(400); res.end('method required'); return; }

    try {
      const result = await gw.request(method, params || {}, timeoutMs || 30000);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, result }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
    return;
  }

  // Common queries
  const commonEndpoints = {
    '/sessions': 'sessions.list',
    '/tools': 'tools.catalog',
    '/models': 'models.list',
    '/status': 'status',
  };

  for (const [path, method] of Object.entries(commonEndpoints)) {
    if (url.pathname === path) {
      try {
        const result = await gw.request(method, {}, 10000);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, result }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
      return;
    }
  }

  res.writeHead(404); res.end('not found');
});

server.listen(RELAY_PORT, '0.0.0.0', () => {
  console.log(`[relay] 🚀 Opie Relay listening on port ${RELAY_PORT}`);
  console.log(`[relay] Gateway: ${GATEWAY_URL}`);
  console.log(`[relay] Full powers: admin + read + write + approvals + pairing`);
  console.log(`[relay] POST /chat — chat streaming`);
  console.log(`[relay] POST /gateway — any WS method`);
  console.log(`[relay] GET /sessions, /tools, /models, /status`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
