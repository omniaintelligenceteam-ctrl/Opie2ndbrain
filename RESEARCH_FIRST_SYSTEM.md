# Research-First Content Creation System

A comprehensive content creation system that **requires** research completion before any content is generated. This ensures all content is data-driven, strategically aligned, and built on market insights.

## 🧬 System Overview

```
USER INPUT → RESEARCH AGENT → STRATEGY AGENT → CONTENT AGENTS → FINAL ASSETS
     ↓             ↓               ↓               ↓              ↓
Parse Intent → Web Research → Platform Planning → AI Writing → Selection UI
```

**Key Principle:** Research MUST complete before content creation begins. No shortcuts.

## 📋 Table of Contents

- [How It Works](#how-it-works)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Components](#components)
- [Agent Behavior](#agent-behavior)
- [Usage Examples](#usage-examples)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)

## 🔬 How It Works

### Phase 1: Input Parser
```typescript
parseContentRequest(userInput: string) // → ParsedContentRequest
```

**Extracts:**
- **Trade:** HVAC/Plumbing/etc (asks if unclear)
- **Topic:** What's the content about (asks if vague) 
- **Platforms:** LinkedIn/Instagram/Email/Video/Hooks/Images
- **Tone:** Professional/casual/urgent (defaults to professional)
- **Intent:** Full creation vs research-only

**Example:**
```javascript
const parsed = parseContentRequest("Create HVAC content for LinkedIn about missed calls")
// Result: { topic: "missed calls", trade: "hvac", platforms: ["linkedin"], tone: "professional" }
```

### Phase 2: Research Agent (Critical Step)

Research runs FIRST, always, in parallel where possible:

1. **Web Search** (`web_search` tool)
   - Latest trends in [trade] industry 2024
   - Contractor statistics [trade]
   - Common problems [trade] business owners face

2. **Competitor Scan** (`web_search` + `web_fetch`)
   - Find top 5 content pieces from competitors
   - Extract hooks, CTAs, angles that work

3. **Viral Hook Analysis** (Agent reasoning)
   - Emotional triggers (pain, fear, aspiration)
   - Stats/numbers that get engagement
   - Formats (listicle, story, contrarian)

4. **Brand Audit** (`web_fetch` silentaipartner.com)
   - Company voice, services, pricing
   - Key differentiators to weave into content

5. **Platform Best Practices** (Agent reasoning)
   - LinkedIn: data-driven, professional, 1300 char limit
   - Instagram: visual-first, short hooks, hashtags
   - Email: longer form, story-driven, soft CTAs
   - Video: 30-60 seconds, hook in first 3 seconds

**Research Output (saved to `content_bundles.research_findings`):**
```json
{
  "trending_angles": ["cost of missed calls", "seasonal maintenance"],
  "key_statistics": {"missed_call_rate": "62%", "avg_loss": "$10K/year"},
  "viral_hooks": ["You lose $X every time...", "Stop doing Y..."],
  "competitor_insights": "Competitors focus on price, not ROI",
  "platform_strategy": {
    "linkedin": "stat + challenge + CTA",
    "instagram": "swipe if + visual problem"
  },
  "brand_voice": "professional but punchy, data-backed",
  "recommended_cta": "Book free workflow audit",
  "research_sources": ["source1", "source2"],
  "confidence_score": 85
}
```

### Phase 3: Strategy Agent (Platform Planning)

Strategy agent reviews research and creates content briefs per platform.

**Strategy Document (saved to `content_bundles.strategy_doc`):**
```json
{
  "linkedin_strategy": {
    "hook": "62% of HVAC calls go unanswered...",
    "angle": "cost-based fear",
    "body": "data + story + CTA",
    "hashtag_seeds": ["#HVAC", "#ContractorLife"]
  },
  "instagram_strategy": {
    "visual_concept": "missed call = missed money graphic",
    "hook": "Swipe if you've ever missed a call...",
    "body": "short problem/solution"
  },
  "email_strategy": {
    "subject_line_options": ["3 signs your phone system is costing you..."],
    "story_angle": "personal story of contractor who fixed it",
    "cta": "book audit"
  }
}
```

### Phase 4: Content Agents (Research-Driven Creation)

**Six Specialized Agents (spawned in parallel):**

1. **email_agent** - 3-part email sequence using research stats
2. **linkedin_agent** - LinkedIn post using platform strategy
3. **instagram_agent** - Instagram caption + visual concept  
4. **video_agent** - HeyGen script with hook from research
5. **hooks_agent** - 10 compelling hook variations
6. **image_agent** - 5 image generation prompts (Nano Banana style)

**Each agent receives:**
- Topic + trade
- Full research findings
- Platform-specific strategy
- Brand voice guidelines

**Enhanced Agent Output:**
```json
{
  "email": "Full email text with research stats...",
  "research_influence": {
    "statistics": "Used 62% missed call rate",
    "hooks": "Applied fear-based hook pattern",
    "brand_voice": "Maintained professional but punchy tone",
    "strategy": "Followed email sequence flow"
  }
}
```

### Phase 5: Image Generation

Uses Gemini API with Nano Banana commercial photography style:

```typescript
const imagePrompt = `Professional commercial photography, ${trade} contractor in clean uniform, ${scene_description}, warm natural lighting, premium service aesthetic, 8k resolution, photorealistic`
```

### Phase 6: Review & Selection UI

**ResearchDrivenContentStudio** component provides:

1. **Research Summary Card** (expandable)
   - Key stats, trending angles
   - Competitor analysis
   - Platform strategy

2. **Assets Grid** with "Based on research" tags
   - Email: "Uses 62% stat from research"
   - LinkedIn: "Follows viral hook pattern"

3. **Asset Actions:**
   - [Keep] - Mark as selected
   - [Drop] - Reject and archive
   - [Regenerate] - Opens comparison view

4. **Regeneration Panel:**
   - Side-by-side comparison
   - Options: angle, length, tone, focus
   - Keep current vs Keep new

## 🛠 API Endpoints

### Main Creation Endpoint
```
POST /api/content-dashboard/create
```

**Research-First Mode (default):**
```json
{
  "topic": "missed call management",
  "trade": "HVAC", 
  "selectedAssets": ["email", "linkedin", "instagram"],
  "tone": "professional",
  "intent": "full_creation",
  "autoApprove": false,
  "skipResearch": false
}
```

**Legacy Mode (skip research):**
```json
{
  "topic": "HVAC maintenance tips",
  "trade": "HVAC",
  "selectedAssets": ["linkedin"],
  "skipResearch": true
}
```

### Research Endpoints
```
GET  /api/content-dashboard/research?bundleId=xxx
POST /api/content-dashboard/research  // Actions: update_findings, restart_research
```

### Strategy Endpoints  
```
GET  /api/content-dashboard/strategy?bundleId=xxx
POST /api/content-dashboard/strategy  // Actions: approve, regenerate, update, reject
```

## 🗄 Database Schema

### Updated `content_bundles` Table
```sql
ALTER TABLE content_bundles ADD COLUMN research_findings JSONB;
ALTER TABLE content_bundles ADD COLUMN strategy_doc JSONB;
ALTER TABLE content_bundles ADD COLUMN status VARCHAR DEFAULT 'researching';
-- Status values: 'researching', 'awaiting_strategy_approval', 'creating', 'review', 'complete', 'failed'

ALTER TABLE content_bundles ADD COLUMN research_started_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN research_completed_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN strategy_started_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN strategy_completed_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN creation_started_at TIMESTAMPTZ;
ALTER TABLE content_bundles ADD COLUMN research_session_id TEXT;
```

### Updated `content_assets` Table
```sql
ALTER TABLE content_assets ADD COLUMN research_influence JSONB;
```

### New `content_images` Table
```sql
CREATE TABLE content_images (
  id TEXT PRIMARY KEY,
  bundle_id TEXT REFERENCES content_bundles(id) ON DELETE CASCADE,
  prompt TEXT NOT NULL,
  original_prompt TEXT,
  url TEXT NOT NULL,
  style TEXT DEFAULT 'commercial_photography',
  aspect_ratio TEXT DEFAULT '1:1', 
  status TEXT DEFAULT 'generated',
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'
);
```

## 🧩 Components

### `ResearchContentStudio` (Main UI)
```tsx
<ResearchContentStudio bundleId="bnd_xxx" onClose={() => {}} />
```

- **Research Tab:** Shows research findings and progress
- **Strategy Tab:** Strategy document and approval flow  
- **Assets Tab:** Generated content with research influences

### `ResearchPanel` (Research Display)
```tsx
<ResearchPanel 
  bundle={bundle}
  expanded={true}
  onToggleExpanded={() => {}}
  onReload={() => {}}
/>
```

Features:
- Progress tracking during research phase
- Expandable detailed findings
- Research sources with timestamps
- Confidence scoring

### `AssetCompare` (Regeneration)
```tsx  
<AssetCompare
  asset={selectedAsset}
  onClose={() => {}}
  onRegenerate={() => {}}
/>
```

Features:
- Side-by-side comparison
- Regeneration options (angle, length, focus)
- Research influence display
- Version management

## 🤖 Agent Behavior

**Agent Model Selection:**
- **Research Agent:** Kimi K2.5 (cost-effective, good at web search + summary)
- **Strategy Agent:** Claude Sonnet 4 (strategic thinking)
- **Content Agents:** Claude Sonnet 4 (quality writing)

**Research-Enhanced Prompts:**
All content agents receive research findings and strategy context:

```typescript
const emailPrompt = `Create email sequence for "${topic}" targeting ${trade} businesses.

RESEARCH INSIGHTS:
- Key Statistics: ${researchFindings.key_statistics}
- Viral Hooks: ${researchFindings.viral_hooks}
- Brand Voice: ${researchFindings.brand_voice}

EMAIL STRATEGY:
${strategy.email_strategy}

REQUIREMENTS:
- Use subject line: ${strategy.email_strategy.subject_line_options[0]}
- Incorporate key statistics
- Follow story angle: ${strategy.email_strategy.story_angle}
- Brand voice: ${researchFindings.brand_voice}
`
```

## 🧪 Usage Examples

### 1. Complete Research-First Flow
```javascript
// 1. Parse user input
const parsed = parseContentRequest("Create professional HVAC content about missed calls for LinkedIn and Instagram")

// 2. Start research-first creation
const response = await fetch('/api/content-dashboard/create', {
  method: 'POST',
  body: JSON.stringify({
    topic: parsed.topic,
    trade: parsed.trade,
    selectedAssets: parsed.platforms,
    tone: parsed.tone,
    autoApprove: false // User must approve strategy
  })
})

const { bundleId } = await response.json()

// 3. Monitor research progress
const researchStatus = await fetch(`/api/content-dashboard/research?bundleId=${bundleId}`)

// 4. Approve strategy when ready
await fetch('/api/content-dashboard/strategy', {
  method: 'POST',
  body: JSON.stringify({ bundleId, action: 'approve' })
})

// 5. Content creation begins automatically
```

### 2. Take The Wheel Mode
When user says "take the wheel":
- Agent asks ONE critical question at a time
- Puts key question in ALL CAPS
- Auto-advances on user response

```
User: "Take the wheel and help me create content"
Agent: "WHAT INDUSTRY/TRADE are you in? (HVAC, plumbing, electrical, etc.)"
User: "HVAC" 
Agent: "WHAT SPECIFIC TOPIC should we create content about?"
User: "Missed customer calls"
Agent: "Starting research on missed call management for HVAC contractors..."
```

### 3. Research-Only Mode
```javascript
await fetch('/api/content-dashboard/create', {
  method: 'POST',
  body: JSON.stringify({
    topic: "seasonal maintenance",
    trade: "HVAC",
    intent: "research_only" // Stops after research phase
  })
})
```

## 🔍 Testing

Run the test suite:
```bash
node test-research-first-system.js
```

**Tests:**
- ✅ Input parser with various user inputs
- ✅ Research-first API endpoint
- ✅ Legacy mode compatibility  
- ✅ Configuration endpoint
- ✅ Research progress tracking
- ✅ Strategy approval flow

**Manual Testing:**
1. Start server: `npm run dev`
2. Open: `http://localhost:3000/content-command-center`
3. Create research-first bundle
4. Monitor in Discord #agents channel
5. Review research findings
6. Approve strategy
7. Examine generated content

## 🐛 Troubleshooting

### Common Issues

**Research Agent Gets Stuck:**
- Check agent session in Discord #agents
- Restart research: `POST /api/content-dashboard/research` with `action: "restart_research"`
- Verify web_search and web_fetch tools are available

**Strategy Not Generated:**
- Ensure research completed successfully
- Check research_findings in database is not null
- Verify strategy agent has access to research data

**Content Agents Don't Use Research:**
- Check research_influence field in content_assets
- Verify enhanced prompts include research context
- Ensure research_findings and strategy_doc are passed to agents

**UI Not Updating:**
- Check WebSocket connections for realtime updates
- Verify polling intervals in components
- Check browser console for API errors

### Debug Commands

**Check Bundle Status:**
```sql
SELECT id, status, research_started_at, research_completed_at, 
       strategy_started_at, strategy_completed_at
FROM content_bundles WHERE id = 'bnd_xxx';
```

**Check Research Findings:**
```sql
SELECT research_findings->'confidence_score' as confidence,
       research_findings->'trending_angles' as angles
FROM content_bundles WHERE id = 'bnd_xxx';
```

**Check Asset Research Influence:**
```sql
SELECT type, research_influence, created_at 
FROM content_assets WHERE bundle_id = 'bnd_xxx';
```

## 🚀 Deployment Checklist

- [ ] Database migrations applied
- [ ] Environment variables configured (GEMINI_API_KEY for images)
- [ ] Agent models available (Kimi K2.5, Claude Sonnet 4)
- [ ] Web search tools functional
- [ ] Discord integration for agent monitoring
- [ ] Supabase realtime enabled
- [ ] Error logging configured

## 📚 References

- [Agent Orchestration Guide](/src/lib/agentOrchestrator.ts)
- [Research System Details](/src/lib/research.ts)
- [Content Strategy Framework](/src/lib/contentStrategy.ts)
- [Image Generation Integration](/src/lib/imageGeneration.ts)
- [Input Parser Documentation](/src/lib/inputParser.ts)

---

**Key Insight:** This system transforms content creation from "spray and pray" to strategic, research-backed assets that actually work because they're built on real market data and competitor analysis.

The research phase is not optional—it's the foundation that makes everything else effective.