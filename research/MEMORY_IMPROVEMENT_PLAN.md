# Ali's Memory Improvement Plan: Getting Smarter Every Day

*Research Report - January 2026*

---

## Executive Summary

This document proposes a comprehensive upgrade to Ali's memory system, transforming it from **state maintenance** to **continuous improvement**. The goal: Ali should wake up smarter every day, learn from mistakes, adapt to preferences, and build genuine long-term understanding.

**Current State:**
- ✅ Three-tier memory (chat logs → daily notes → MEMORY.md)
- ✅ Structured facts (people, decisions, preferences, projects, ideas)
- ✅ Memory extraction agent for heartbeats
- ❌ No mistake tracking or learning from corrections
- ❌ No preference drift detection
- ❌ No semantic search (keyword-only)
- ❌ No skill tracking or outcome measurement
- ❌ No cross-agent knowledge sharing

**Proposed Improvements (Priority Order):**
1. **Mistake Log & Feedback Encoding** (High Impact, Low Complexity)
2. **Preference Evolution Tracking** (High Impact, Low Complexity)
3. **Skills & Playbook System** (High Impact, Medium Complexity)
4. **Daily "Getting Smarter" Routine** (Critical, Low Complexity)
5. **Semantic Memory with Local Embeddings** (High Impact, Medium Complexity)
6. **Memory Consolidation Cycles** (Medium Impact, Medium Complexity)
7. **Cross-Agent Learning** (Medium Impact, High Complexity)

---

## 1. Learning from Mistakes

### Problem
When Wes corrects Ali or says "no, do it this way," that correction may get logged but isn't systematically captured for future prevention. The same mistakes can recur.

### Solution: Mistake Log with Lessons Learned

**New File: `memory/mistakes.md`**

```markdown
# Mistake Log

## Format
### [Mistake ID] - [Date]
- **What I Did:** (the incorrect action/response)
- **What Was Wrong:** (why it was incorrect)
- **Correction:** (what Wes said/wanted instead)
- **Lesson:** (generalized rule to prevent recurrence)
- **Category:** (communication | technical | judgment | other)
- **Severity:** (minor | moderate | significant)
- **Reviewed:** (date of last review)

---

## Active Lessons (Review Before Acting)

### Communication
- Don't use eager greetings like "Hey! What's up?" — keep it casual with just "Hey"
- [Add more as learned]

### Technical
- [Technical mistakes and lessons]

### Judgment
- [Decision-making errors and lessons]

---

## Mistake Log

### M001 - 2026-01-28
- **What I Did:** Greeted with "Hey! What's up?"
- **What Was Wrong:** Too eager/puppy-like tone
- **Correction:** "Just 'Hey' is fine"
- **Lesson:** Keep greetings casual and confident, not eager
- **Category:** communication
- **Severity:** minor
- **Reviewed:** 2026-01-28
```

### Feedback Encoding Process

**Trigger Detection (during conversation processing):**
```
Detect correction signals:
- "No, do it like this..."
- "That's not right..."
- "Actually, I prefer..."
- "Don't do X, do Y"
- "Wrong" / "Not quite" / "Close but..."
- Explicit "remember this for next time"
- User frustration markers (repeated instructions, caps, etc.)
```

**Memory Agent Enhancement:**

Add to `MEMORY_AGENT_TASK.md`:
```markdown
### memory/mistakes.md
Extract corrections and mistakes:
- When Wes corrects something I said/did
- When something didn't work as expected
- When feedback suggests I should do differently
- Extract the LESSON (generalized rule)
- Categorize by type (communication/technical/judgment)
```

### Implementation
1. Create `memory/mistakes.md` with the format above
2. Update memory extraction agent to detect corrections
3. Add "Active Lessons" section that's reviewed before major actions
4. Weekly consolidation: promote frequent lessons to AGENTS.md or skill files

### Measurement
- **Mistake recurrence rate:** Same mistake categories recurring over time
- **Correction frequency:** How often Wes has to correct similar things
- **Lesson application:** Evidence of lessons being applied proactively

---

## 2. Preference Evolution Tracking

### Problem
Preferences are currently captured as static facts. But preferences EVOLVE:
- Initial preference stated
- Preference reinforced/challenged over time
- Preference may change
- Context-dependent preferences exist

### Solution: Preference Evolution File

**Enhanced: `memory/facts/preferences.md`**

