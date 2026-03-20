# Opie Ops Center — Deployment Guide

**Quick start:** 5 minutes to live Ops dashboard.

---

## Prerequisites

- Node.js 18+ (check: `node -v`)
- OpenClaw gateway running (`openclaw gateway` or systemd service)
- Gateway accessible at `ws://localhost:19001`
- Workspace at `~/.openclaw/workspace`

---

## 1. Local Development (Device)

### Start Relay Server
```bash
cd ~/openclaw/workspace/Opie2ndbrain
node opie-relay.js
```
Expected output:
```
[relay] 🚀 Opie Relay listening on port 19100
[relay] Gateway: ws://localhost:19001
[relay] Full powers: admin + read + write + approvals + pairing
```

### Start Next.js Dev Server
```bash
cd ~/openclaw/workspace/Opie2ndbrain
npm run dev
```
Expected output:
```
> next dev
ready - started server on 0.0.0.0:3000, url: http://localhost:3000
```

### Access Dashboard
- Open browser: `http://localhost:3000`
- See agent status, live ops feed, health indicators
- Toggle tabs: Dashboard → Leads → Crons → Costs

---

## 2. Production Deployment (Vercel)

### Prerequisites
- Vercel account
- GitHub repo with Opie2ndbrain code
- OpenClaw gateway + relay running on your device (always-on)

### Deploy via Vercel CLI
```bash
cd ~/openclaw/workspace/Opie2ndbrain
npm i -g vercel
vercel login
vercel --prod
```

### Environment Variables (Vercel Settings)
Add in Vercel dashboard under **Settings > Environment Variables:**

```
NEXT_PUBLIC_OPIE_RELAY_URL=https://your-device-ip:19100
```

Or use a tunneling service (recommended for security):

```bash
# Install cloudflared on your device
curl https://pkg.cloudflare.com/cloudflare-release.key | sudo gpg --import -
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-archive-keyring.gpg] https://pkg.cloudflare.com/linux/$(lsb_release -cs) $(lsb_release -cs) main' | sudo tee /etc/apt/sources.list.d/cloudflare.list
sudo apt update && sudo apt install cloudflared

# Tunnel relay server
cloudflared tunnel login
cloudflared tunnel create opie-relay
cloudflared tunnel route dns opie-relay your.domain.com
cloudflared tunnel run opie-relay --url http://localhost:19100
```

Then set:
```
NEXT_PUBLIC_OPIE_RELAY_URL=https://opie-relay.your.domain.com
```

### Deploy to Vercel
```bash
vercel env add NEXT_PUBLIC_OPIE_RELAY_URL
# Enter the relay URL above
vercel --prod
```

### Keep Relay Running 24/7

**Option A: systemd service (Linux)**
```bash
sudo tee /etc/systemd/system/opie-relay.service << 'EOF'
[Unit]
Description=Opie Relay Server
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/root/openclaw/workspace/Opie2ndbrain
ExecStart=/usr/bin/node opie-relay.js
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable opie-relay
sudo systemctl start opie-relay
sudo systemctl status opie-relay
```

**Option B: PM2 (Node process manager)**
```bash
npm i -g pm2
cd ~/openclaw/workspace/Opie2ndbrain
pm2 start opie-relay.js --name opie-relay
pm2 save
pm2 startup
```

**Option C: Docker (if containerized)**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY opie-relay.js .
RUN npm install ws
EXPOSE 19100
CMD ["node", "opie-relay.js"]
```

---

## 3. Configuration

### .env.local (Development)
```bash
NEXT_PUBLIC_OPIE_RELAY_URL=http://localhost:19100
```

### .env.production (Vercel)
Set via Vercel dashboard (see section 2 above).

### Relay Server Configuration (opie-relay.js)

Edit top of file:
```javascript
const GATEWAY_URL = 'ws://localhost:19001';  // Gateway WS endpoint
const GATEWAY_TOKEN = 'a3ab72184283a6c817a967b4d665efe73b2485bb6770c67c';  // Your token
const RELAY_PORT = 19100;  // Change if needed
```

---

## 4. Verify Deployment

### Health Check (Device)
```bash
curl http://localhost:19100/health
# Expected: {"ok":true,"gateway":{...},"webhook":{...},"ram":{...}}

