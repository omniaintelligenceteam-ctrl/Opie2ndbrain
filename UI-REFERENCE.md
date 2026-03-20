# Opie Ops Center — UI Reference

Quick visual guide to the Live Ops Command Center interface.

---

## Layout Overview

```
┌─────────────────────────────────────────────────────────────────┐
│  🧠 OPIE OPS CENTER         v2.0                                │
│  📊 DASHBOARD  📋 LEADS  ⏰ CRONS  💰 COSTS  [DEMO MODE]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Agent Status Cards (Full Width)                                │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ 🤖 G         │ │ 🐙 Opie      │ │ 🔬 Research  │             │
│  │ Orchestrator │ │ WebChat      │ │ Intel Agent  │             │
│  │ claude-opus  │ │ claude-opus  │ │ minimax-m2.5 │             │
│  │ ● working    │ │ ○ online     │ │ ○ idle       │             │
│  │ Processing.. │ │ Waiting      │ │ 45m ago      │             │
│  │ 847k tokens  │ │ 124k tokens  │ │ 213k tokens  │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│                                                                   │
├────────────────────────────────────┬──────────────────────────────┤
│                                    │                              │
│  Live Operations Feed              │  System Health Widget        │
│  (Monospace, auto-scroll)          │  ┌────────────────────┐     │
│  ┌──────────────────────────────┐  │  │ ✅ Gateway        │     │
│  │ 2026-03-20 14:32:51Z         │  │  │ ✅ Webhook 78.5h  │     │
│  │ G: agent.chat                │  │  │ ━━━━━━━━━━━━━━━━ │     │
│  │ ChatMessage: "status check"  │  │  │ RAM 2.2/7.8 GB ▓ │     │
│  │                              │  │  │ Disk 27% ▓▓▓     │     │
│  │ 2026-03-20 14:32:48Z         │  │  │ Crons 6⚙ 2⚠     │     │
│  │ Opie: agent.spawn            │  │  └────────────────────┘     │
│  │ SpawnSubagent:Scout          │  │                              │
│  │                              │  │  Memory Activity Widget      │
│  │ 2026-03-20 14:32:45Z         │  │  ┌────────────────────┐     │
│  │ Research: memory.write       │  │  │ 📝 write (14:32)  │     │
│  │ SessionMemoryUpdate          │  │  │ ⚙️ compress (14:30)│     │
│  │                              │  │  │ 🗑️ evict (14:28)   │     │
│  │ 2026-03-20 14:32:42Z         │  │  │ 📄 narrative       │     │
│  │ G: operations.complete       │  │  │                     │     │
│  │ TaskComplete: "lead-triage"  │  │  │ Context 14.2/200k  │     │
│  │                              │  │  │ ━━━━━━━━━━ 7.1%   │     │
│  │ [Filter by agent ▼ ALL]      │  │  └────────────────────┘     │
│  │ [← Older]              [↓ Follow] │                              │
│  └──────────────────────────────┘  │                              │
│                                    │                              │
├─────────────────────────────────────┴──────────────────────────────┤
│                                                                      │
│  Open Loops Panel                                                  │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │ Task                           Owner     Status   Age  Due   │   │
│  │ ─────────────────────────────────────────────────────────  │   │
│  │ SAP demo redeploy            @Wes      🔴 BLOCKED  3d  now  │   │
│  │ Fix cron timeout errors       @G        🟡 WAITING  2d  +1d  │   │
│  │ Update HEARTBEAT.md path      @Ops      🟢 ACTIVE   1h  +3d  │   │
│  │ Memory validation test        @Scout    ✅ DONE     2d  -1d  │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Component Sizes & Colors

### AgentStatusCards
- Height: ~100px
- Each card: 200px wide (flex, 4 per row on desktop)
- Colors: Background #1a1a28, border #333, text #f0f0f0
- Status badges:
  - 🟢 Working: #06b6d4 (cyan)
  - 🔘 Online: #a855f7 (purple)
  - ⚪ Idle: #6b7280 (gray)

### SystemHealthWidget
- Width: 220px (fixed sidebar)
- Height: auto (expands with content)
- Background: #0f0f18 with border #222
- Health indicators:
  - ✅ Healthy: #10b981 (green)
  - ⚠️ Warning: #f59e0b (amber)
  - ❌ Error: #ef4444 (red)

### LiveOpsFeed
- Flex: 1 (fills available space)
- Font: JetBrains Mono, 11px, monospaced
- Line height: 1.6
- Colors:
  - Timestamp: #a0a0a0 (gray)
  - Agent name: #a855f7 (purple)
  - Action: #f0f0f0 (white)
  - Detail: #6b7280 (gray)
- Auto-scroll when new events arrive
- Max 200 events in buffer

### OpenLoopsPanel
- Height: 180px (fixed bottom)
- Font: Inter, table layout
- Row height: 36px
- Status badges:
  - 🔴 BLOCKED: #ef4444 (red)
  - 🟡 WAITING: #f59e0b (amber)
  - 🟢 ACTIVE: #10b981 (green)
  - ✅ DONE: #6b7280 (gray, strikethrough)

### MemoryActivityWidget
- Width: 220px (sidebar)
- Height: auto
- Font: Inter, 11px
- Event types:
  - 📝 write: #a855f7
  - ⚙️ compress: #06b6d4
  - 🗑️ evict: #ef4444
  - 📄 narrative: #f59e0b

---

## Tab Navigation

Located in top bar (56px height):

```
📊 DASHBOARD
   Background: #0a0a14, border-bottom: #222
   Active: background #2a1a4a, text #a855f7
   Inactive: text #999, hover background #1a1a28