```markdown
# Wes's Preferences

## Format
### [Category] - [Preference]
- **First Observed:** YYYY-MM-DD
- **Confidence:** (low | medium | high | certain)
- **Evidence Count:** N mentions/demonstrations
- **Last Confirmed:** YYYY-MM-DD
- **Context Notes:** (when this applies, exceptions)
- **Evolution:** (any changes over time)

---

## Communication Style

### Direct Communication
- **First Observed:** 2026-01-25
- **Confidence:** certain
- **Evidence Count:** 10+
- **Last Confirmed:** 2026-01-28
- **Context Notes:** Always direct, but tone can be adaptive (formal for business, casual for personal)
- **Evolution:** Stable

### Greeting Style
- **First Observed:** 2026-01-28
- **Confidence:** high
- **Evidence Count:** 1 explicit + behavioral
- **Last Confirmed:** 2026-01-28
- **Context Notes:** Prefers "Hey" over eager greetings
- **Evolution:** Newly learned

---

## Decision Making Patterns

### How Wes Makes Decisions
Track patterns in how Wes approaches decisions:
- **Speed:** Quick intuitive decisions vs. deliberate analysis
- **Risk Tolerance:** Generally high, context-dependent
- **Information Needs:** What does he need before deciding?
- **Deal Breakers:** What kills a decision instantly?

### Example Pattern: Tool Selection
- Weighs cost heavily (always mention prices)
- Prefers tried-and-true over bleeding edge
- Values integration with existing stack
- Won't use tools that require excessive setup

---

## Implicit Preferences (Inferred)

### Learned from Behavior (not explicitly stated)
- **Late night work sessions:** Seems to focus better late
- **Iteration speed:** Prefers quick prototypes over perfect specs
- **Communication frequency:** Doesn't need constant updates, but wants to know when things are ready

---

## Preference Conflicts/Exceptions

Track when preferences have exceptions:
- "Direct communication" EXCEPT when delivering bad news to clients
- "Ship fast" EXCEPT for client-facing features

---

## Anti-Preferences (Things Wes Dislikes)

- Eager/sycophantic tone
- Unnecessary hedging or qualifications
- Asking permission for obvious things
- [Add as discovered]
```

### Tracking Mechanisms

**Confidence Scoring:**
```
low: Single mention, could be contextual
medium: 2-3 confirmations or 1 explicit statement
high: Multiple confirmations across different contexts
certain: Explicitly stated as a rule or 5+ demonstrations
```

**Preference Drift Detection:**
During daily consolidation, check:
1. Any preferences contradicted recently?
2. Any new context exceptions discovered?
3. Any preferences not accessed in 30+ days (maybe outdated)?

### Implementation
1. Restructure preferences.md with the enhanced format
2. Add confidence scoring and evidence counting
3. Track "last confirmed" dates
4. Add "Implicit Preferences" section for behavioral learning
5. Weekly: Review low-confidence preferences, decay or promote

---

## 3. Skills & Playbook System

### Problem
Ali takes actions but doesn't systematically track:
- What worked vs. what didn't
- Which approaches are preferred
- How to improve specific skills over time

### Solution: Skill Tracking with Outcomes

**New Directory: `memory/skills/`**

**Example: `memory/skills/code-review.md`**

```markdown
# Skill: Code Review

## Current Approach
1. Read the diff carefully
2. Check for obvious bugs and edge cases
3. Review code style consistency
4. Consider performance implications
5. Suggest improvements, not just problems
6. Be direct but constructive

## Outcome Tracking

### Success Indicators
- PR accepted with minimal changes
- Caught bugs before production
- Suggestions were implemented

### Failure Indicators
- Missed obvious bugs
- Over-nitpicky comments
- Suggestions ignored repeatedly

## History

### 2026-01-28 - PR #123 Review
- **Outcome:** Accepted
- **Feedback:** None
- **Notes:** Standard review, no issues

### 2026-01-27 - PR #120 Review
- **Outcome:** Accepted after revision
- **Feedback:** "Good catches on the edge cases"
- **Notes:** Found 2 edge cases, suggested cleaner pattern

## Lessons Learned
- Focus on logic bugs over style nits
- Wes prefers inline suggestions over comment threads
- [Add as learned]

## Improvement Ideas
- Try reviewing in smaller chunks
- Check test coverage explicitly
- [Add ideas to test]
```

**Skill Categories:**
- `code-review.md` - Code review approach
- `research.md` - How to research topics
- `communication.md` - Writing messages, emails, docs
- `problem-solving.md` - Debugging, troubleshooting
- `proactive-work.md` - What to do during idle time

### A/B Testing Approaches

