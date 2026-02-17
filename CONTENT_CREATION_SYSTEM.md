# Content Creation System - Silent AI Partner

## Overview

The Content Creation System is the core engine behind Silent AI Partner's Content Command Center. It automatically generates comprehensive content bundles by spawning specialized AI agents for different content types.

## Features

### ✨ Content Bundle Creation
- **Topic-Based Generation**: Create content around any topic
- **Trade-Specific**: Customize for different industries (HVAC, Plumbing, etc.)
- **Multi-Asset**: Generate multiple content types simultaneously
- **Agent-Powered**: Each content type has a specialized agent

### 📝 Supported Content Types
1. **Email Sequence** - 3-part professional email series (welcome, value, CTA)
2. **LinkedIn Post** - Professional post with engagement hooks and hashtags
3. **Instagram Caption** - Visual content with story-driven approach and hashtags  
4. **Video Script** - 30-60 second script optimized for HeyGen AI video
5. **Marketing Hooks** - 10 compelling hooks with emotional triggers
6. **Image Prompts** - 5 detailed prompts for AI image generation

### 🔄 Asset Management
- **Status Tracking**: generated → selected → published
- **Version Control**: Keep multiple versions, compare changes
- **Regeneration**: Customize tone, length, angle, focus
- **Quality Scoring**: Automatic quality assessment

## API Endpoints

### Create Content Bundle
```bash
POST /api/content-dashboard/create
```

**Body:**
```json
{
  "topic": "How to Save Money on HVAC Maintenance",
  "trade": "HVAC",
  "selectedAssets": ["email", "linkedin", "instagram", "video_script", "hooks", "image_prompt"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "bundleId": "bnd_1707264000_xyz123",
    "sessionIds": {
      "email": "content-bnd_1707264000_xyz123-email",
      "linkedin": "content-bnd_1707264000_xyz123-linkedin"
    },
    "spawnedAgents": 6,
    "expectedAgents": 6
  }
}
```

### Regenerate Asset
```bash
POST /api/content-dashboard/assets/{assetId}/regenerate
```

**Body:**
```json
{
  "angle": "casual",
  "length": "shorter", 
  "tone": "friendly",
  "focus": "cost savings",
  "style": "bullet points"
}
```

### Agent Completion Webhook
```bash
POST /api/content-dashboard/complete
```

**Body:**
```json
{
  "sessionId": "content-bnd_1707264000_xyz123-email",
  "output": "Agent-generated content with <content-output> tags",
  "status": "completed"
}
```

## Database Schema

### content_bundles
```sql
id TEXT PRIMARY KEY
topic TEXT NOT NULL
trade TEXT
status TEXT DEFAULT 'creating'  -- creating, review, complete, failed
quality_score INTEGER DEFAULT 0
assets JSONB DEFAULT '{}'
created_at TIMESTAMPTZ DEFAULT NOW()
workflow_id TEXT REFERENCES workflows(id)
```

### content_assets
```sql
id TEXT PRIMARY KEY
bundle_id TEXT REFERENCES content_bundles(id)
type TEXT NOT NULL  -- email, linkedin, instagram, video_script, hooks, image_prompt
content TEXT
status TEXT DEFAULT 'generated'  -- generated, selected, regenerating, dropped, archived
metadata JSONB
version INTEGER DEFAULT 1
created_at TIMESTAMPTZ DEFAULT NOW()
```

## Architecture Flow

```mermaid
graph TD
    A[User clicks "Create Bundle"] --> B[POST /api/content-dashboard/create]
    B --> C[createContentBundle()]
    C --> D[Spawn Specialized Agents]
    D --> E[email_agent]
    D --> F[linkedin_agent]
    D --> G[instagram_agent]
    D --> H[video_agent]
    D --> I[hooks_agent]
    D --> J[image_agent]
    
    E --> K[Agent Completes]
    F --> K
    G --> K
    H --> K
    I --> K
    J --> K
    
    K --> L[POST /api/content-dashboard/complete]
    L --> M[processAgentCompletion()]
    M --> N[Parse Output with contentParser]
    N --> O[Save to content_assets]
    O --> P[Check Bundle Completion]
    P --> Q[Update Bundle Status]
```

## Content Parsing

The system uses structured output parsing with `<content-output>` tags:

```javascript
// Agent Output
const output = `
Here's your content:

<content-output>
{"email": "Subject: Welcome!\n\nHi there, ..."}
</content-output>
`;

// Parsed Result
const parsed = parseAgentOutput(output);
// { email: "Subject: Welcome!\n\nHi there, ..." }
```

## Agent Specialization

Each agent has a specific prompt optimized for its content type:

- **email_agent**: Creates 3-part sequences (welcome, value, CTA)
- **linkedin_agent**: Professional posts with engagement hooks
- **instagram_agent**: Visual storytelling with hashtags
- **video_agent**: HeyGen-optimized scripts with visual cues
- **hooks_agent**: 10 variations with emotional triggers
- **image_agent**: Detailed prompts for AI image generation

## Regeneration System

Assets can be regenerated with customization options:

- **Angle**: professional, casual, urgent, educational, conversational
- **Length**: shorter, longer, same
- **Tone**: Custom tone description
- **Focus**: What to emphasize
- **Style**: Format/structure approach

The system keeps all versions for comparison and archives old versions when new ones are created.

## Testing

Run the test suite:

```bash
node test-content-creation-system.js
```

Tests include:
- Configuration loading
- Bundle creation
- Agent completion simulation
- Asset regeneration
- Webhook functionality

## Usage in Content Command Center

1. **User Input**: Topic + trade + asset selection
2. **Bundle Creation**: System spawns agents automatically
3. **Real-time Updates**: Assets appear as agents complete
4. **Review & Edit**: User can regenerate with custom options
5. **Publication**: Selected assets move to publishing pipeline

## Integration Points

- **Gateway**: Agent spawning via `sessions_spawn`
- **Supabase**: Data persistence and real-time updates
- **Frontend**: Real-time bundle status via Supabase subscriptions
- **Publishing**: Assets flow to scheduling and publication systems

## Error Handling

- **Agent Failures**: Tracked in asset metadata, user notified
- **Timeout Handling**: 5-minute timeout per agent
- **Partial Completion**: Bundle marked as review-ready with partial assets
- **Regeneration Failures**: Original asset preserved, user can retry

## Performance

- **Parallel Processing**: All agents spawn simultaneously
- **Async Completion**: No blocking waits for agent responses
- **Efficient Parsing**: Structured output with fallback strategies
- **Database Optimization**: Proper indexing for real-time queries

---

**Status**: ✅ Fully Implemented
**Last Updated**: 2026-02-17
**Version**: 1.0.0