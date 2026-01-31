# Comprehensive Skill Library Proposal
## For Omnia Light Scape Pro AI Team

*Research completed: 2026-01-28*
*Prepared by: Research Subagent*

---

## Executive Summary

This proposal outlines **45 skills** across 5 categories, prioritized for a SaaS startup building landscape lighting software with AI mockups. Skills are designed for a multi-agent ecosystem where Ali (main assistant) coordinates specialized "bees" (agents).

**Current Skills:** GitHub, Brave Search, Browser Use, Marketing Mode, Remotion, Humanizer
**Proposed Skills:** 45 new skills (15 P0, 18 P1, 12 P2)

---

## 1. CORE SKILLS FOR ALI (Main Assistant)

These skills make Ali a true executive assistant + COO hybrid.

### P0 - Critical (Daily Use)

| Skill | Description | Key Capabilities |
|-------|-------------|------------------|
| **daily-operations** | Morning briefing, daily standup, EOD summary | Auto-generate briefs, track action items, monitor key metrics, prioritize tasks |
| **email-management** | Gmail reading + Resend sending, unified inbox | Read/search inbox, draft responses, send via Resend, follow-up tracking |
| **calendar-management** | Google Calendar + scheduling | View/create events, find availability, smart scheduling, meeting prep |
| **project-tracker** | KANBAN.md management + progress tracking | Update status, create tasks, deadline tracking, blockers identification |
| **context-manager** | Memory system optimization | MEMORY.md curation, daily log management, context recovery, smart summarization |

### P1 - High Priority

| Skill | Description | Key Capabilities |
|-------|-------------|------------------|
| **decision-logger** | Track decisions with context/rationale | Log decisions, link to conversations, searchable history, revisit past choices |
| **document-templates** | Standard docs for Omnia operations | Proposals, contracts, SOPs, email templates, customizable formats |
| **meeting-notes** | Structure meeting summaries + action items | Auto-extract todos, assign owners, deadline tracking, follow-up reminders |
| **async-briefing** | Catch Wes up on overnight work | Summarize changes, highlight PRs, report metrics, note blockers |

### P2 - Medium Priority

| Skill | Description | Key Capabilities |
|-------|-------------|------------------|
| **time-tracker** | Track time spent on projects/tasks | Log time, generate reports, identify bottlenecks, estimate future work |
| **knowledge-base** | Internal wiki management | Create/search docs, link related info, version control, team onboarding |

---

## 2. DEVELOPMENT SKILLS

Critical for the React + Supabase + Stripe stack.

### P0 - Critical

| Skill | Description | Agents | Key Capabilities |
|-------|-------------|--------|------------------|
| **supabase-dev** | Supabase database + auth + storage | Code Agent, Ali | Schema design, RLS policies, migrations, edge functions, storage buckets |
| **react-patterns** | React/TS/Vite best practices | Code Agent | Component patterns, hooks, state management, performance optimization |
| **stripe-integration** | Stripe subscriptions + payments | Code Agent, Ali | Subscription flows, webhooks, customer portal, metered billing, refunds |
| **ai-pipeline** | Image generation pipeline management | Code Agent, AI Agent | Prompt engineering, model selection, cost optimization, quality scoring |
| **testing-automation** | Test writing + CI/CD | Code Agent | Unit tests, E2E tests, GitHub Actions, test coverage |

### P1 - High Priority

| Skill | Description | Agents | Key Capabilities |
|-------|-------------|--------|------------------|
| **code-review** | PR review with actionable feedback | Code Agent | Security scan, performance check, style consistency, suggested fixes |
| **db-optimization** | Database performance tuning | Code Agent | Query analysis, index recommendations, RLS optimization, Supabase dashboard |
| **api-design** | REST/GraphQL API patterns | Code Agent | Endpoint design, versioning, error handling, documentation |
| **deployment-ops** | Deploy + monitor production | Code Agent, Ali | Deploy workflows, rollback procedures, health checks, error tracking |
| **prompt-engineering** | AI prompt optimization | AI Agent | Prompt templates, A/B testing prompts, cost/quality tradeoffs |

### P2 - Medium Priority

