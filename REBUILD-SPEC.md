# 2nd Brain App — Full Rebuild Spec

## Mission
Rebuild the dashboard from a chat-first app into a **Live Ops Command Center**. Remove all chat components. The main screen should feel like a Bloomberg Terminal / mission control for watching AI agents work in real-time.

## Tech Stack (keep existing)
- Next.js (App Router) on Vercel
- TypeScript + Tailwind (dark theme, purple/cyan accents)
- opie-relay.js on port 19100 as the backend bridge to OpenClaw gateway
- Supabase for persistence where needed
- Lucide icons

## Architecture

### Navigation: Tab-based layout
- **Dashboard** (default/home) — the main ops screen with panels 1,2,3,4,8
- **Leads & CRM** — tab 5
- **Cron Timeline** — tab 6  
- **Cost Tracker** — tab 7

Use a clean top tab bar or sidebar tabs. Keep it minimal.

---

## Dashboard Screen (Main View) — 5 Panels

### Panel 1: 🔴 Live Operations Feed (CENTER — largest panel)
The hero of the whole app. Real-time stream of what every agent is doing.

**Data source:** OpenClaw gateway sessions API + opie-relay WebSocket events

**Each row shows:**
- Timestamp (HH:MM:SS)
- Agent name + color badge (G=purple, Opie=cyan, Scout=green, etc.)
- Action description: "Reading HEARTBEAT.md", "Webhook health OK ✅", "Compressing memory block..."
- Expandable: click a row to see full tool call details / output

**Behavior:**
- Auto-scrolls, new events appear at top
- Filterable by agent
- Max ~200 visible rows, older ones fade/paginate
- Pulsing dot indicator when new events are streaming

**API needed from relay:** 
- GET /api/operations/live — SSE stream of agent events
- GET /api/operations/recent — last 200 events

### Panel 2: 🤖 Agent Status Cards (TOP ROW)
Horizontal row of cards, one per agent.

**Each card shows:**
- Agent emoji + name (e.g. "🤖 G", "🐙 Opie")
- Status: Online (green pulse) / Working (amber pulse) / Offline (gray)
- Current task (truncated, 1 line)
- Model name (small text)
- Last active: "2m ago"
- Token usage today (small)

**Data source:** GET /api/agents/status (poll every 10s)

**Agents to show:** G (main), Opie, Scout, and any other active sub-agents dynamically

### Panel 3: 📊 System Health (TOP-RIGHT or sidebar widget)
Compact health indicators.

**Shows:**
- Gateway: Connected ✅ / Disconnected ❌ + latency
- Webhook: UP ✅ + uptime duration
- RAM: X.X / 7.8 GB (progress bar)
- Disk: XX% (progress bar)
- Cron Health: X healthy / Y errored (colored badge)

**Data source:** GET /api/health (poll every 30s)
- Webhook: curl localhost:3456/webhook/health
- System: psutil-equivalent (from relay)
- Crons: openclaw cron list summary

### Panel 4: 📋 Open Loops / Active Tasks (SIDE PANEL)
Live task list pulled from the system.

**Shows:**
- Task name
- Owner (G / Wes / etc.)
- Status badge: 🔴 Blocked / 🟡 Waiting / 🟢 Active
- Next action (1 line)
- Age: "3 days"

**Data source:** GET /api/tasks/open-loops
- Parse from memory/open-loops.md on the server
- Or maintain a structured JSON version

### Panel 8: 🧠 Memory Activity (BOTTOM or small widget)
Shows the memory system working.

**Shows:**
- Recent memory writes (last 5-10)
- Compression events: "Compressed block #47: 4200→2100 tokens"
- Context window usage: visual bar showing used/total
- Eviction events

**Data source:** GET /api/memory/activity
- Parse from r-memory log, LCM status, breadcrumbs

---

## Tab: Leads & CRM (Panel 5)

