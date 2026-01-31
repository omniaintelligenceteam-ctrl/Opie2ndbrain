# Useful AI Agent Types for Opie

*Research compiled: January 2026*
*Focus: Practical, buildable agents for business owners / entrepreneurs*

---

## Overview

AI agents differ from simple assistants—they can observe, decide, and act autonomously to achieve goals. For Opie as an orchestrator, specialized agents handle specific domains while Opie coordinates, delegates, and maintains context.

**Architecture Model:**
```
                    ┌─────────────────┐
                    │      Opie       │
                    │  (Orchestrator) │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │          │         │         │          │
   ┌────┴────┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐ ┌───┴───┐
   │Productiv│ │Creative│ │Research│ │Automat│ │Special│
   │  Agents │ │ Agents │ │ Agents │ │ Agents│ │ Agents│
   └─────────┘ └────────┘ └────────┘ └───────┘ └───────┘
```

---

## 1. Productivity Agents

### 1.1 Calendar Commander
**Purpose:** Intelligent scheduling that goes beyond simple booking

**Capabilities:**
- Schedule optimization (batch meetings, protect deep work time)
- Travel time calculation between appointments
- Smart rescheduling when conflicts arise
- Prep time auto-blocking before important meetings
- Time zone handling for international calls
- Recurring meeting pattern optimization

**Integration with Opie:**
- Opie says "Schedule a call with John next week" → Calendar Commander finds optimal slot, sends invite, adds prep time
- Proactive alerts: "You have 4 meetings tomorrow but no lunch blocked"

**APIs/Tools:**
- Google Calendar API / Microsoft Graph API
- Calendly API for external booking
- Travel time: Google Maps API
- Timezone: WorldTimeAPI

---

### 1.2 Inbox Zero Agent
**Purpose:** Email triage, categorization, and smart response drafting

**Capabilities:**
- Priority scoring (urgent vs. can-wait vs. FYI)
- Auto-categorization (leads, support, personal, newsletters)
- Draft responses for common patterns
- Follow-up tracking (sent 3 days ago, no response)
- Newsletter/promo auto-archiving
- VIP sender detection and prioritization

**Integration with Opie:**
- Morning brief: "3 urgent emails need attention, 2 follow-ups pending"
- "What did Sarah say about the proposal?" → searches and summarizes

**APIs/Tools:**
- Gmail API / Microsoft Graph
- Resend for outbound (existing setup)
- Custom NLP for classification

---

### 1.3 Task Orchestrator
**Purpose:** Project and task management with intelligent prioritization

