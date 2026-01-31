# Mobile AI Agent Best Practices: Comprehensive Research Report

*Last Updated: January 2026*
*Research for: Opie/Moltbot Enhancement*

---

## Executive Summary

This report synthesizes research across academic papers, production AI assistants (ChatGPT, Claude, Pi, Rabbit R1), open-source frameworks (LangGraph, CrewAI, AutoGPT), and industry best practices for building stronger, more capable mobile AI agents.

**Key Findings:**
1. **Mobile-first AI is rapidly evolving** - Edge LLMs are becoming viable for offline capabilities
2. **Context management is the critical bottleneck** - Memory systems need multiple tiers (MemGPT-style)
3. **Proactive beats reactive** - The best assistants anticipate needs rather than just responding
4. **Cross-device sync is essential** - Users expect one continuous thread across all screens
5. **Error handling is foundational** - Graceful degradation separates prototypes from production

---

## 1. Mobile AI Agent Architectures

### 1.1 Current State of the Art

**Production Examples:**
- **ChatGPT Mobile App**: Global memory, voice-first interface, real-time streaming
- **Claude Mobile App**: Project-scoped memory, voice features in pilot
- **Pi by Inflection**: Emotional intelligence focus, conversational flow
- **Rabbit R1**: LAM (Large Action Model) for app interaction - cautionary tale about overpromising

**Key Mobile Frameworks:**
- **DroidRun**: Open-source framework for LLM-controlled Android/iOS devices
- **Mobile-Use by Minitap**: AI agents for real mobile app interaction
- **React Native + AI**: Callstack's best practices for on-device AI

### 1.2 iOS/Android Considerations

| Platform | Strengths | Challenges |
|----------|-----------|------------|
| **iOS** | Apple Intelligence integration, Core ML, Siri Shortcuts | Stricter sandboxing, background limits |
| **Android** | More open APIs, Gemini Nano on-device, flexible intents | Fragmentation, battery optimization kills |

**iOS-Specific:**
- Apple Intelligence (iOS 18+) provides on-device Foundation Models
- "LLM Siri" coming in iOS 26.4 (early 2026) with conversational capabilities
- Use App Intents framework for Siri integration

**Android-Specific:**
- Gemini Nano via ML Kit GenAI APIs for offline summarization/rewriting
- DroidRun framework enables LLM control of device
- More flexible for background processing

### 1.3 Offline Capabilities & Edge AI

**On-Device LLM Options (2024-2026):**

| Model | Size | Use Case | Platform |
|-------|------|----------|----------|
| Gemma-3-4B (quantized) | ~2-4GB | Chat assistant | Android |
| Gemini Nano | Built-in | Summarization, rewrite | Android |
| Phi-3 Mini | ~2GB | General tasks | iOS/Android |
| Qwen 2.5 1.5B | ~1GB | Reasoning | Cross-platform |
| DeepSeek R1 1.5B | ~1GB | Reasoning | Cross-platform |

**Key Strategies:**
1. **Hybrid architecture**: On-device for latency-sensitive/private, cloud for complex
2. **Model quantization**: INT4/INT8 for mobile deployment
3. **Caching**: Pre-compute common responses, cache embeddings locally
4. **Progressive enhancement**: Basic offline → enhanced online

**Recommendation for Opie/Moltbot:**
```
Priority: MEDIUM (Impact: High, Effort: High)
- Start with offline voice transcription (Whisper.cpp)
- Add simple on-device classifier for intent routing
- Cache frequent responses locally
- Full offline LLM when hardware/models mature
```

### 1.4 Push Notification Strategies

**Best Practices from Research:**

1. **Timing Optimization**
   - AI-predicted optimal send times based on user activity patterns
   - 25% increase in daily active users when using predictive timing
   - Avoid 23:00-08:00 unless truly urgent

2. **Personalization**
   - Hyper-personalized content based on behavior patterns
   - 35% increase in open rates with AI automation
   - Context-aware notifications (location, activity, calendar)