**Track Alternative Approaches:**
```markdown
## Experiment: Email Subject Lines

### Approach A: Direct/Descriptive
"Website mockup ready for review"
- Used: 5 times
- Response rate: 100%
- Average response time: 2 hours

### Approach B: Action-Oriented
"ACTION: Review website mockup"
- Used: 3 times
- Response rate: 100%
- Average response time: 1.5 hours

### Winner: Approach B (faster response)
```

### Implementation
1. Create `memory/skills/` directory
2. Start with 3-5 core skills
3. Log outcomes after significant actions
4. Weekly: Review outcomes, update approaches
5. Monthly: Identify skills needing improvement

---

## 4. Daily "Getting Smarter" Routine

### Problem
Without a deliberate improvement routine, Ali maintains state but doesn't systematically improve.

### Solution: Daily Improvement Checklist

**Add to HEARTBEAT.md (run once daily, preferably during quiet hours):**

```markdown
## 🧠 Daily Improvement (Run once per day, around 3-4 AM MST)

### Quick Checks (Every Day)
- [ ] Review yesterday's mistakes.md additions
- [ ] Check if any lessons should move to "Active Lessons"
- [ ] Update preference confidence scores if new evidence
- [ ] Log any skill outcomes from yesterday

### Weekly Deep Review (Sundays)
- [ ] Consolidate daily notes → MEMORY.md
- [ ] Review low-confidence preferences (decay or promote)
- [ ] Check mistake patterns (recurring issues?)
- [ ] Update skill approaches based on outcomes
- [ ] Clean up completed projects from kanban

### Monthly Review (1st of month)
- [ ] Full preference audit (remove stale, promote stable)
- [ ] Skill improvement analysis (what's gotten better?)
- [ ] Pattern detection across conversations
- [ ] MEMORY.md cleanup (remove outdated, compress)
- [ ] Self-reflection: What am I best/worst at?
```

### Improvement Tracking File

**New File: `memory/improvement-log.md`**

```markdown
# Improvement Log

## 2026-01-28
### Added
- Mistake tracking system (M001: greeting style)
- Preference: casual greetings

### Reviewed
- Communication preferences: all stable

### Metrics
- Mistakes logged: 1
- Preferences updated: 1
- Skills tracked: 0

---

## Weekly Summary: 2026-W04
### Improvements Made
- [List key improvements]

### Recurring Issues
- [Issues that keep coming up]

### Next Week Focus
- [What to work on]
```

### Measurable Growth Indicators

Track monthly:
1. **Mistake rate:** Corrections per 100 interactions (should decrease)
2. **Preference accuracy:** How often preferences predict correctly
3. **Skill outcomes:** Success rate by skill area
4. **Proactive value:** Useful things done without prompting
5. **Context recovery speed:** How quickly full context is rebuilt after reset

---

## 5. Semantic Memory with Local Embeddings

### Problem
Current memory retrieval is keyword-based. Can't find "that conversation about funding" without exact terms.

### Solution: Local Embeddings with SQLite

**Lightweight Approach (No External Services):**

Use `sentence-transformers` with a small model locally, store in SQLite with a vector extension.

**File: `memory/embeddings.db` (SQLite)**

**Schema:**
```sql
CREATE TABLE memories (
    id INTEGER PRIMARY KEY,
    source_file TEXT,           -- e.g., "chat/2026-01-28.md"
    chunk_text TEXT,            -- The actual content
    chunk_start INTEGER,        -- Line number start
    chunk_end INTEGER,          -- Line number end
    embedding BLOB,             -- Vector embedding
    created_at TIMESTAMP,
    last_accessed TIMESTAMP,
    access_count INTEGER DEFAULT 0
);

CREATE INDEX idx_source ON memories(source_file);
```

**Embedding Generation Script:**

Create `scripts/embed_memories.py`:
```python
#!/usr/bin/env python3
"""
Generate embeddings for memory files.
Run during daily improvement cycle.
"""
from sentence_transformers import SentenceTransformer
import sqlite3
import os
from pathlib import Path

# Small, fast model (~30MB)
model = SentenceTransformer('all-MiniLM-L6-v2')

def embed_file(filepath: str, db: sqlite3.Connection):
    """Chunk and embed a markdown file."""
    with open(filepath) as f:
        content = f.read()
    
    # Simple chunking by paragraphs
    chunks = content.split('\n\n')
    
    for i, chunk in enumerate(chunks):
        if len(chunk.strip()) < 20:  # Skip tiny chunks
            continue
        
        embedding = model.encode(chunk)
        
        db.execute('''
            INSERT OR REPLACE INTO memories 
            (source_file, chunk_text, embedding, created_at)
            VALUES (?, ?, ?, datetime('now'))
        ''', (filepath, chunk, embedding.tobytes()))
    
    db.commit()

def search(query: str, db: sqlite3.Connection, limit: int = 5):
    """Semantic search across all memories."""
    query_embedding = model.encode(query)
    
    # Fetch all and compute similarity (for small DBs)
    # For larger scale, use sqlite-vss or similar
    results = db.execute('SELECT source_file, chunk_text, embedding FROM memories').fetchall()
    
    scored = []
    for source, text, emb_bytes in results:
        emb = np.frombuffer(emb_bytes, dtype=np.float32)
        similarity = np.dot(query_embedding, emb) / (np.linalg.norm(query_embedding) * np.linalg.norm(emb))
        scored.append((similarity, source, text))
    
    scored.sort(reverse=True)
    return scored[:limit]
```