**Shows:**
- Pipeline summary: HOT (red) / WARM (amber) / COLD (gray) counts
- Lead cards with: name, company, call duration, last contact, temperature
- Last call timestamp
- Quick filters by temperature

**Data source:** GET /api/crm/leads
- Parse from memory/crm/call-log.md

---

## Tab: Cron Timeline (Panel 6)

**Shows:**
- Horizontal timeline / gantt-style view of cron jobs
- Each job: name, last run time, next run time, status
- Color coded: Green=success, Red=error, Gray=pending, Amber=running
- Click to expand and see last output/error

**Data source:** GET /api/crons/timeline
- From openclaw cron list + job history

---

## Tab: Cost Tracker (Panel 7)

**Shows:**
- Today's total API spend (big number)
- Breakdown by model (bar chart or table)
- Breakdown by agent
- 7-day trend sparkline
- Token usage: input vs output

**Data source:** GET /api/costs/summary
- From usage-tracker plugin data

---

## Layout Spec

```
┌──────────────────────────────────────────────────────────┐
│  [Dashboard]  [Leads/CRM]  [Crons]  [Costs]    tabs     │
├──────────────────────────────────────────────────────────┤
│  [Agent Card] [Agent Card] [Agent Card]  │  System Health│
│  G ● Online   Opie ● Work  Scout ● Idle │  GW: ✅ 23ms  │
│                                          │  RAM: 3.2/7.8 │
├──────────────────────────────┬───────────┤  Disk: 37%    │
│                              │ Open Loops│  Crons: 6/2   │
│   LIVE OPERATIONS FEED       │           │               │
│   ● G reading HEARTBEAT.md   │ 🔴 Demo   ├───────────────┤
│   ● G webhook OK ✅          │ 🟡 Jessica│  Memory       │
│   ● Opie compressing...      │ 🟢 Cron   │  🧠 Ctx: 45% │
│   ● Scout scanning jobs...   │    triage │  Last write:  │
│                              │           │  2m ago       │
└──────────────────────────────┴───────────┴───────────────┘
```

## What to DELETE from current codebase
- ChatPanel.tsx, MobileChat.tsx, ConversationSidebar.tsx, MessageContextMenu.tsx
- ImmersiveVoiceMode.tsx, VoiceController.tsx, VoiceStateIndicator.tsx
- OnboardingModal.tsx
- ContentCommandCenter (entire /content-command-center route)
- AgentSuggestionWidget.tsx
- DocumentViewer.tsx
- ModelCounsel.tsx
- WorkspaceBrowser.tsx
- All chat-related API routes

## What to KEEP / adapt
- SystemStatusContext.tsx (extend it for new panels)
- opie-relay.js (add new API endpoints)
- globals.css / premium.css (dark theme base)
- layout.tsx (providers, PWA config)
- ErrorBoundary.tsx
- StatusIndicators.tsx (adapt for new use)

## Design Language
- Dark background: #0a0a0f or similar deep dark
- Purple accent: #a855f7
- Cyan accent: #06b6d4  
- Green for healthy: #22c55e
- Red for errors: #ef4444
- Amber for warnings: #f59e0b
- Monospace font for the ops feed (JetBrains Mono)
- Inter for everything else
- Subtle glow effects on active elements
- Smooth animations, no jank

## Relay API Endpoints Needed (add to opie-relay.js)

```
GET  /api/operations/live     — SSE stream of real-time agent events
GET  /api/operations/recent   — Last 200 operations
GET  /api/agents/status       — All agent statuses
GET  /api/health              — System health (webhook, RAM, disk, crons)
GET  /api/tasks/open-loops    — Parsed open loops
GET  /api/memory/activity     — Recent memory events
GET  /api/crm/leads           — CRM lead data
GET  /api/crons/timeline      — Cron job timeline
GET  /api/costs/summary       — Cost/usage data
```

## Priority
1. Get the Dashboard main screen working first (panels 1,2,3,4,8)
2. Then build the tabs (5,6,7)
3. Polish animations and real-time feel last
