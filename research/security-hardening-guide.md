# Security Hardening Guide for Clawdbot + AI Assistant Setup

**Created:** 2026-01-29  
**Purpose:** Comprehensive security analysis and hardening recommendations for Wes's Clawdbot/Moltbot AI assistant infrastructure.

---

## Executive Summary

This guide addresses security vulnerabilities in the current Clawdbot setup. The analysis identified **15 critical/high-priority issues** requiring immediate attention, including weak tokens, exposed credentials, and insecure network configurations.

### Threat Model (RAK Framework)

| Risk Type | Description | Current Exposure |
|-----------|-------------|-----------------|
| **Root Risk** | Host/container compromise via RCE | Medium-High (shell access enabled) |
| **Agency Risk** | Unintended agent actions | Medium (no sandboxing) |
| **Keys Risk** | Credential theft/leakage | **HIGH** (plaintext in config) |

---

## Part 1: Current Vulnerabilities Identified

### 🔴 CRITICAL Issues

#### 1. Weak Browser Control Token
- **Current:** `secrettoken123`
- **Risk:** Trivially guessable, allows full browser control
- **Impact:** Anyone who discovers this can control Wes's browser sessions
- **Fix:** Generate cryptographically random 64+ character token

#### 2. Weak Gateway Password
- **Current:** `clawdbot2026`
- **Risk:** Dictionary-attackable, contains predictable year
- **Impact:** Full gateway access, can issue commands as Wes
- **Fix:** Generate 32+ character random password

#### 3. API Keys in Plaintext
**Found in configs:**
- `OPENAI_API_KEY` - in both `.env` and `clawdbot.json`
- `RESEND_API_KEY` - in `.env`
- `REPLICATE_API_TOKEN` - in `.env`
- `Brave Search API Key` - in `clawdbot.json`
- `Telegram Bot Token` - in `clawdbot.json`

**Risk:** Any file read can exfiltrate all credentials

#### 4. allowInsecureAuth Enabled
```json
"controlUi": {
  "allowInsecureAuth": true
}
```
**Risk:** Bypasses device identity verification for Control UI

### 🟠 HIGH Issues

#### 5. Gateway Bound to LAN
```json
"bind": "lan"
```
**Risk:** Exposes gateway to entire local network, not just localhost

#### 6. Browser noSandbox Mode
```json
"noSandbox": true
```
**Risk:** Browser runs without Chrome's security sandbox

#### 7. No Sandboxing for Agent
- Current setup runs agent with full host access
- No tool restrictions configured
- Can read/write anywhere on filesystem

#### 8. Session Files World-Readable
```
drwxr-xr-x credentials/
drwxr-xr-x browser/
```
Some directories have overly permissive permissions (755 instead of 700)

### 🟡 MEDIUM Issues

#### 9. mDNS Discovery Enabled (Default)
- Broadcasts gateway presence on local network
- Exposes hostname, paths, SSH availability

#### 10. No Rate Limiting
- No configuration for API rate limiting
- Vulnerable to abuse if credentials compromised

#### 11. Tailscale Funnel Exposure
- Browser control exposed via Tailscale Funnel
- Anyone with URL can attempt authentication
- Public internet exposure (even with token)

#### 12. Session Transcript Accumulation
- All conversations stored in plaintext JSONL
- No encryption at rest
- Potential GDPR/privacy implications

---

## Part 2: Authentication & Token Security

### Token Generation Best Practices

**Recommended:** Use cryptographically secure random generation.

```bash
# Linux/macOS - Generate 64-character hex token
openssl rand -hex 32

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**Token Requirements:**
- Minimum 32 bytes (64 hex characters)
- Cryptographically random (not UUID, not timestamp-based)
- No dictionary words or patterns
- Rotate every 90 days or after any suspected compromise

### Secure Token Storage

**Hierarchy (best to worst):**
1. **Hardware Security Module (HSM)** - Best, enterprise-grade
2. **Secrets Manager** (1Password CLI, Doppler, Vault) - Recommended
3. **Environment Variables** (from secure source) - Acceptable
4. **Encrypted config files** - Acceptable with proper key management
5. **Plaintext in config** ❌ - Current state, unacceptable

**Implementation with 1Password CLI:**
```bash
# Store token in 1Password
op item create --category=password --title="Clawdbot Gateway Token" \
  password=$(openssl rand -hex 32)

