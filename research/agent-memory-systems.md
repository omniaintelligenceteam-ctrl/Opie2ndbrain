# Agent Memory Architectures for Long-Running Assistants

> Research compiled: January 2026
> Focus: Practical patterns for file-based memory systems like Clawdbot

---

## Executive Summary

After reviewing MemGPT, LangChain, AutoGPT/BabyAGI, academic papers, and production systems, the key insight is:

**The best memory systems are often application-specific.** There's no one-size-fits-all solution, but there are proven patterns that work.

### Key Takeaways for Clawdbot-Style Systems

1. **File-based memory works** — AutoGPT ditched vector DBs, GitHub Copilot uses file recency
2. **Tiered memory is essential** — separate "hot" (in-context) from "cold" (searchable) storage
3. **Summarization beats accumulation** — recursive summarization prevents unbounded growth
4. **Self-editing memory is powerful** — let the agent update its own memory blocks
5. **Subconscious/async processing wins** — memory formation outside the hot path improves both latency and quality

---

## 1. MemGPT: The OS-Inspired Approach

### Core Architecture

MemGPT treats memory like an operating system manages RAM and disk:

| Component | Analogy | Purpose |
|-----------|---------|---------|
| **Main Context** (prompt) | RAM | Fast, limited, directly accessible |
| **External Context** | Disk | Slow, unlimited, requires explicit retrieval |

**Memory Hierarchy:**
```
┌─────────────────────────────────────────────┐
│  MAIN CONTEXT (in-context, ~limited tokens) │
│  ├── System prompt (read-only)              │
│  ├── Working context (read/write scratchpad)│
│  └── FIFO message queue (recent turns)      │
├─────────────────────────────────────────────┤
│  EXTERNAL CONTEXT (out-of-context)          │
│  ├── Recall storage (searchable history)    │
│  └── Archival storage (vector-based docs)   │
└─────────────────────────────────────────────┘
```

### Key Mechanisms

1. **Virtual Context Management**: Creates illusion of infinite memory via intelligent paging
2. **Self-Directed Memory**: LLM issues function calls to manage its own memory (store, retrieve, summarize, update)
3. **Event-Driven Write-Back**: Memory pressure triggers summarization/eviction (e.g., at 70% capacity)
4. **Heartbeats**: Multi-step reasoning via `request_heartbeat=true` flag

### MemGPT Performance (from paper)

| Model | Deep Memory Retrieval | ROUGE-L |
|-------|----------------------|---------|
| GPT-4 baseline | 32.1% | 0.296 |
| GPT-4 + MemGPT | **92.5%** | **0.814** |

### Tradeoffs

✅ **Pros:**
- Elegant abstraction of context limits
- Autonomous memory management
- Works with any function-calling LLM

❌ **Cons:**
- Single-agent overhead (memory ops consume cognitive bandwidth)
- Unstructured storage limits relational queries
- All reasoning + memory management = one busy agent

### Relevance to Clawdbot

