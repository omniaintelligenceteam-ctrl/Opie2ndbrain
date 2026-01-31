# Clawdbot Gateway Stability Guide

## Executive Summary

This guide addresses recurring issues with Clawdbot gateway:
- Session file lock timeouts
- Gateway unresponsive/connection reset
- Container restart problems
- LAN vs loopback binding issues

---

## 1. Session File Locking

### Why Session Files Get Locked

The gateway uses file-based locking to prevent multiple instances from running simultaneously. Lock files contain:

```json
{
  "pid": 6,
  "createdAt": "2026-01-29T20:03:38.928Z",
  "configPath": "/home/node/.clawdbot/clawdbot.json",
  "startTime": 4630651  // Linux process start time (prevents PID recycling)
}
```

### Root Causes of Lock Timeouts

1. **Stale locks on persistent volumes** - When container crashes without cleanup, lock files remain on mounted volumes
2. **PID recycling** - New process gets same PID as old one, causing lock confusion (fixed in v2026.1.23)
3. **Container restarts** - Docker `restart: unless-stopped` doesn't clean locks between restarts
4. **NFS/network volumes** - Lock files on network storage have inconsistent behavior

### Official Fix (v2026.1.24)

> "Gateway: store lock files in the temp directory to avoid stale locks on persistent volumes" - Changelog #1676

**Ensure you're running v2026.1.24 or later.** This version moves locks to `/tmp` instead of the persistent config directory.

### Manual Lock Recovery

```bash
# Check for stale locks
ls -la ~/.clawdbot/*.lock /tmp/clawdbot*.lock 2>/dev/null

# View lock contents
cat ~/.clawdbot/gateway.*.lock

# Remove stale lock (ONLY if gateway is definitely not running)
rm ~/.clawdbot/gateway.*.lock

# Verify no gateway running
ps aux | grep clawdbot-gateway
```

### Best Practices

1. **Don't store lock files on persistent volumes** - Use `/tmp` or tmpfs
2. **Add cleanup on container stop** - Use Docker `stop_grace_period` and signal handling
3. **Use `init: true`** in docker-compose - Ensures proper signal forwarding for cleanup

---

## 2. Gateway Stability

### Why Gateway Stops Responding

1. **Memory exhaustion** - Session history grows unbounded
2. **Unhandled promise rejections** - Network timeouts, API failures
3. **Zombie WebSocket connections** - Half-open connections consume resources
4. **Event loop blocking** - Long synchronous operations

### Configuration for Stability

```json
{
  "session": {
    "historyLimit": 100,
    "reset": {
      "mode": "daily",
      "atHour": 4,
      "idleMinutes": 10080
    }
  },
  "reply": {
    "timeoutSeconds": 1800
  },
  "logging": {
    "level": "info",
    "consoleLevel": "debug",
    "consoleStyle": "pretty"
  }
}
```

### Health Check Endpoint

The gateway exposes a WebSocket-based health check. Use the CLI:

```bash
# Quick probe
clawdbot gateway probe

# Full status with deep checks
clawdbot status --deep

# Channel-specific probe
clawdbot channels status --probe
```

### Keep-Alive Monitoring

Create a simple health check script:

```bash
#!/bin/bash
# /opt/scripts/gateway-healthcheck.sh

GATEWAY_URL="http://localhost:18789"
TIMEOUT=5

# Try to reach the gateway
if curl -sf --max-time $TIMEOUT "$GATEWAY_URL/health" > /dev/null 2>&1; then
    exit 0
else
    echo "Gateway unhealthy at $(date)"
    exit 1
fi
```

---

## 3. Docker Best Practices

### Current Configuration Issues

Your current docker-compose lacks:
- Health checks
- Stop grace period
- Proper signal handling
- Resource limits

### Recommended docker-compose.yml

