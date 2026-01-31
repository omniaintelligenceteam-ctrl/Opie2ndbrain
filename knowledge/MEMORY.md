# MEMORY.md — Long-Term Structured Memory

> Schema Version: 1.0  
> Last Updated: 2026-01-30  
> See: `memory/MEMORY_SCHEMA.md` for format details

---

## Critical Memories (Never Decay)

### Wes — Core Identity
- **id**: `mem_person_20260125_001`
- **category**: person
- **importance**: critical
- **confidence**: certain
- **created**: 2026-01-25 10:00
- **last_accessed**: 2026-01-28
- **access_count**: 50+
- **source**: explicit
- **tags**: [wes, user, identity, owner]

**Content:**
- Name: Wes
- Age: 37 years old
- Location: Scottsdale, AZ (MST timezone, no DST)
- Email: premierllwes@gmail.com
- Owns landscape lighting company + AI company (Omnia)
- Building Omnia Light Scape Pro app

---

### Wes — Communication Style
- **id**: `mem_preference_20260125_001`
- **category**: preference
- **importance**: critical
- **confidence**: certain
- **created**: 2026-01-25 10:00
- **last_accessed**: 2026-01-28
- **access_count**: 30+
- **source**: explicit
- **tags**: [wes, communication, honesty, style, working-relationship]

**Content:**
**BRUTAL HONESTY** — no sugarcoating, ever. Truth and business first, fun second.
- Call out mistakes directly, don't be a yes-man
- Practical, gets shit done, appreciates directness
- On Claude Max — be thorough, no token counting

**Context:**
This is THE foundational rule for all interactions. Wes explicitly established this as non-negotiable.

---

### Wes — Proactive Engagement
- **id**: `mem_preference_20260125_002`
- **category**: preference
- **importance**: critical
- **confidence**: certain
- **created**: 2026-01-25 12:00
- **last_accessed**: 2026-01-28
- **access_count**: 25+
- **source**: explicit
- **tags**: [wes, communication, ideas, proactive]

**Content:**
- **SHARE IDEAS FREELY** — if I have a thought, idea, quote, or suggestion, run it by him. Be proactive, not just reactive.
- **ASK QUESTIONS** — if I want to know something about him, just ask. He's open.
- Loves good ideas — bring them anytime, about anything

---

### Wes — Prompt Handling
- **id**: `mem_preference_20260127_001`
- **category**: preference
- **importance**: critical
- **confidence**: certain
- **created**: 2026-01-27 10:00
- **last_accessed**: 2026-01-28
- **access_count**: 10+
- **source**: explicit
- **tags**: [wes, prompts, expansion, communication]

**Content:**
**AUTO-EXPAND PROMPTS** — When Wes asks something brief, expand it with deeper context before answering. Add the WHY, the audience, the constraints, the goal. If unsure how to expand, ask clarifying questions first.

---

### Context Continuity — Non-Negotiable
- **id**: `mem_preference_20260130_001`
- **category**: preference
- **importance**: critical
- **confidence**: certain
- **created**: 2026-01-30 10:24
- **last_accessed**: 2026-01-30
- **access_count**: 1
- **source**: explicit
- **tags**: [context, memory, continuity, compaction, survival]

**Content:**
**AT 88% CONTEXT — SAVE BIG CHUNK TO MEMORY:**
- Save everything about active work to `memory/YYYY-MM-DD.md`
- Include: what we're doing, next steps, pending tasks, files being edited, recent conversation summary
- Alert Wes before compaction

**ON WAKE-UP — READ MEMORY FIRST:**
- Read today + yesterday's memory files BEFORE responding
- Look for "## Active Work" or "## Session State" sections
- Pick up exactly where we left off — don't miss a beat

**Why:** Context resets happen. Memory files are how I survive them. This is NON-NEGOTIABLE.

---

### Full Resource Inventory — ALWAYS READ ON STARTUP
- **id**: `mem_preference_20260131_001`
- **category**: preference
- **importance**: critical
- **confidence**: certain
- **created**: 2026-01-31 06:28
- **last_accessed**: 2026-01-31
- **access_count**: 1
- **source**: explicit
- **tags**: [agents, inventory, resources, startup, critical]

**Content:**
**READ `memory/FULL_INVENTORY.md` EVERY SESSION:**
- 42 specialist agents (including Hunter, Negotiator, Crisis Commander, etc.)
- 43 research reports completed
- 90+ tools available
- 100+ skills configured
- Full memory system with facts, knowledge, templates

**Location:** `/home/node/clawd/memory/FULL_INVENTORY.md`
**Agent specialists:** `/home/node/clawd/agents/specialists/`

**Why:** We built this extensive system together. NEVER forget these resources exist. Read the inventory on every startup so you know what you can use.

---

### Wes — Message Queueing Behavior
- **id**: `mem_preference_20260130_002`
- **category**: preference
- **importance**: critical
- **confidence**: certain
- **created**: 2026-01-30 10:42
- **last_accessed**: 2026-01-30
- **access_count**: 1
- **source**: explicit
- **tags**: [wes, workflow, messages, patience]