**Capabilities:**
- Break down goals into actionable tasks
- Dependency tracking (can't do X until Y is done)
- Priority matrix (urgent/important quadrants)
- Deadline alerts with buffer time
- Progress tracking and reporting
- Context switching cost awareness

**Integration with Opie:**
- "What should I focus on today?" → considers deadlines, energy patterns, meeting gaps
- Auto-capture tasks from conversations: "Oh I need to call the accountant" → creates task

**APIs/Tools:**
- Notion API / Linear API / Todoist API
- Local markdown for simple storage
- Time blocking integration with Calendar Commander

---

## 2. Creative Agents

### 2.1 Content Architect
**Purpose:** Long-form content planning and creation

**Capabilities:**
- Content calendar management
- Blog post/article outlining and drafting
- SEO keyword integration
- Repurposing (blog → social posts → newsletter)
- Brand voice consistency checking
- Headline/title generation and A/B suggestions

**Integration with Opie:**
- "I need a blog post about landscape lighting trends" → researches, outlines, drafts
- Weekly content review: "Your blog is due for a post, last was 12 days ago"

**APIs/Tools:**
- WordPress API for publishing
- SEMrush/Ahrefs API for SEO
- Unsplash API for images
- Grammarly API for polish

---

### 2.2 Visual Design Agent
**Purpose:** Quick design generation and brand consistency

**Capabilities:**
- Social media graphics (sized correctly per platform)
- Quote cards, announcement graphics
- Brand color/font enforcement
- Simple photo editing (crop, filter, overlay text)
- Thumbnail generation

**Integration with Opie:**
- "Make me an Instagram post announcing our spring special"
- "Create a before/after graphic for this project"

**APIs/Tools:**
- Canva API / Figma API
- DALL-E / Midjourney for generation
- Remove.bg for background removal
- Cloudinary for image manipulation

---

### 2.3 Video Script Agent
**Purpose:** Video content planning and scripting

**Capabilities:**
- Script writing (intro, body, CTA structure)
- Shot list creation
- Caption/subtitle generation
- Video description + tags optimization
- Hook writing (first 3 seconds)

**Integration with Opie:**
- "I want to make a YouTube video about outdoor lighting installation"
- Generates script, shot suggestions, optimized title/description

**APIs/Tools:**
- YouTube Data API
- Descript for transcription
- TubeBuddy/VidIQ concepts for optimization

---

## 3. Research Agents

### 3.1 Deep Dive Researcher
**Purpose:** Comprehensive research on any topic

**Capabilities:**
- Multi-source gathering (web, academic, news)
- Source credibility assessment
- Synthesis and summarization
- Contradiction detection across sources
- Citation tracking
- Gap identification (what's NOT being said)

**Integration with Opie:**
- "Research the commercial lighting market in Dallas"
- Returns structured report with key findings, sources, and recommendations

**APIs/Tools:**
- Brave Search API (existing)
- Perplexity API
- Google Scholar (scraping)
- Apify for structured data

---

### 3.2 Competitive Intel Agent
**Purpose:** Monitor competitors and market positioning

**Capabilities:**
- Competitor website monitoring (new services, pricing changes)
- Review analysis (what customers love/hate about competitors)
- Social media tracking
- Job posting analysis (what are they hiring for?)
- Google Alert style notifications
- Market positioning reports

**Integration with Opie:**
- Weekly digest: "Here's what changed with your top 3 competitors"
- "How do our prices compare to XYZ Lighting?"

**APIs/Tools:**
- Apify for scraping
- Google Alerts
- ReviewTrackers API
- LinkedIn API (limited)
- SimilarWeb API

---

### 3.3 Fact Checker Agent
**Purpose:** Verify claims and ensure accuracy

**Capabilities:**
- Cross-reference claims against reliable sources
- Date/statistics verification
- Quote attribution checking
- Logical consistency analysis
- Bias detection in sources

**Integration with Opie:**
- Before sending important communications, verify key claims
- "Is it true that LED lighting saves 75% on energy costs?"

**APIs/Tools:**
- Multiple search APIs
- Snopes/fact-check site APIs
- Academic databases

---

## 4. Automation Agents

### 4.1 Workflow Automator
**Purpose:** Build and manage automated workflows

**Capabilities:**
- Trigger detection (new email, form submission, time-based)
- Multi-step workflow execution
- Conditional logic (if/then branching)
- Error handling and retry logic
- Logging and audit trails
- Human-in-the-loop checkpoints

**Integration with Opie:**
- "When someone fills out the contact form, send a thank you email, create a CRM entry, and notify me"
- Manages n8n/Zapier workflows programmatically

**APIs/Tools:**
- n8n (self-hosted, existing consideration)
- Zapier Webhooks
- Make.com API
- Custom Node.js workflows

---

### 4.2 Data Pipeline Agent
**Purpose:** ETL and data processing tasks

**Capabilities:**
- Data extraction from various sources
- Cleaning and transformation
- Validation and quality checks
- Loading into destinations
- Scheduled runs
- Anomaly detection

**Integration with Opie:**
- "Pull all our Google Ads data into a spreadsheet weekly"
- "When the CRM export happens, clean it up and generate a report"

**APIs/Tools:**
- Google Sheets API
- Airtable API
- Database connectors (Postgres, etc.)
- Pandas/data manipulation libraries

---

### 4.3 System Monitor Agent
**Purpose:** Watch systems and alert on issues

**Capabilities:**
- Uptime monitoring (websites, APIs)
- Performance metrics tracking
- Error log watching
- Threshold-based alerting
- Daily health reports
- Auto-remediation for simple issues

**Integration with Opie:**
- "Website is down" → immediate alert
- "Server CPU has been high for 2 hours" → proactive notification

**APIs/Tools:**
- UptimeRobot / Pingdom APIs
- Server monitoring (existing Moltbot infrastructure)
- Custom health check scripts

---

## 5. Communication Agents

### 5.1 Outreach Agent
**Purpose:** Manage prospecting and lead communication

**Capabilities:**
- Personalized cold email generation
- Follow-up sequence management
- Response detection and categorization
- A/B testing of messaging
- Optimal send time calculation
- Lead scoring integration

**Integration with Opie:**
- "Send a personalized intro email to these 10 architects"
- Tracks responses, suggests follow-ups, updates CRM

**APIs/Tools:**
- Resend API (existing)
- Apollo/Hunter for email finding
- CRM APIs (HubSpot, Pipedrive)
- LinkedIn (careful with ToS)

---

### 5.2 Social Media Agent
**Purpose:** Social presence management

**Capabilities:**
- Post scheduling and publishing
- Engagement monitoring (mentions, comments)
- Comment response drafting
- Trending topic identification
- Analytics and reporting
- Hashtag optimization

**Integration with Opie:**
- "Post this project photo to Instagram and Facebook"
- Weekly: "Your top post got 500 impressions, engagement up 20%"

**APIs/Tools:**
- Meta Graph API (Facebook, Instagram)
- X/Twitter API
- LinkedIn API
- Buffer/Hootsuite APIs

---

### 5.3 Customer Response Agent
**Purpose:** Handle routine customer inquiries

**Capabilities:**
- FAQ-based response generation
- Sentiment detection (escalate angry customers)
- Response time SLA tracking
- Template personalization
- Handoff to human when needed
- Knowledge base integration

**Integration with Opie:**
- Monitors incoming messages, drafts responses, flags complex issues
- "Someone asked about pricing" → pulls current pricing, drafts response for approval

**APIs/Tools:**
- Help Scout / Zendesk / Intercom APIs
- Custom knowledge base (RAG)
- Sentiment analysis models

---

## 6. Specialist Agents

### 6.1 Code Assistant Agent
**Purpose:** Development support and automation

**Capabilities:**
- Code generation from descriptions
- Bug finding and fixing
- Code review and suggestions
- Documentation generation
- Test writing
- Refactoring recommendations

**Integration with Opie:**
- "Write a script that processes our invoices"
- "Why is this function failing?"

**APIs/Tools:**
- GitHub Copilot concepts
- Claude API for code generation
- Local execution sandbox
- Git integration

---

### 6.2 Finance Agent
**Purpose:** Financial tracking and insights

**Capabilities:**
- Expense categorization
- Invoice processing
- Cash flow forecasting
- Budget vs. actual tracking
- Tax preparation assistance (data organization)
- Financial report generation

**Integration with Opie:**
- "What did we spend on materials last month?"
- Monthly: "Revenue up 15%, but material costs increased 20%"

**APIs/Tools:**
- QuickBooks / Xero APIs
- Plaid for bank connections
- Stripe API for payments
- Custom spreadsheet integration

---

### 6.3 Legal Document Agent
**Purpose:** Contract and legal document assistance

**Capabilities:**
- Contract review (flag unusual clauses)
- Template customization
- Compliance checklist management
- Document comparison (what changed?)
- Deadline tracking (renewals, expirations)
- Plain-language explanations

**Integration with Opie:**
- "Review this contractor agreement"
- "When does our insurance expire?"

**APIs/Tools:**
- DocuSign API
- PandaDoc API
- Claude for analysis (with disclaimers)
- Custom clause libraries

**⚠️ Note:** Always include "not legal advice" disclaimers. Flags for attorney review on significant matters.

---

### 6.4 Lead Qualification Agent
**Purpose:** Score and qualify incoming leads

**Capabilities:**
- Lead scoring based on criteria
- Company/person research
- Budget qualification signals
- Timeline assessment
- Fit scoring against ideal customer profile
- Prioritization recommendations

**Integration with Opie:**
- New lead comes in → researches company, scores fit, recommends next action
- "This lead looks promising: $2M+ revenue company, expanding their property"

**APIs/Tools:**
- Clearbit / Apollo for enrichment
- LinkedIn (limited)
- Apify for company research
- CRM integration

---

## Priority Recommendations for Building

### Phase 1: High Impact, Buildable Now
1. **Inbox Zero Agent** - Daily time savings, clear ROI
2. **Deep Dive Researcher** - Leverages existing web tools
3. **Content Architect** - Supports marketing needs
4. **Workflow Automator** - Foundation for other automations

### Phase 2: Business Growth Focus
5. **Lead Qualification Agent** - Sales efficiency
6. **Outreach Agent** - Scalable prospecting
7. **Calendar Commander** - Time optimization
8. **Competitive Intel Agent** - Strategic advantage

### Phase 3: Operational Excellence
9. **Finance Agent** - Business health visibility
10. **Customer Response Agent** - Scale support
11. **Task Orchestrator** - Personal productivity
12. **Social Media Agent** - Brand presence

---

## Integration Patterns

### Event-Driven
```
Trigger (email/webhook/schedule) → Agent processes → Opie notified if needed
```

### Request-Response
```
User asks Opie → Opie delegates to specialist → Agent returns result → Opie responds
```

### Proactive Monitoring
```
Agent monitors continuously → Threshold crossed → Alert to Opie → User notified
```

### Collaborative
```
Multiple agents work together → Researcher feeds Content Architect → Outreach Agent distributes
```

---

## Key Principles

1. **Human in the loop for external actions** - Draft, don't send automatically
2. **Graceful degradation** - If agent fails, Opie handles it or asks user
3. **Transparent reasoning** - Agents explain why they made decisions
4. **Specialist over generalist** - Narrow scope, deep capability
5. **Composable** - Agents can call other agents through Opie

---

## Technical Considerations

### For Each Agent, Define:
- **Trigger conditions** (when does it activate?)
- **Input schema** (what data does it need?)
- **Output schema** (what does it return?)
- **Error handling** (what if it fails?)
- **Human escalation rules** (when to involve user?)
- **Rate limits and costs** (API usage)

### Shared Infrastructure Needs:
- Message queue for async tasks
- Persistent state storage
- Logging and observability
- Secrets management
- Sandbox execution environment

---

*This research provides a foundation for building out Opie's agent ecosystem. Start with high-impact, low-complexity agents and expand based on actual usage patterns.*