| Skill | Description | Agents | Key Capabilities |
|-------|-------------|--------|------------------|
| **accessibility-check** | WCAG compliance scanning | Code Agent | Audit pages, fix suggestions, screen reader testing |
| **performance-audit** | Core Web Vitals optimization | Code Agent | Lighthouse audits, bundle analysis, lazy loading, image optimization |
| **documentation-gen** | Auto-generate docs from code | Code Agent | JSDoc → README, API docs, changelog generation |

---

## 3. BUSINESS/GROWTH SKILLS

Lead generation, outreach, and growth for Omnia.

### P0 - Critical

| Skill | Description | Agents | Key Capabilities |
|-------|-------------|--------|------------------|
| **lead-scraper** | Find landscape lighting contractors | Research Agent | Google Maps scraping, Yelp/BBB extraction, LinkedIn company search |
| **lead-enrichment** | Enrich leads with contact info | Research Agent | Email finding, phone lookup, social profiles, company data |
| **cold-outreach** | Email sequences for B2B sales | Outreach Agent, Ali | Template library, personalization, sequence timing, follow-up logic |
| **competitor-monitor** | Track competitor pricing/features | Research Agent | Price tracking, feature comparison, review monitoring, alert on changes |

### P1 - High Priority

| Skill | Description | Agents | Key Capabilities |
|-------|-------------|--------|------------------|
| **content-calendar** | Plan + track content production | Content Agent, Ali | Editorial calendar, content types, platform-specific scheduling |
| **social-content** | Create platform-specific posts | Content Agent | LinkedIn posts, Instagram captions, X threads, before/after showcases |
| **blog-writing** | SEO-optimized blog posts | Content Agent | Keyword research, outline generation, drafting, internal linking |
| **review-management** | Monitor + respond to reviews | Ali | Track G2/Capterra, respond to reviews, request reviews from customers |
| **partnership-outreach** | Find + contact integration partners | Outreach Agent | Integration opportunities, co-marketing, reseller programs |

### P2 - Medium Priority

| Skill | Description | Agents | Key Capabilities |
|-------|-------------|--------|------------------|
| **case-study-builder** | Create customer success stories | Content Agent | Interview templates, story structure, design templates |
| **video-scripts** | Scripts for demo/tutorial videos | Content Agent | Demo scripts, feature walkthroughs, Loom-style guides |
| **newsletter-writer** | Monthly/weekly newsletter content | Content Agent | Product updates, tips, industry news, engagement tracking |

---

## 4. INTEGRATION SKILLS

Connect external services to the workflow.

### P0 - Critical

| Skill | Description | Key Capabilities |
|-------|-------------|------------------|
| **apify-scraping** | Web scraping via Apify actors | Actor selection, run management, data extraction, cost optimization |
| **resend-email** | Transactional + marketing emails | Send emails, templates, tracking, domain management |
| **supabase-admin** | Database admin operations | Backup/restore, user management, usage monitoring, alerts |

### P1 - High Priority

| Skill | Description | Key Capabilities |
|-------|-------------|------------------|
| **vapi-voice** | Voice AI for phone calls | Outbound calls, inbound handling, call scripts, transcription |
| **analytics-tracker** | Metrics + dashboards | Track KPIs, build dashboards, anomaly detection, reporting |
| **google-workspace** | Gmail + Drive + Docs | Read/search Drive, create/edit docs, share files |
| **notion-sync** | Notion workspace management | Create pages, databases, sync with KANBAN, collaborative docs |

### P2 - Medium Priority

| Skill | Description | Key Capabilities |
|-------|-------------|------------------|
| **zapier-automations** | No-code workflow automation | Trigger/action setup, multi-step zaps, error handling |
| **postmark-transactional** | High-deliverability transactional email | Bounce handling, delivery tracking, template management |
| **twilio-sms** | SMS notifications + marketing | Send SMS, 2FA flows, marketing campaigns, opt-out management |

---

## 5. SPECIALIZED AGENT SKILLS

Skills organized by agent type for spawned subagents.

### Research Agent
Should have: `lead-scraper`, `lead-enrichment`, `competitor-monitor`, `apify-scraping`, `brave-search`, `web-research`

| Skill | Description | Priority |
|-------|-------------|----------|
| **web-research** | Deep research on any topic | P0 |
| **market-analysis** | Industry/market research | P1 |
| **tech-research** | Evaluate tools/technologies | P1 |

### Code Agent  
Should have: `supabase-dev`, `react-patterns`, `stripe-integration`, `testing-automation`, `code-review`, `github`

