# Ideas Backlog

Ideas discussed that might be worth revisiting.

## Format
```
### [Idea Title]
- **Date:** YYYY-MM-DD
- **Context:** Where this came from
- **Description:** What the idea is
- **Status:** new/exploring/parked/implemented/rejected
- **Next step:** (if any)
```

---

## Product Ideas

*(None yet)*

---

## Technical Ideas

### Two-Pass Vision for AI Mockups
- **Date:** 2026-01-25
- **Context:** AI mockup accuracy issues
- **Description:** Use Claude for analysis/planning, then Gemini for generation
- **Status:** exploring
- **Next step:** Continue testing different models

### Memory Extraction Agent
- **Date:** 2026-01-28
- **Context:** Building memory persistence
- **Description:** Spawn dedicated agent during heartbeats to process memories
- **Status:** implemented (manual extraction works, subagent spawn blocked by gateway auth)
- **Next step:** Debug gateway remote.token mismatch — config updated but still failing after restart

### Memory Decay / Relevance Scoring
- **Date:** 2026-01-28
- **Context:** Memory persistence improvements
- **Description:** Older facts decay in relevance unless reinforced by repetition
- **Status:** proposed
- **Next step:** Consider after core system is stable

### Cross-Session Pattern Detection
- **Date:** 2026-01-28
- **Context:** Memory persistence improvements
- **Description:** Detect patterns across conversations (recurring topics, sentiment shifts)
- **Status:** proposed
- **Next step:** Consider after core system is stable

### Semantic Search on Startup
- **Date:** 2026-01-28
- **Context:** Memory persistence improvements
- **Description:** When waking up fresh, use memory_search to find context relevant to incoming message
- **Status:** proposed
- **Next step:** Implement after core system is stable

---

## Business Ideas

*(None yet)*

---

*Auto-updated by memory extraction agent*