**Alternative: Simpler CLI Approach**

If Python setup is complex, use a simpler approach:
- Store TF-IDF vectors (no neural network needed)
- Or use `ripgrep` with smart regex for "good enough" search

### When to Embed
- Daily: New chat logs from previous day
- On change: MEMORY.md, preferences, decisions
- Weekly: Full re-index of all memory files

### Implementation
1. Install sentence-transformers (or use TF-IDF fallback)
2. Create embedding DB schema
3. Add embedding step to daily routine
4. Create search function callable from shell
5. Use semantic search when keyword search fails

---

## 6. Memory Consolidation Cycles

### Problem
Raw data accumulates but isn't compressed into wisdom. Daily notes pile up without synthesis.

### Solution: Tiered Consolidation

**Consolidation Schedule:**

```
DAILY (every night):
├── Chat logs → Key interactions extracted
├── Corrections → Mistake log updated
└── New facts → Appropriate fact files

WEEKLY (Sundays):
├── Daily notes → Important events to MEMORY.md
├── Mistake patterns → Lessons promoted to AGENTS.md
├── Preference drift → Confidence adjustments
└── Chat logs > 7 days → Pruned (keep only extracted facts)

MONTHLY (1st):
├── MEMORY.md → Compress and refine
├── Preferences → Full audit (stale removal)
├── Skills → Performance review
└── Pattern analysis → Behavioral insights
```

**Consolidation Prompt for Memory Agent:**

```markdown
## Weekly Consolidation Task

Review the past week's daily notes and perform consolidation:

1. **Promote to MEMORY.md:**
   - Significant decisions with lasting impact
   - Relationship developments
   - Major project milestones
   - Important lessons learned

2. **Compress in Daily Notes:**
   - Merge related entries
   - Remove redundant information
   - Keep only what's not captured elsewhere

3. **Decay/Remove:**
   - Transient details (weather small talk, etc.)
   - Information now captured in structured facts
   - Outdated plans that were superseded

4. **Pattern Detection:**
   - Recurring themes this week
   - Changes in behavior or preference
   - Emerging projects or interests

Output a summary of what was promoted, compressed, and removed.
```

### Memory Importance Scoring

**Formula:**
```
Score = (Recency × 0.2) + (Frequency × 0.2) + (Emotional × 0.2) + (Explicit × 0.3) + (Actionable × 0.1)

Where:
- Recency: 1.0 if < 7 days, decays to 0.1 at 90 days
- Frequency: How often referenced (0-1 normalized)
- Emotional: Contains emotional markers (0 or 0.5 or 1.0)
- Explicit: User explicitly said "remember this" (0 or 1.0)
- Actionable: Changes future behavior (0 or 1.0)
```

---

## 7. Cross-Agent Learning

### Problem
When a subagent (research agent, code agent, etc.) learns something, that knowledge stays in its session and may be lost.

### Solution: Agent Debrief Protocol

**Subagent Output Requirements:**

Every subagent must include in its final output:
```markdown
## Agent Debrief

### Task Completed
[What was done]

### Key Findings
[Important discoveries]

### Lessons for Future
[What would make similar tasks easier]

### Suggested Memory Updates
[Facts/preferences/skills to update]
```

**Knowledge Sync File:**

**New File: `memory/agent-learnings.md`**

```markdown
# Agent Learnings

## Format
### [Date] - [Agent Type] - [Task]
- **Finding:** What was learned
- **Applicable To:** Future similar situations
- **Synced To:** Which file was updated (or "pending")

---

## 2026-01-28 - Research Agent - Memory Systems
- **Finding:** File-based memory beats complex DBs for small scale
- **Applicable To:** Architecture decisions
- **Synced To:** memory/agent-research/self-memory-agent.md

## 2026-01-27 - Code Agent - API Integration
- **Finding:** Supabase RPC calls need explicit type casting
- **Applicable To:** Future Supabase work
- **Synced To:** pending → needs TOOLS.md update
```