| Skill | Description | Priority |
|-------|-------------|----------|
| **refactor-assistant** | Safely refactor large files | P1 |
| **bug-hunter** | Debug systematically | P1 |
| **migration-planner** | Plan DB/code migrations | P2 |

### Outreach Agent
Should have: `cold-outreach`, `partnership-outreach`, `resend-email`, `humanizer`

| Skill | Description | Priority |
|-------|-------------|----------|
| **email-sequences** | Multi-step email campaigns | P0 |
| **personalization** | Research + personalize messages | P1 |
| **response-handler** | Categorize + draft responses to replies | P1 |

### Content Agent
Should have: `social-content`, `blog-writing`, `content-calendar`, `case-study-builder`, `marketing-mode`

| Skill | Description | Priority |
|-------|-------------|----------|
| **seo-writer** | SEO-optimized content creation | P0 |
| **visual-brief** | Create briefs for design/video | P1 |
| **repurposer** | Turn 1 piece into multiple formats | P1 |

### AI Agent
Should have: `ai-pipeline`, `prompt-engineering`

| Skill | Description | Priority |
|-------|-------------|----------|
| **model-selector** | Choose best model for task | P0 |
| **quality-scorer** | Evaluate AI output quality | P1 |
| **cost-optimizer** | Minimize AI API costs | P1 |

---

## IMPLEMENTATION ROADMAP

### Phase 1: Foundation (Week 1-2)
**Goal:** Core operations + immediate value

1. `daily-operations` - P0 - Ali's backbone
2. `email-management` - P0 - Unified inbox
3. `supabase-dev` - P0 - Core development
4. `lead-scraper` - P0 - Start building pipeline
5. `apify-scraping` - P0 - Powers lead scraper

### Phase 2: Development Velocity (Week 3-4)
**Goal:** Ship faster with quality

6. `react-patterns` - P0
7. `stripe-integration` - P0
8. `ai-pipeline` - P0
9. `testing-automation` - P0
10. `code-review` - P1

### Phase 3: Growth Engine (Week 5-6)
**Goal:** Outbound + content

11. `lead-enrichment` - P0
12. `cold-outreach` - P0
13. `competitor-monitor` - P0
14. `resend-email` - P0
15. `social-content` - P1

### Phase 4: Scale Operations (Week 7-8)
**Goal:** Automation + efficiency

16. `calendar-management` - P0
17. `project-tracker` - P0
18. `vapi-voice` - P1
19. `analytics-tracker` - P1
20. `content-calendar` - P1

---

## SKILL TEMPLATE STRUCTURE

Each skill should follow this format:

```markdown
# Skill Name

One-line description of what this skill does.

## When to Use
- Trigger conditions
- Example scenarios

## Setup
Required config, API keys, dependencies

## Commands/Patterns
Specific commands, code snippets, API calls

## Examples
Real examples with expected output

## Common Mistakes
What to avoid, edge cases

## Related Skills
Links to complementary skills
```

---

## COST CONSIDERATIONS

| Integration | Pricing | Monthly Estimate |
|-------------|---------|------------------|
| Apify | $49/mo (Pro) | $49 |
| Resend | Free tier (3k/mo) → $20/mo | $0-20 |
| Vapi | $0.05/min | ~$50-100 |
| Supabase | Free tier → $25/mo | $0-25 |
| Stripe | 2.9% + $0.30/txn | Variable |
| OpenAI/Claude | Usage-based | $50-200 |

**Estimated Total:** $150-400/month for full stack

---

## KEY RECOMMENDATIONS

1. **Start with lead generation** - `lead-scraper` + `apify-scraping` + `lead-enrichment` gives immediate ROI
2. **Automate the daily grind** - `daily-operations` saves 30+ min/day
3. **Code quality pays off** - `testing-automation` + `code-review` prevents costly bugs
4. **AI pipeline is differentiator** - `ai-pipeline` + `prompt-engineering` is core product value
5. **Content compounds** - `social-content` + `blog-writing` builds organic traffic over time

---

## NEXT STEPS

1. Review this proposal with Wes
2. Prioritize based on immediate needs
3. Create Phase 1 skills (5 skills)
4. Test with real workflows
5. Iterate and expand

---

*End of proposal. Ready for review.*