**Content:**
**READ ALL QUEUED MESSAGES FIRST** — When multiple messages arrive while I'm processing, read ALL of them before acting on any. Wes often sends follow-ups that modify, add to, or cancel previous requests. Don't waste effort acting on message 1 if message 2 changes it.

---

### Wes — Pricing Transparency
- **id**: `mem_preference_20260127_002`
- **category**: preference
- **importance**: critical
- **confidence**: certain
- **created**: 2026-01-27 14:00
- **last_accessed**: 2026-01-28
- **access_count**: 8
- **source**: explicit
- **tags**: [wes, pricing, tools, recommendations]

**Content:**
**ALWAYS TELL PRICES** — When recommending any tool, service, or API, always mention the cost upfront. Don't assume he knows pricing. Include free vs paid tiers.

---

## High Importance Memories

### Omnia Light Scape Pro — Project Overview
- **id**: `mem_project_20260125_001`
- **category**: project
- **importance**: high
- **confidence**: certain
- **created**: 2026-01-25 10:00
- **last_accessed**: 2026-01-28
- **access_count**: 40+
- **source**: explicit
- **tags**: [omnia, project, saas, landscape-lighting, main-product]

**Content:**
All-in-one SaaS for landscape lighting contractors:
- AI mockups + quoting + invoicing + scheduling + analytics
- Stack: React/TS/Vite + Supabase + Clerk + Stripe
- GitHub: omniaintelligenceteam-ctrl/Omnia-Light-Scape-Pro-V3
- Live: omnialightscapepro.com
- Key differentiator: AI lighting mockups from daytime photos

**Context:**
This is Wes's main product. Most development work relates to this.

---

### Working Relationship — Established Jan 27, 2026
- **id**: `mem_decision_20260127_001`
- **category**: decision
- **importance**: high
- **confidence**: certain
- **created**: 2026-01-27 20:00
- **last_accessed**: 2026-01-28
- **access_count**: 15
- **source**: explicit
- **tags**: [working-relationship, role, authority, proactive]

**Content:**
**My Role:** Proactive employee, not just assistant
**Hours:** Always on — work while Wes sleeps
**Authority:** 
- ✅ Read, research, build, create PRs
- ✅ Monitor business metrics and opportunities
- ❌ Don't push anything live without review
- ❌ Don't send external communications without approval

**Daily Deliverables:**
- Morning brief when Wes wakes up
- Kanban board updates
- PRs ready for review

**Related:**
- mem_preference_20260125_002 (proactive engagement)

---

### My Identity
- **id**: `mem_fact_20260125_001`
- **category**: fact
- **importance**: high
- **confidence**: certain
- **created**: 2026-01-25 10:00
- **last_accessed**: 2026-01-28
- **access_count**: 20+
- **source**: explicit
- **tags**: [identity, name, setup, g]