3. **Smart Notification Types:**
   - **Proactive reminders**: Calendar events, travel departure times
   - **Anticipatory**: Restock alerts, relevant news updates
   - **Completion notifications**: Long-running task finished
   - **Digest bundling**: Group related notifications

**Implementation Pattern:**
```python
def should_notify(user_context, notification):
    # Check time appropriateness
    if is_quiet_hours(user_context.timezone):
        return notification.urgency == 'critical'
    
    # Predict engagement likelihood
    engagement_score = predict_engagement(
        user_context.activity_patterns,
        notification.type,
        current_time()
    )
    
    return engagement_score > THRESHOLD
```

---

## 2. Agent Capabilities & Architectures

### 2.1 Agent Architecture Comparison

| Architecture | Best For | Latency | Reliability | Complexity |
|--------------|----------|---------|-------------|------------|
| **ReAct** | Simple, iterative tasks | High (per-step) | Good | Low |
| **Plan-and-Execute** | Complex multi-step | Lower overall | Moderate | Medium |
| **ReWOO** | Efficiency-critical | Lowest | Good | Medium |
| **Multi-Agent** | Specialized domains | Variable | Complex | High |

### 2.2 ReAct (Reason + Act) Framework

**How it works:**
1. **Thought**: Reason about current state and goal
2. **Action**: Choose and execute tool
3. **Observation**: Process result
4. Repeat until complete

**Best Practices:**
- Add explicit reflection for error recovery
- Separate planning from execution
- Goal reiteration prevents context drift
- Limit to ~10 tools per agent (benchmarks show degradation above this)

**LangChain Benchmarks (claude-3.5-sonnet):**
- 10 tools: 85% success
- 50 tools: 67% success
- 100 tools: 54% success

### 2.3 Multi-Agent Orchestration

**Key Patterns:**

1. **Supervisor/Orchestrator**: Central agent routes to specialists
2. **Conversational Multi-Agent** (AutoGen): Agents chat to solve problems
3. **Graph-Based** (LangGraph): Explicit state machine with transitions
4. **Hierarchical**: Manager agents delegate to worker agents

**LangGraph State Machine Pattern:**
```python
from langgraph.graph import StateGraph, MessagesState

def create_agent_workflow():
    graph = StateGraph(MessagesState)
    
    # Add nodes for each capability
    graph.add_node("router", route_request)
    graph.add_node("research", research_agent)
    graph.add_node("action", action_agent)
    graph.add_node("respond", response_agent)
    
    # Define transitions
    graph.add_edge("router", "research")
    graph.add_conditional_edges(
        "research",
        should_act,
        {"yes": "action", "no": "respond"}
    )
    
    return graph.compile()
```

### 2.4 Tool Calling Best Practices

**From Anthropic's Advanced Tool Use (2025):**

1. **Tool Search Tool**: Don't load all tools upfront
   - 58 tools = ~55K tokens before conversation starts
   - With Tool Search: ~500 tokens + on-demand discovery
   - 85% reduction in token usage
   - Accuracy improved: 49% → 74% (Opus 4)

2. **Programmatic Tool Calling**: Let Claude write code to orchestrate
   - 37% reduction in token consumption
   - Eliminates round-trips for multi-tool workflows
   - Example: Budget check across 20 employees = 1 code block, not 20 tool calls

3. **Strict Schema Validation**:
```json
{
  "name": "get_weather",
  "strict": true,  // Guarantees schema match
  "input_schema": {...}
}
```

4. **Tool Use Examples**: Show, don't just tell
   - Schemas define structure, examples show patterns
   - Include when to use optional parameters
   - Show common usage combinations

**MCP (Model Context Protocol):**
- Anthropic's open standard (Nov 2024)
- M+N integrations instead of M×N
- Universal connector for tools/data sources
- Adopt for standardized tool interfaces

**Recommendation for Opie/Moltbot:**
```
Priority: HIGH (Impact: High, Effort: Medium)
- Implement Tool Search pattern for large tool libraries
- Use MCP for new integrations
- Add strict schema validation
- Consider programmatic tool calling for data-heavy operations
```

