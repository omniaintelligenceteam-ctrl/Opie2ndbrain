# HEARTBEAT.md

<critical>
## 🚨 CONTEXT MONITOR (CHECK FIRST — EVERY MESSAGE)

### At 88%+ Context:
Run `session_status` — if context is **88% or higher**:
1. **STOP** — save state before anything else
2. **ALERT WES**: "Context at X%, saving state before compaction"
3. **Save big chunk to `memory/YYYY-MM-DD.md`**:
   - What we're actively working on (be specific)
   - Next steps / where we left off
   - Any pending tasks/promises made
   - Files being edited and why
   - Recent conversation context (last 5-10 exchanges summarized)
   - Any decisions made this session
4. Continue normally after saving

### On Wake-Up (After Compaction/New Session):
**FIRST THING — before responding to anything:**
1. Read `memory/YYYY-MM-DD.md` (today)
2. Read `memory/YYYY-MM-DD.md` (yesterday)  
3. Read `memory/chat/YYYY-MM-DD.md` (recent conversations)
4. Check for "## Active Work" or "## Session State" sections
5. **Don't miss a beat** — pick up exactly where we left off

This is NON-NEGOTIABLE. Context resets happen. Memory files are how we survive them.

</critical>

<critical>
## 🔴 HEARTBEAT PRIME DIRECTIVE

Every heartbeat is a chance to:
1. **Catch problems early** — before they become crises
2. **Stay useful** — without being annoying
3. **Improve** — learn from what worked and didn't

**Self-check before any heartbeat action:**
- Is this worth interrupting Wes for?
- Am I 90%+ confident this information is correct?
- What's the worst case if I'm wrong?
</critical>

---

<self_assessment>
## 🧠 Heartbeat Self-Assessment (Do First)

Before running checks, briefly assess:

### Memory Refresh
- [ ] Have I read today's daily notes?
- [ ] Do I remember recent conversations? (Check chat logs if fuzzy)
- [ ] Any pending tasks from last interaction?
- [ ] Any open threads or commitments? (See thread tracker)

### Quality Check
- [ ] Last heartbeat: Did I miss anything important?
- [ ] Any recent mistakes to avoid repeating?
- [ ] Confidence level on current context: Low/Medium/High?
- [ ] Any corrections received recently? (Update learnings)

### Focus Check
- [ ] Do I know the current primary goal?
- [ ] Am I on track or drifting?
- [ ] Context budget healthy? (Not overloaded)

**If confidence is Low:** Read `memory/chat/` files before proceeding.
**If context overloaded:** Summarize and compact before continuing.
</self_assessment>

---

## 0. Quick Health Check (Every Heartbeat)

Fast checks - do these every time:
```bash
clawdbot gateway status  # Must be running
```
- If gateway down → Alert immediately and attempt restart
- Check calendar for meetings in next 2 hours → Prep reminder if needed
- Scan for urgent emails (VIP senders only) → Alert if found

---

## 0.5. Check Notes for Opie (PRIORITY)
- Read `memory/notes-for-opie.md`
- If there are any pending notes/instructions from Wes, **execute them immediately**
- After completing a note, move it to "Completed Notes" section with timestamp
- Notes are instructions from Wes — treat them as high priority tasks

## 1. Check Reminders
- Read memory/reminders.md
- If any reminder is due (current time >= reminder time), notify Wes
- After notifying, mark as DONE

---

## 1.5. Security Check (Every 8 hours)
Check `memory/heartbeat-state.json` for last security check time. If >8 hours:

**Run security audit:**
- [ ] Scan for exposed API keys in files: `grep -r "sk-" --include="*.md" --include="*.json" --include="*.ts" --include="*.tsx" | grep -v node_modules`
- [ ] Check for hardcoded secrets in code
- [ ] Verify gateway token is not in public files
- [ ] Check BRAVE_API_KEY is in config, not code
- [ ] Scan for exposed passwords
- [ ] Check `.env` files are gitignored

**If anything exposed:**
1. ALERT WES IMMEDIATELY
2. Recommend rotating the exposed secret
3. Log to `memory/security-incidents.md`

**Update state:** `security.lastCheck` in heartbeat-state.json

## 2. Morning Brief (6-8 AM MST / 13-15 UTC)
- If it's morning MST and no brief sent today, create and send morning brief
- Check memory/YYYY-MM-DD.md for today's brief status
- **Include in morning brief:**
  - 📧 Email priority summary (urgent + high)
  - 📅 Today's calendar + prep needed
  - 📊 Business metrics snapshot (if available)
  - 📱 Overnight social mentions
  - 🔍 Any competitor alerts