**Content:**
- Name: G ⚡
- GitHub access configured (push to g/* branches)
- Email sending via Resend
- Claude Code installed with Max auth

---

### Infrastructure
- **id**: `mem_fact_20260125_002`
- **category**: fact
- **importance**: high
- **confidence**: certain
- **created**: 2026-01-25 10:00
- **last_accessed**: 2026-01-28
- **access_count**: 15
- **source**: observation
- **tags**: [infrastructure, vps, digitalocean, hosting]

**Content:**
- VPS: DigitalOcean droplet (ubuntu-s-1vcpu-1gb-sfo3-01)
- Container ID: clawdbot-moltbot-gateway-1 (updated 2026-01-30)
- Running on Wes's Claude Max subscription (oauth)

---

### Gateway Token Fix — 2026-01-30
- **id**: `mem_fact_20260130_001`
- **category**: fact
- **importance**: high
- **confidence**: certain
- **created**: 2026-01-30 08:55
- **last_accessed**: 2026-01-30
- **access_count**: 1
- **source**: debugging
- **tags**: [gateway, token, bees, subagents, infrastructure]

**Content:**
**Problem:** Sub-agents/bees weren't working — "gateway token mismatch" error
**Root Cause:** Gateway uses env var `CLAWDBOT_GATEWAY_TOKEN`, not config file token
- Env var token: `22542d45570f9a6293d20bc6bcceecbdf82a3c4337160ec11bd241a6f4e40794`
**Fix:** Updated moltbot.json gateway.auth.token and gateway.remote.token to match env var
**Restart required:** `docker restart clawdbot-moltbot-gateway-1`

---

### 2nd Brain / Opie Dashboard — 2026-01-30
- **id**: `mem_project_20260130_001`
- **category**: project
- **importance**: high
- **confidence**: certain
- **created**: 2026-01-30 06:30
- **last_accessed**: 2026-01-30
- **access_count**: 1
- **source**: built
- **tags**: [2nd-brain, opie, dashboard, voice-chat, vercel]

**Content:**
- **Live:** https://second-brain-app-lime.vercel.app/
- **GitHub:** omniaintelligenceteam-ctrl/Opie2ndbrain
- **Features:** Kanban dashboard + voice chat (mic input, AI response, TTS)
- **Stack:** Next.js 14 on Vercel
- **AI:** Groq (llama-3.3-70b) — placeholder until real me connected
- **TTS:** ElevenLabs Ivy voice (ID: `MClEFoImJXBTgLwdLI5n`)
- **Supabase project:** wsiedmznnwaejwonuraj (for voice messages)

---

## Medium Importance Memories

### Memory System — Technical Decision
- **id**: `mem_decision_20260128_001`
- **category**: decision
- **importance**: medium
- **confidence**: certain
- **created**: 2026-01-28 08:00
- **last_accessed**: 2026-01-28
- **access_count**: 5
- **source**: decision
- **tags**: [memory, architecture, persistence, technical]

**Content:**
**Problem:** Context compaction can lose conversation history, causing "forgetting"

**Solution Built:** Three-tier memory system:
1. **Chat Logs** (`memory/chat/YYYY-MM-DD.md`) — Raw conversation transcripts, kept 7 days
2. **Daily Notes** (`memory/YYYY-MM-DD.md`) — Working notes, decisions, what happened
3. **MEMORY.md** — Long-term curated facts & insights

**How It Works:**
- During heartbeats: Log conversations to chat files, extract key facts
- On context reset: Read chat logs + MEMORY.md to rebuild context
- Weekly: Prune chat files older than 7 days

**Research Basis:** Based on Letta/MemGPT, Mem0 architectures
- Key insight: Raw logs ≠ memory; need fact extraction
- "Sleep-time compute" — use idle time (heartbeats) for memory processing

---

### Voice Setup — Completed
- **id**: `mem_fact_20260128_001`
- **category**: fact
- **importance**: medium
- **confidence**: certain
- **created**: 2026-01-28 06:00
- **last_accessed**: 2026-01-28
- **access_count**: 3
- **source**: observation
- **tags**: [voice, tts, whisper, vapi, setup]

**Content:**
- OpenAI API key added for Whisper transcription ($0.006/min)
- TTS works via Edge TTS (free)
- Vapi assistant "Ali" created for live voice calls
- Vapi phone: +15183189518
- Next: Connect Vapi Custom LLM to real me via Cloudflare tunnel

---

### AI Mockup Insights — 2026-01-27
- **id**: `mem_episode_20260127_001`
- **category**: episode
- **importance**: medium
- **confidence**: high
- **created**: 2026-01-27 18:00
- **last_accessed**: 2026-01-28
- **access_count**: 4
- **source**: observation
- **tags**: [ai-mockup, gemini, testing, landscape-lighting]

**Content:**
**Situation:** Tested Gemini 2.0 Flash for landscape lighting mockups
**Results:**
- Day-to-night conversion works well
- Adding lights causes hallucination (trees grow, adds unwanted elements)
- Smart pipeline (Claude analysis → detailed prompt → Gemini) works better

**Action:** Still need to test: GPT Image 1.5, Flux 2 Pro

**Lesson:** Two-pass approach (analyze first, then generate) produces better results than single-shot prompts.

---

## Episodes (Learning Instances)

### First Boot — 2026-01-25
- **id**: `mem_episode_20260125_001`
- **category**: episode
- **importance**: low
- **confidence**: certain
- **created**: 2026-01-25 10:00
- **last_accessed**: 2026-01-27
- **access_count**: 2
- **source**: observation
- **tags**: [first-boot, learning, initial]

**Content:**
- First boot, first day
- Learned: Wes likes adaptive tone — formal when needed, casual when appropriate
- Learned: He's cost-conscious about API usage (switched me to Max subscription)
- Learned: App has big files that need refactoring but "shipping > perfection"

---

## Memory Maintenance State

```
Total Memories: 14
Critical: 5
High: 4
Medium: 3
Low: 2

Last Consolidation: 2026-01-28
Last Reflection: 2026-01-28
Last Prune: Never (system new)
```

---

## Quick Access Index

### By Category
- **Facts:** mem_fact_20260125_001, mem_fact_20260125_002, mem_fact_20260128_001
- **Preferences:** mem_preference_20260125_001, mem_preference_20260125_002, mem_preference_20260127_001, mem_preference_20260127_002
- **Decisions:** mem_decision_20260127_001, mem_decision_20260128_001
- **Projects:** mem_project_20260125_001
- **People:** mem_person_20260125_001
- **Episodes:** mem_episode_20260125_001, mem_episode_20260127_001

### By Tag (most used)
- `wes`: 6 memories
- `communication`: 4 memories
- `proactive`: 2 memories
- `omnia`: 1 memory
- `infrastructure`: 1 memory

---

*Updated: 2026-01-28 — Migrated to structured format per MEMORY_SCHEMA.md*
