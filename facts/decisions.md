# Decisions Log

Key decisions made, with context and rationale.

## Format
```
### [Decision Title]
- **Date:** YYYY-MM-DD
- **Context:** Why this came up
- **Decision:** What was decided
- **Rationale:** Why this choice
- **Status:** active/superseded/revisit
```

---

## Technical Decisions

### Memory Persistence System
- **Date:** 2026-01-28
- **Context:** Context compaction was causing memory loss
- **Decision:** Three-tier memory system (chat logs → daily notes → MEMORY.md)
- **Rationale:** Based on research of Letta/MemGPT, Mem0 — simple approaches beat complex ones
- **Status:** active

### Structured Fact Extraction
- **Date:** 2026-01-28
- **Context:** Building on memory persistence system
- **Decision:** Create categorized memory files (people, decisions, preferences, projects, ideas)
- **Rationale:** Atomic facts are easier to search and maintain than raw logs
- **Status:** active

---

## Business Decisions

*(None yet)*

---

## Product Decisions

*(None yet)*

---

*Auto-updated by memory extraction agent*
