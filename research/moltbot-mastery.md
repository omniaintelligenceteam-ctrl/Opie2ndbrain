# Moltbot Mastery: Complete Guide to Building a Powerful AI Agent

> **Research Date:** 2026-01-31
> **Purpose:** Comprehensive documentation of Moltbot capabilities, best practices, and optimization strategies for building the strongest possible AI agent.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Architecture Deep Dive](#architecture-deep-dive)
3. [Configuration Mastery](#configuration-mastery)
4. [Tools Reference](#tools-reference)
5. [Extensions & Capabilities](#extensions--capabilities)
6. [Multi-Agent System](#multi-agent-system)
7. [Memory System](#memory-system)
8. [Channel Optimization](#channel-optimization)
9. [Skills Platform](#skills-platform)
10. [Heartbeats & Proactive Behavior](#heartbeats--proactive-behavior)
11. [Gateway API Reference](#gateway-api-reference)
12. [Security Best Practices](#security-best-practices)
13. [Optimization Recommendations](#optimization-recommendations)
14. [Underutilized Features](#underutilized-features)

---

## Executive Summary

**Moltbot** (formerly Clawdbot) is a personal AI assistant platform that:

- Runs locally on your devices (macOS, Linux, Windows via WSL2)
- Connects to 10+ messaging channels (WhatsApp, Telegram, Discord, Slack, Signal, iMessage, etc.)
- Supports proactive behavior via heartbeats and cron jobs
- Enables multi-agent orchestration with sub-agents
- Provides browser automation, canvas rendering, and node device control
- Features a skills marketplace (ClawdHub) with 100+ extensions

**Core Philosophy:** Unlike cloud AI assistants, Moltbot is self-hosted, extensible, and can actually take action on your behalf.

---

## Architecture Deep Dive

### System Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Messaging Platforms (WhatsApp/Telegram/Discord/Slack/Signal)   │
└───────────────────────────────┬──────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                       GATEWAY (Control Plane)                    │
│                   ws://127.0.0.1:18789 (loopback)                │
│  ┌─────────────┬────────────┬────────────┬──────────────────┐   │
│  │  Sessions   │   Cron     │   Tools    │   Channels       │   │
│  │  Manager    │   Jobs     │   Router   │   Connectors     │   │
│  └─────────────┴────────────┴────────────┴──────────────────┘   │
└────────────┬─────────────┬────────────┬────────────┬─────────────┘
             │             │            │            │
    ┌────────▼───┐  ┌──────▼────┐ ┌─────▼────┐ ┌────▼─────┐
    │ Pi Agent   │  │  Browser  │ │  Canvas  │ │  Nodes   │
    │   (RPC)    │  │  Control  │ │ (A2UI)   │ │(iOS/Mac) │
    └────────────┘  └───────────┘ └──────────┘ └──────────┘
```

### Key Components

| Component | Purpose | Location |
|-----------|---------|----------|
| **Gateway** | Central control plane, WebSocket server | `moltbot gateway` |
| **Pi Agent** | The AI brain (Claude, GPT, local models) | RPC mode |
| **Workspace** | Agent files, memory, skills | `~/clawd` |
| **Config** | Global settings | `~/.clawdbot/moltbot.json` |
| **Sessions** | Chat history, state | `~/.clawdbot/agents/<id>/sessions/` |
| **Credentials** | OAuth tokens, API keys | `~/.clawdbot/credentials/` |

### Session Architecture

Sessions are the core unit of conversation state:

- **Main session**: `agent:<agentId>:main` - Primary DM conversation
- **Group sessions**: `agent:<agentId>:<channel>:group:<id>` - Per-group isolation
- **Sub-agent sessions**: `agent:<agentId>:subagent:<uuid>` - Background tasks
- **Cron sessions**: `cron:<jobId>` - Scheduled task contexts

**Session Scopes:**
- `main` (default): All DMs share the main session
- `per-peer`: Isolate by sender across channels
- `per-channel-peer`: Isolate by channel + sender
- `per-account-channel-peer`: Full isolation for multi-account setups

---

## Configuration Mastery

### Configuration File Location

Primary: `~/.clawdbot/moltbot.json` (JSON5 format - comments allowed!)

### Essential Configuration Structure

```json5
{
  // Agent settings
  agents: {
    defaults: {
      workspace: "~/clawd",
      model: "anthropic/claude-opus-4-5",
      
      // Heartbeat configuration
      heartbeat: {
        every: "30m",
        target: "last",
        prompt: "Read HEARTBEAT.md...",
        activeHours: { start: "08:00", end: "23:00" }
      },
      
      // Session management
      contextPruning: {
        mode: "cache-ttl",
        ttl: "1h"
      },
      
      // Compaction settings
      compaction: {
        mode: "safeguard",
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000
        }
      },
      
      // Sub-agent defaults
      subagents: {
        maxConcurrent: 8,
        model: "anthropic/claude-sonnet-4-5"
      },
      
      // Memory search
      memorySearch: {
        enabled: true,
        provider: "openai",
        model: "text-embedding-3-small"
      }
    },
    
    // Multi-agent setup
    list: [
      {
        id: "main",
        default: true,
        workspace: "~/clawd",
        identity: {
          name: "Opie",
          emoji: "🦞"
        }
      }
    ]
  },
  
  // Channel configuration
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+1234567890"],
      groups: { "*": { requireMention: true } }
    },
    telegram: {
      botToken: "YOUR_BOT_TOKEN"
    }
  },
  
  // Tool settings
  tools: {
    web: {
      search: {
        provider: "brave",
        apiKey: "YOUR_BRAVE_KEY"
      }
    }
  },
  
  // Browser control
  browser: {
    enabled: true,
    defaultProfile: "clawd"
  },
  
  // Hooks
  hooks: {
    internal: {
      enabled: true,
      entries: {
        "session-memory": { enabled: true },
        "command-logger": { enabled: true }
      }
    }
  }
}
```

### Advanced Configuration Options

#### Environment Variable Substitution
```json5
{
  gateway: {
    auth: {
      token: "${CLAWDBOT_GATEWAY_TOKEN}"
    }
  }
}
```

#### Config Includes (Split Large Configs)
```json5
{
  agents: { "$include": "./agents.json5" },
  broadcast: { 
    "$include": [
      "./clients/alice.json5",
      "./clients/bob.json5"
    ]
  }
}
```

#### Identity-Based Defaults
```json5
{
  agents: {
    list: [{
      id: "main",
      identity: {
        name: "Opie",
        theme: "helpful lobster",
        emoji: "🦞",
        avatar: "avatars/opie.png"  // Workspace-relative or URL
      }
    }]
  }
}
```

---

## Tools Reference

### Core Tools Available

| Tool | Purpose | Key Parameters |
|------|---------|----------------|
| `exec` | Run shell commands | `command`, `yieldMs`, `background`, `timeout` |
| `process` | Manage background processes | `action`, `sessionId`, `log`, `kill` |
| `read` | Read files | `path`, `offset`, `limit` |
| `write` | Write files | `path`, `content` |
| `edit` | Precise file edits | `path`, `oldText`, `newText` |
| `web_search` | Search the web | `query`, `count`, `freshness` |
| `web_fetch` | Fetch URL content | `url`, `extractMode`, `maxChars` |
| `browser` | Browser automation | `action`, `profile`, `target` |
| `canvas` | Canvas control (A2UI) | `action`, `node`, `url` |
| `nodes` | Device node control | `action`, `node`, `command` |
| `message` | Send messages | `action`, `target`, `message` |
| `cron` | Scheduled jobs | `action`, `jobId`, `schedule` |
| `sessions_list` | List sessions | `kinds`, `limit`, `activeMinutes` |
| `sessions_history` | Get transcript | `sessionKey`, `limit` |
| `sessions_send` | Message another session | `sessionKey`, `message` |
| `sessions_spawn` | Spawn sub-agent | `task`, `label`, `model` |
| `memory_search` | Search memory | `query`, `maxResults` |
| `memory_get` | Read memory file | `path`, `startLine`, `lines` |
| `image` | Analyze images | `image`, `prompt`, `model` |
| `tts` | Text-to-speech | `text`, `channel` |

### Tool Groups (For Allow/Deny)

```json5
{
  tools: {
    allow: ["group:fs", "group:sessions"],
    deny: ["group:automation"]
  }
}
```

| Group | Tools Included |
|-------|----------------|
| `group:runtime` | `exec`, `bash`, `process` |
| `group:fs` | `read`, `write`, `edit`, `apply_patch` |
| `group:sessions` | `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status` |
| `group:memory` | `memory_search`, `memory_get` |
| `group:web` | `web_search`, `web_fetch` |
| `group:ui` | `browser`, `canvas` |
| `group:automation` | `cron`, `gateway` |
| `group:messaging` | `message` |
| `group:nodes` | `nodes` |

### Browser Automation Details

```json5
{
  browser: {
    enabled: true,
    defaultProfile: "clawd",  // or "chrome" for extension relay
    color: "#FF4500",
    profiles: {
      clawd: { cdpPort: 18800 },
      work: { cdpPort: 18801 },
      remote: { cdpUrl: "http://10.0.0.42:9222" }
    }
  }
}
```

**Browser Actions:**
- `status`, `start`, `stop` - Lifecycle
- `tabs`, `open`, `focus`, `close` - Tab management
- `snapshot` - Get page structure (AI refs for clicking)
- `screenshot` - Capture image
- `navigate` - Go to URL
- `act` - Click, type, press, hover, drag, select

**Snapshot Modes:**
- `--format ai` - Numeric refs for actions
- `--format aria` - Accessibility tree
- `--interactive` - Flat list of interactive elements

---

## Extensions & Capabilities

### Voice Call Extension
Real-time voice conversations via LiveKit.

### Browser Relay (Chrome Extension)
Control your existing Chrome tabs via the extension relay.

```bash
moltbot browser extension install
# Then load unpacked at chrome://extensions
```

### Canvas System (A2UI)
Agent-driven visual workspace for rendering content.

```json5
// A2UI push example
{
  action: "a2ui_push",
  node: "my-mac",
  jsonl: '{"kind":"text","content":"Hello World"}'
}
```

### Nodes (Device Control)

**Supported Nodes:**
- macOS (menu bar app)
- iOS (companion app)
- Android (companion app)
- Headless (node host)

**Node Capabilities:**
- `canvas.*` - Present/hide/snapshot canvas
- `camera.*` - Snap photos, record clips
- `screen.*` - Screen recording
- `location.*` - Get device location
- `system.run` - Execute commands (macOS/headless)
- `system.notify` - Send notifications

```bash
# List nodes
moltbot nodes status

# Approve pending pairing
moltbot nodes approve <requestId>

# Take a photo
moltbot nodes camera snap --node my-iphone --facing front

# Run command on remote node
moltbot nodes run --node office-mac -- echo "Hello"
```

---

## Multi-Agent System

### Sub-Agent Architecture

Sub-agents enable parallel, background work:

```
Main Agent ──sessions_spawn──▶ Sub-Agent (isolated session)
     │                              │
     │◀────announce (result)────────┘
```

**Key Features:**
- Run in dedicated session: `agent:<agentId>:subagent:<uuid>`
- Results announced back to requester chat
- Default model can differ from main agent
- Auto-archive after configurable time

**Configuration:**
```json5
{
  agents: {
    defaults: {
      subagents: {
        maxConcurrent: 8,
        model: "anthropic/claude-sonnet-4-5",
        archiveAfterMinutes: 60
      }
    }
  }
}
```

**Tool Policy for Sub-Agents:**
Sub-agents get all tools EXCEPT session tools by default.
```json5
{
  tools: {
    subagents: {
      tools: {
        deny: ["gateway", "cron"]
      }
    }
  }
}
```

### Multi-Agent Routing

Route different channels/accounts to different agents:

```json5
{
  agents: {
    list: [
      { id: "home", workspace: "~/clawd-home", default: true },
      { id: "work", workspace: "~/clawd-work" }
    ]
  },
  bindings: [
    { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
    { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
    { agentId: "work", match: { channel: "whatsapp", peer: { kind: "dm", id: "+15551234567" } } }
  ]
}
```

### Agent-to-Agent Communication

```json5
{
  tools: {
    agentToAgent: {
      enabled: true,
      allow: ["home", "work"]
    }
  }
}
```

---

## Memory System

### Memory Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  CONTEXT WINDOW (current session, volatile)                 │
├─────────────────────────────────────────────────────────────┤
│  CHAT LOGS - memory/chat/YYYY-MM-DD.md (7 days retained)    │
├─────────────────────────────────────────────────────────────┤
│  DAILY NOTES - memory/YYYY-MM-DD.md (working notes)         │
├─────────────────────────────────────────────────────────────┤
│  MEMORY.md (long-term, curated - main session only)         │
└─────────────────────────────────────────────────────────────┘
```

### Memory Files

| File | Purpose | Scope |
|------|---------|-------|
| `MEMORY.md` | Long-term curated memory | Main session only |
| `memory/YYYY-MM-DD.md` | Daily working notes | All sessions |
| `memory/chat/*.md` | Chat logs | Last 7 days |
| `memory/facts/*.md` | Permanent facts | As needed |
| `memory/people/*.md` | Contact profiles | As needed |

### Vector Memory Search

Semantic search over memory files:

```json5
{
  agents: {
    defaults: {
      memorySearch: {
        enabled: true,
        provider: "openai",  // or "gemini", "local"
        model: "text-embedding-3-small",
        
        // Hybrid search (vector + BM25)
        query: {
          hybrid: {
            enabled: true,
            vectorWeight: 0.7,
            textWeight: 0.3
          }
        },
        
        // Cache embeddings
        cache: {
          enabled: true,
          maxEntries: 50000
        },
        
        // Index sessions (experimental)
        experimental: { sessionMemory: true },
        sources: ["memory", "sessions"]
      }
    }
  }
}
```

**Memory Tools:**
- `memory_search` - Semantic search, returns snippets with file/line refs
- `memory_get` - Read specific memory file content

### Pre-Compaction Memory Flush

Before auto-compaction, trigger a silent turn to save durable memories:

```json5
{
  agents: {
    defaults: {
      compaction: {
        memoryFlush: {
          enabled: true,
          softThresholdTokens: 4000,
          systemPrompt: "Session nearing compaction. Store durable memories now.",
          prompt: "Write any lasting notes to memory/YYYY-MM-DD.md; reply NO_REPLY if nothing."
        }
      }
    }
  }
}
```

---

## Channel Optimization

### WhatsApp

```json5
{
  channels: {
    whatsapp: {
      dmPolicy: "pairing",  // pairing | allowlist | open | disabled
      allowFrom: ["+1234567890"],
      groups: {
        "*": { requireMention: true }
      },
      textChunkLimit: 4000,
      chunkMode: "length"
    }
  }
}
```

### Telegram

```json5
{
  channels: {
    telegram: {
      botToken: "123456:ABCDEF",
      groups: {
        "*": { requireMention: true }
      },
      // Enable draft streaming for real-time typing
      draftStreaming: true
    }
  }
}
```

### Discord

```json5
{
  channels: {
    discord: {
      token: "YOUR_TOKEN",
      guilds: {
        "123456789": {
          allowedChannels: ["general", "bot-channel"]
        }
      },
      dm: {
        policy: "pairing",
        allowFrom: ["user_id"]
      }
    }
  }
}
```

### Channel-Specific Best Practices

| Channel | Formatting | Chunking | Special Features |
|---------|-----------|----------|------------------|
| WhatsApp | Bold, bullets | 4000 chars | Voice notes, media |
| Telegram | Full Markdown | Per-message | Draft streaming, topics |
| Discord | Markdown, embeds | 2000 chars | Reactions, threads |
| Slack | mrkdwn | Per-block | Threads, reactions |

---

## Skills Platform

### Skill Structure

Skills are directories with `SKILL.md`:

```
skills/
└── my-skill/
    ├── SKILL.md      # Metadata + instructions
    └── handler.ts    # Optional handler (for hooks)
```

### SKILL.md Format

```markdown
---
name: my-skill
description: "What this skill does"
metadata: {"moltbot":{"emoji":"🎯","requires":{"bins":["node"],"env":["API_KEY"]}}}
---

# My Skill

Instructions for the model on how to use this skill...
```

### Skill Precedence

1. **Workspace skills**: `<workspace>/skills/` (highest)
2. **Managed skills**: `~/.clawdbot/skills/`
3. **Bundled skills**: Shipped with Moltbot (lowest)

### Installing Skills

```bash
# From ClawdHub
clawdhub install <skill-slug>

# Update all
clawdhub update --all

# List available
moltbot skills list
```

### Gating Skills

```json5
{
  skills: {
    entries: {
      "my-skill": {
        enabled: true,
        apiKey: "YOUR_KEY",
        env: {
          CUSTOM_VAR: "value"
        }
      },
      "dangerous-skill": { enabled: false }
    }
  }
}
```

### Creating Custom Skills

1. Create directory: `~/clawd/skills/my-skill/`
2. Create `SKILL.md` with frontmatter
3. Add instructions in markdown body
4. Use `{baseDir}` to reference skill folder

---

## Heartbeats & Proactive Behavior

### Heartbeat Configuration

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m",           // Interval (0m to disable)
        target: "last",         // last | none | channel-id
        to: "+1234567890",      // Optional specific recipient
        model: "anthropic/claude-opus-4-5",
        
        // Custom prompt
        prompt: "Read HEARTBEAT.md if it exists. Follow it strictly. If nothing needs attention, reply HEARTBEAT_OK.",
        
        // Active hours (local time)
        activeHours: {
          start: "08:00",
          end: "23:00"
        },
        
        // Include reasoning in delivery
        includeReasoning: false,
        
        // Max chars allowed after HEARTBEAT_OK
        ackMaxChars: 300
      }
    }
  }
}
```

### HEARTBEAT.md Template

```markdown
# Heartbeat Checklist

## Priority Checks
- [ ] Urgent emails requiring response?
- [ ] Calendar events in next 2 hours?
- [ ] Critical system alerts?

## Routine Checks (2-4x daily, not all at once)
- [ ] Weather update if human might go out
- [ ] Social mentions or notifications
- [ ] Pending tasks nearing deadline

## When to Reach Out
- Important email arrived
- Calendar event < 2h away
- Been > 8h since last contact (daytime only)

## Stay Quiet When
- Late night (23:00-08:00) unless urgent
- Human clearly busy
- Nothing actionable found
- Already checked < 30 min ago
```

### Response Contract

- `HEARTBEAT_OK` at start/end = silent acknowledgment (dropped)
- Alert content without `HEARTBEAT_OK` = delivered to user
- Empty HEARTBEAT.md = heartbeat skipped

### Cron Jobs (Alternative to Heartbeats)

For specific scheduled tasks:

```bash
# One-shot reminder
moltbot cron add \
  --name "Meeting prep" \
  --at "2026-02-01T09:00:00Z" \
  --session main \
  --system-event "Prepare for 10am meeting" \
  --wake now

# Recurring job
moltbot cron add \
  --name "Daily briefing" \
  --cron "0 7 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Generate daily briefing" \
  --deliver \
  --channel whatsapp \
  --to "+1234567890"
```

**Heartbeat vs Cron:**
- **Heartbeat**: General "check if anything needs attention" loop
- **Cron**: Specific scheduled tasks with dedicated prompts

---

## Gateway API Reference

### WebSocket Methods

The Gateway exposes a WebSocket control plane at `ws://127.0.0.1:18789`.

**Key Methods:**

| Method | Purpose |
|--------|---------|
| `sessions.list` | List active sessions |
| `sessions.delete` | Remove session |
| `sessions.patch` | Update session settings |
| `config.get` | Get current config |
| `config.apply` | Apply new config + restart |
| `config.patch` | Partial config update |
| `cron.list` | List cron jobs |
| `cron.add` | Create cron job |
| `cron.run` | Force run job |
| `node.list` | List connected nodes |
| `node.invoke` | Invoke node command |

### HTTP Endpoints

```bash
# Status
curl http://127.0.0.1:18789/

# OpenAI-compatible responses
POST http://127.0.0.1:18789/v1/responses

# Health check
GET http://127.0.0.1:18789/health

# Webhooks
POST http://127.0.0.1:18789/webhooks/<id>
```

### CLI Gateway Commands

```bash
# Status
moltbot gateway status

# Start/Stop/Restart
moltbot gateway start
moltbot gateway stop
moltbot gateway restart

# Call RPC methods
moltbot gateway call sessions.list --params '{}'
moltbot gateway call config.get --params '{}'
```

---

## Security Best Practices

### Default Security Model

| Session Type | Default Environment | Risk Level |
|--------------|---------------------|------------|
| Main (you) | Host machine | ⚠️ Full trust |
| Groups | Docker sandbox (opt-in) | ✅ Isolated |
| Unknown DMs | Pairing required | ✅ Protected |

### Recommended Security Configuration

```json5
{
  // DM pairing by default
  channels: {
    whatsapp: {
      dmPolicy: "pairing",
      allowFrom: ["+1234567890"]
    }
  },
  
  // Sandbox non-main sessions
  agents: {
    defaults: {
      sandbox: {
        mode: "non-main",
        scope: "session"
      }
    }
  },
  
  // Gateway authentication
  gateway: {
    bind: "loopback",
    auth: {
      mode: "token",
      token: "your-secure-token"
    }
  },
  
  // Tool restrictions for risky agents
  tools: {
    deny: ["gateway"]  // Prevent restart/config changes
  }
}
```

### Security Checklist

- ✅ Use `dmPolicy: "pairing"` for unknown senders
- ✅ Enable Docker sandboxing for groups
- ✅ Set gateway authentication
- ✅ Review `moltbot doctor` output regularly
- ✅ Keep allowlists updated
- ✅ Use Tailscale for remote access (not public exposure)
- ❌ Don't expose port 18789 publicly
- ❌ Don't use `dmPolicy: "open"` without understanding risks
- ❌ Don't install unverified skills

---

## Optimization Recommendations

### Performance Optimizations

1. **Context Pruning**
   ```json5
   {
     agents: {
       defaults: {
         contextPruning: {
           mode: "cache-ttl",
           ttl: "1h"
         }
       }
     }
   }
   ```

2. **Sub-Agent Model Selection**
   Use cheaper models for sub-agents:
   ```json5
   {
     agents: {
       defaults: {
         model: "anthropic/claude-opus-4-5",
         subagents: {
           model: "anthropic/claude-sonnet-4-5"
         }
       }
     }
   }
   ```

3. **Memory Search Caching**
   ```json5
   {
     agents: {
       defaults: {
         memorySearch: {
           cache: { enabled: true, maxEntries: 50000 }
         }
       }
     }
   }
   ```

4. **Session Reset Policies**
   ```json5
   {
     session: {
       reset: {
         mode: "daily",
         atHour: 4,
         idleMinutes: 120
       }
     }
   }
   ```

### Cost Optimizations

1. **Heartbeat Intervals**: Longer intervals = fewer API calls
2. **Compact Sessions**: Use `/compact` to summarize and reduce context
3. **Sub-Agent Usage**: Offload research to cheaper models
4. **Memory Flush**: Pre-compaction flush saves reprocessing

### Quality Optimizations

1. **Rich SOUL.md**: Define personality, preferences, decision-making style
2. **Clear AGENTS.md**: Operating rules and workspace context
3. **Curated MEMORY.md**: Long-term facts the agent should always know
4. **Structured HEARTBEAT.md**: Clear, actionable checklist

---

## Underutilized Features

### 1. Hooks System
Event-driven automation that most users don't leverage:

```bash
# Enable session memory hook (saves context on /new)
moltbot hooks enable session-memory

# Enable command logger
moltbot hooks enable command-logger
```

### 2. Identity Links
Map the same person across channels to a unified identity:

```json5
{
  session: {
    identityLinks: {
      alice: ["telegram:123456789", "discord:987654321"]
    }
  }
}
```

### 3. Broadcast Groups
Route one message to multiple agents:

```json5
{
  broadcast: {
    "120363...@g.us": ["transcribe-agent", "docs-agent"]
  }
}
```

### 4. Per-Provider Tool Policy
Restrict tools for specific model providers:

```json5
{
  tools: {
    byProvider: {
      "google-antigravity": { profile: "minimal" }
    }
  }
}
```

### 5. Remote Nodes for Tool Execution
Run tools on remote machines:

```bash
# On remote node
moltbot node run --host gateway-host --port 18789

# Configure gateway to use it
moltbot config set tools.exec.host node
moltbot config set tools.exec.node "remote-node-id"
```

### 6. Config Includes
Split large configs:

```json5
{
  agents: { "$include": "./agents.json5" }
}
```

### 7. Active Hours for Heartbeats
Avoid night-time pings:

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        activeHours: { start: "08:00", end: "23:00" }
      }
    }
  }
}
```

### 8. Session Send Policies
Block delivery for specific session types:

```json5
{
  session: {
    sendPolicy: {
      rules: [
        { action: "deny", match: { channel: "discord", chatType: "group" } }
      ],
      default: "allow"
    }
  }
}
```

### 9. Tool Groups
Use shorthands for allow/deny:

```json5
{
  tools: {
    allow: ["group:fs", "group:sessions", "group:web"]
  }
}
```

### 10. Browser Profiles
Multiple isolated browser instances:

```json5
{
  browser: {
    profiles: {
      clawd: { cdpPort: 18800 },
      work: { cdpPort: 18801 },
      testing: { cdpPort: 18802 }
    }
  }
}
```

---

## Quick Reference Commands

```bash
# Gateway management
moltbot gateway status
moltbot gateway restart
moltbot doctor

# Session management
moltbot sessions --json
moltbot sessions --active 60

# Skills
moltbot skills list
moltbot hooks list
moltbot hooks enable <hook>

# Nodes
moltbot nodes status
moltbot nodes describe --node <id>
moltbot nodes camera snap --node <id>

# Browser
moltbot browser status
moltbot browser snapshot --interactive

# Cron
moltbot cron list
moltbot cron runs --id <jobId>

# Config
moltbot config set <path> <value>
moltbot config get <path>
```

---

## Resources

### Official
- **Docs**: https://docs.molt.bot
- **GitHub**: https://github.com/moltbot/moltbot
- **Discord**: https://discord.gg/clawd
- **Skills Marketplace**: https://clawdhub.com

### Key Documentation Pages
- [Getting Started](https://docs.molt.bot/start/getting-started)
- [Configuration Reference](https://docs.molt.bot/gateway/configuration)
- [Multi-Agent Routing](https://docs.molt.bot/concepts/multi-agent)
- [Skills](https://docs.molt.bot/tools/skills)
- [Security](https://docs.molt.bot/gateway/security)
- [Heartbeat](https://docs.molt.bot/gateway/heartbeat)
- [Cron Jobs](https://docs.molt.bot/automation/cron-jobs)

---

*Last Updated: 2026-01-31*
*Research Scope: Local codebase, official documentation, community resources*
