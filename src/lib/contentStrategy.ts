// =============================================================================
// Content Strategy System — Silent AI Partner Strategy Generation
// =============================================================================
// Creates platform-specific content strategies based on research findings

import { getSupabaseAdmin } from './supabase'
import { invokeGatewayTool } from './gateway'
import { ResearchFindings } from './research'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PlatformStrategy {
  hook: string
  angle: string
  body: string
  hashtag_seeds?: string[]
  visual_concept?: string
  cta: string
  length_target: string
  engagement_tactics: string[]
}

export interface ContentStrategyDocument {
  linkedin_strategy: PlatformStrategy
  instagram_strategy: PlatformStrategy
  email_strategy: PlatformStrategy & {
    subject_line_options: string[]
    story_angle: string
    sequence_flow: string
  }
  video_strategy: PlatformStrategy & {
    script_structure: string
    timing_breakdown: string
    visual_elements: string[]
  }
  hooks_strategy: {
    primary_triggers: string[]
    hook_variations: string[]
    testing_approach: string
  }
  image_strategy: {
    visual_themes: string[]
    style_guide: string
    composition_notes: string
    brand_elements: string[]
  }
  overall_narrative: string
  key_differentiators: string[]
  risk_assessment: string
  strategy_confidence: number
  created_at: string
}

export interface StrategyRequest {
  bundleId: string
  selectedPlatforms: string[]
  researchFindings: ResearchFindings
  topic: string
  trade: string
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function getSupabase() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    throw new Error('Supabase not configured. Check environment variables.')
  }
  return supabase
}

// ---------------------------------------------------------------------------
// Strategy Generation
// ---------------------------------------------------------------------------

/**
 * Generate comprehensive content strategy based on research findings
 */