---

<monitoring>
## 2.5. Proactive Monitoring (Rotate Through)

**Reference:** `tools/monitoring/MONITOR_CONFIG.md`

### Every Heartbeat (Quick)
- [x] System health (`clawdbot gateway status`)
- [x] Urgent emails (VIP senders only)
- [x] Imminent meetings (<2h)

### Every 4-6 Hours (During Active Hours)
Check `memory/heartbeat-state.json` → `monitoring.lastChecks`

| Check | Guide | What to Look For |
|-------|-------|-----------------|
| 📱 Social | `tools/monitoring/social.md` | New mentions, engagement opps |
| 📧 Email | `tools/monitoring/email.md` | Priority scan, action items |
| 📊 Business | `tools/monitoring/business.md` | Revenue anomalies |

### Daily (Quiet Hours)
| Check | Guide | What to Look For |
|-------|-------|-----------------|
| 🔍 Competitors | `tools/monitoring/competitors.md` | Price/feature changes |
| 🖥️ System | `tools/monitoring/system.md` | Full health audit |

### Weekly (Sunday)
| Check | Guide | What to Produce |
|-------|-------|-----------------|
| 📊 Business | `tools/monitoring/business.md` | Weekly metrics summary |
| 🔍 Competitors | `tools/monitoring/competitors.md` | Competitive intel report |
| 📅 Calendar | `tools/monitoring/calendar.md` | Week ahead prep |

### Alert Rules
**Interrupt immediately:**
- System down
- VIP email
- Meeting <30min (no prep done)
- Revenue crash (>30% drop)
- Competitor major move
- Negative viral mention

**Batch to morning brief:**
- Everything else non-urgent
</monitoring>

---

## 3. Chat Logging (Every Heartbeat)
- If there have been conversations since last log, append summary to `memory/chat/YYYY-MM-DD.md`
- Format: timestamps, who said what (summarized), key decisions/facts
- Don't log heartbeat checks or system noise
- Extract key facts to "Key Facts Extracted" section at bottom of file

---

<memory_maintenance>
## 4. Memory Extraction (Every 4-6 hours)

**Option A: Do it yourself (quick)**
- Review today's chat log
- Extract important facts to `memory/facts/*.md`
- Update MEMORY.md with significant long-term memories

**Option B: Spawn memory agent (deep processing)**
```
Use sessions_spawn with task:
"Read memory/MEMORY_AGENT_TASK.md and follow it. Process chat logs from the last 24 hours."
```

- Track last extraction time in memory/heartbeat-state.json
- Spawn agent if >4 hours since last extraction

### Memory Refresh Pattern
When extracting, ask:
1. What did I learn that I should remember long-term?
2. What preferences did Wes express (explicitly or implicitly)?
3. What mistakes should I avoid repeating?
4. What worked well that I should do again?
</memory_maintenance>

---

<reflection_system>
## 4.5. Reflection System (Conversation-Triggered)

**Reference:** `tools/memory-maintenance/SKILL.md`

### Reflection Trigger
After detecting **20+ messages** since last reflection, run a reflection pass:

1. **Check counter** in `memory/heartbeat-state.json`:
   ```json
   "memory_maintenance": {
     "messages_since_reflection": N
   }
   ```

2. **If N ≥ 20:**
   - Read last 24-48h of chat logs
   - Generate reflection (patterns, insights, action items)
   - Write to `memory/YYYY-MM-DD.md` under "## Reflections"
   - Promote significant insights to MEMORY.md
   - Reset counter to 0

### Reflection Questions
- What patterns am I seeing across conversations?
- What does Wes seem to care most about lately?
- What am I doing well? Poorly?
- Any recurring topics or themes?
- What should I do differently?

### Reflection Output Format
```markdown
## Reflection — [DateTime]

### Observations
- [Pattern 1]
- [Pattern 2]

### Insights
- [What it means]

### Action Items
- [What to change]
```
</reflection_system>

---

<background_consolidation>
## 4.6. Background Consolidation (Quiet Hours: 1-5 AM MST / 08-12 UTC)

**Reference:** `tools/memory-maintenance/SKILL.md`

### Purpose
During quiet hours, consolidate daily notes into long-term MEMORY.md using the structured schema.

### Consolidation Process

1. **Check timing:**
   - Is it quiet hours (1-5 AM MST)?
   - Has consolidation run today? Check `last_consolidation` in state file

2. **If due, run consolidation:**
   - Read: `memory/YYYY-MM-DD.md` (last 2-3 days)
   - Read: `memory/chat/*.md` (last 48 hours)
   - Extract using `memory/MEMORY_SCHEMA.md` format

