# AI Agent Memory Systems: Research Report

> **Research Date:** 2026-01-31  
> **Purpose:** Improve Opie's memory system (Moltbot/Claude personal assistant)  
> **Current Setup:** File-based markdown memory with heartbeat extraction

---

## Executive Summary

After deep research into state-of-the-art AI agent memory systems, the key finding is that **Opie's current file-based approach is fundamentally sound** — research shows file-based memory with semantic search often outperforms specialized memory tools. The biggest improvements will come from:

1. **Sleep-time compute** — use heartbeats for proactive memory consolidation
2. **Better retrieval scoring** — recency × relevance × importance weighted retrieval
3. **Episodic vs semantic separation** — different storage for "what happened" vs "what I know"
4. **Smarter compression** — recursive summarization with importance preservation

---

## Part 1: State-of-the-Art Memory Architectures

### 1.1 MemGPT/Letta — The OS Approach

**Core Concept:** Treat the LLM context window like RAM, with external storage as "disk."

**Key Architecture:**
```
┌─────────────────────────────────────────────────┐
│  Core Memory (in-context, ~8K tokens)           │
│  • Persona block - who the agent is             │
│  • Human block - info about the user            │
│  • System block - current task state            │
├─────────────────────────────────────────────────┤
│  Recall Memory (conversation history)           │
│  • Full chat history, searchable                │
│  • Auto-persists to disk                        │
├─────────────────────────────────────────────────┤
│  Archival Memory (long-term facts)              │
│  • Vector-indexed knowledge                     │
│  • Agent writes via tool calls                  │
└─────────────────────────────────────────────────┘
```

**Key Innovation: Self-editing memory via tool calling.** The agent uses tools like:
- `core_memory_append()` — add to persona/human blocks
- `core_memory_replace()` — rewrite memory sections
- `archival_memory_insert()` — save to long-term
- `archival_memory_search()` — retrieve from long-term

**Heartbeats:** MemGPT uses `request_heartbeat=true` in tool calls to enable multi-step reasoning — agent can "think again" after each action.

**Relevance to Opie:** ✅ Already using similar principles with MEMORY.md (core) + daily notes (recall) + facts/ (archival)

---

### 1.2 Mem0 — Universal Memory Layer

**Core Concept:** Drop-in memory layer that extracts, stores, and retrieves memories automatically.

**Architecture:**
```python
from mem0 import Memory

memory = Memory()

# Add a conversation → auto-extracts memories
memory.add([
    {"role": "user", "content": "I prefer morning meetings"},
    {"role": "assistant", "content": "Noted! I'll schedule things AM."}
], user_id="wes")

# Search → returns relevant memories
memories = memory.search("when should I schedule?", user_id="wes")
# Returns: ["User prefers morning meetings"]
```

**Key Features:**
- **Automatic extraction:** LLM identifies what's worth remembering
- **Multi-level:** User, Session, Agent state separation
- **Conflict resolution:** New info can update/replace old
- **Hybrid retrieval:** Vector search + graph traversal

**Research Results:** Mem0 claims +26% accuracy over OpenAI Memory, 91% faster, 90% fewer tokens on LOCOMO benchmark.

**Relevance to Opie:** 💡 The automatic extraction approach is worth adopting — currently Opie relies on manual "remember this" triggers + heartbeat extraction.

---

### 1.3 LangChain Memory Types

LangChain provides multiple memory patterns:

| Type | What It Does | Use Case |
|------|--------------|----------|
| `ConversationBufferMemory` | Stores all messages | Short conversations |
| `ConversationSummaryMemory` | Summarizes history | Long conversations |
| `ConversationSummaryBufferMemory` | Recent = full, old = summary | Best of both |
| `VectorStoreRetrieverMemory` | Semantic search over history | Large histories |
| `EntityMemory` | Tracks mentioned entities | People/project tracking |

**Best Practice:** `ConversationSummaryBufferMemory` — keeps recent 5-7 turns in full, summarizes everything older.

**Relevance to Opie:** 💡 Chat logs should use this pattern — full recent logs + compressed older summaries.

---

### 1.4 Zep — Temporal Knowledge Graph

**Core Innovation:** Memory with temporal validity (when facts were true).

