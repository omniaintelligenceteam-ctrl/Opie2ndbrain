# Multi-Agent Architecture Recommendation

**Date:** 2026-01-30  
**Context:** Pre-PMF SaaS (Omnia Light Scape Pro) focused on getting 20 paying customers. Comparing 2-tier (orchestrator + workers) vs 3-tier (orchestrator → managers → workers) architecture.

---

## TL;DR

**Recommendation: Stick with 2-tier (flat) architecture for now.**

A manager layer adds overhead that doesn't pay off until you have 10+ agents across distinct domains. For a small sales/outreach operation, the extra layer creates latency, costs more tokens, and makes debugging harder—with no meaningful benefit.

---

## What I Found

### Framework Approaches

| Framework | Default Pattern | Hierarchy Support |
|-----------|----------------|-------------------|
| **CrewAI** | Sequential (flat) | Yes - `Process.hierarchical` with manager_llm |
| **LangGraph** | Supervisor (flat) | Yes - langgraph-supervisor package |
| **AutoGen** | Two-agent chat | Yes - group chats, hierarchical delegation |

All major frameworks support hierarchy, but none default to it. They all start flat and add layers when needed.

### Key Research Findings

#### 1. Google Research: "The Sequential Penalty" (Critical)
From [Towards a Science of Scaling Agent Systems](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/):

> "On tasks requiring strict sequential reasoning (like planning), **every multi-agent variant we tested degraded performance by 39-70%**. The overhead of communication fragmented the reasoning process, leaving insufficient 'cognitive budget' for the actual task."

**Why this matters for sales/outreach:** Most sales workflows are sequential:
- Research lead → personalize outreach → send email → log in CRM → schedule follow-up

Adding a manager layer means more "telephone" between agents = more errors, not fewer.

#### 2. LangChain Benchmarking: Translation Overhead
From their [multi-agent benchmarking](https://www.blog.langchain.com/benchmarking-multi-agent-architectures/):

> "Most of the mistakes of supervisor happen because of the 'translation' layer, where only the supervisor agent is allowed to respond to the user."

When they tested supervisor (hierarchical) vs swarm (flat peer-to-peer):
- Swarm slightly outperformed supervisor across the board
- Supervisor used more tokens consistently
- Adding "forward_message" to skip translation improved supervisor by 50%

**Takeaway:** Manager layers that just relay information add cost without value.

#### 3. When Hierarchy DOES Help
Google's research found:

> "On parallelizable tasks like financial reasoning, **centralized coordination improved performance by 80.9%** over a single agent."

Hierarchy helps when:
- Tasks can run in parallel across distinct domains
- You need error containment (centralized catches 4.4x vs 17.2x error amplification)
- Scale requires divide-and-conquer (10+ agents, 100+ tools)

#### 4. The Cost Reality
From CrewAI docs:

> "Delegation creates more LLM calls. A manager asking a question, a specialist answering, and the manager processing the answer is at least three calls. This can escalate quickly."

With Claude/GPT-4 pricing, each layer roughly doubles your token cost per task.

---

## 2-Tier vs 3-Tier Comparison

### 2-Tier (Orchestrator + Workers)
```
[Orchestrator]
    ├── Worker A (research)
    ├── Worker B (outreach)
    ├── Worker C (CRM)
    └── Worker D (scheduling)
```

**Pros:**
- Simpler debugging (one layer of coordination)
- Lower latency (no manager relay)
- Cheaper (fewer LLM calls)
- Faster iteration (change one thing, test one thing)
- Works great up to ~8-10 workers

**Cons:**
- Orchestrator can get overloaded with 15+ workers
- No domain isolation (all workers visible to orchestrator)
- Harder to add compliance boundaries later

### 3-Tier (Orchestrator → Managers → Workers)
```
[Orchestrator]
    ├── [Sales Manager]
    │       ├── Research Worker
    │       └── Outreach Worker
    └── [Ops Manager]
            ├── CRM Worker
            └── Scheduling Worker
```

**Pros:**
- Scales better (each manager handles subset)
- Domain isolation (compliance, different prompts)
- Managers can specialize in domain-specific coordination
- Parallel execution across manager domains

**Cons:**
- "Telephone game" errors (40-70% degradation on sequential tasks)
- Higher token costs (2-3x per task)
- More complex testing (unit + integration + e2e per layer)
- Slower iteration (change requires testing up/down chain)
- Overkill for <10 agents

---

## Our Specific Situation

| Factor | Implication |
|--------|-------------|
| Pre-PMF | Speed of iteration > architectural elegance |
| 20 customers goal | Don't need enterprise-scale patterns yet |
| Sales/outreach focus | Sequential workflows → hierarchy hurts |
| Small team | Simpler = faster debugging |
| Limited agent count | <10 agents = orchestrator can handle directly |

**The math is clear:** A 3-tier architecture would cost us 2-3x more tokens, add 39-70% degradation risk on our sequential sales workflows, and require 3x the testing surface—all for scalability we don't need yet.

---

## Recommendation

### Now: 2-Tier Flat Architecture
```
[Main Orchestrator]
    ├── Lead Research Agent
    ├── Email Outreach Agent
    ├── CRM Sync Agent
    ├── Meeting Scheduler Agent
    └── Follow-up Agent
```

Keep the orchestrator smart about:
- Which agent to call for what
- Passing minimal context between agents
- Error handling and retry logic

### Consider Upgrading to 3-Tier When:

1. **You hit 10+ specialized agents** — Orchestrator context window gets crowded
2. **You add a second business domain** — e.g., customer success separate from sales
3. **You need compliance isolation** — Different data access for different agent groups
4. **Parallel execution matters** — Tasks that can truly run simultaneously across domains
5. **You hit PMF and scale** — More customers = more concurrent requests

### Upgrade Signals (Watch For):
- Orchestrator prompt > 2000 tokens of agent definitions
- Debugging time increasing disproportionately
- Need to run sales + support + ops simultaneously
- Different teams need different agent access

---

## Practical Next Steps

1. **Keep current 2-tier design** — It's correct for our stage
2. **Build agents as modular as possible** — Easy to group under managers later
3. **Track agent count** — When approaching 8-10, start planning upgrade
4. **Measure iteration speed** — If debugging becomes painful, consider restructure

---

## Sources

- [LangChain: Benchmarking Multi-Agent Architectures](https://www.blog.langchain.com/benchmarking-multi-agent-architectures/)
- [Google Research: Towards a Science of Scaling Agent Systems](https://research.google/blog/towards-a-science-of-scaling-agent-systems-when-and-why-agent-systems-work/)
- [CrewAI: Hierarchical Process Docs](https://docs.crewai.com/how-to/hierarchical-process)
- [arXiv: Taxonomy of Hierarchical Multi-Agent Systems](https://arxiv.org/html/2508.12683v1)
- [Microsoft: Designing Multi-Agent Intelligence](https://developer.microsoft.com/blog/designing-multi-agent-intelligence)
- [ActiveWizards: Hierarchical AI Agents Guide](https://activewizards.com/blog/hierarchical-ai-agents-a-guide-to-crewai-delegation)

---

*Bottom line: The research is clear that hierarchy adds overhead that only pays off at scale. For a pre-PMF company doing sequential sales workflows with <10 agents, 2-tier is the right call. Revisit when you've got the good problem of needing to scale.*
