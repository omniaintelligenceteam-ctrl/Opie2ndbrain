# 2nd Brain Dashboard — Improvement Plan

## Current State (2026-01-30)
- ✅ Left sidebar navigation
- ✅ Drill-down views for Agents, Skills, Tasks, Crons
- ✅ Voice chat with TTS
- ✅ Basic Kanban dashboard

---

## Priority 1: Core Functionality Gaps

### 1. Real Data Integration
**Current:** Mock/placeholder data
**Needed:**
- Connect Agents panel to actual `sessions_list` API
- Connect Tasks panel to real sub-agent activity
- Connect Crons panel to `cron list` API
- Pull Skills from actual SKILL_INDEX.md

### 2. Voice Context Fix Deploy
**Status:** Code ready, needs Vercel token setup
**Action:** Login to Vercel and redeploy, or set up auto-deploy on push

### 3. Live Agent Spawning
**Current:** "Deploy Agent" button is UI only
**Needed:**
- Wire up to `sessions_spawn` API
- Task input → spawn sub-agent
- Show real-time status updates

---

## Priority 2: UX Improvements

### 1. Real-time Updates
- WebSocket or polling for live task progress
- Agent status changes without refresh
- Cron run notifications

### 2. Search & Filter
- Search across all skills
- Filter agents by status/tier
- Filter tasks by status (running/complete/failed)
- Filter crons by enabled/disabled

### 3. Better Mobile Experience
- Collapsible sidebar on mobile
- Touch-friendly drill-down views
- Voice button more prominent

### 4. Dark Mode
- Currently light only
- Add toggle in Settings

---

## Priority 3: New Features

### 1. Memory Panel
- View MEMORY.md contents
- Browse daily notes
- Search memory with `memory_search` API
- Add/edit memories manually

### 2. Chat History
- View conversation history across sessions
- Filter by channel (Telegram, voice, web)
- Search past conversations

### 3. Settings Panel
- Configure voice (TTS voice selection)
- API key management
- Notification preferences
- Theme settings

### 4. Analytics Dashboard
- Token usage over time
- Cost tracking
- Agent performance metrics
- Task success rates

### 5. Quick Actions
- Common task shortcuts
- One-click agent spawns for frequent tasks
- Pinned/favorite agents

---

## Priority 4: Advanced Features

### 1. Orchestrator Integration
- Auto-route tasks to best agent
- Show routing decisions
- Override suggestions

### 2. Multi-Agent Coordination
- Visual workflow builder
- See parallel agent execution
- Dependency tracking

### 3. Notifications
- Push notifications for completed tasks
- Alert on failures
- Daily summary option

### 4. Calendar Integration
- Show upcoming events
- Trigger agents from calendar
- Meeting prep automation

### 5. Email Dashboard
- View recent emails
- Quick reply via agent
- Email-triggered automations

---

## Technical Debt

### 1. API Layer
- Create proper API routes for all gateway calls
- Add error handling and retries
- Rate limiting

### 2. State Management
- Consider Zustand or Jotai for complex state
- Cache API responses
- Optimistic updates

### 3. Testing
- Add component tests
- E2E tests for critical flows
- API mocking for development

### 4. Performance
- Code splitting by route
- Lazy load panels
- Image optimization

---

## Quick Wins (Can Do Today)

1. [ ] Fix Vercel deploy (login and redeploy)
2. [ ] Add loading states to all panels
3. [ ] Add error states with retry buttons
4. [ ] Add "Last updated" timestamps
5. [ ] Add refresh buttons to each panel
6. [ ] Improve empty states with helpful messages

---

## Moonshot Ideas

- **Voice commands:** "Hey Opie, spawn a research agent"
- **AR/VR dashboard:** Spatial interface for agent management
- **Agent marketplace:** Browse and install community agents
- **Collaborative mode:** Multiple users managing same agent fleet
- **Mobile app:** Native iOS/Android companion

---

*Last updated: 2026-01-30*