```
Alice --[manages: 2023-06-01 to 2024-01-15]--> Team A
Alice --[manages: 2024-01-16 to present]--> Team B
```

**Key Features:**
- **Graphiti engine:** Builds knowledge graphs from conversations
- **Temporal reasoning:** "Who managed this team when X happened?"
- **Facts with timestamps:** valid_at, invalid_at fields
- **Continuous learning:** Updates graph as new info arrives

**Relevance to Opie:** 💡 Tracking WHEN facts were learned and when they changed would help with stale memory detection.

---

### 1.5 Sleep-Time Compute (Letta 2025)

**Core Concept:** Use idle time (between interactions) for memory processing.

**Traditional MemGPT:**
```
User message → Memory ops + Response → Wait...
                    ↓
            (memory management blocks response)
```

**Sleep-Time Enhanced:**
```
User message → Response (fast)
                 ↓
         [Sleep-time agent runs in background]
                 ↓
         - Consolidates memories
         - Reorganizes knowledge
         - Pre-computes useful context
         - Improves memory quality
```

**Key Insight:** Memory quality improves when you give a dedicated "sleep-time agent" time to reflect and consolidate, rather than trying to manage memory during conversation.

**Research Results:** Pareto improvement — better memory quality AND lower latency.

**Relevance to Opie:** ✅✅ **HIGH PRIORITY** — Opie's heartbeats ARE sleep-time compute. Should be used more aggressively for memory consolidation.

---

## Part 2: Memory Retrieval Techniques

### 2.1 The Stanford Generative Agents Formula

The seminal "Generative Agents" paper (Park et al., 2023) introduced the standard retrieval scoring:

```
score = α(recency) + β(importance) + γ(relevance)

Where:
- recency: exponential_decay(hours_since_access)
- importance: LLM-scored 1-10 based on content
- relevance: semantic_similarity(query, memory)

Default weights: α=1.0, β=1.0, γ=1.0 (normalized)
```

**Implementation:**
```python
def retrieve_memories(query, memories, top_k=5):
    scores = []
    for m in memories:
        recency = math.exp(-0.99 * hours_since(m.last_access))
        importance = m.importance_score / 10.0
        relevance = cosine_similarity(embed(query), m.embedding)
        
        score = recency + importance + relevance
        scores.append((m, score))
    
    return sorted(scores, key=lambda x: x[1], reverse=True)[:top_k]
```

**Enhancement from MemoryBank paper:** Add recall frequency:
```
score = α(recency) + β(importance) + γ(relevance) + δ(frequency)

Where frequency = log(access_count + 1) / log_max
```

**Relevance to Opie:** ✅ Already have this formula in MEMORY_SCHEMA.md — but not implemented in code.

---

### 2.2 Hybrid Retrieval: Vector + Keyword + Graph

**Best practice: Layer multiple retrieval methods:**

```
Query: "What did we decide about pricing?"
                    │
    ┌───────────────┼───────────────┐
    ▼               ▼               ▼
[Semantic]      [Keyword]       [Graph]
 vector DB       grep/BM25     entity links
    │               │               │
    ▼               ▼               ▼
 "pricing         "pricing"      "pricing" →
  decisions"       matches        "Omnia" →
                                  "decisions"
    │               │               │
    └───────────────┴───────────────┘
                    │
                    ▼
           [Rank & Merge]
                    │
                    ▼
            Top-K Results
```

**Key Finding from Letta Benchmarks:** Simple filesystem tools (grep, semantic search) often outperform specialized memory tools because:
1. Agents are better at using familiar tools (more training data)
2. Iterative search beats single-shot retrieval
3. Agent can reformulate queries dynamically

**Relevance to Opie:** ✅ Current grep + file reading approach is solid. Could add semantic search layer.

---

### 2.3 Multi-Hop Retrieval

For complex queries that require connecting dots:

```python
# Query: "Who worked on projects related to what Alice mentioned about pricing?"

# Hop 1: Find Alice mentions
alice_mentions = search("Alice mentioned pricing")

# Hop 2: Extract entities from results
projects = extract_entities(alice_mentions, type="project")

# Hop 3: Find people connected to those projects
people = []
for project in projects:
    people.extend(graph.query(f"MATCH (p:Person)-[:WORKED_ON]->({project})"))

# Return connected information
return people
```