---

## 3. Context Management & Memory

### 3.1 Memory Architecture Patterns

**MemGPT "Operating System" Paradigm:**

```
┌─────────────────────────────────────────┐
│  PRIMARY CONTEXT (RAM - Active Window)  │
│  ├─ Static system prompt                │
│  ├─ Dynamic working context (scratchpad)│
│  └─ FIFO message buffer (recent turns)  │
├─────────────────────────────────────────┤
│  EXTERNAL CONTEXT (Disk - Persistent)   │
│  ├─ Recall Storage (full history, RAG)  │
│  └─ Archival Storage (long-term, vectors)│
└─────────────────────────────────────────┘
```

**Key Mechanisms:**
- **Memory pressure triggers**: At 70% context capacity, summarize and archive
- **Self-managed write-back**: LLM decides what to keep, archive, or discard
- **Explicit retrieval**: `conversation_search`, `archival_memory_search`

### 3.2 Comparison of Production Memory Systems

| System | Scope | Automation | User Control | Best For |
|--------|-------|------------|--------------|----------|
| **OpenAI (ChatGPT)** | Global, cross-chat | High (auto-extract) | View/edit/delete | Consumer personalization |
| **Claude Projects** | Project-scoped | Low (mostly manual) | Full control | Professional/enterprise |
| **MemGPT/Letta** | Unlimited (virtual) | Full (self-managing) | Moderate | Autonomous agents |
| **LangChain** | Configurable | Build your own | Full | Custom systems |

### 3.3 Long-Term Memory Best Practices

1. **Layered Memory Architecture:**
   - **L1 (In-context)**: Current conversation, ~8-32K tokens
   - **L2 (Session)**: This session's facts, keyword searchable
   - **L3 (Persistent)**: Cross-session, vector-indexed
   - **L4 (Archival)**: Compressed, rarely accessed

2. **Memory Formation Strategies:**
   - **Explicit**: User says "remember this"
   - **Implicit**: Background extraction of salient facts
   - **Triggered**: On context pressure, summarize and archive
   - **Periodic**: Regular consolidation/pruning

3. **Retrieval Strategies:**
   - Hybrid: Keyword + semantic search
   - Recency-weighted scoring
   - Entity-based retrieval (who/what mentioned)
   - Relationship-aware (knowledge graphs)

### 3.4 Cross-Device Conversation Sync

**What Users Expect:**
- Start on laptop, continue on phone seamlessly
- No reloading history, no re-introduction
- See long-running task results on any device
- One continuous thread across all screens

**Technical Requirements:**
1. **Identity-aware fan-out**: All user sessions receive updates
2. **Durable stream relay**: Buffer streams for reconnection
3. **Message ordering**: Guarantee delivery order
4. **Session recovery**: Rehydrate after disconnects
5. **Presence tracking**: Know which devices are active

**Implementation Pattern:**
```javascript
// Ably-style realtime sync
class ConversationSync {
  async syncMessage(userId, message) {
    // Get all active sessions for user
    const sessions = await this.sessionStore.getActiveSessions(userId);
    
    // Fan out to all devices
    await Promise.all(sessions.map(session =>
      this.realtime.publish(session.channelId, {
        ...message,
        sequence: await this.getNextSequence(userId)
      })
    ));
  }
  
  async recoverSession(sessionId, lastSequence) {
    // Replay missed messages
    return this.messageStore.getMessagesSince(sessionId, lastSequence);
  }
}
```

**Recommendation for Opie/Moltbot:**
```
Priority: HIGH (Impact: High, Effort: Medium)
- Implement message sequence numbers for ordering
- Add session recovery on reconnect
- Consider Ably or similar for realtime infrastructure
- Store conversation state server-side, not just client
```

---

## 4. Proactive AI

### 4.1 Moving from Reactive to Proactive

**The Paradigm Shift:**
- **Reactive**: Wait for user request → process → respond
- **Proactive**: Monitor context → anticipate needs → surface information

