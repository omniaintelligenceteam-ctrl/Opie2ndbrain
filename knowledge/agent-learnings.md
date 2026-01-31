# Agent Learnings

When subagents complete tasks, they should debrief with learnings that get synced here.

---

## Format
```
### [Date] - [Agent Type] - [Task Summary]
- **Finding:** What was learned
- **Applicable To:** Future similar situations
- **Synced To:** Which file updated (or "pending")
```

---

## Learnings Log

### 2026-01-28 - Research Agent - Memory System Design
- **Finding:** File-based memory with structured extraction beats complex databases for small-scale personal AI
- **Applicable To:** Architecture decisions, tool selection
- **Synced To:** memory/research/MEMORY_IMPROVEMENT_PLAN.md

### 2026-01-28 - Research Agent - Memory System Design
- **Finding:** Mistake tracking with generalized lessons is more valuable than raw correction logs
- **Applicable To:** Learning from feedback, preventing repeated errors
- **Synced To:** memory/mistakes.md (system created)

### 2026-01-28 - Research Agent - Memory System Design
- **Finding:** Confidence scoring on preferences prevents false certainty from single mentions
- **Applicable To:** Preference tracking, decision making
- **Synced To:** memory/facts/preferences.md (format enhanced)

### 2026-01-27 - Research/Testing - AI Mockup Quality
- **Finding:** Gemini 2.0 Flash hallucinations when adding lights (trees grow, unwanted elements)
- **Applicable To:** Image generation pipeline decisions
- **Synced To:** MEMORY.md

### 2026-01-27 - Research/Testing - AI Mockup Quality
- **Finding:** Smart pipeline (Claude analysis → detailed prompt → Gemini) produces better results
- **Applicable To:** Multi-model workflows
- **Synced To:** MEMORY.md

---

## Pending Sync (Main agent should process these)

*None currently*

---

## Debrief Template for Subagents

Include this in your final output:
```markdown
## Agent Debrief

### Task Completed
[What was done]

### Key Findings
[Important discoveries - what would help future similar tasks?]

### Lessons for Future
[Generalizable insights]

### Suggested Memory Updates
- Fact files to update: [list]
- Skills to update: [list]
- Mistakes to log: [list if any]
```

---

*Created: 2026-01-28*