**Relevance to Opie:** 💡 Could implement via knowledge-graph.md relationships.

---

## Part 3: Memory Consolidation Strategies

### 3.1 Hierarchical Summarization

**Pattern: Compress at multiple time scales:**

```
Raw Conversations (7 days)
        │
        ▼ (daily)
Daily Summaries
        │
        ▼ (weekly)
Weekly Digests
        │
        ▼ (monthly)
Monthly Reviews
        │
        ▼ (yearly)
Permanent Memory
```

**Implementation:**
```python
def consolidate_daily(date):
    # Get all chat logs from date
    chats = read_chat_logs(date)
    
    # Extract key facts, decisions, episodes
    facts = llm_extract("Extract facts from: " + chats)
    decisions = llm_extract("Extract decisions from: " + chats)
    episodes = llm_extract("Extract notable events from: " + chats)
    
    # Update structured memory
    update_facts_md(facts)
    update_decisions_md(decisions)
    update_episodes_md(episodes)
    
    # Create daily summary
    write_daily_summary(date, facts + decisions + episodes)
    
    # Optionally prune raw logs after extraction
    if date < today - 7:
        archive_and_prune(date)
```

**Relevance to Opie:** ⚠️ Currently has the structure but consolidation isn't automated.

---

### 3.2 Importance Scoring for Retention

**What to keep vs. forget:**

| Keep (High Importance) | Forget (Low Importance) |
|------------------------|------------------------|
| User preferences | Casual greetings |
| Decisions with rationale | Repeated questions |
| Error corrections | Implementation details |
| Project milestones | Temporary debugging |
| Relationship dynamics | One-off jokes |

**Scoring Heuristics:**
```python
def score_importance(memory):
    score = 0
    
    # Content signals
    if contains_decision(memory): score += 3
    if contains_preference(memory): score += 3
    if contains_correction(memory): score += 2
    if contains_emotion(memory): score += 1
    
    # Usage signals
    score += min(memory.access_count / 5, 2)  # Max 2 points
    
    # Recency penalty for low-use memories
    days_stale = (today - memory.last_access).days
    if memory.access_count < 3 and days_stale > 14:
        score -= 2
    
    return max(0, min(10, score))
```

**Relevance to Opie:** 💡 Should implement importance scoring during heartbeat fact extraction.

---

### 3.3 Forgetting Curve Implementation

**Based on Ebbinghaus forgetting curve + spaced repetition:**

```python
def decay_probability(memory, days_since_access, access_count):
    """
    Returns probability this memory should be retained.
    Based on: P(recall) = e^(-t/S) where S = strength
    """
    # Base strength from access pattern
    strength = math.log(access_count + 1) * 10
    
    # Importance multiplier
    importance_mult = {
        'critical': 100,  # Never forgets
        'high': 10,
        'medium': 5,
        'low': 1
    }[memory.importance]
    
    # Calculate retention probability
    effective_strength = strength * importance_mult
    retention_prob = math.exp(-days_since_access / effective_strength)
    
    return retention_prob

# During consolidation:
for memory in all_memories:
    if memory.importance == 'critical':
        continue  # Never decay
    
    prob = decay_probability(memory, days_stale, access_count)
    if prob < 0.3:  # Below threshold
        flag_for_review(memory)  # Don't auto-delete, review first
```

**Relevance to Opie:** 💡 Implement as part of weekly maintenance heartbeat.

---

## Part 4: Episodic vs Semantic Memory Separation

### 4.1 The Distinction

| Episodic Memory | Semantic Memory |
|-----------------|-----------------|
| "What happened" | "What I know" |
| Timestamped events | Timeless facts |
| Personal experiences | General knowledge |
| "Jan 27: tested Gemini for mockups" | "Gemini hallucinates on lighting" |
| Rich context, narrative | Compressed, extracted |

### 4.2 Why It Matters