**Proactive Capabilities (Google Assistant examples):**
- Suggest departure time based on traffic + calendar
- Remind about subscription renewals before they expire
- Surface relevant information before meetings
- Detect anomalies and alert before user asks

### 4.2 Proactive Trigger Types

| Trigger | Example | Implementation |
|---------|---------|----------------|
| **Time-based** | Meeting in 2 hours | Calendar + notification scheduler |
| **Event-based** | Email from VIP | Email monitoring + priority rules |
| **Pattern-based** | Usually orders coffee now | Activity pattern analysis |
| **Context-based** | Arrived at airport | Location + activity context |
| **Anomaly-based** | Unusual login detected | Security monitoring |

### 4.3 Implementation Architecture

```python
class ProactiveEngine:
    def __init__(self):
        self.triggers = []
        self.context_store = ContextStore()
        
    async def run_continuous_loop(self):
        while True:
            context = await self.context_store.get_current()
            
            for trigger in self.triggers:
                if trigger.should_fire(context):
                    action = trigger.get_action(context)
                    
                    # Check if notification is appropriate
                    if self.should_notify(context, action):
                        await self.notify_user(action)
                        
            await asyncio.sleep(POLL_INTERVAL)
    
    def should_notify(self, context, action):
        # Respect quiet hours
        if context.is_quiet_hours and action.urgency != 'critical':
            return False
        
        # Avoid notification fatigue
        if self.recent_notifications_count() > THRESHOLD:
            return False
            
        # Check user preferences
        return context.user_prefs.allows(action.type)
```

### 4.4 Smart Context Gathering

**What to Monitor:**
- Calendar: Upcoming events, travel time
- Email: Unread from VIPs, action items
- Weather: Before outdoor activities
- Traffic: Before departures
- Social: Mentions, replies
- Tasks: Approaching deadlines

**How to Gather (Low-Friction):**
- Background sync during idle
- Delta-only updates to minimize data
- Respect API rate limits
- Cache aggressively

**Recommendation for Opie/Moltbot:**
```
Priority: HIGH (Impact: Very High, Effort: Medium)
- Implement heartbeat system with check rotation (2-4x/day)
- Monitor: Email (urgent), Calendar (24-48h), Mentions
- Add proactive notification for:
  * Calendar events approaching
  * Important emails received
  * Task deadlines
- Respect quiet hours (23:00-08:00)
```

---

## 5. Voice Interfaces

### 5.1 Voice UX Best Practices

**From Siri/Alexa Learnings:**

1. **Natural Language Understanding:**
   - Don't require specific keywords
   - Handle context and intent across turns
   - Support complex multi-step commands

2. **Conversation Flow:**
   - Confirmations should be brief
   - Don't over-explain capabilities
   - Handle interruptions gracefully
   - Allow corrections mid-stream

3. **Error Recovery:**
   - "I didn't catch that" with specific guidance
   - Offer alternatives when unsure
   - Learn from corrections

### 5.2 Barge-In and Interruption Handling

**Barge-in** = User speaks while AI is responding

**Strategies:**
1. **Immediate stop**: Halt output, listen to user
2. **Contextual resume**: Can continue from where stopped if user says "go on"
3. **Smart detection**: Distinguish "uh-huh" acknowledgments from actual interruptions

**Implementation:**
```python
class VoiceConversation:
    async def handle_audio_stream(self, audio_chunks):
        self.speaking = False
        
        async for chunk in audio_chunks:
            # Detect speech during our output
            if self.is_outputting and self.detect_speech(chunk):
                await self.handle_barge_in()
                
            # Process user speech
            transcript = await self.transcribe(chunk)
            if transcript:
                await self.process_input(transcript)
    
    async def handle_barge_in(self):
        self.stop_output()
        self.save_resume_point()  # In case user wants to continue
        self.listening = True
```

### 5.3 Multimodal Voice+Visual Design

**When to Use Voice vs Visual:**