3. **Extraction checklist:**
   - [ ] New facts about Wes or his world
   - [ ] Preferences (explicit or implicit)
   - [ ] Decisions made with rationale
   - [ ] People mentioned
   - [ ] Project updates
   - [ ] Successful interaction patterns (episodes)

4. **Write structured entries:**
   - Critical/High importance → MEMORY.md
   - Medium/Low importance → memory/facts/*.md
   - Episodes → memory/episodes/YYYY-MM.md

5. **Update state:**
   ```json
   "memory_maintenance": {
     "last_consolidation": "2026-01-28T09:00:00Z"
   }
   ```
</background_consolidation>

---

<memory_decay>
## 4.7. Memory Decay & Archival (Weekly/Monthly)

**Reference:** `tools/memory-maintenance/SKILL.md`

### Decay Rules

| Condition | Action |
|-----------|--------|
| Not accessed in 30+ days + low importance | Flag for review |
| Not accessed in 30+ days + medium importance | Demote to low |
| Not accessed in 60+ days + any importance | Archive candidate |
| Superseded by newer info | Archive old, keep new |

### Weekly Decay Check (Sundays, during improvement review)

1. **Scan MEMORY.md:**
   - Find entries where `last_accessed` > 30 days ago
   - List candidates with their importance levels

2. **For each candidate, ask:**
   - "If I forgot this, would it matter?"
   - "Has this been superseded?"
   - "Is this still accurate?"

3. **Apply actions:**
   - **Keep:** Update `last_accessed`, maybe boost importance
   - **Demote:** Lower importance level
   - **Archive:** Move to `memory/archive/YYYY-MM.md`
   - **Delete:** Remove (only for low-value, confirmed obsolete)

### Monthly Prune (1st of month, quiet hours)

1. **Full MEMORY.md audit:**
   - Count total entries
   - Identify stale entries (no access 30+ days)
   - Check for duplicates

2. **Execute pruning:**
   - Archive stale medium/low entries
   - Merge duplicates
   - Update importance based on access patterns

3. **Log results:**
   - Record in daily notes: "Pruned X entries, archived Y"
   - Update `last_prune` in state file

### Never Decay
- **critical** importance memories
- User identity information
- Safety/security memories
- Memories < 14 days old

### Archive Location
```
memory/archive/
└── YYYY-MM.md  ← Monthly archive files
```
</memory_decay>

---

## 5. Chat Pruning (Daily, during quiet hours)
- Delete `memory/chat/` files older than 7 days
- Log pruning to today's daily notes

## 5.5. 2nd Brain Documentation (Every Session End)
After significant conversations, update the 2nd Brain:
- **Daily Journal**: Write/update `second-brain/journals/YYYY-MM-DD.md` with high-level summary
- **Concepts**: If we explored an important topic deeply, create `second-brain/concepts/[topic].md`
- **Insights**: Capture actionable ideas in `second-brain/insights/[insight].md`

Format: Clean markdown with headers, meant for reading in the 2nd Brain app.

---

## 6. Proactive Work
- During quiet hours, work on KANBAN.md backlog items
- Update KANBAN.md with progress
- Create PRs, don't push live

---

<thread_tracking>
## 7. 📋 Thread & Commitment Tracking (Every Heartbeat)

**Reference:** `tools/thread-tracker/SKILL.md`

### Quick Thread Check
- [ ] Any pending commitments from last conversation?
- [ ] Any overdue items (promised but not delivered)?
- [ ] Any open loops that need closing?

### In Daily Notes, Maintain
```markdown
## Active Threads
### Promised Actions
- [ ] [Action] - promised [when] - status: [pending/done]

### Pending Questions  
- [ ] [Question asked but not addressed]

### Open Loops
- [ ] [Investigation/task in progress]
```

### Carry Forward
Before ending any session, check threads and carry forward to next daily note.
</thread_tracking>

---

<feedback_processing>
## 8. 📊 Feedback Processing (Every 4-6 hours)

**Reference:** `tools/feedback-loop/SKILL.md`

### Scan Recent Conversations For
- Explicit corrections ("actually...", "no...", "that's wrong")
- Implicit frustration (rephrasing, short responses)
- Positive signals ("perfect!", enthusiasm, expansion)

### When Corrections Found
Log in daily notes:
```markdown
## Corrections Today
- [Time]: User corrected [X] to [Y]
  - Why I was wrong: [analysis]
  - Learning: [what to do differently]
  - Pattern: [recurring? first time?]
```

### Update Preferences
If feedback reveals preferences, update USER.md:
```markdown
## Preference: [Name]
- Evidence: [feedback received]
- Confidence: [low/medium/high]
```
</feedback_processing>

---

<improvement>
## 9. 🧠 Daily Improvement (Once per day, ~3-4 AM MST)

**Reference:** `tools/continuous-learning/SKILL.md`, `tools/skill-quality/SKILL.md`

### Quick Daily Review
- [ ] Check `memory/mistakes.md` - any new lessons to add?
- [ ] Review recent corrections - patterns emerging?
- [ ] Update skill outcome tracking if actions had results
- [ ] Log to `memory/improvement-log.md`

### Learning Capture
Extract from today's interactions:
- New facts learned → `memory/facts/`
- New preferences → USER.md
- Successful patterns → Note in daily file
- Procedures discovered → `memory/procedures/`

### Self-Contrast Exercise (Weekly)
For recent decisions, ask:
- **What would I have done differently if optimizing for BEST outcome?**
- **What would I have done if trying to AVOID worst outcome?**
- **Where did my actual choice fall? Was that right?**

### Weekly Deep Review (Sundays)
- [ ] Consolidate daily notes → MEMORY.md
- [ ] Review low-confidence preferences (decay or promote)
- [ ] Check mistake patterns (recurring issues?)
- [ ] Update skill approaches based on outcomes
- [ ] Clean completed items from KANBAN.md
- [ ] Generate skill quality report (see `tools/skill-quality/SKILL.md`)
- [ ] Run feedback pattern analysis
</improvement>

---

<focus_check>
## 10. 🎯 Focus & Goal Check (During Active Sessions)

**Reference:** `tools/focus/SKILL.md`

### Every 10-15 Exchanges
Quick check:
- [ ] What is the primary goal of this session?
- [ ] Am I still working toward that goal?
- [ ] Any commitments made that I haven't fulfilled?
- [ ] Any threads left open?

### If Drift Detected
```markdown
[FOCUS CORRECTION]
Was doing: [what I drifted into]
Should be doing: [original goal]
Action: [getting back on track]
```

### Context Budget Awareness
**Reference:** `tools/context-budget/SKILL.md`
- If context feels crowded, summarize and compact
- Keep priority information at start and end
- Drop less relevant middle context first
</focus_check>

---

## Heartbeat State Tracking

Track in `memory/heartbeat-state.json`:
```json
{
  "lastChecks": {
    "reminders": null,
    "chatLog": null,
    "memoryExtraction": null,
    "chatPrune": null
  },
  "lastConversationLogged": null,
  "lastImprovement": {
    "daily": "YYYY-MM-DD",
    "weekly": "YYYY-MM-DD"
  },
  "monitoring": {
    "lastChecks": {
      "system": "timestamp",
      "email": "timestamp",
      "social": "timestamp",
      "business": "timestamp",
      "competitors": "timestamp",
      "calendar": "timestamp"
    }
  }
}
```

---

## Memory Structure

```
memory/
├── chat/                    ← Raw conversation logs (7 days)
│   └── YYYY-MM-DD.md
├── facts/                   ← Structured extracted facts (AUTO-UPDATED)
│   ├── people.md           ← People mentioned + relationships
│   ├── preferences.md      ← User preferences with confidence
│   ├── projects.md         ← Active projects + status
│   ├── decisions.md        ← Key decisions
│   └── ideas.md            ← Ideas to revisit
├── evaluations/             ← Self-evaluation scores (NEW)
│   └── YYYY-MM.md          ← Monthly evaluation logs
├── research/                ← Deep research outputs (NEW)
│   └── *.md                ← Research documents
├── skills/                  ← Skill tracking with outcomes
│   └── *.md    
├── YYYY-MM-DD.md            ← Daily working notes
├── mistakes.md              ← Corrections & lessons learned
├── improvement-log.md       ← Daily improvement tracking
├── agent-learnings.md       ← Cross-agent knowledge sync
├── heartbeat-state.json     ← Tracking state
├── reminders.md             ← Active reminders
└── MEMORY_AGENT_TASK.md     ← Task prompt for memory agent

tools/
├── memory-extraction/       ← Auto-extract memories from convos
├── self-evaluation/         ← Score and track response quality
├── feedback-detection/      ← Detect implicit/explicit feedback
└── [other tools...]
```

---

<quality_protocols>
## 11. ✅ Quality Protocols

### Self-Critique Before Important Outputs
**Reference:** `tools/self-critique/SKILL.md`

For complex or high-stakes responses:
- [ ] Accuracy: Are all facts verifiable?
- [ ] Relevance: Did I answer what was asked?
- [ ] Completeness: Did I miss anything important?
- [ ] Confidence: Am I hedging appropriately?

### Confidence Calibration
**Reference:** `tools/confidence/SKILL.md`

Before stating facts:
- Verified/certain → State directly
- Strong inference → "I believe...", "Likely..."
- Uncertain → "I think...", "Possibly..."
- Don't know → "I don't know"

### Error Recovery
**Reference:** `tools/error-recovery/SKILL.md`

When things fail:
1. Retry with backoff for transient errors
2. Fix input and retry for input errors
3. Try fallback approach for capability issues
4. Escalate with context if all else fails
</quality_protocols>

---

<self_evolution>
## 12. 🧬 Self-Evolution Loop (NEW - Every Session End)

**Reference:** `tools/memory-extraction/SKILL.md`, `tools/self-evaluation/SKILL.md`

### After Every Significant Session

1. **Memory Extraction**
   - Extract facts → `memory/facts/people.md`, `preferences.md`, `projects.md`
   - Extract learnings → daily notes
   - Update relationships → track who was mentioned

2. **Self-Evaluation**
   - Score responses: Accuracy, Helpfulness, Conciseness, Proactivity
   - Log to `memory/evaluations/YYYY-MM.md`
   - Identify patterns (what worked, what didn't)

3. **Feedback Detection**
   - Scan for correction signals ("no", "actually", rephrasing)
   - Scan for satisfaction signals ("perfect", engagement)
   - Update preferences with evidence

4. **Improvement Capture**
   - What should I do differently?
   - What worked well to repeat?
   - Any recurring issues to fix?

### Self-Evolution Metrics

Track in `memory/evaluations/`:
- Session scores over time
- Improvement trends
- Pattern detection
- Areas needing work

### The Loop
```
SESSION → EXTRACT MEMORIES → EVALUATE SELF → DETECT FEEDBACK → IMPROVE
    ↑                                                              ↓
    └──────────────────── APPLY LEARNINGS ←────────────────────────┘
```
</self_evolution>

---

<skill_tracking>
## 13. 📈 Skill Quality Tracking (Weekly)

**Reference:** `tools/skill-quality/SKILL.md`

### Track Per Skill
- Uses this week
- Success rate
- Corrections received
- Patterns noticed

### Weekly Report (Sundays)
```markdown
## Skill Quality Report - Week of [Date]

### Top Performers
1. [Skill]: [X]% success, [N] uses

### Needs Improvement
1. [Skill]: [X]% success - Issue: [pattern]

### Skills Updated
- [Skill] v1.X → v1.Y (addressed [issue])

### Focus for Next Week
- Improve [specific area]
```
</skill_tracking>

---

<critical>
## 🔴 END ANCHOR: Heartbeat Principles

### Core Principles
1. **Self-assess first** — check your context before acting
2. **Quality over quantity** — one good alert > five noisy ones
3. **Learn from patterns** — track what works, avoid repeat mistakes
4. **Refresh memory** — when fuzzy, read the files
5. **Confidence matters** — if uncertain, verify before alerting
6. **Track commitments** — never lose promises or open threads
7. **Continuous learning** — every interaction is a learning opportunity
8. **Self-critique** — check quality before important outputs

### Key References
| System | Skill File |
|--------|------------|
| Memory Extraction | `tools/memory-extraction/SKILL.md` |
| Self-Evaluation | `tools/self-evaluation/SKILL.md` |
| Feedback Detection | `tools/feedback-detection/SKILL.md` |
| Reasoning | `tools/reasoning/SKILL.md` |
| Pattern Detection | `tools/pattern-detection/SKILL.md` |
| Weekly Report | `tools/weekly-report/SKILL.md` |
| Memory | `tools/memory/SKILL.md` |
| Focus | `tools/focus/SKILL.md` |
| Threads | `tools/thread-tracker/SKILL.md` |
| Feedback | `tools/feedback-loop/SKILL.md` |
| Self-Critique | `tools/self-critique/SKILL.md` |
| Confidence | `tools/confidence/SKILL.md` |
| Error Recovery | `tools/error-recovery/SKILL.md` |
| Skill Quality | `tools/skill-quality/SKILL.md` |
| Context Budget | `tools/context-budget/SKILL.md` |
| Continuous Learning | `tools/continuous-learning/SKILL.md` |
| Model Routing | `tools/model-routing/SKILL.md` |

**The goal:** Be the assistant who catches the important stuff, learns continuously, and delivers quality consistently.
</critical>