curl http://localhost:19100/api/agents/status
# Expected: {"ok":true,"agents":[...]}

curl http://localhost:19100/api/operations/recent
# Expected: {"ok":true,"events":[...]}
```

### Health Check (Vercel)
```bash
curl https://your-vercel-app.vercel.app/api/health
# Expected: {"ok":true,"gateway":{...}}
```

---

## 5. Troubleshooting

### Relay Won't Start
```bash
# Check port 19100 is free
lsof -i :19100
# Kill if needed: kill -9 <PID>

# Check gateway is running
openclawgateway health
# or
openclaw health
```

### Relay Can't Connect to Gateway
```bash
# Verify gateway URL in opie-relay.js
# Verify gateway token is correct
# Test gateway directly:
curl ws://localhost:19001/gateway --output /dev/null -w "%{http_code}\n"
# (WebSocket, so will fail with curl, but port confirms running)

# Use OpenClaw CLI:
openclaw gateway-cli /health
```

### Vercel Can't Reach Relay
- Check firewall allows inbound on port 19100
- Check tunnel service is running (if using Cloudflare)
- Check `NEXT_PUBLIC_OPIE_RELAY_URL` is set correctly
- Test from Vercel function: `curl https://opie-relay.your.domain.com/health`

### Agents Not Showing
- Check `/api/agents/status` returns sessions
- Verify main agent session is active: `openclaw sessions list`
- Check relay logs: check for agent connection errors

### Operations Feed Stuck
- Relay may be buffering too much data
- Restart relay: `systemctl restart opie-relay`
- Check for WebSocket connection errors in browser console

---

## 6. Monitoring

### Check Relay Health (Cron)
```bash
#!/bin/bash
# Add to crontab: 0 * * * * /path/to/relay-health-check.sh

curl -s http://localhost:19100/api/health > /tmp/relay-health.json
if ! grep -q '"ok":true' /tmp/relay-health.json; then
  systemctl restart opie-relay
  echo "Relay restarted at $(date)" >> /var/log/opie-relay.log
fi
```

### Watch Logs
```bash
# systemd
sudo journalctl -u opie-relay -f

# PM2
pm2 logs opie-relay

# Direct (if running in terminal)
# Just watch the console output
```

### Monitor Vercel Deployment
- Vercel dashboard: https://vercel.com/dashboard
- View function logs: Dashboard → Project → Deployments → Logs
- Check error rate and cold start metrics

---

## 7. Scaling

### Multiple Relay Instances
If you have multiple devices/regions:

```bash
# Device A: Relay on port 19100
node opie-relay.js

# Device B: Relay on port 19100
node opie-relay.js

# Vercel: Load balance via DNS or API gateway
# Set NEXT_PUBLIC_OPIE_RELAY_URL to a load balancer URL
```

### Increase Buffer Size
Edit opie-relay.js:
```javascript
const MAX_OPS_BUFFER = 500;  // Increase to 1000+ for high-volume
```

---

## 8. Security

### Protect Relay Endpoint
**Option A: IP Allowlist (firewall)**
```bash
# Allow only your Vercel IP ranges
# https://vercel.com/docs/concepts/edge-network/regions

sudo ufw allow from YOUR_VERCEL_IP to any port 19100
```

**Option B: API Key (add to relay)**
```javascript
// In opie-relay.js, check for header before responding
if (req.headers['x-relay-key'] !== process.env.RELAY_SECRET) {
  res.writeHead(401);
  res.end('Unauthorized');
  return;
}
```

**Option C: TLS Tunnel (recommended)**
```bash
# Use Cloudflare or ngrok for encrypted tunnel
cloudflared tunnel create opie-relay
# Provides HTTPS + auto-certificate
```

---

## 9. Next Steps

1. **Deploy** using option A (local) or option B (Vercel)
2. **Verify** health checks pass
3. **Monitor** logs for issues
4. **Scale** if needed (multiple relays, increase buffer)
5. **Iterate** on dashboard design based on real operations data

---

## Support

- **Logs:** `journalctl -u opie-relay -f` or `pm2 logs`
- **Health Check:** `curl http://localhost:19100/health`
- **Gateway Issues:** `openclaw health`
- **Vercel Issues:** Check deployment logs in dashboard

---

**Status:** Ready to deploy! 🚀