| Scenario | Voice | Visual | Both |
|----------|-------|--------|------|
| Quick query | ✓ | | |
| List of options | | ✓ | |
| Complex data | | ✓ | |
| Confirmation | ✓ | | ✓ |
| Ambient/hands-free | ✓ | | |
| Detailed review | | ✓ | |

**Best Practices:**
- Voice for input, visual for output (when screen available)
- Keep voice responses concise (~15 seconds max)
- Provide visual confirmation of voice commands
- Use sound effects for feedback, not just words

**Recommendation for Opie/Moltbot:**
```
Priority: MEDIUM-HIGH (Impact: High, Effort: Medium)
- Implement barge-in detection
- Keep voice responses brief (TTS under 15s)
- Add "continue" capability for interrupted outputs
- Use reaction sounds for acknowledgment
```

---

## 6. Security & Privacy

### 6.1 Data Handling Best Practices

**CISA AI Data Security Guidelines:**

1. **Data Minimization**: Only collect what's necessary
2. **Purpose Limitation**: Use data only for stated purposes
3. **Access Control**: Zero-trust approach, IAM controls
4. **Encryption**: At rest and in transit
5. **Audit Logging**: Track all data access

### 6.2 Personal AI Assistant Privacy

**Key Principles:**
1. **Transparency**: Always clear when AI is processing data
2. **User Control**: View, edit, delete personal data
3. **Data Isolation**: Separate contexts don't leak
4. **Local Processing**: Prefer on-device when possible
5. **Consent-First**: Explicit opt-in for sensitive data

**Implementation Checklist:**
- [ ] Clear privacy policy explaining AI data use
- [ ] User-accessible data view/export/delete
- [ ] Encryption for all stored personal data
- [ ] Audit trail for AI decisions
- [ ] Separate storage for different users/contexts
- [ ] Regular data retention cleanup
- [ ] On-device processing for sensitive categories

### 6.3 Secure Memory Architecture

```python
class SecureMemoryStore:
    def store_memory(self, user_id, memory, sensitivity):
        # Encrypt based on sensitivity
        if sensitivity == 'high':
            encrypted = self.encrypt_with_user_key(memory, user_id)
        else:
            encrypted = self.encrypt_with_system_key(memory)
        
        # Store with access controls
        self.storage.put(
            key=self.generate_key(user_id, memory.id),
            value=encrypted,
            acl={'read': [user_id], 'write': [user_id]}
        )
        
        # Log access for audit
        self.audit_log.record('store', user_id, memory.id)
```

**Recommendation for Opie/Moltbot:**
```
Priority: HIGH (Impact: High, Effort: Medium)
- Encrypt all user data at rest
- Implement user data export/delete
- Add audit logging for data access
- Separate user contexts strictly
- Prefer on-device for voice/biometrics
```

---

## 7. Performance Optimization

### 7.1 Latency Reduction Strategies

**Quick Reference:**

| Technique | Latency Reduction | Best For |
|-----------|-------------------|----------|
| **Response Streaming** | Perceived 50%+ | All applications |
| **Prompt Caching** | 50-90% on cache hit | Repeated contexts |
| **Speculative Decoding** | 2-3x | Large models |
| **Token Compression** | 20-40% | Long contexts |
| **Hardware (H100 vs A100)** | 36-52% | Scale deployments |

### 7.2 Streaming Best Practices

**Why Stream:**
- Users see response immediately
- Perceived latency drops dramatically
- Can interrupt if going wrong direction
- Feels more conversational

**Implementation:**
```python
async def stream_response(prompt, on_chunk):
    response = await llm.stream(prompt)
    
    buffer = ""
    async for chunk in response:
        buffer += chunk.text
        
        # Emit complete sentences for smoother UX
        while '.' in buffer or '!' in buffer or '?' in buffer:
            sentence, buffer = split_at_sentence(buffer)
            await on_chunk(sentence)
    
    # Emit any remaining text
    if buffer:
        await on_chunk(buffer)
```

### 7.3 Caching Strategies

**Multi-Level Caching:**

