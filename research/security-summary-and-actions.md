# Security Hardening Summary & Action Items

**Date:** 2026-01-29  
**For:** Wes (human) and Opie (AI assistant)

---

## Quick Summary

**Found 15 security issues.** 4 are critical and need fixing today.

| Severity | Count | Examples |
|----------|-------|----------|
| 🔴 Critical | 4 | Weak tokens, exposed API keys, insecure auth |
| 🟠 High | 4 | LAN bind, no sandbox, browser no-sandbox |
| 🟡 Medium | 4 | mDNS exposure, no rate limiting, session accumulation |
| 🟢 Low | 3 | Nice-to-haves |

---

## Immediate Fixes - WES Must Do (Human Action Required)

These require access to Windows PC or Tailscale admin:

### 1. Rotate Browser Control Token (5 min)

**On Windows PC:**
```powershell
# Generate new token
$newToken = -join ((48..57) + (97..102) | Get-Random -Count 64 | ForEach-Object {[char]$_})
Write-Host "New token: $newToken"

# Update browser serve command:
clawdbot browser serve --bind 127.0.0.1 --port 18791 --token $newToken

# Then tell Opie the new token to update config
```

### 2. Switch Funnel to Serve (2 min)

**On Windows PC:**
```powershell
# Stop Funnel (public internet exposure)
tailscale funnel off

# Use Serve instead (tailnet-only)
tailscale serve 18791
```

This change means browser control only works from devices on your Tailscale network (your phone, your other computers) - not from the public internet. Much safer.

### 3. Rotate Gateway Password (3 min)

Generate and save securely:
```bash
openssl rand -hex 32
# Example output: a7b9c2d4e6f8g1h3j5k7l9m2n4p6q8r1s3t5u7v9w2x4y6z8a1b3c5d7e9f2
```

Tell Opie the new password to update the config, or update it yourself in the config.

### 4. Verify Tailscale ACLs

In [Tailscale Admin Console](https://login.tailscale.com/admin/acls):
- Ensure Funnel access is restricted to your devices only
- Consider disabling Funnel entirely if not needed

---

## Immediate Fixes - OPIE Can Do (Agent Action)

I can update these in the configuration files:

### 1. Update tokens in config (after Wes provides new ones)
- `browser.controlToken`
- `gateway.auth.password`
- `gateway.auth.token`
- `gateway.remote.token`

### 2. Fix insecure settings
```bash
# I can edit ~/.moltbot/clawdbot.json to:
- Set "allowInsecureAuth": false
- Set "noSandbox": false (if supported)
- Set "bind": "loopback" (if LAN not needed)
- Add "mdns": { "mode": "minimal" }
```

### 3. Fix file permissions
```bash
chmod 700 ~/.moltbot
chmod 600 ~/.moltbot/clawdbot.json
chmod 600 ~/.moltbot/.env
chmod -R 700 ~/.moltbot/credentials
chmod -R 700 ~/.moltbot/agents
```

### 4. Run security audit
```bash
clawdbot security audit --deep
clawdbot security audit --fix
```

### 5. Remove duplicate API keys
- Remove OPENAI_API_KEY from clawdbot.json (keep in .env only)
- Use environment variable references instead of hardcoded values

---

## Token Rotation Procedure

### Full Rotation (Do Quarterly or After Incident)

**Step 1: Generate All New Tokens**
```bash
# Run these and save output securely (1Password, etc.)
echo "Gateway Token: $(openssl rand -hex 32)"
echo "Gateway Password: $(openssl rand -hex 32)"
echo "Browser Token: $(openssl rand -hex 32)"
echo "Remote Token: $(openssl rand -hex 32)"
```

**Step 2: Update Config**

Edit `~/.moltbot/clawdbot.json`:
```json
{
  "gateway": {
    "auth": {
      "token": "NEW_GATEWAY_TOKEN_HERE",
      "password": "NEW_PASSWORD_HERE"
    },
    "remote": {
      "token": "NEW_REMOTE_TOKEN_HERE"
    }
  },
  "browser": {
    "controlToken": "NEW_BROWSER_TOKEN_HERE"
  }
}
```

**Step 3: Update Windows PC**
```powershell
# Update browser serve command with new token
clawdbot browser serve --bind 127.0.0.1 --port 18791 --token NEW_BROWSER_TOKEN

# Restart Tailscale Serve
tailscale serve 18791
```

**Step 4: Restart Gateway**
```bash
clawdbot gateway restart
```

**Step 5: Verify**
```bash
clawdbot gateway status
clawdbot security audit
```

**Step 6: Document**
- Record rotation date
- Store old tokens for 7 days (in case rollback needed)
- Then delete old tokens

---

## Priority-Ranked Security Improvements

### Tier 1: Critical (Do Today) 🔴

| # | Issue | Fix | Owner |
|---|-------|-----|-------|
| 1 | Browser token `secrettoken123` | Generate 64-char random | Wes |
| 2 | Gateway password `clawdbot2026` | Generate 64-char random | Wes |
| 3 | Tailscale Funnel exposure | Switch to Serve | Wes |
| 4 | `allowInsecureAuth: true` | Set to false | Opie |

### Tier 2: High (This Week) 🟠

| # | Issue | Fix | Owner |
|---|-------|-----|-------|
| 5 | Gateway bound to LAN | Change to loopback | Opie |
| 6 | No agent sandboxing | Enable sandbox mode | Opie |
| 7 | Browser noSandbox=true | Set to false | Opie |
| 8 | Loose file permissions | chmod 700/600 | Opie |

### Tier 3: Medium (This Month) 🟡

| # | Issue | Fix | Owner |
|---|-------|-----|-------|
| 9 | mDNS full mode | Set to minimal | Opie |
| 10 | API keys in config | Move to env vars | Opie |
| 11 | No session pruning | Implement cleanup | Opie |
| 12 | No encryption at rest | Enable disk encryption | Wes |

### Tier 4: Low (When Convenient) 🟢

| # | Issue | Fix | Owner |
|---|-------|-----|-------|
| 13 | No rate limiting | Add proxy rate limit | Wes |
| 14 | No log monitoring | Set up alerts | Both |
| 15 | No incident response doc | Create runbook | Opie |

---

## What's Actually Exposed Right Now?

### Via Tailscale Funnel (PUBLIC INTERNET)
- Browser control endpoint: `https://desktop-on29pvn.tail0fbff3.ts.net`
- Protected only by token `secrettoken123`
- **Risk: HIGH** - Anyone guessing URL + token gets browser control

### Via Gateway (LAN)
- Port 18789 on local network
- Protected by password `clawdbot2026`
- **Risk: MEDIUM** - Anyone on same WiFi could attempt access

### Via Telegram
- Bot accepts DMs (with pairing)
- Groups disabled
- **Risk: LOW** - Pairing required

---

## Files Created

1. **Full Security Guide:** `memory/research/security-hardening-guide.md`
2. **Actionable Checklist:** `memory/procedures/security-checklist.md`
3. **This Summary:** `memory/research/security-summary-and-actions.md`

---

## Next Steps

1. **Wes:** Review this document, generate new tokens, run Windows-side commands
2. **Opie:** Once Wes provides new tokens, update config and fix agent-side issues
3. **Both:** Verify everything works after changes
4. **Schedule:** Monthly security audit with `clawdbot security audit --deep`