# Retrieve at runtime
export CLAWDBOT_GATEWAY_TOKEN=$(op read "op://Private/Clawdbot Gateway Token/password")
```

**Implementation with Docker Secrets:**
```bash
# Create secret file
openssl rand -hex 32 > /run/secrets/gateway_token

# In docker-compose.yml
secrets:
  gateway_token:
    file: ./secrets/gateway_token.txt

services:
  clawdbot:
    secrets:
      - gateway_token
```

### Token Rotation Procedure

1. **Generate new token** (don't reuse)
2. **Update gateway config** with new token
3. **Update all clients** that use the token (browser relay, remote CLI)
4. **Restart gateway** to apply
5. **Test connectivity** with new token
6. **Revoke old token** (already done by restart)
7. **Document rotation** in security log

---

## Part 3: Network Security

### Tailscale Funnel Security Analysis

**What Tailscale Funnel Does:**
- Exposes local port to `*.ts.net` public URL
- Traffic flows: Internet → Tailscale Relay → Your Device
- TLS terminated on your device (Tailscale can't read content)
- Hides your real IP address

**Security Implications:**
| Aspect | Status |
|--------|--------|
| Encryption | ✅ End-to-end TLS |
| IP Hidden | ✅ Relay hides device IP |
| Public Exposure | ⚠️ URL is public, guessable pattern |
| Authentication | ⚠️ Only your token protects it |
| Rate Limiting | ❌ No built-in rate limiting |

**Current Risk:** Browser control URL `https://desktop-on29pvn.tail0fbff3.ts.net` is publicly accessible. Only the weak token `secrettoken123` protects it.

### Recommendations

#### Option A: Tailscale Serve Only (Recommended)
```bash
# Stop Funnel
tailscale funnel off

# Use Serve instead (tailnet-only)
tailscale serve 18791
```
**Result:** Only devices on your Tailscale network can access.

#### Option B: Keep Funnel with Strong Auth
If Funnel is required:
1. Generate 64-char random token
2. Implement rate limiting at proxy level
3. Add IP allowlisting if possible
4. Monitor for unauthorized access attempts

### Gateway Bind Configuration

**Current (Insecure):**
```json
"bind": "lan"
```

**Recommended:**
```json
"bind": "loopback"
```

**If LAN access needed:**
- Use Tailscale Serve instead
- Or implement firewall rules:
```bash
# Allow only specific Tailscale IPs
sudo ufw allow from 100.64.0.0/10 to any port 18789
```

### Firewall Recommendations

```bash
# Default deny
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Allow SSH only from Tailscale
sudo ufw allow from 100.64.0.0/10 to any port 22 proto tcp

# Allow gateway only from Tailscale
sudo ufw allow from 100.64.0.0/10 to any port 18789 proto tcp

# Enable
sudo ufw enable
```

---

## Part 4: Data Security

### Conversation History Protection

**Current State:**
- Sessions stored in `~/.moltbot/agents/*/sessions/*.jsonl`
- Plaintext, no encryption
- Contains full message history including potentially sensitive data

**Risks:**
- Filesystem access = full conversation access
- Backup/sync tools may replicate unencrypted
- Legal discovery could expose all conversations

**Recommendations:**

1. **Encryption at Rest (System Level)**
```bash
# Full disk encryption (best)
# Enable LUKS on Linux or FileVault on macOS
```

2. **Dedicated Encrypted Volume**
```bash
# Create encrypted container for .moltbot
cryptsetup luksFormat /dev/sdX
cryptsetup open /dev/sdX moltbot_secure
mkfs.ext4 /dev/mapper/moltbot_secure
mount /dev/mapper/moltbot_secure ~/.moltbot
```