1. **Prompt Prefix Caching** (API-level)
   - OpenAI and Anthropic support this
   - Cache system prompts and tool definitions
   - 50% cost reduction on cache hits

2. **Semantic Response Caching**
   - Hash semantically similar queries
   - Return cached responses for duplicates
   - Use embeddings for similarity matching

3. **KV Cache** (Inference-level)
   - Store key-value pairs from attention
   - Reuse across tokens in generation
   - Critical for speculative decoding

**Implementation:**
```python
class SemanticCache:
    def __init__(self, embedding_model, similarity_threshold=0.95):
        self.embeddings = VectorStore()
        self.responses = {}
        self.threshold = similarity_threshold
    
    async def get_or_generate(self, query, generate_fn):
        query_embedding = await self.embed(query)
        
        # Check for similar cached query
        similar = await self.embeddings.search(
            query_embedding, 
            threshold=self.threshold
        )
        
        if similar:
            return self.responses[similar.id]
        
        # Generate and cache
        response = await generate_fn(query)
        cache_id = await self.embeddings.store(query_embedding)
        self.responses[cache_id] = response
        
        return response
```

### 7.4 Mobile-Specific Optimizations

1. **Prefetch on Idle**: Use quiet moments to prepare common queries
2. **Background Processing**: Summarize emails/calendar in background
3. **Adaptive Quality**: Lower quality on slow networks
4. **Batch Requests**: Combine multiple queries
5. **Delta Updates**: Only sync changes, not full state

**Recommendation for Opie/Moltbot:**
```
Priority: HIGH (Impact: High, Effort: Low-Medium)
- Enable prompt caching (already supported by APIs)
- Implement response streaming everywhere
- Add semantic cache for common queries
- Prefetch during heartbeat idle times
```

---

## 8. Integration Patterns

### 8.1 Calendar Integration

**Best Practices:**
- **Read Access**: Get upcoming events, free/busy times
- **Write Access**: Create events from natural language
- **Smart Parsing**: "Meeting with John next Tuesday at 2pm"
- **Conflict Detection**: Warn before double-booking
- **Travel Time**: Add buffer based on locations

**Integration Pattern:**
```python
class CalendarIntegration:
    async def create_event_from_text(self, text, user_id):
        # Parse natural language
        parsed = await self.llm.parse_event(text)
        
        # Check for conflicts
        conflicts = await self.calendar.check_conflicts(
            user_id, parsed.start, parsed.end
        )
        
        if conflicts:
            return await self.handle_conflicts(conflicts, parsed)
        
        # Create event
        event = await self.calendar.create(user_id, {
            'title': parsed.title,
            'start': parsed.start,
            'end': parsed.end,
            'attendees': parsed.attendees,
            'location': parsed.location
        })
        
        return event
```

### 8.2 Email Integration

**Key Capabilities:**
- **Triage**: Auto-categorize importance/urgency
- **Summarization**: Condensed view of threads
- **Action Extraction**: Detect tasks, deadlines
- **Smart Reply**: Suggest responses
- **Draft Composition**: Write emails from intent

**Best Practices:**
- Batch processing during sync
- Incremental updates (not full refresh)
- Highlight VIP senders
- Extract calendar events from email content

### 8.3 Messaging App Integration

**Patterns:**
- **Unified Inbox**: Aggregate across platforms
- **Smart Routing**: Direct responses to correct app
- **Context Preservation**: Maintain thread context
- **Notification Consolidation**: Don't duplicate alerts

**Recommendation for Opie/Moltbot:**
```
Priority: MEDIUM-HIGH (Impact: High, Effort: Medium)
Current integrations to enhance:
- Calendar: Add conflict detection, travel time awareness
- Email: Improve triage with importance scoring
- Messaging: Consider unified inbox view
- Cross-integration: Event extraction from emails
```

---

## 9. Personalization

### 9.1 Learning User Preferences

**What to Learn:**
- Communication style preferences
- Topic interests
- Time preferences for notifications
- Tool/feature usage patterns
- Common queries/tasks

