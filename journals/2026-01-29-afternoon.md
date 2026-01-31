# Daily Notes: 2026-01-29 (Afternoon Session)

## Major Accomplishments

### 2nd Brain App Deployed ✅
- **URL**: https://second-brain-app-lime.vercel.app
- NextJS app with dark mode, document viewer, search
- Deployed to Vercel under OmniaLightScapePro account
- Content directories: journals, concepts, insights, projects, conversations

### Voice Chat (Vapi) Setup — Partial ✅
- Gateway now binding to `0.0.0.0:18789` (was loopback issue)
- Fixed by changing `CLAWDBOT_GATEWAY_BIND=lan` in `~/clawdbot/.env`
- Tailscale Funnel URL: `https://ubuntu-s-1vcpu-1bg-sfo3-01.tail0fbff3.ts.net`
- Vapi assistant "Ali" configured with Custom LLM pointing to gateway
- Phone number: +1 518-318-9518
- **Issue**: Still getting "Unauthorized" on Tailscale Funnel — needs more debugging

### Gateway Stability Fixes
- Changed bind from loopback to lan (persists in ~/clawdbot/.env)
- Created lock cleanup script: `/home/node/clawd/scripts/cleanup-locks.sh`
- Added cron job to clean stale locks every 15 minutes
- Research completed: `memory/research/gateway-stability-guide.md`
- Troubleshooting guide: `memory/procedures/gateway-troubleshooting.md`

## Active Research (Sub-agents)
1. **security-research** — Security hardening guide in progress
2. Lock cleanup automation implemented

## Key Technical Details

### Droplet Info
- Host: ubuntu-s-1vcpu-1bg-sfo3-01
- Tailscale IP: 100.79.40.69
- Clawdbot dir: ~/clawdbot
- Docker compose: `cd ~/clawdbot && docker compose up -d`

### Important Commands
```bash
# Restart gateway
cd ~/clawdbot && docker compose down && docker compose up -d

# Check gateway logs
docker logs clawdbot-clawdbot-gateway-1 --tail 50

# Check what gateway is listening on
docker logs clawdbot-clawdbot-gateway-1 2>&1 | grep listening

# Reset Tailscale funnel
tailscale funnel reset && tailscale funnel 18789
```

### Config Locations
- Host .env: `~/clawdbot/.env`
- Container .env: `/app/.env` (inside container)
- Clawdbot config: `/home/node/.clawdbot/clawdbot.json` (inside container)

## Reminders Still Pending
- [ ] Contact Kenny (was due noon)
- [ ] Set up HeyGen (was due noon)
- [ ] Fix Vapi voice call (Unauthorized error on Tailscale)

## Wes Preferences Noted
- "Send the boys out" not "bees" — for sub-agents
- Wants voice chat working so he can work while talking
- Frustrated by time lost to debugging — wants stability fixes
- Security-conscious — requested security research

## Next Session Priority
1. Fix Vapi voice call (Tailscale auth issue)
2. Implement health checks + autoheal from research
3. Kenny and HeyGen setup
