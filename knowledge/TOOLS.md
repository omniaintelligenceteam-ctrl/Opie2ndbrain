# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff unique to your setup.

---

## 📋 Quick Reference

### When to Use What

| Need | Tool | Notes |
|------|------|-------|
| Send email | Resend API | Never browser automation for Gmail |
| Web scraping | Apify | Lead lists, market research, data at scale |
| Browser control | Browser Relay | Windows Chrome via Tailscale |
| Research | web_search + web_fetch | Quick lookups |
| Files | Read/Write/Edit | Direct file operations |

---

## What Goes Here

- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- API keys location
- Anything environment-specific

---

## 🐙 GitHub

| Field | Value |
|-------|-------|
| Token | `.env` as `GITHUB_TOKEN` |
| Credentials | `~/.git-credentials` |
| Org | omniaintelligenceteam-ctrl |

Token has `repo` scope — full access to private repos.

---

## 📧 Email (Resend) — PRIMARY

**Always use Resend for sending emails.** Don't mess with Gmail browser automation.

| Field | Value |
|-------|-------|
| API Key | `/home/node/clawd/.env` as `RESEND_API_KEY` |
| From | `Wes Overstreet <wes@omnialightscapepro.com>` |
| Reply-to | `omniaintelligenceteam@gmail.com` |

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H "Authorization: Bearer $RESEND_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Wes Overstreet <wes@omnialightscapepro.com>",
    "to": ["recipient@example.com"],
    "subject": "Subject here",
    "text": "Body here"
  }'
```

---

## 🌐 Browser Relay (Windows Chrome)

Remote browser control via Tailscale Funnel.

| Field | Value |
|-------|-------|
| Control URL | `https://desktop-on29pvn.tail0fbff3.ts.net` |
| Token | `secrettoken123` |
| Windows PC IP | 192.168.0.6 (local) / 100.112.72.76 (Tailscale) |
| Hostname | desktop-on29pvn |

### Start Commands (on Windows)
```powershell
# Window 1 - Browser control server
clawdbot browser serve --bind 127.0.0.1 --port 18791 --token secrettoken123

# Window 2 - Tailscale Funnel
tailscale funnel 18791
```

### Usage
1. User clicks Clawdbot extension icon on target tab (badge shows ON)
2. I can then navigate, click, type, screenshot that tab

### API Examples
```bash
# List tabs
curl -H "Authorization: Bearer secrettoken123" https://desktop-on29pvn.tail0fbff3.ts.net/tabs

# Navigate
curl -X POST -H "Authorization: Bearer secrettoken123" -H "Content-Type: application/json" \
  -d '{"url":"https://example.com"}' https://desktop-on29pvn.tail0fbff3.ts.net/navigate

# Snapshot
curl -H "Authorization: Bearer secrettoken123" "https://desktop-on29pvn.tail0fbff3.ts.net/snapshot?format=ai"

# Click element
curl -X POST -H "Authorization: Bearer secrettoken123" -H "Content-Type: application/json" \
  -d '{"kind":"click","ref":"e6"}' https://desktop-on29pvn.tail0fbff3.ts.net/act
```

---

## 🕷️ Apify (Web Scraping)

| Field | Value |
|-------|-------|
| API Key | `~/.config/apify/api_key` |
| Docs | https://docs.apify.com/api/v2 |

### Use Cases
- Lead scraping (Google Maps, LinkedIn)
- Competitor monitoring
- Review scraping (Yelp, Google)
- Social media data
- Any website at scale

---

## ⚠️ Common Gotchas

| Issue | Solution |
|-------|----------|
| Gmail automation | Use Resend instead, always |
| Browser relay not working | Check if user clicked extension icon (badge ON) |
| Apify rate limits | Check quota, may need to wait |
| Email bouncing | Verify recipient address, check Resend logs |

---

## 🎤 TTS (if configured)

| Setting | Value |
|---------|-------|
| Preferred voice | *(add when configured)* |
| Default speaker | *(add when configured)* |

---

## 📷 Cameras (if configured)

```markdown
### Example format:
- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered
```

---

## 🔐 SSH (if configured)

```markdown
### Example format:
- home-server → 192.168.1.100, user: admin
```

---

*Add whatever helps you do your job. This is your cheat sheet.*