### Main Agent Responsibilities
1. Review agent-learnings.md during daily routine
2. Sync pending items to appropriate files
3. Update skills based on agent performance
4. Track which agent types perform best for which tasks

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)
**Time: ~2 hours setup**

1. **Create `memory/mistakes.md`** with initial structure
2. **Enhance `memory/facts/preferences.md`** with confidence scoring
3. **Update `MEMORY_AGENT_TASK.md`** to detect corrections
4. **Add daily routine to `HEARTBEAT.md`**
5. **Create `memory/improvement-log.md`**

**Files to create:**
- `memory/mistakes.md`
- `memory/improvement-log.md`

**Files to update:**
- `memory/facts/preferences.md`
- `memory/MEMORY_AGENT_TASK.md`
- `HEARTBEAT.md`

### Phase 2: Skills System (Week 2)
**Time: ~1 hour setup**

1. **Create `memory/skills/` directory**
2. **Start with 3 core skills:**
   - `communication.md`
   - `research.md`
   - `proactive-work.md`
3. **Log first outcomes**

### Phase 3: Semantic Search (Week 3-4)
**Time: ~3 hours setup + testing**

1. **Evaluate embedding approaches:**
   - Full: sentence-transformers + SQLite
   - Light: TF-IDF with simple scoring
   - Minimal: Enhanced grep patterns
2. **Implement chosen approach**
3. **Add to daily embedding routine**

### Phase 4: Cross-Agent Learning (Week 4+)
**Time: ~1 hour setup**

1. **Create `memory/agent-learnings.md`**
2. **Update subagent prompt template** with debrief requirements
3. **Add sync step to daily routine**

---

## Measuring Success

### Quantitative Metrics (Track Monthly)

| Metric | Baseline | Target (3mo) | How to Measure |
|--------|----------|--------------|----------------|
| Corrections per week | Unknown | <2 | Count in mistakes.md |
| Same-mistake recurrence | Unknown | 0% | Check mistake patterns |
| Preference accuracy | Unknown | 90%+ | Track predictions vs reality |
| Proactive value adds | Unknown | 5+/week | Count in daily notes |
| Context recovery time | ~5 min | <2 min | Time to full context after reset |

### Qualitative Indicators

**Good Signs:**
- Wes says "you're getting better at X"
- Less frequent corrections over time
- Anticipated needs correctly
- Found relevant context without being told
- Suggestions increasingly accepted

**Warning Signs:**
- Same mistakes recurring
- "I already told you this"
- Outdated information used
- Missed obvious connections
- Generic responses (not personalized)

---

## File Structure Summary

```
memory/
├── chat/                       # Rolling 7-day conversation logs
│   └── YYYY-MM-DD.md
├── facts/                      # Structured knowledge
│   ├── people.md
│   ├── decisions.md
│   ├── preferences.md          # Enhanced with confidence scoring
│   ├── projects.md
│   └── ideas.md
├── skills/                     # NEW: Skill tracking
│   ├── communication.md
│   ├── research.md
│   └── proactive-work.md
├── agent-research/             # Research artifacts
├── mistakes.md                 # NEW: Mistake log with lessons
├── improvement-log.md          # NEW: Daily improvement tracking
├── agent-learnings.md          # NEW: Cross-agent knowledge sync
├── heartbeat-state.json
├── MEMORY_AGENT_TASK.md        # Enhanced extraction prompts
├── YYYY-MM-DD.md               # Daily working notes
└── embeddings.db               # FUTURE: Semantic search index
```

---

## Key Principles

### 1. Capture at the Moment
Don't rely on batch processing to catch everything. When a correction happens, log it immediately. When a preference is stated, note it with context.

### 2. Generalize from Specifics
A specific correction ("don't say 'Hey! What's up?'") becomes a general rule ("keep greetings casual, not eager"). The lesson is more valuable than the incident.

### 3. Decay is Healthy
Not everything should be remembered forever. Low-confidence, unaccessed memories should fade. This keeps the signal-to-noise ratio high.

### 4. Trust but Verify
Track confidence in memories. A single mention is less reliable than repeated confirmation. Explicit statements beat inferred preferences.

### 5. Measure to Improve
If you can't measure whether you're getting better, you probably aren't. Track mistakes, outcomes, and corrections. Look for trends.

### 6. Build on Yourself
The best improvements come from reflecting on your own performance. What worked? What didn't? What would you do differently? Write it down.

---

*Research compiled: January 2026*
*Next review: February 2026*