**How to Learn:**

1. **Explicit Collection**
   - Ask during onboarding
   - Periodic "preference check-ins"
   - Learn from corrections

2. **Implicit Learning**
   - Track response feedback (helpful/not helpful)
   - Observe tool usage patterns
   - Monitor interaction timing preferences
   - Note query patterns

### 9.2 Personalization Architecture

```python
class PersonalizationEngine:
    def __init__(self):
        self.user_models = {}  # User-specific models
        self.global_patterns = {}  # Cross-user patterns
    
    async def personalize_response(self, user_id, base_response):
        preferences = await self.get_preferences(user_id)
        
        # Adjust style
        styled = await self.apply_style(
            base_response,
            tone=preferences.tone,
            verbosity=preferences.verbosity
        )
        
        # Add personalized context
        enriched = await self.add_context(
            styled,
            interests=preferences.interests,
            history=preferences.recent_topics
        )
        
        return enriched
    
    async def learn_from_feedback(self, user_id, interaction, feedback):
        # Update preferences based on feedback
        if feedback.type == 'too_long':
            await self.update_preference(user_id, 'verbosity', -0.1)
        elif feedback.type == 'helpful':
            await self.reinforce_patterns(user_id, interaction)
```

### 9.3 Adaptive Behavior

**Patterns:**
- **Time-based**: Briefer in mornings, more detailed when user has time
- **Context-based**: Professional tone for work topics, casual for personal
- **History-based**: Remember past preferences and decisions
- **Feedback-based**: Improve from corrections

**Recommendation for Opie/Moltbot:**
```
Priority: MEDIUM (Impact: Medium-High, Effort: Medium)
- Track explicit preferences in user profile
- Implement implicit learning from interactions
- Adapt response length based on feedback
- Personalize notification timing
- Remember user's common tasks/queries
```

---

## 10. Reliability & Error Handling

### 10.1 Error Categories

| Category | Examples | Recovery Strategy |
|----------|----------|-------------------|
| **Execution** | API failure, timeout | Retry with backoff |
| **Semantic** | Hallucinated API, wrong params | Schema validation, retry with different prompt |
| **State** | Stale data, wrong assumptions | State verification, rollback |
| **Dependency** | Rate limit, external service down | Circuit breaker, fallback |
| **Timeout** | Long-running task | Progressive updates, recovery checkpoint |

### 10.2 Error Recovery Patterns

**1. Retry with Exponential Backoff:**
```python
@retry(
    wait=wait_exponential(min=1, max=60),
    stop=stop_after_attempt(3),
    retry=retry_if_exception_type(TransientError)
)
async def call_tool_with_retry(tool, args):
    return await tool.execute(args)
```

**2. Circuit Breaker:**
```python
class CircuitBreaker:
    def __init__(self, failure_threshold=5, reset_timeout=60):
        self.failures = 0
        self.state = 'closed'
        
    async def call(self, func, *args):
        if self.state == 'open':
            raise CircuitOpenError()
        
        try:
            result = await func(*args)
            self.failures = 0
            return result
        except Exception as e:
            self.failures += 1
            if self.failures >= self.failure_threshold:
                self.state = 'open'
                asyncio.create_task(self.schedule_reset())
            raise
```

**3. Graceful Degradation Tiers:**
```python
class DegradationManager:
    tiers = [
        ('full', full_capability_agent),
        ('reduced', template_based_agent),
        ('minimal', rule_based_fallback),
        ('emergency', human_escalation)
    ]
    
    async def execute(self, task):
        for tier_name, handler in self.tiers:
            try:
                return await handler.execute(task)
            except Exception as e:
                self.log_degradation(tier_name, e)
                continue
        
        return await self.human_escalation(task)
```

**4. Checkpointing for Multi-Step Workflows:**
```python
class CheckpointedWorkflow:
    async def execute(self, steps):
        checkpoint = await self.load_checkpoint()
        
        for i, step in enumerate(steps[checkpoint.step:]):
            try:
                result = await step.execute()
                await self.save_checkpoint(i, result)
            except Exception:
                # Can resume from last checkpoint
                await self.save_checkpoint(i, None, failed=True)
                raise
```

