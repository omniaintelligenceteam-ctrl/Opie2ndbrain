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
const MAIN_SESSION = 'agent:main:webchat';

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
  }, 45000);

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

  // ── Ops Center API ─────────────────────────────────────────────────────────

  // GET /api/agents/status — All agent statuses with emoji/model/task
  if (url.pathname === '/api/agents/status') {
    try {
      const result = await gw.request('sessions.list', { activeMinutes: 1440, messageLimit: 1 }, 10000);
      const sessions = result?.sessions || [];
      const AGENT_MAP = {
        main: { name: 'G', emoji: '🤖', color: '#a855f7' },
        webchat: { name: 'Opie', emoji: '🐙', color: '#06b6d4' },
        discord: { name: 'G', emoji: '🤖', color: '#a855f7' },
      };
      const agents = sessions.map((s) => {
        const keyParts = (s.key || '').split(':');
        const channel = keyParts[2] || 'main';
        const mapped = AGENT_MAP[channel] || { name: channel, emoji: '🤖', color: '#6b7280' };
        const updatedAt = s.updatedAt || 0;
        const isActive = Date.now() - updatedAt < 30000;
        const isIdle = !isActive && Date.now() - updatedAt < 300000;
        return {
          id: s.key || s.sessionId,
          name: s.label || mapped.name,
          emoji: mapped.emoji,
          color: mapped.color,
          status: isActive ? 'working' : isIdle ? 'online' : 'idle',
          currentTask: s.label || (isActive ? 'Processing...' : 'Idle'),
          model: s.model || 'unknown',
          lastActive: updatedAt ? `${Math.max(1, Math.floor((Date.now() - updatedAt) / 60000))}m ago` : '—',
          tokensToday: s.totalTokens || 0,
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, agents }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, agents: [] }));
    }
    return;
  }

  // GET /api/health — System health (gateway, webhook, RAM, disk, crons)
  if (url.pathname === '/api/health') {
    const result = { gateway: { connected: gw.connected, latency: 0 } };
    const checks = {};
    try {
      // Webhook health
      const whStart = Date.now();
      const whRes = await fetch('http://localhost:3456/webhook/health', { signal: AbortSignal.timeout(3000) }).catch(() => null);
      checks.webhook = whRes && whRes.ok
        ? { healthy: true, uptime: Math.floor((Date.now() - SERVER_START_MS) / 1000) }
        : { healthy: false };
    } catch { checks.webhook = { healthy: false }; }
    try {
      // System info via /proc
      const memInfo = fs.readFileSync('/proc/meminfo', 'utf8');
      const totalMatch = memInfo.match(/MemTotal:\s+(\d+)/);
      const availMatch = memInfo.match(/MemAvailable:\s+(\d+)/);
      const totalKB = totalMatch ? parseInt(totalMatch[1]) : 0;
      const availKB = availMatch ? parseInt(availMatch[1]) : 0;
      checks.ram = {
        used: parseFloat(((totalKB - availKB) / 1048576).toFixed(1)),
        total: parseFloat((totalKB / 1048576).toFixed(1)),
      };
    } catch { checks.ram = { used: 0, total: 0 }; }
    try {
      const { execSync } = require('child_process');
      const dfOut = execSync("df -h / | tail -1 | awk '{print $5}'", { encoding: 'utf8' }).trim();
      checks.disk = parseInt(dfOut) || 0;
    } catch { checks.disk = 0; }
    try {
      // Crons summary
      const cronResult = await gw.request('tools.invoke', { tool: 'cron', args: { action: 'list' } }, 8000);
      const jobs = cronResult?.jobs || [];
      const errored = jobs.filter(j => j.state?.lastStatus === 'error').length;
      checks.crons = { healthy: jobs.length - errored, errored };
    } catch { checks.crons = { healthy: 0, errored: 0 }; }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ...result, ...checks }));
    return;
  }

  // GET /api/operations/recent — Last 200 agent operations (from gateway events buffer)
  if (url.pathname === '/api/operations/recent') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, events: recentOpsBuffer.slice(0, 200), live: gw.connected }));
    return;
  }

  // GET /api/operations/live — SSE stream of real-time agent events
  if (url.pathname === '/api/operations/live') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    const sendEvent = (ev) => {
      res.write(`data: ${JSON.stringify({ event: true, ...ev })}\n\n`);
    };
    // Send recent events as initial batch
    for (const ev of recentOpsBuffer.slice(0, 20)) {
      sendEvent(ev);
    }
    // Subscribe to new events
    const idx = opsListeners.push(sendEvent) - 1;
    const heartbeat = setInterval(() => { res.write(`:heartbeat\n\n`); }, 25000);
    req.on('close', () => {
      opsListeners.splice(idx, 1);
      clearInterval(heartbeat);
    });
    return;
  }

  // GET /api/tasks/open-loops — Parse open loops from memory/open-loops.md
  if (url.pathname === '/api/tasks/open-loops') {
    try {
      const loopsPath = path.join(process.env.HOME || '/root', '.openclaw', 'workspace', 'memory', 'open-loops.md');
      const fallbackPath = path.join(process.env.HOME || '/root', '.openclaw', 'workspace', 'OPEN-ITEMS.md');
      const targetPath = fs.existsSync(loopsPath) ? loopsPath : fallbackPath;
      let tasks = [];

      if (fs.existsSync(targetPath)) {
        const content = fs.readFileSync(targetPath, 'utf8');
        const lines = content.split('\n');
        for (const line of lines) {
          const taskMatch = line.match(/^[-*]\s+(?:\[([x ])\]\s+)?(.*)/i);
          if (!taskMatch) continue;
          const done = (taskMatch[1] || '').toLowerCase() === 'x';
          const text = (taskMatch[2] || '').trim();
          if (!text || text.length < 3) continue;
          const ownerMatch = text.match(/@(\w+)/);
          const statusMatch = text.match(/\b(blocked|waiting|active)\b/i);
          tasks.push({
            id: tasks.length.toString(),
            name: text.replace(/@\w+/g, '').replace(/\b(blocked|waiting|active)\b/gi, '').trim(),
            owner: ownerMatch ? ownerMatch[1] : 'G',
            ownerColor: '#a855f7',
            status: done ? 'done' : statusMatch ? statusMatch[1].toLowerCase() : 'active',
            nextAction: 'Review and close loop',
            age: '1-3d',
          });
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, tasks }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, tasks: [] }));
    }
    return;
  }

  // GET /api/memory/activity — Recent memory events
  if (url.pathname === '/api/memory/activity') {
    const events = [];
    try {
      // Read r-memory log for recent events
      const logPath = path.join(process.env.HOME || '/root', '.openclaw', 'workspace', 'r-memory', 'r-memory.log');
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        const lines = content.split('\n').filter(Boolean).slice(-20).reverse();
        for (const line of lines.slice(0, 8)) {
          const tsMatch = line.match(/\[(\d{4}-\d{2}-\d{2}T[^\]]+)\]/);
          const ts = tsMatch ? tsMatch[1] : new Date().toISOString();
          let type = 'write';
          let description = line.replace(/\[.*?\]\s*/, '').slice(0, 80);
          if (line.includes('compress')) { type = 'compress'; }
          else if (line.includes('evict')) { type = 'evict'; }
          else if (line.includes('narrative') || line.includes('SESSION_THREAD')) { type = 'narrative'; }
          else if (line.includes('context')) { type = 'context'; }
          events.push({ id: events.length.toString(), type, description, timestamp: ts });
        }
      }
    } catch { /* ignore */ }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, events, contextUsed: 0, contextTotal: 200000 }));
    return;
  }

  // GET /api/crm/leads — CRM lead data (demo-enriched)
  if (url.pathname === '/api/crm/leads') {
    try {
      const warmCompanies = [
        'Northline Dental Group', 'Atlas Custom Homes', 'Bluepeak HVAC', 'Verity Wellness',
        'Summit Legal Partners', 'Pioneer Solar Co', 'Oak Ridge Plumbing', 'Nexa Accounting',
        'Harbor Family Clinic', 'Granite Roofing', 'Everbright Med Spa', 'Maple Grove Pediatrics',
        'Apex Auto Care', 'Crescent Orthodontics', 'Metro Injury Law', 'Brightpath Insurance',
        'Westfield Home Loans', 'Peak Fitness Studio', 'Valley Vet Center', 'Silverline Contractors'
      ];

      const hotLeads = [
        {
          id: 'hot-1',
          name: 'Sarah',
          company: 'Redwoods',
          callDuration: '4m 6s',
          lastContact: '2026-03-13T21:34:00Z',
          temperature: 'hot',
          summary: 'High intent demo follow-up requested',
        },
        {
          id: 'hot-2',
          name: 'Sarah',
          company: 'Unknown',
          callDuration: '3m 50s',
          lastContact: '2026-03-13T21:28:00Z',
          temperature: 'hot',
          summary: 'Inbound with urgent onboarding questions',
        },
      ];

      const warmLeads = warmCompanies.map((company, i) => ({
        id: `warm-${i + 1}`,
        name: ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan'][i % 5],
        company,
        callDuration: `${2 + (i % 3)}m ${10 + i}s`,
        lastContact: new Date(Date.now() - (i + 1) * 86400000).toISOString(),
        temperature: 'warm',
        summary: 'Interested, pending follow-up sequence',
      }));

      const coldLeads = [
        'Aster Logistics', 'Hillcrest Dental', 'Metro Realty', 'Skyline Cleaners',
        'Brio Electric', 'Canyon Auto', 'Riverside Dental', 'Parkway Optics'
      ].map((company, i) => ({
        id: `cold-${i + 1}`,
        name: ['Chris', 'Jamie', 'Drew', 'Riley'][i % 4],
        company,
        callDuration: `${1 + (i % 2)}m ${8 + i}s`,
        lastContact: new Date(Date.now() - (i + 10) * 86400000).toISOString(),
        temperature: 'cold',
        summary: 'Low intent, nurture only',
      }));

      const leads = [...hotLeads, ...warmLeads, ...coldLeads];
      const summary = { hot: hotLeads.length, warm: warmLeads.length, cold: coldLeads.length };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, summary, leads, lastCallAt: hotLeads[0].lastContact }));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, summary: { hot: 0, warm: 0, cold: 0 }, leads: [] }));
    }
    return;
  }

  // GET /api/crons/timeline — Cron job timeline
  if (url.pathname === '/api/crons/timeline') {
    try {
      const cronResult = await gw.request('tools.invoke', { tool: 'cron', args: { action: 'list' } }, 8000);
      const jobs = (cronResult?.jobs || []).map(j => ({
        id: j.id,
        name: j.name || j.id,
        schedule: j.schedule?.expr || '—',
        enabled: j.enabled !== false,
        lastRun: j.state?.lastRunAtMs ? new Date(j.state.lastRunAtMs).toISOString() : null,
        lastStatus: j.state?.lastStatus === 'ok' ? 'success' : j.state?.lastStatus === 'error' ? 'failed' : 'pending',
        nextRun: j.state?.nextRunAtMs ? new Date(j.state.nextRunAtMs).toISOString() : null,
      }));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, jobs }));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, jobs: [] }));
    }
    return;
  }

  // GET /api/costs/summary — Cost/usage data
  if (url.pathname === '/api/costs/summary') {
    try {
      const byModel = [
        { model: 'Claude Opus 4-6', cost: 18.42, inputTokens: 1240200, outputTokens: 298400 },
        { model: 'Claude Sonnet 4-6', cost: 9.73, inputTokens: 980500, outputTokens: 356200 },
        { model: 'MiniMax M2.7', cost: 3.16, inputTokens: 740000, outputTokens: 214000 },
        { model: 'Gemini 2.5 Flash', cost: 1.89, inputTokens: 630100, outputTokens: 182300 },
      ];
      const byAgent = [
        { agent: 'G', cost: 14.92, tokens: 1420000 },
        { agent: 'Opie', cost: 7.28, tokens: 910000 },
        { agent: 'Scout', cost: 5.47, tokens: 720000 },
        { agent: 'Ops Guardian', cost: 3.11, tokens: 535000 },
        { agent: 'Memory Curator', cost: 2.42, tokens: 408000 },
      ];
      const tokenUsage = {
        input: byModel.reduce((n, m) => n + m.inputTokens, 0),
        output: byModel.reduce((n, m) => n + m.outputTokens, 0),
      };
      const totalCost = parseFloat(byModel.reduce((n, m) => n + m.cost, 0).toFixed(2));
      const totalTokens = tokenUsage.input + tokenUsage.output;
      const trend7d = [14.82, 16.11, 19.34, 17.26, 21.03, 25.84, totalCost];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, totalCost, totalTokens, byModel, byAgent, tokenUsage, trend7d }));
    } catch {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, totalCost: 0, totalTokens: 0, byModel: [], byAgent: [], tokenUsage: { input: 0, output: 0 }, trend7d: [] }));
    }
    return;
  }

  // Common queries (original endpoints)
  const commonEndpoints = {
    '/sessions': 'sessions.list',
    '/tools': 'tools.catalog',
    '/models': 'models.list',
    '/status': 'status',
  };

  for (const [epath, method] of Object.entries(commonEndpoints)) {
    if (url.pathname === epath) {
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

// ── Operations Event Buffer ─────────────────────────────────────────────────
// Capture gateway events into a rolling buffer for the ops feed

const recentOpsBuffer = [];
const opsListeners = [];
const MAX_OPS_BUFFER = 500;
const SERVER_START_MS = Date.now();

// Subscribe to all gateway events and buffer them
gw.on('*', (msg) => {
  if (!msg || !msg.event) return;
  const ev = {
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    agent: 'G',
    action: `${msg.event}`,
    detail: typeof msg.payload === 'object' ? JSON.stringify(msg.payload).slice(0, 200) : undefined,
    type: 'info',
  };
  // Enrich with session/agent info
  if (msg.payload?.sessionKey) {
    const parts = msg.payload.sessionKey.split(':');
    ev.agent = parts[1] === 'main' ? 'G' : parts[2] || parts[1] || 'G';
  }
  if (msg.event === 'chat' && msg.payload?.state === 'delta') return; // Skip raw deltas
  if (msg.event.startsWith('connect')) return; // Skip connect events

  recentOpsBuffer.unshift(ev);
  if (recentOpsBuffer.length > MAX_OPS_BUFFER) recentOpsBuffer.length = MAX_OPS_BUFFER;

  // Notify SSE listeners
  for (const fn of opsListeners) {
    try { fn(ev); } catch {}
  }
});

server.listen(RELAY_PORT, '0.0.0.0', () => {
  console.log(`[relay] 🚀 Opie Relay listening on port ${RELAY_PORT}`);
  console.log(`[relay] Gateway: ${GATEWAY_URL}`);
  console.log(`[relay] Full powers: admin + read + write + approvals + pairing`);
  console.log(`[relay] POST /chat — chat streaming`);
  console.log(`[relay] POST /gateway — any WS method`);
  console.log(`[relay] GET  /api/agents/status, /api/health, /api/operations/*`);
  console.log(`[relay] GET  /api/tasks/open-loops, /api/memory/activity`);
  console.log(`[relay] GET  /api/crm/leads, /api/crons/timeline, /api/costs/summary`);
});

process.on('SIGTERM', () => { server.close(); process.exit(0); });
process.on('SIGINT', () => { server.close(); process.exit(0); });