**Episodic → Semantic Pipeline:**
```
Episodic: "On Jan 27, Wes and I tested Gemini 2.0 Flash for 
           landscape lighting mockups. The day-to-night conversion 
           worked well, but adding lights caused trees to grow and 
           added unwanted elements. We tried a two-pass approach 
           (Claude analysis first, then Gemini) which worked better."
                    │
                    ▼ (extraction)
Semantic: 
  - Gemini 2.0 Flash: good for day-to-night, hallucinates on additions
  - Two-pass approach (analyze → generate) beats single-shot
  - AI mockup testing ongoing; still need to test GPT Image 1.5, Flux 2 Pro
```

### 4.3 Storage Patterns

**Episodic (memory/episodes/):**
```markdown
## 2026-01-27: AI Mockup Testing

**Context:** Testing image generation for landscape lighting mockups
**Participants:** Wes, G
**Duration:** ~2 hours

### What Happened
1. Started with Gemini 2.0 Flash direct prompting
2. Day-to-night conversion worked well
3. Adding lights caused hallucination issues
4. Tried two-pass: Claude analysis → detailed prompt → Gemini
5. Two-pass approach produced better results

### Outcome
- Partial success — pipeline direction identified
- Need more testing with other models

### Lessons Learned
- Analysis first, generation second produces better results
- Single-shot prompts lack sufficient context
```

**Semantic (memory/facts/ai-tools.md):**
```markdown
## Image Generation for Lighting Mockups

### Tested Models
| Model | Day-to-Night | Add Lights | Notes |
|-------|--------------|------------|-------|
| Gemini 2.0 Flash | ✅ Good | ❌ Hallucinates | Trees grow, unwanted elements |
| GPT Image 1.5 | ? | ? | Untested |
| Flux 2 Pro | ? | ? | Untested |

### Best Approach
Two-pass pipeline:
1. Claude analyzes image, identifies light placement
2. Generate detailed prompt with specific coordinates
3. Feed to image model
```

**Relevance to Opie:** ⚠️ Current setup mixes episodic/semantic. Should separate more clearly.

---

## Part 5: Context Compression Techniques

### 5.1 Sliding Window with Summary

**Pattern from LangChain/Factory.ai:**
```
┌─────────────────────────────────────────────────┐
│  System Prompt (always kept)                    │
├─────────────────────────────────────────────────┤
│  Summary of messages 1-50 (compressed)          │
│  "Previous context: User is building an app..." │
├─────────────────────────────────────────────────┤
│  Full messages 51-60 (recent, uncompressed)     │
│  [Complete conversation history]                │
├─────────────────────────────────────────────────┤
│  Current message                                │
└─────────────────────────────────────────────────┘
```

### 5.2 Recursive Summarization

**When summaries get too long, summarize the summaries:**
```python
def recursive_summarize(messages, max_tokens=2000):
    chunks = split_into_chunks(messages, chunk_size=10)
    summaries = []
    
    for chunk in chunks:
        summary = llm_summarize(chunk)
        summaries.append(summary)
    
    combined = "\n".join(summaries)
    
    if count_tokens(combined) > max_tokens:
        # Recursively summarize the summaries
        return recursive_summarize(summaries, max_tokens)
    
    return combined
```

### 5.3 Selective Compression (What NOT to Compress)

**Always preserve:**
- User-stated preferences
- Explicit decisions
- Error corrections
- Current task context
- Recent tool outputs

**Safe to compress:**
- Exploration/brainstorming
- Rejected alternatives
- Verbose explanations
- Debugging sessions (keep conclusion only)

**Relevance to Opie:** 💡 Implement this during context compaction — save critical items to memory BEFORE compression.

---

## Part 6: Vector Database Options

### 6.1 Comparison Matrix

| Database | Best For | Latency | Cost | Self-Host |
|----------|----------|---------|------|-----------|
| **pgvector** | Existing Postgres users | Low | Low | ✅ |
| **ChromaDB** | Prototyping, small scale | Very low | Free | ✅ |
| **Qdrant** | Production, filtered search | Low | Free/Paid | ✅ |
| **Pinecone** | Enterprise, managed | Medium | $$ | ❌ |
| **Milvus** | Massive scale (billions) | Low | Free | ✅ |

### 6.2 Recommendation for Opie

**Current state:** File-based works well. Letta research shows agents using filesystem tools (grep + semantic search) achieve 74% on LoCoMo — beating Mem0's 68.5%.