```yaml
services:
  clawdbot-gateway:
    image: ${CLAWDBOT_IMAGE:-clawdbot:local}
    container_name: clawdbot-gateway
    environment:
      HOME: /home/node
      TERM: xterm-256color
      CLAWDBOT_GATEWAY_TOKEN: ${CLAWDBOT_GATEWAY_TOKEN}
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      # Lock files go to temp (volatile) storage
      TMPDIR: /tmp
    volumes:
      - ${CLAWDBOT_CONFIG_DIR}:/home/node/.clawdbot
      - ${CLAWDBOT_WORKSPACE_DIR}:/home/node/clawd
      # Use tmpfs for lock files (optional, provides extra safety)
      - type: tmpfs
        target: /tmp
        tmpfs:
          size: 100M
    ports:
      - "${CLAWDBOT_GATEWAY_PORT:-18789}:18789"
      - "${CLAWDBOT_BRIDGE_PORT:-18790}:18790"
    init: true
    restart: unless-stopped
    stop_grace_period: 30s
    # CRITICAL: Add health check
    healthcheck:
      test: ["CMD", "node", "dist/index.js", "gateway", "probe", "--timeout", "5000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s
    # Resource limits prevent runaway memory
    deploy:
      resources:
        limits:
          memory: 2G
        reservations:
          memory: 512M
    command:
      [
        "node",
        "dist/index.js",
        "gateway",
        "--bind",
        "${CLAWDBOT_GATEWAY_BIND:-lan}",
        "--port",
        "${CLAWDBOT_GATEWAY_PORT:-18789}"
      ]
    labels:
      - "autoheal=true"

  # Auto-restart unhealthy containers
  autoheal:
    image: willfarrell/autoheal
    container_name: autoheal
    restart: always
    environment:
      AUTOHEAL_CONTAINER_LABEL: autoheal
      AUTOHEAL_INTERVAL: 30
      AUTOHEAL_START_PERIOD: 120
      AUTOHEAL_DEFAULT_STOP_TIMEOUT: 30
      WEBHOOK_URL: ${WEBHOOK_URL:-}  # Optional: Slack/Discord webhook
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - /etc/localtime:/etc/localtime:ro
    network_mode: none
```

### Key Changes Explained

| Setting | Purpose |
|---------|---------|
| `healthcheck` | Detects unhealthy gateway before complete failure |
| `autoheal` container | Automatically restarts unhealthy containers |
| `stop_grace_period: 30s` | Gives gateway time to clean up locks |
| `init: true` | Proper signal handling for cleanup |
| `tmpfs` for `/tmp` | Lock files don't persist across restarts |
| `memory limits` | Prevents runaway memory consumption |
| `start_period: 60s` | Don't fail health check during startup |

---

## 4. Gateway Binding (LAN vs Loopback)

### Understanding Bind Modes

| Mode | Address | Auth Required | Use Case |
|------|---------|---------------|----------|
| `loopback` | 127.0.0.1 | No | Local development |
| `lan` | 0.0.0.0 | **Yes** | Docker, remote access |
| `tailnet` | Tailscale IP | **Yes** | Secure remote |
| `custom` | Specified IP | **Yes** | Specific interface |

### Your Configuration

```json
"gateway": {
  "bind": "lan",
  "auth": {
    "mode": "password",
    "token": "xxx..."
  }
}
```

**This is correct.** LAN binding requires auth, and you have it configured.

### Common Issues

1. **"refusing to bind without auth"** - Set `gateway.auth.token`
2. **"address already in use"** - Another process on port 18789
3. **Connection reset by peer** - Usually firewall or gateway crash

### Verifying Connectivity

```bash
# Check what's listening
ss -tlnp | grep 18789

# Test from localhost
curl -H "Authorization: Bearer $TOKEN" http://localhost:18789/health

# Test from Docker host
curl -H "Authorization: Bearer $TOKEN" http://host.docker.internal:18789/health
```

---

## 5. Monitoring & Alerting

### Health Check Script