MemGPT's architecture validates Clawdbot's approach:
- **Core memory (persona + user info)** → Similar to SOUL.md + USER.md
- **Working context** → memory/YYYY-MM-DD.md daily notes
- **Archival storage** → memory/chat/*.md logs
- **Self-editing** → Agent updating MEMORY.md

---

## 2. LangChain Memory Approaches

### Memory Types Comparison

| Type | How It Works | Use Case | Drawback |
|------|--------------|----------|----------|
| **ConversationBufferMemory** | Stores entire history | Short conversations | Hits context limits fast |
| **ConversationBufferWindowMemory** | Last K messages only | Long conversations | Forgets early context |
| **ConversationSummaryMemory** | Summarizes history | Token efficiency | Loses detail |
| **ConversationSummaryBufferMemory** | Hybrid: recent + summary | Best of both | More complex |
| **ConversationEntityMemory** | Extracts entities/facts | Knowledge tracking | Extraction quality varies |
| **ConversationKGMemory** | Builds knowledge graph | Relational queries | Complex to maintain |

### The Modern Approach: LangMem

LangChain's newer `langmem` library introduces better patterns:

#### Memory Types (Human-Inspired)

1. **Semantic Memory** (Facts/Knowledge)
   - **Collections**: Unbounded fact storage with semantic search
   - **Profiles**: Structured schemas (e.g., UserProfile) that get updated, not appended

2. **Episodic Memory** (Past Experiences)
   - Captures observation → thoughts → action → result
   - Great for learning from successful interactions

3. **Procedural Memory** (System Behavior)
   - Starts with system prompts
   - Evolves through feedback (prompt optimization)

#### Memory Formation Patterns

| Formation Type | When | Latency Impact | Best For |
|----------------|------|----------------|----------|
| **Conscious (Hot Path)** | During conversation | Higher | Critical updates |
| **Subconscious (Background)** | After conversation | None | Pattern extraction |

**Key Insight**: Background memory formation is often superior — it doesn't slow down responses and allows deeper pattern analysis.

### Relevance to Clawdbot

LangChain's evolution validates several Clawdbot patterns:
- **Profiles over collections** for user/persona data
- **Background processing** for memory consolidation
- **Structured schemas** vs. free-form text

---

## 3. AutoGPT/BabyAGI: Lessons Learned

### The Vector DB Pivot

**Surprising finding: AutoGPT dropped all vector database support** (Pinecone, Milvus, Redis, Weaviate).

Why? Vector DBs were "overkill":

```
LLM inference: ~10 seconds per call
100K memories accumulated after: ~11.57 days of continuous operation
Numpy dot product on 100K vectors: ~70ms

Cost to reach 100K memories: ~$27,000 in API calls
```

**Conclusion**: Simple brute-force similarity (numpy dot) is fast enough for realistic agent workloads.

### Current AutoGPT Approach

- **JSON files** as default memory storage
- **np.dot()** for similarity search
- **Focus on multi-agent collaboration** instead of single omniscient agent

### BabyAGI Pattern

```
Goal → Task Generation → Task Execution → Result Storage → Task Prioritization → Loop
```

Uses vector DB (Pinecone) for:
- Embedding task results
- Retrieving relevant prior outcomes for new tasks

### What Coding Agents Use Instead

| Agent | Memory Approach |
|-------|-----------------|
| GitHub Copilot | File recency, open tabs, code references |
| GPT Pilot | Multi-agent with specialized roles |
| GPT Engineer | File system proximity |

**Key Insight**: Context relevance often beats semantic similarity. Recent files, references, and structure matter more than embedding distance.

### Relevance to Clawdbot

- **File-based is validated** — simple JSON/markdown works
- **Recency matters** — last 7 days of chat logs, yesterday's notes
- **Multi-agent helps** — subagents with focused tasks

---

## 4. Academic Patterns Worth Knowing

### Generative Agents (Stanford, Park et al. 2023)

The "Smallville" paper introduced key concepts now widely adopted:

#### Memory Stream Architecture

1. **Observation**: Raw perceptions stored with timestamp
2. **Retrieval**: Scored by recency × importance × relevance
3. **Reflection**: Higher-level abstractions from observations
4. **Planning**: Future actions derived from reflections

#### Retrieval Formula

```
score = α * recency + β * importance + γ * relevance

recency = exponential_decay(time_since_access)
importance = LLM_scored(1-10 scale)
relevance = cosine_similarity(query, memory_embedding)
```

#### Reflection Trigger

Reflections generated when `sum(recent_importance_scores) > threshold`

In practice: ~2-3 reflections per simulated day

#### Example Reflection Chain

```
Observations:
- "Klaus Mueller is reading a book on gentrification"
- "Klaus Mueller is conversing with librarian about research"

Generated Question: "What topic is Klaus Mueller passionate about?"

Reflection: "Klaus is deeply interested in urban development issues"
```

### Mem0: Production-Ready Architecture (2025)

State-of-the-art results on LOCOMO benchmark:

| Metric | Improvement |
|--------|-------------|
| Response accuracy | +26% vs OpenAI memory |
| P95 latency | 91% lower vs full-context |
| Token usage | 90% savings |

**Core approach:**
1. Dynamically extract salient information
2. Consolidate/deduplicate across sessions
3. Retrieve only what's relevant

**Mem0ᵍ variant**: Graph-based storage for multi-session relationships

### MemR³: Reflective Retrieval (2025)

Memory Retrieval via Reflective Reasoning:
- Agent reflects before retrieving
- Outperforms standard RAG by +7.29%
- Shows agentic retrieval beats passive search

---

## 5. Production Patterns That Work

### OpenAI ChatGPT Memory

**Architecture:**
- **Saved Memories**: ~1-2 pages of accumulated facts (prepended to every prompt)
- **Chat History RAG**: Semantic search across all past conversations

**Formation:**
- Explicit: "Remember that I live in SF"
- Automatic: Background classifiers extract salient info

**Tradeoff**: Great for consumers, risky for enterprise (context leakage risk)

### Claude Memory (Anthropic)

**Architecture:**
- **Project Memory**: Isolated summaries per project
- **CLAUDE.md Pattern**: File-based context injection, version-controlled

**Formation:**
- Mostly user-curated
- Explicit updates requested by user
- Search tools scoped to current project

**Tradeoff**: High control, high manual effort, excellent for professional work

### Comparison Matrix

| System | Automation | Control | Isolation | Best For |
|--------|------------|---------|-----------|----------|
| OpenAI | High | Low | None | Consumers |
| Claude | Low | High | Strong | Professionals |
| MemGPT | High | Medium | Configurable | Developers |
| Mem0 | High | Medium | Configurable | Production |
| Clawdbot | Medium | High | By design | Personal assistant |

---

## 6. Recommendations for File-Based Systems

### What Clawdbot Already Does Right

1. **Hierarchical memory structure** (context window → chat logs → memory.md)
2. **Daily notes pattern** (working memory that gets reviewed)
3. **File-based persistence** (simple, auditable, version-controllable)
4. **Self-editing capability** (agent updates its own files)
5. **Multi-session support** (separate subagent contexts)

### Suggested Enhancements

#### 1. Structured Memory Blocks

Instead of free-form MEMORY.md, consider structured sections:

```markdown
## User Profile
- name: Wes
- preferences: casual tone, technical depth
- current_projects: [list]

## Active Context
- current_focus: memory architecture research
- recent_decisions: [list]

## Learned Patterns
- when_user_says_X_they_usually_mean_Y: [patterns]
```

#### 2. Importance Scoring

When saving memories, tag importance:

```markdown
## Memory: Project deadline
- importance: HIGH
- context: Wes mentioned this 3x
- expires: 2026-02-15
```

#### 3. Reflection Triggers

Implement periodic reflection:
- After N messages
- At session end
- On heartbeat when idle

Reflection prompt:
```
Given recent interactions, what patterns or insights should I remember?
What outdated information should I update or remove?
```

#### 4. Tiered Retrieval

```
1. Always load: SOUL.md, USER.md, today's notes
2. Load on session start: MEMORY.md, yesterday's notes
3. Search on demand: chat logs (last 7d), archived notes
4. Deep search: older archives, project-specific docs
```

#### 5. Memory Consolidation (Sleep-Time Compute)

Background process to:
- Summarize verbose chat logs
- Extract recurring patterns
- Update user profile
- Archive stale information

#### 6. Graph-Based Relationships (Optional)

For complex relationship tracking:

```markdown
## Relationships
- Wes → works_on → Clawdbot
- Wes → interested_in → AI agents
- Clawdbot → uses → file-based memory
```

---

## 7. Novel Techniques Worth Trying

### 1. Subconscious Memory Formation

Don't update memory during conversation. Instead:
- Log everything
- After conversation ends, run a "memory extraction" pass
- Update memory files asynchronously

**Why**: Better quality, no latency hit, can use bigger models

### 2. Memory Decay with Reinforcement

Memories that get retrieved/referenced → boost importance
Memories never accessed → decay over time
Implement with access timestamps + exponential decay

### 3. Contrastive Memory Updates

When new info conflicts with old:
- Don't just overwrite
- Create "updated" entry with reason
- Maintain audit trail

```markdown
## Memory Update: User timezone
- old: PST
- new: EST
- reason: User mentioned moving to NYC (2026-01-15)
```

### 4. Episodic Few-Shot Learning

Store successful interaction patterns:

```markdown
## Episode: Explaining technical concepts
- situation: User asked about recursion
- approach: Used metaphor (explorer in treehouse)
- result: User understood, thanked for clarity
- lesson: Metaphors work well for abstract concepts
```

Then retrieve similar episodes when facing similar situations.

### 5. Memory-Aware Prompting

Include memory metadata in prompts:

```
You have access to:
- 47 stored facts about user
- 12 recent conversations
- 3 active projects being tracked

Your confidence in user preferences: HIGH (updated 2 days ago)
```

---

## Summary: What Actually Works

### Patterns with Strong Evidence

| Pattern | Evidence | Complexity |
|---------|----------|------------|
| Tiered memory (hot/cold) | MemGPT, all production systems | Low |
| Recursive summarization | LangChain, Claude, GPT-4 | Medium |
| Self-editing memory | MemGPT, Letta | Low |
| Background memory formation | LangMem, sleep-time compute | Medium |
| File/JSON over vector DB | AutoGPT, GitHub Copilot | Low |
| Importance scoring | Generative Agents | Medium |
| Reflection generation | Stanford paper, Mem0 | Medium |

### Avoid

- Over-engineering with vector DBs for small-scale use
- Single-agent trying to do everything
- Unbounded memory accumulation
- Hot-path memory updates that slow responses

### Start Simple, Add Complexity When Needed

1. **Week 1**: Structured daily notes + user profile
2. **Week 2**: Add importance tags and decay
3. **Week 3**: Implement background consolidation
4. **Week 4**: Add episodic learning if patterns emerge

---

## References

1. [MemGPT Paper](https://arxiv.org/abs/2310.08560) - Packer et al., 2023
2. [Generative Agents Paper](https://arxiv.org/abs/2304.03442) - Park et al., 2023
3. [Mem0 Paper](https://arxiv.org/abs/2504.19413) - Chhikara et al., 2025
4. [LangMem Docs](https://langchain-ai.github.io/langmem/concepts/conceptual_guide/)
5. [Letta/MemGPT Docs](https://docs.letta.com/concepts/memgpt/)
6. [Why AutoGPT Ditched Vector DBs](https://dariuszsemba.com/blog/why-autogpt-engineers-ditched-vector-databases/)
7. [Design Patterns for LLM Memory](https://serokell.io/blog/design-patterns-for-long-term-memory-in-llm-powered-architectures)

---

*This research document is a living reference. Update as new patterns emerge.*