📋 LEADS / CRM
   Same styling as DASHBOARD
   Placeholder with stats: "2 HOT · 20 WARM · 28 COLD"

⏰ CRONS
   Same styling
   Placeholder with stats: "6 healthy · 2 errored"

💰 COSTS
   Same styling
   Placeholder with stats: "$2.47 · 847k tokens"
```

---

## Responsive Design

### Desktop (1920px+)
```
┌─────────────────────────────────────────────────────┐
│ Agent Cards (full width)                            │
├────────────────────────────┬────────────────────────┤
│ Ops Feed (flex)            │ Sidebars (220px)       │
│                            │ - Health               │
│                            │ - Memory               │
├─────────────────────────────────────────────────────┤
│ Open Loops (full width, 180px)                      │
└─────────────────────────────────────────────────────┘
```

### Tablet (768px-1920px)
```
┌──────────────────────────┐
│ Agent Cards (full width) │
├─────────────────┬────────┤
│ Ops Feed        │Sidebar │
│ (flex)          │ (compact)
├──────────────────────────┤
│ Open Loops               │
└──────────────────────────┘
```

### Mobile (< 768px)
```
┌──────────────────┐
│ Agent Cards      │
├──────────────────┤
│ Ops Feed         │
│ (full width)     │
├──────────────────┤
│ Health + Memory  │
│ (stacked)        │
├──────────────────┤
│ Open Loops       │
└──────────────────┘
```

---

## Data Flow Diagram

```
┌──────────────────────┐
│ OpenClaw Gateway     │
│ (WebSocket)          │
└──────────┬───────────┘
           │
           │ WS subscribe to events
           │
┌──────────▼───────────────────────┐
│ opie-relay.js                     │
│ (Node.js, port 19100)             │
├───────────────────────────────────┤
│ Event Buffer (500 events)         │
│ SSE Listeners                     │
├───────────────────────────────────┤
│ GET /api/operations/recent   ────┐
│ GET /api/operations/live     ───┐│
│ GET /api/health              ──┐││
│ GET /api/agents/status       ─┐│││
│ GET /api/tasks/open-loops    ─┐│││
│ GET /api/memory/activity    ──┐│││
│ GET /api/crm/leads          ──┐│││
│ GET /api/crons/timeline     ──┐│││
│ GET /api/costs/summary      ──┐│││
└──────────┬────────────────────────┘
           │
           │ HTTP/SSE
           │
┌──────────▼─────────────────┐
│ Vercel (Next.js)            │
│ (Your app domain)           │
├─────────────────────────────┤
│ /api/operations     ────┐   │
│ /api/health         ───┤   │
│ /api/agents/status  ──┤   │
│ /api/tasks/*        ──┤───┐
│ /api/memory/*      ──┐│   │
└────────────┬──────────────┘
             │ Proxy requests
             │
┌────────────▼──────────────────┐
│ Browser (ops-center.com)       │
├────────────────────────────────┤
│ Dashboard Page                 │
│ - AgentStatusCards             │
│ - LiveOpsFeed                  │
│ - SystemHealthWidget           │
│ - OpenLoopsPanel               │
│ - MemoryActivityWidget         │
│ - Tab Navigation               │
└────────────────────────────────┘
```

---

## Color Palette (Full Reference)

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| Background | #0a0a14 | 10,10,20 | Page bg |
| Surface Dark | #0f0f18 | 15,15,24 | Card bg |
| Surface Light | #1a1a28 | 26,26,40 | Hover bg |
| Border | #222 or rgba(255,255,255,0.06) | — | Dividers |
| Text Primary | #f0f0f0 | 240,240,240 | Main text |
| Text Secondary | #999 / #a0a0a0 | — | Secondary text |
| Text Muted | rgba(255,255,255,0.35) | — | Timestamps, metadata |
| Primary | #a855f7 | 168,85,247 | Buttons, highlights, G |
| Secondary | #06b6d4 | 6,182,212 | Accent, Opie, cyan |
| Success | #10b981 | 16,185,129 | Online, active, green |
| Warning | #f59e0b | 245,158,11 | Waiting, amber |
| Error | #ef4444 | 239,68,68 | Blocked, red |
| Muted | #6b7280 | 107,114,128 | Idle, done, gray |

---

## Typography Sizes

| Size | Usage |
|------|-------|
| 9px | Small labels, timestamps, badges |
| 11px | Body text, table cells, monospace |
| 13px | Regular body, input text |
| 16px | Section headers |
| 20px | Page title |
| 22px | Brand name/logo |

All weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)

---

## Animation & Transitions

- **Fast:** 0.15s (button hover, tab switch)
- **Medium:** 0.3s (panel expand, card swap)
- **Smooth:** 0.5s (scroll, fade in)
- **Easing:** ease, ease-in-out

Live feed scrolls automatically when new events arrive (no jump, smooth scroll).

---

## Accessibility

- ✅ Semantic HTML (buttons, inputs, labels)
- ✅ High contrast text (#f0f0f0 on #0a0a14)
- ✅ Focus rings on interactive elements
- ✅ Tab navigation support
- ✅ ARIA labels on complex components
- ✅ Keyboard-accessible tab switching

---

## Demo Mode Appearance

When relay is unreachable, components show:

- All panels render with realistic sample data
- No error messages (graceful fallback)
- [DEMO MODE] badge in top-right (amber)
- Full functionality works with hardcoded data
- Perfect for screenshots, demos, testing

---

This reference shows the exact visual structure and styling of the Opie Ops Center. Use it to:
- Verify layout matches design
- Customize colors/sizes
- Plan future UI improvements
- Create marketing screenshots