**If adding vector search:**
1. **ChromaDB** — easiest to add, zero infrastructure
2. **pgvector** — if already using Supabase (Wes is)

**Implementation sketch:**
```python
import chromadb

# Initialize
client = chromadb.PersistentClient(path="./memory/vector-store")
collection = client.get_or_create_collection("opie_memories")

# Index a memory
collection.add(
    documents=["Wes prefers brutal honesty"],
    metadatas=[{"type": "preference", "importance": "critical"}],
    ids=["mem_pref_001"]
)

# Search
results = collection.query(
    query_texts=["how should I communicate?"],
    n_results=5,
    where={"importance": "critical"}  # Filter
)
```

**Relevance to Opie:** ⏳ LOW PRIORITY — file-based is working. Vector DB is optimization, not necessity.

---

## Part 7: How Other AI Assistants Handle Memory

### 7.1 ChatGPT Memory

**How it works:**
- Two types: Saved memories + Chat history reference
- User can trigger: "Remember that I..."
- Auto-extraction: ChatGPT decides what's worth remembering
- Stored as simple key-value facts
- Injected into system prompt

**Limitations:**
- No temporal reasoning
- Limited capacity (~50 memories)
- No importance scoring visible to user

### 7.2 Claude (Anthropic)

**Currently:** Stateless — no built-in memory
**Projects feature:** Context loaded per project
**Third-party memory:** Via MCP tools (Mem0, Zep, etc.)

### 7.3 Personal AI Assistants (Pattern from Research)

**Common approach for file-based personal assistants:**
```
project-root/
├── AGENTS.md      # Agent instructions (loaded always)
├── USER.md        # User profile (loaded always)
├── MEMORY.md      # Core memories (loaded always)
├── memory/
│   ├── YYYY-MM-DD.md    # Daily notes (loaded: today + yesterday)
│   └── facts/           # Structured knowledge (loaded on query)
```

**This is exactly Opie's pattern** — validated by multiple projects (Claude Code, Cursor, etc.)

---

## Part 8: Recommendations for Opie

### 8.1 High-Impact Improvements (Do First)

#### 1. Implement Sleep-Time Memory Processing
**Current:** Heartbeats check for tasks but don't proactively process memory
**Improvement:** During heartbeats, run memory consolidation:

```python
# In heartbeat handler:
async def heartbeat():
    # Current checks...
    check_email()
    check_calendar()
    
    # ADD: Memory processing
    if hours_since_last_consolidation() > 4:
        await consolidate_recent_conversations()
        await extract_new_facts()
        await update_importance_scores()
        await prune_stale_memories()
```

**Expected Impact:** Better memory quality, no added user-facing latency

#### 2. Automatic Fact Extraction
**Current:** Manual "remember this" or explicit extraction
**Improvement:** Auto-extract during each conversation:

```python
def extract_memories_from_conversation(messages):
    prompt = """
    Extract memorable information from this conversation:
    - User preferences (how they like things done)
    - Decisions made (what was chosen and why)
    - Facts learned (about user, projects, people)
    - Corrections (mistakes and fixes)
    
    Return as structured JSON.
    """
    return llm_call(prompt, messages)
```

**Expected Impact:** ~30% more memories captured without user effort

#### 3. Recency-Weighted Retrieval
**Current:** Manual file reading order
**Improvement:** Score memories before loading:

```python
def get_context_for_message(message):
    # Score all memories
    candidates = []
    for memory in all_memories():
        score = (
            0.3 * importance_score(memory) +
            0.3 * recency_score(memory) +
            0.4 * relevance_score(message, memory)
        )
        candidates.append((memory, score))
    
    # Load top-scoring within token budget
    sorted_candidates = sorted(candidates, key=lambda x: -x[1])
    return load_within_budget(sorted_candidates, max_tokens=50000)
```

**Expected Impact:** More relevant context, fewer missed connections

### 8.2 Medium-Impact Improvements (Do Second)

#### 4. Separate Episodic and Semantic Storage
**Current:** Mixed in daily notes and MEMORY.md
**Improvement:**
- `memory/episodes/` — timestamped event narratives
- `memory/knowledge/` — extracted timeless facts
- Daily extraction: episodes → knowledge