3. **Permissions Hardening**
```bash
chmod 700 ~/.moltbot
chmod 600 ~/.moltbot/clawdbot.json
chmod 600 ~/.moltbot/.env
chmod -R 700 ~/.moltbot/credentials
chmod -R 700 ~/.moltbot/agents
```

4. **Session Retention Policy**
- Implement automatic pruning of old sessions
- Consider 30-90 day retention
- Archive to encrypted cold storage if needed

### GDPR/Privacy Considerations

If handling EU user data:
1. Document what data is collected
2. Implement data subject access requests
3. Have deletion procedures ready
4. Consider data minimization (don't log everything)

---

## Part 5: API Security

### Rate Limiting

**Implement at multiple levels:**

1. **Nginx/Proxy Level:**
```nginx
limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;

server {
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://localhost:18789;
    }
}
```

2. **Application Level:**
```json
{
  "gateway": {
    "rateLimit": {
      "enabled": true,
      "windowMs": 60000,
      "max": 100
    }
  }
}
```

### API Key Scoping

**Principle of Least Privilege:**

| Service | Current Scope | Recommended |
|---------|---------------|-------------|
| OpenAI | Full access | Read-only models, usage limits |
| Resend | Full send | Domain-restricted |
| GitHub (if used) | Full repo | Read-only, specific repos |

### Prompt Injection Protection

**Defense Layers:**

1. **Model Selection:** Use Claude Opus 4.5 (best prompt injection resistance)
2. **Input Sanitization:** Treat all external content as untrusted
3. **Sandboxing:** Limit blast radius of compromised agent
4. **Tool Restrictions:** Whitelist only necessary tools
5. **Output Filtering:** Monitor for data exfiltration patterns

**High-Risk Inputs:**
- Email content (can contain hidden instructions)
- Web search/fetch results
- Browser page content
- File attachments
- Pasted code/logs

---

## Part 6: Docker Security

### Container Hardening

**Current Issues:**
- Running as root in container
- Full network access
- No capability dropping

**Hardened docker run:**
```bash
docker run \
  --name clawdbot \
  --read-only \
  --tmpfs /tmp:rw,noexec,nosuid,size=64M \
  --security-opt=no-new-privileges \
  --cap-drop=ALL \
  --cap-add=NET_BIND_SERVICE \
  --cpus="1.0" \
  --memory="2g" \
  -u 1000:1000 \
  -v /path/to/workspace:/workspace:rw \
  -v /path/to/secrets:/run/secrets:ro \
  clawdbot:latest
```

### docker-compose.yml Security Template

```yaml
version: '3.8'

secrets:
  gateway_token:
    file: ./secrets/gateway_token.txt
  anthropic_key:
    file: ./secrets/anthropic_key.txt

services:
  clawdbot:
    image: clawdbot:latest
    read_only: true
    security_opt:
      - no-new-privileges:true
    cap_drop:
      - ALL
    cap_add:
      - NET_BIND_SERVICE
    user: "1000:1000"
    tmpfs:
      - /tmp:rw,noexec,nosuid,size=64m
    secrets:
      - gateway_token
      - anthropic_key
    environment:
      - CLAWDBOT_GATEWAY_TOKEN_FILE=/run/secrets/gateway_token
      - ANTHROPIC_API_KEY_FILE=/run/secrets/anthropic_key
    volumes:
      - ./workspace:/workspace:rw
      - ./config:/config:ro
    networks:
      - clawdbot_net
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 2G

networks:
  clawdbot_net:
    driver: bridge
    internal: false
```

### Network Segmentation

**Egress Control (prevent data exfiltration):**
```bash
# Only allow necessary outbound
iptables -A OUTPUT -p tcp -d api.anthropic.com --dport 443 -j ACCEPT
iptables -A OUTPUT -p tcp -d api.openai.com --dport 443 -j ACCEPT
iptables -A OUTPUT -j DROP
```

**Or use a proxy allowlist:**
- Run outbound traffic through Squid/nginx proxy
- Allowlist only required domains
- Log all outbound requests

---

## Part 7: Clawdbot-Specific Security

### Security Audit Command

**Run regularly:**
```bash
clawdbot security audit --deep
clawdbot security audit --fix  # Auto-fix safe issues
```

### Recommended Configuration

```json
{
  "gateway": {
    "mode": "local",
    "bind": "loopback",
    "port": 18789,
    "auth": {
      "mode": "token",
      "token": "${CLAWDBOT_GATEWAY_TOKEN}"
    },
    "controlUi": {
      "allowInsecureAuth": false
    }
  },
  "discovery": {
    "mdns": { "mode": "minimal" }
  },
  "channels": {
    "telegram": {
      "dmPolicy": "pairing",
      "groupPolicy": "disabled"
    }
  },
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "all",
        "scope": "agent",
        "workspaceAccess": "rw"
      }
    }
  },
  "browser": {
    "noSandbox": false,
    "headless": true
  },
  "logging": {
    "redactSensitive": "tools"
  }
}
```

### DM Policy Best Practices

- **pairing** (recommended): Unknown senders get pairing code
- **allowlist**: Only pre-approved senders
- **Never use "open"**: Allows anyone to message

### Group Chat Security

**CRITICAL:** Never add Clawdbot to group chats where you don't trust all members. Every person can issue commands.

If groups needed:
```json
{
  "channels": {
    "telegram": {
      "groups": {
        "*": { "requireMention": true }
      },
      "groupPolicy": "allowlist",
      "groupAllowFrom": ["trusted_group_id"]
    }
  }
}
```

---

## Part 8: Incident Response

### If You Suspect Compromise

**Immediate Actions (first 5 minutes):**
1. Stop the gateway: `clawdbot gateway stop` or kill the process
2. Disable Tailscale Funnel: `tailscale funnel off`
3. Block incoming connections: `sudo ufw deny incoming`

**Rotate All Credentials (next 30 minutes):**
1. Gateway token/password
2. Browser control token
3. All API keys (OpenAI, Resend, Replicate, etc.)
4. Telegram bot token (create new bot if needed)
5. Any OAuth tokens

**Audit (next 24 hours):**
1. Review session transcripts for unexpected commands
2. Check gateway logs: `/tmp/moltbot/moltbot-*.log`
3. Review tool call history
4. Check for unauthorized file access/modifications

### Credential Rotation Checklist

```bash
# Generate new tokens
NEW_GATEWAY_TOKEN=$(openssl rand -hex 32)
NEW_BROWSER_TOKEN=$(openssl rand -hex 32)

# Update config (or use env vars)
# Restart services
# Update all clients
# Verify old tokens don't work
```

---

## Appendices

### A. Quick Security Checklist

See: `memory/procedures/security-checklist.md`

### B. Token Generation Commands

```bash
# 64-char hex (32 bytes)
openssl rand -hex 32

# Base64 (44 chars for 32 bytes)
openssl rand -base64 32

# Alphanumeric (64 chars)
openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64
```

### C. File Permission Reference

| Path | Recommended | Current |
|------|-------------|---------|
| ~/.moltbot/ | 700 | Check |
| ~/.moltbot/clawdbot.json | 600 | 600 ✓ |
| ~/.moltbot/credentials/ | 700 | 755 ✗ |
| ~/.moltbot/agents/ | 700 | 700 ✓ |
| .env files | 600 | 600 ✓ |

### D. References

- [Moltbot Official Security Docs](https://docs.molt.bot/gateway/security)
- [OWASP Docker Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html)
- [Tailscale Funnel Documentation](https://tailscale.com/kb/1223/funnel)
- [GitGuardian Secrets Management](https://blog.gitguardian.com/how-to-handle-secrets-in-docker/)