export async function generateContentStrategy(
  request: StrategyRequest
): Promise<{ sessionId: string; success: boolean; error?: string }> {
  const supabase = getSupabase()

  try {
    // Update bundle status
    await supabase
      .from('content_bundles')
      .update({
        strategy_started_at: new Date().toISOString()
      })
      .eq('id', request.bundleId)

    // Create strategy generation prompt
    const strategyPrompt = buildStrategyPrompt(request)

    // Spawn strategy agent (use Sonnet for strategic thinking)
    const result = await invokeGatewayTool('sessions_spawn', {
      task: strategyPrompt,
      label: `strategy-${request.bundleId}`,
      model: 'anthropic/claude-sonnet-4',
      thinking: 'high',
      runTimeoutSeconds: 300, // 5 minutes for strategy
    }, { timeout: 30000 })

    if (!result.ok) {
      throw new Error(result.error?.message || 'Failed to spawn strategy agent')
    }

    const sessionId = (result.result as any)?.sessionId || (result.result as any)?.childSessionKey || `strategy-${request.bundleId}`

    return { sessionId, success: true }

  } catch (error) {
    await supabase
      .from('content_bundles')
      .update({ status: 'failed' })
      .eq('id', request.bundleId)

    return {
      sessionId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Build comprehensive strategy prompt
 */
function buildStrategyPrompt(request: StrategyRequest): string {
  const { selectedPlatforms, researchFindings, topic, trade } = request

  return `You are a content strategy expert for Silent AI Partner. Your job is to create platform-specific content strategies based on research findings.

RESEARCH SUMMARY:
${JSON.stringify(researchFindings, null, 2)}

STRATEGY TARGET:
- Topic: "${topic}"
- Industry/Niche: "${trade}"
- Selected Platforms: ${selectedPlatforms.join(', ')}

STRATEGY TASK:
Create detailed, platform-specific strategies that leverage the research findings. Each strategy should be immediately actionable for content agents.

PLATFORM REQUIREMENTS:

LINKEDIN STRATEGY:
- Hook: Compelling opening line using research stats/angles
- Angle: Professional approach (data-driven, authority-building, problem-solving)
- Body: Structure for 150-300 words (stat → story → solution → CTA)
- CTA: Professional but direct call-to-action
- Engagement tactics: Questions, polls, industry insights
- Length: 1300 character limit consideration

INSTAGRAM STRATEGY:  
- Hook: Eye-catching first line (research-backed hook variations)
- Visual concept: Specific visual idea that supports the message
- Body: Story-driven, relatable content structure
- Hashtag seeds: 8-12 strategic hashtags from research
- CTA: Soft but clear action step
- Engagement tactics: Swipe prompts, save-worthy content, relatability

EMAIL STRATEGY:
- Subject line options: 3 variants using research insights
- Story angle: Narrative approach from research findings
- Hook: Opening that captures attention immediately  
- Body: Value-first structure (problem → insight → solution → soft CTA)
- Sequence flow: How this fits into 3-email sequence
- CTA: Relationship-building call-to-action

VIDEO STRATEGY:
- Hook: First 3-second attention grabber
- Script structure: 30-60 second flow (hook → problem → solution → CTA)
- Timing breakdown: Second-by-second pacing
- Visual elements: Specific visual concepts for HeyGen
- CTA: Clear next step for viewers

HOOKS STRATEGY:
- Primary triggers: Top 3 emotional triggers from research
- Hook variations: Different approaches to same core message
- Testing approach: How to test and iterate hooks

IMAGE STRATEGY:
- Visual themes: 3 main visual directions
- Style guide: Consistent visual approach
- Composition notes: Framing, colors, elements to include
- Brand elements: Silent AI Partner visual integration

OVERALL NARRATIVE:
- Unified message across all platforms
- Key differentiators to emphasize
- Risk assessment: Potential issues to avoid
- Strategy confidence: 0-100 based on research quality

OUTPUT FORMAT (provide complete JSON):
{
  "linkedin_strategy": {
    "hook": "62% of HVAC calls go unanswered...",
    "angle": "cost-based fear approach",
    "body": "data + story + solution + CTA structure",
    "cta": "Book free workflow audit",
    "length_target": "200-250 words",
    "engagement_tactics": ["ask question about missed calls", "share industry insight"]
  },
  "instagram_strategy": {
    "hook": "Swipe if you've ever missed a call that cost you $$$",
    "angle": "relatable problem with emotional impact",
    "body": "problem story → solution reveal → success outcome",
    "hashtag_seeds": ["#HVAC", "#ContractorLife", "#BusinessGrowth"],
    "visual_concept": "missed call = missed money graphic with dollar signs",
    "cta": "DM 'CALLS' for free audit",
    "length_target": "150-200 characters", 
    "engagement_tactics": ["swipe carousel", "save-worthy tips"]
  },
  "email_strategy": {
    "hook": "Is your phone system costing you $10K+ per year?",
    "angle": "cost revelation with solution preview",
    "body": "personal story → data reveal → solution tease → value add",
    "subject_line_options": ["3 signs your phone system is costing you money", "The $10K phone system mistake", "Are you losing customers before hello?"],
    "story_angle": "contractor case study from research",
    "sequence_flow": "Email 1: Problem awareness, Email 2: Solution preview, Email 3: Case study + CTA",
    "cta": "book free audit call",
    "length_target": "300-500 words",
    "engagement_tactics": ["storytelling", "data reveals", "case studies"]
  },
  "video_strategy": {
    "hook": "You're losing $27 every time this happens",
    "angle": "shock value with immediate payoff",
    "body": "hook → problem visualization → solution demo → results proof",
    "script_structure": "hook (0-3s) → problem (3-15s) → solution (15-45s) → CTA (45-60s)",
    "timing_breakdown": "3s shock hook, 12s problem setup, 30s solution, 15s CTA",
    "visual_elements": ["missed call animation", "dollar loss counter", "solution demo"],
    "cta": "Get your free audit link in bio",
    "length_target": "45-60 seconds",
    "engagement_tactics": ["visual storytelling", "data visualization", "clear progression"]
  },
  "hooks_strategy": {
    "primary_triggers": ["fear of loss", "curiosity gap", "social proof"],
    "hook_variations": ["You lose $X every time...", "Stop doing Y...", "The secret Z..."],
    "testing_approach": "A/B test across platforms, track engagement metrics"
  },
  "image_strategy": {
    "visual_themes": ["professional contractor in action", "before/after transformations", "data visualizations"],
    "style_guide": "clean, professional, warm lighting, branded colors",
    "composition_notes": "rule of thirds, clear focal point, minimal text overlay",
    "brand_elements": ["Silent AI Partner logo", "brand color palette", "professional typography"]
  },
  "overall_narrative": "Silent AI Partner helps contractors capture every opportunity through intelligent call management",
  "key_differentiators": ["AI-powered call handling", "proven ROI tracking", "contractor-specific solutions"],
  "risk_assessment": "avoid overly technical language, ensure claims are verifiable, maintain professional tone",
  "strategy_confidence": 85,
  "created_at": "${new Date().toISOString()}"
}

IMPORTANT:
- Base all strategies on the research findings - cite specific insights
- Make strategies immediately actionable for content creation agents
- Ensure brand consistency across all platforms
- Consider platform-specific best practices and limitations
- Include specific metrics and targets where possible
- Risk assessment should identify potential issues before content creation

Create comprehensive, research-backed strategies now.`
}

/**
 * Process completed strategy and save document
 */
export async function processStrategyCompletion(
  sessionId: string,
  rawOutput: string
): Promise<{ success: boolean; bundleId?: string; strategy?: ContentStrategyDocument; error?: string }> {
  const supabase = getSupabase()

  try {
    // Parse session ID to get bundle ID
    const sessionMatch = sessionId.match(/^strategy-(.+)$/)
    if (!sessionMatch) {
      throw new Error(`Invalid strategy session ID format: ${sessionId}`)
    }

    const bundleId = sessionMatch[1]

    // Parse strategy document from agent output
    const strategy = parseStrategyOutput(rawOutput)
    
    if (!strategy) {
      throw new Error('Failed to parse strategy document from agent output')
    }

    // Update bundle with strategy document
    await supabase
      .from('content_bundles')
      .update({
        strategy_doc: strategy,
        strategy_completed_at: new Date().toISOString()
      })
      .eq('id', bundleId)

    return { 
      success: true, 
      bundleId, 
      strategy 
    }

  } catch (error) {
    console.error('Strategy completion processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Parse strategy document from agent output
 */
function parseStrategyOutput(rawOutput: string): ContentStrategyDocument | null {
  try {
    // Look for JSON in the output
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in strategy output')
      return null
    }

    const strategy = JSON.parse(jsonMatch[0]) as ContentStrategyDocument
    
    // Validate required strategy sections
    const requiredSections = [
      'linkedin_strategy', 'instagram_strategy', 'email_strategy', 
      'video_strategy', 'hooks_strategy', 'image_strategy'
    ]
    
    for (const section of requiredSections) {
      if (!strategy[section as keyof ContentStrategyDocument]) {
        console.error(`Missing required strategy section: ${section}`)
        return null
      }
    }

    // Set defaults for optional fields
    if (!strategy.overall_narrative) strategy.overall_narrative = "Comprehensive content strategy based on research"
    if (!strategy.key_differentiators) strategy.key_differentiators = []
    if (!strategy.risk_assessment) strategy.risk_assessment = "Standard content risks apply"
    if (!strategy.strategy_confidence) strategy.strategy_confidence = 75
    if (!strategy.created_at) strategy.created_at = new Date().toISOString()

    return strategy

  } catch (error) {
    console.error('Error parsing strategy output:', error)
    return null
  }
}

/**
 * Auto-approve strategy for immediate content creation
 */
export async function approveStrategy(bundleId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase()

  try {
    await supabase
      .from('content_bundles')
      .update({
        status: 'creating',
        creation_started_at: new Date().toISOString()
      })
      .eq('id', bundleId)

    return { success: true }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get strategy document for a bundle
 */
export async function getStrategyDocument(bundleId: string): Promise<ContentStrategyDocument | null> {
  const supabase = getSupabase()

  try {
    const { data: bundle, error } = await supabase
      .from('content_bundles')
      .select('strategy_doc')
      .eq('id', bundleId)
      .single()

    if (error || !bundle) {
      return null
    }

    return bundle.strategy_doc as ContentStrategyDocument | null

  } catch (error) {
    console.error('Error getting strategy document:', error)
    return null
  }
}