### 10.3 Validation-First Execution

**Always validate LLM outputs before using:**
```python
async def execute_tool_call(tool_call):
    # 1. Schema validation
    try:
        validated = ToolSchema.parse(tool_call.arguments)
    except ValidationError as e:
        # Retry with sanitization
        sanitized = await sanitize_arguments(tool_call.arguments, e)
        validated = ToolSchema.parse(sanitized)
    
    # 2. Semantic validation
    if not await validate_semantics(validated):
        raise SemanticError("Invalid tool usage")
    
    # 3. Execute with timeout
    try:
        result = await asyncio.wait_for(
            tools[tool_call.name].execute(validated),
            timeout=TOOL_TIMEOUT
        )
    except asyncio.TimeoutError:
        return ToolResult(error="Tool execution timed out")
    
    return result
```

### 10.4 Human-in-the-Loop Fallback

**When to Escalate:**
- Confidence below threshold
- High-stakes actions (money, reputation)
- Repeated failures
- Ambiguous instructions
- User explicitly requests review

**Implementation:**
```python
class HumanReviewGate:
    async def check_needs_review(self, action, context):
        if action.risk_level == 'high':
            return True
        if context.confidence < CONFIDENCE_THRESHOLD:
            return True
        if context.retry_count > MAX_RETRIES:
            return True
        return False
    
    async def request_review(self, action, context):
        # Show preview
        preview = await self.generate_preview(action)
        
        # Request human approval
        approval = await self.notify_user(
            f"Please review before executing:\n{preview}",
            actions=['approve', 'reject', 'modify']
        )
        
        return approval
```

**Recommendation for Opie/Moltbot:**
```
Priority: VERY HIGH (Impact: High, Effort: Medium)
- Implement retry with exponential backoff on all tools
- Add circuit breaker for external services
- Create graceful degradation tiers
- Validate all LLM outputs before execution
- Add human-in-the-loop for high-stakes actions
- Log all errors with context for debugging
```

---

## Implementation Priority Matrix

| Recommendation | Impact | Effort | Priority |
|----------------|--------|--------|----------|
| Error handling & graceful degradation | High | Medium | **P0** |
| Response streaming everywhere | High | Low | **P0** |
| Cross-device conversation sync | High | Medium | **P1** |
| Proactive heartbeat system | Very High | Medium | **P1** |
| Tool Search pattern for tools | High | Medium | **P1** |
| Prompt caching | High | Low | **P1** |
| Security/privacy controls | High | Medium | **P1** |
| Voice barge-in handling | High | Medium | **P2** |
| Personalization engine | Medium-High | Medium | **P2** |
| On-device offline capabilities | High | High | **P3** |
| Semantic response caching | Medium | Medium | **P3** |

---

## Appendix: Key Resources

### Papers & Research
- "ReAct: Synergizing Reasoning and Acting in Language Models" (Yao et al., 2022)
- "MemGPT: Towards LLMs as Operating Systems" (Packer et al., 2023)
- "Speculative Decoding" (Google Research, 2022-2024)
- "Multi-Agent Collaboration Mechanisms: A Survey of LLMs" (arXiv, 2025)

### Open Source Projects
- [LangGraph](https://github.com/langchain-ai/langgraph) - State machine orchestration
- [MemGPT/Letta](https://github.com/letta-ai/letta) - Virtual context management
- [DroidRun](https://github.com/droidrun/droidrun) - Mobile device control
- [MCP](https://github.com/modelcontextprotocol) - Model Context Protocol

### Documentation
- [Anthropic Tool Use](https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview)
- [OpenAI Structured Outputs](https://platform.openai.com/docs/guides/structured-outputs)
- [LangChain Memory](https://docs.langchain.com/oss/python/langgraph/overview)

---

*This research document should be updated quarterly as the field evolves rapidly.*