#### 5. Recursive Summarization for Chat Logs
**Current:** Raw logs kept 7 days then deleted
**Improvement:**
- Days 1-3: Full logs
- Days 4-7: Summarized logs
- Week+: Ultra-compressed weekly digest

#### 6. Importance-Based Decay
**Current:** No automatic decay
**Improvement:** During weekly maintenance:
```python
def weekly_maintenance():
    for memory in non_critical_memories():
        days_stale = days_since_accessed(memory)
        if days_stale > 30 and memory.access_count < 3:
            flag_for_archival(memory)
        if days_stale > 60 and memory.access_count < 5:
            archive(memory)
```

### 8.3 Optional Enhancements (If Needed)

#### 7. Add ChromaDB for Semantic Search
**When:** If grep-based search becomes insufficient
**How:** Embed all memory files, search by meaning

#### 8. Knowledge Graph for Entity Relationships
**When:** If tracking people/project relationships becomes complex
**How:** Extend knowledge-graph.md with structured queries

---

## Part 9: Implementation Priorities

### Priority Matrix

| Improvement | Impact | Effort | Priority |
|-------------|--------|--------|----------|
| Sleep-time consolidation | High | Medium | **1st** |
| Auto fact extraction | High | Low | **2nd** |
| Recency-weighted retrieval | High | Medium | **3rd** |
| Episodic/semantic separation | Medium | Medium | 4th |
| Recursive summarization | Medium | Low | 5th |
| Importance decay | Medium | Low | 6th |
| Vector DB (ChromaDB) | Low | Medium | Optional |
| Knowledge graph queries | Low | High | Optional |

### Suggested Implementation Order

**Week 1:**
- [ ] Add memory consolidation to heartbeat handler
- [ ] Implement auto fact extraction after each conversation
- [ ] Test with sample conversations

**Week 2:**
- [ ] Build recency-weighted retrieval scoring
- [ ] Integrate scoring into context loading
- [ ] Measure context quality improvement

**Week 3:**
- [ ] Separate episodic/semantic storage
- [ ] Build episode → knowledge extraction pipeline
- [ ] Implement recursive chat log summarization

**Week 4:**
- [ ] Add importance decay to weekly maintenance
- [ ] Build memory review/prune interface
- [ ] Monitor and tune weights

---

## Part 10: Code Architecture Suggestions

### 10.1 Memory Manager Module

```python
# memory/manager.py

class MemoryManager:
    def __init__(self, base_path="memory/"):
        self.base_path = base_path
        self.memories = self._load_memories()
    
    # --- Core Operations ---
    
    def add_memory(self, content, category, importance, tags):
        """Add a new memory with proper schema"""
        memory_id = self._generate_id(category)
        memory = {
            "id": memory_id,
            "content": content,
            "category": category,
            "importance": importance,
            "tags": tags,
            "created": datetime.now(),
            "last_accessed": datetime.now(),
            "access_count": 0
        }
        self._save_memory(memory)
        return memory_id
    
    def retrieve(self, query, top_k=5, filters=None):
        """Score and retrieve most relevant memories"""
        candidates = []
        for memory in self.memories:
            if filters and not self._matches_filters(memory, filters):
                continue
            
            score = self._score_memory(query, memory)
            candidates.append((memory, score))
        
        # Sort and return top-k
        sorted_candidates = sorted(candidates, key=lambda x: -x[1])
        results = [m for m, s in sorted_candidates[:top_k]]
        
        # Update access counts
        for memory in results:
            self._touch_memory(memory)
        
        return results
    
    def _score_memory(self, query, memory):
        """Compute retrieval score"""
        recency = self._recency_score(memory)
        importance = self._importance_score(memory)
        relevance = self._relevance_score(query, memory)
        frequency = self._frequency_score(memory)
        
        return (
            0.3 * importance +
            0.2 * recency +
            0.4 * relevance +
            0.1 * frequency
        )
    
    # --- Consolidation ---
    
    def consolidate_daily(self, date):
        """Run daily memory consolidation"""
        chat_logs = self._read_chat_logs(date)
        
        # Extract different memory types
        facts = self._extract_facts(chat_logs)
        decisions = self._extract_decisions(chat_logs)
        episodes = self._extract_episodes(chat_logs)
        preferences = self._extract_preferences(chat_logs)
        
        # Add to appropriate stores
        for fact in facts:
            self.add_memory(fact, "fact", self._estimate_importance(fact), [])
        # ... similar for other types
        
        return {
            "facts": len(facts),
            "decisions": len(decisions),
            "episodes": len(episodes),
            "preferences": len(preferences)
        }
    
    def prune_stale(self, days_threshold=30, min_accesses=3):
        """Archive memories that haven't been useful"""
        flagged = []
        for memory in self.memories:
            if memory["importance"] == "critical":
                continue
            
            days_stale = (datetime.now() - memory["last_accessed"]).days
            if days_stale > days_threshold and memory["access_count"] < min_accesses:
                flagged.append(memory)
        
        return flagged  # Return for review, don't auto-delete
```