```bash
#!/bin/bash
# /opt/scripts/check-gateway.sh

set -e

CONTAINER_NAME="clawdbot-gateway"
LOG_FILE="/var/log/clawdbot-health.log"
WEBHOOK_URL="${WEBHOOK_URL:-}"

check_health() {
    docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" 2>/dev/null || echo "unknown"
}

log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

notify() {
    if [ -n "$WEBHOOK_URL" ]; then
        curl -sf -X POST "$WEBHOOK_URL" \
            -H "Content-Type: application/json" \
            -d "{\"text\": \"$1\"}" || true
    fi
}

# Main check
STATUS=$(check_health)

case $STATUS in
    healthy)
        exit 0
        ;;
    unhealthy)
        log "Gateway unhealthy - autoheal should restart"
        notify "⚠️ Clawdbot gateway unhealthy, auto-restart triggered"
        ;;
    *)
        log "Gateway status unknown: $STATUS"
        notify "❓ Clawdbot gateway status: $STATUS"
        ;;
esac
```

### Cron-Based Monitoring

```bash
# Add to crontab -e
*/5 * * * * /opt/scripts/check-gateway.sh

# Or use systemd timer for more reliability
```

### systemd Watchdog (Alternative to Docker)

If running outside Docker:

```ini
# /etc/systemd/user/clawdbot-gateway.service
[Unit]
Description=Clawdbot Gateway
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/node /app/dist/index.js gateway
Restart=always
RestartSec=10
WatchdogSec=60

[Install]
WantedBy=default.target
```

---

## 6. Actionable Fixes (TODAY)

### Immediate Priority

1. **Verify version** - Must be v2026.1.24+ for lock file fixes
   ```bash
   docker exec clawdbot-gateway node dist/index.js --version
   ```

2. **Add health check to docker-compose** - Most impactful change
   ```yaml
   healthcheck:
     test: ["CMD", "node", "dist/index.js", "gateway", "probe", "--timeout", "5000"]
     interval: 30s
     timeout: 10s
     retries: 3
     start_period: 60s
   ```

3. **Add autoheal container** - Automatic recovery
   ```yaml
   autoheal:
     image: willfarrell/autoheal
     restart: always
     environment:
       AUTOHEAL_CONTAINER_LABEL: all
     volumes:
       - /var/run/docker.sock:/var/run/docker.sock
   ```

4. **Clear any stale locks before restart**
   ```bash
   docker-compose down
   rm -f ${CLAWDBOT_CONFIG_DIR}/*.lock
   docker-compose up -d
   ```

### Quick Recovery Procedure

When gateway is unresponsive:

```bash
# 1. Check status
docker-compose ps
docker logs clawdbot-gateway --tail 100

# 2. Force restart
docker-compose restart clawdbot-gateway

# 3. If still failing, full reset
docker-compose down
rm -f /path/to/config/*.lock
docker-compose up -d

# 4. Verify
docker-compose logs -f clawdbot-gateway
```

---

## 7. Configuration Summary

### Recommended clawdbot.json additions

```json
{
  "session": {
    "historyLimit": 100,
    "reset": {
      "mode": "daily",
      "atHour": 4,
      "idleMinutes": 1440
    }
  },
  "gateway": {
    "bind": "lan",
    "auth": {
      "mode": "password",
      "token": "YOUR_TOKEN"
    }
  },
  "logging": {
    "level": "info"
  }
}
```

### Environment Variables

| Variable | Purpose | Recommended |
|----------|---------|-------------|
| `CLAWDBOT_GATEWAY_TOKEN` | Auth for non-loopback | Required for LAN |
| `TMPDIR` | Lock file location | `/tmp` |
| `NODE_OPTIONS` | Memory limits | `--max-old-space-size=1536` |

---

## References

- [Clawdbot Troubleshooting](https://docs.molt.bot/gateway/troubleshooting)
- [Clawdbot Health Checks](https://docs.clawd.bot/gateway/health)
- [Docker Autoheal](https://github.com/willfarrell/docker-autoheal)
- [Clawdbot Changelog](https://github.com/clawdbot/clawdbot/releases)

---

*Last updated: 2026-01-29*