### 10.2 Heartbeat Integration

```python
# In heartbeat handler:

async def memory_heartbeat():
    """Run memory maintenance during idle time"""
    
    manager = MemoryManager()
    
    # 1. Check if consolidation needed
    last_consolidation = get_last_consolidation_time()
    if hours_since(last_consolidation) > 4:
        # Get recent conversations not yet processed
        unprocessed = get_unprocessed_conversations()
        
        for conv in unprocessed:
            # Extract memories
            results = manager.consolidate_from_conversation(conv)
            log(f"Extracted: {results}")
            mark_processed(conv)
        
        set_last_consolidation_time(now())
    
    # 2. Weekly: prune stale memories
    if is_weekly_maintenance_due():
        stale = manager.prune_stale()
        if stale:
            # Flag for human review rather than auto-delete
            create_review_task(stale)
    
    # 3. Update access patterns (for decay calculation)
    manager.update_access_statistics()
```

### 10.3 Context Loading

```python
# When building context for a new message:

def build_context(user_message, session_state):
    manager = MemoryManager()
    
    # 1. Always load core files
    context = []
    context.append(read_file("SOUL.md"))
    context.append(read_file("USER.md"))
    
    # 2. Score and load relevant memories
    memories = manager.retrieve(
        query=user_message,
        top_k=10,
        filters={"importance": ["critical", "high"]}
    )
    context.extend(memories)
    
    # 3. Load recent daily notes (always today + yesterday)
    context.append(read_file(f"memory/{today}.md"))
    context.append(read_file(f"memory/{yesterday}.md"))
    
    # 4. Load task-specific context if applicable
    if session_state.get("active_project"):
        project_memories = manager.retrieve(
            query=session_state["active_project"],
            top_k=5,
            filters={"category": "project"}
        )
        context.extend(project_memories)
    
    return context
```

---

## Conclusion

Opie's current file-based memory system aligns well with state-of-the-art approaches. The research shows:

1. **File-based memory works** — Letta benchmarks show filesystems + semantic search beat specialized tools
2. **Sleep-time compute is underutilized** — heartbeats should do more memory work
3. **Auto-extraction matters** — don't rely on manual "remember this"
4. **Scoring + decay are key** — importance × recency × relevance retrieval
5. **Separation helps** — episodic (what happened) vs semantic (what I know)

The biggest wins will come from using heartbeats for proactive memory consolidation, implementing automatic fact extraction, and adding retrieval scoring — not from adding complex infrastructure like vector databases or knowledge graphs.

---

## References

1. MemGPT Paper: https://arxiv.org/abs/2310.08560
2. Generative Agents (Stanford): https://arxiv.org/abs/2304.03442
3. Mem0 Research: https://mem0.ai/research
4. Letta Sleep-Time Compute: https://arxiv.org/abs/2504.13171
5. CoALA (Cognitive Agent Framework): https://arxiv.org/abs/2309.02427
6. Letta Memory Benchmark: https://www.letta.com/blog/benchmarking-ai-agent-memory
7. LangChain Memory Blog: https://blog.langchain.com/memory-for-agents/
8. Zep Temporal Knowledge Graph: https://arxiv.org/abs/2501.13956

---

*Research compiled 2026-01-31 for Opie memory improvement initiative*
