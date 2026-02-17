// =============================================================================
// Research Agent System — Silent AI Partner Research-First Content Creation
// =============================================================================
// Orchestrates comprehensive research before any content creation begins

import { getSupabaseAdmin } from './supabase'
import { invokeGatewayTool } from './gateway'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ResearchFindings {
  trending_angles: string[]
  key_statistics: Record<string, string>
  viral_hooks: string[]
  competitor_insights: string
  platform_strategy: Record<string, string>
  brand_voice: string
  recommended_cta: string
  research_sources: string[]
  confidence_score: number
  research_timestamp: string
}

export interface ResearchRequest {
  topic: string
  trade: string
  platforms: string[]
  tone?: string
  intent?: 'full_creation' | 'research_only'
}

export interface ResearchProgress {
  stage: 'initializing' | 'web_search' | 'competitor_scan' | 'brand_audit' | 'synthesis' | 'complete' | 'failed'
  message: string
  progress_percent: number
  details?: Record<string, unknown>
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

async function updateResearchProgress(
  bundleId: string,
  progress: ResearchProgress
): Promise<void> {
  const supabase = getSupabase()

  // Fetch current assets first to avoid overwriting request_metadata
  const { data: current } = await supabase
    .from('content_bundles')
    .select('assets')
    .eq('id', bundleId)
    .single()

  const existingAssets = (current?.assets as Record<string, unknown>) || {}

  await supabase
    .from('content_bundles')
    .update({
      assets: { ...existingAssets, research_progress: progress }
    })
    .eq('id', bundleId)
}

// ---------------------------------------------------------------------------
// Research Orchestration
// ---------------------------------------------------------------------------

/**
 * Start comprehensive research process for content creation
 */
export async function startResearchProcess(
  bundleId: string,
  request: ResearchRequest
): Promise<{ sessionId: string; success: boolean; error?: string }> {
  const supabase = getSupabase()

  try {
    // Update bundle to research status
    await supabase
      .from('content_bundles')
      .update({
        status: 'researching',
        research_started_at: new Date().toISOString()
      })
      .eq('id', bundleId)

    await updateResearchProgress(bundleId, {
      stage: 'initializing',
      message: 'Starting research process...',
      progress_percent: 0
    })

    // Create comprehensive research prompt
    const researchPrompt = buildResearchPrompt(request)

    // Spawn research agent (use Kimi K2.5 for cost-effectiveness)
    const result = await invokeGatewayTool('sessions_spawn', {
      task: researchPrompt,
      label: `research-${bundleId}`,
      model: 'ollama/kimi-k2.5:cloud',
      thinking: 'low',
      runTimeoutSeconds: 600, // 10 minutes for comprehensive research
      delivery: {
        mode: 'announce',
        channel: 'webhook',
        url: process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://second-brain-app-lime.vercel.app/api/content-dashboard/complete',
      },
    }, { timeout: 30000 })

    if (!result.ok) {
      throw new Error(result.error?.message || 'Failed to spawn research agent')
    }

    const sessionId = (result.result as any)?.sessionId || (result.result as any)?.childSessionKey || `research-${bundleId}`

    // Update bundle with research session
    await supabase
      .from('content_bundles')
      .update({
        research_session_id: sessionId
      })
      .eq('id', bundleId)

    return { sessionId, success: true }

  } catch (error) {
    await supabase
      .from('content_bundles')
      .update({ status: 'failed' })
      .eq('id', bundleId)

    await updateResearchProgress(bundleId, {
      stage: 'failed',
      message: `Research failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      progress_percent: 0
    })

    return {
      sessionId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Build comprehensive research prompt for the agent
 */
function buildResearchPrompt(request: ResearchRequest): string {
  const { topic, trade, platforms, tone = 'professional', intent = 'full_creation' } = request

  return `You are a research agent for Silent AI Partner's content creation system. 
Your job is to conduct COMPREHENSIVE research before any content is created.

RESEARCH TARGET:
- Topic: "${topic}"
- Industry/Niche: "${trade}"
- Target Platforms: ${platforms.join(', ')}
- Tone: ${tone}
- Intent: ${intent}

RESEARCH PHASES (do them in order, report progress):

PHASE 1: INDUSTRY TRENDS & STATISTICS
Use web_search to find:
- Latest trends in the ${trade} space 2024/2025
- Key statistics about ${trade}
- Common pain points and challenges in ${trade}
- Growth opportunities and market shifts
- Industry-specific terminology and language

Search queries:
- "latest trends in ${trade} 2024"
- "${trade} statistics 2024"
- "common problems in ${trade}"
- "${trade} challenges and solutions"

PHASE 2: COMPETITOR CONTENT ANALYSIS
Use web_search + web_fetch to:
- Find top 5 content pieces from ${trade} competitors
- Analyze their hooks, CTAs, and messaging angles
- Identify what gets engagement vs what falls flat
- Extract successful content formats and styles

Search queries:
- "${trade} marketing content examples"
- "best ${trade} social media posts"
- "${trade} email marketing examples"
- "viral ${trade} content 2024"

PHASE 3: VIRAL HOOK ANALYSIS
Analyze emotional triggers that work:
- Pain points (fear, frustration, urgent problems)
- Aspirational content (success, growth, efficiency)
- Educational angles (tips, secrets, insider knowledge)
- Social proof (testimonials, case studies, results)
- Contrarian takes (challenging common beliefs)

PHASE 4: BRAND AUDIT (Silent AI Partner)
Use web_fetch on silentaipartner.com to extract:
- Company voice and messaging style
- Key services and value propositions  
- Pricing and positioning
- Unique differentiators
- Target customer profile
- Brand personality traits

PHASE 5: PLATFORM STRATEGY
For each platform in ${platforms.join(', ')}, define:
- Optimal content length and format
- Best engagement tactics
- Hashtag strategies (where applicable)
- CTA approaches that convert
- Visual requirements
- Posting time recommendations

${(() => {
  const knownDescriptions: Record<string, string> = {
    linkedin: 'Professional, data-driven, 1300 char limit, business focus',
    instagram: 'Visual-first, story-driven, hashtags important, younger audience',
    email: 'Longer form, relationship building, soft CTAs, value-first',
    video: '30-60 seconds, hook in first 3 seconds, visual storytelling',
  }
  return platforms.map(p => {
    const desc = knownDescriptions[p]
    const label = p.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())
    return desc ? `${label}: ${desc}` : `${label}: Research best practices for this content format`
  }).join('\n')
})()}

OUTPUT FORMAT (provide complete JSON):
{
  "trending_angles": ["angle1", "angle2", "angle3"],
  "key_statistics": {
    "stat_name": "stat_value_with_source",
    "another_stat": "value_with_source"
  },
  "viral_hooks": ["hook1", "hook2", "hook3"],
  "competitor_insights": "Summary of what competitors do well/poorly",
  "platform_strategy": {
${platforms.map(p => `    "${p}": "Specific strategy for ${p.replace(/_/g, ' ')}"`).join(',\n')}
  },
  "brand_voice": "Description of Silent AI Partner's voice and positioning",
  "recommended_cta": "Best CTA based on research",
  "research_sources": ["source1", "source2", "source3"],
  "confidence_score": 85,
  "research_timestamp": "${new Date().toISOString()}"
}

IMPORTANT: 
- Use actual web_search and web_fetch tools - don't make up data
- Cite all sources in research_sources array
- Be comprehensive but focus on actionable insights
- Confidence score should reflect quality of sources found
- If certain research phases fail, note it but continue with available data
- This research will directly inform content creation - make it count!

Begin research now. Report progress as you go through each phase.`
}

/**
 * Process completed research and save findings
 */
export async function processResearchCompletion(
  sessionId: string,
  rawOutput: string
): Promise<{ success: boolean; bundleId?: string; findings?: ResearchFindings; error?: string }> {
  const supabase = getSupabase()

  try {
    // Find bundle by research session ID
    const { data: bundle, error: fetchError } = await supabase
      .from('content_bundles')
      .select('*')
      .eq('research_session_id', sessionId)
      .single()

    if (fetchError || !bundle) {
      throw new Error(`Bundle not found for research session: ${sessionId}`)
    }

    // Parse research findings from agent output
    const findings = parseResearchOutput(rawOutput)
    
    if (!findings) {
      throw new Error('Failed to parse research findings from agent output')
    }

    // Update bundle with research findings
    await supabase
      .from('content_bundles')
      .update({
        status: 'awaiting_strategy_approval',
        research_findings: findings,
        research_completed_at: new Date().toISOString()
      })
      .eq('id', bundle.id)

    await updateResearchProgress(bundle.id, {
      stage: 'complete',
      message: 'Research completed successfully!',
      progress_percent: 100,
      details: {
        trending_angles_found: findings.trending_angles.length,
        statistics_gathered: Object.keys(findings.key_statistics).length,
        hooks_identified: findings.viral_hooks.length,
        confidence_score: findings.confidence_score
      }
    })

    return { 
      success: true, 
      bundleId: bundle.id, 
      findings 
    }

  } catch (error) {
    console.error('Research completion processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Parse research findings from agent output
 */
function parseResearchOutput(rawOutput: string): ResearchFindings | null {
  try {
    // Look for JSON in the output
    const jsonMatch = rawOutput.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in research output')
      return null
    }

    const findings = JSON.parse(jsonMatch[0]) as ResearchFindings
    
    // Validate required fields
    const requiredFields = [
      'trending_angles', 'key_statistics', 'viral_hooks', 
      'competitor_insights', 'platform_strategy', 'brand_voice'
    ]
    
    for (const field of requiredFields) {
      if (!findings[field as keyof ResearchFindings]) {
        console.error(`Missing required field: ${field}`)
        return null
      }
    }

    // Ensure arrays are arrays
    if (!Array.isArray(findings.trending_angles)) findings.trending_angles = []
    if (!Array.isArray(findings.viral_hooks)) findings.viral_hooks = []
    if (!Array.isArray(findings.research_sources)) findings.research_sources = []
    
    // Ensure platform_strategy is an object (don't enforce specific keys — custom types are allowed)
    if (!findings.platform_strategy || typeof findings.platform_strategy !== 'object') {
      findings.platform_strategy = {}
    }

    // Set defaults for optional fields
    if (!findings.confidence_score) findings.confidence_score = 75
    if (!findings.research_timestamp) findings.research_timestamp = new Date().toISOString()

    return findings

  } catch (error) {
    console.error('Error parsing research output:', error)
    return null
  }
}

/**
 * Get research progress for a bundle
 */
export async function getResearchProgress(bundleId: string): Promise<ResearchProgress | null> {
  const supabase = getSupabase()

  try {
    const { data: bundle, error } = await supabase
      .from('content_bundles')
      .select('assets, status')
      .eq('id', bundleId)
      .single()

    if (error || !bundle) {
      return null
    }

    const assets = bundle.assets as any
    return assets?.research_progress || null

  } catch (error) {
    console.error('Error getting research progress:', error)
    return null
  }
}

/**
 * Check if research is complete for a bundle
 */
export async function isResearchComplete(bundleId: string): Promise<boolean> {
  const supabase = getSupabase()

  try {
    const { data: bundle, error } = await supabase
      .from('content_bundles')
      .select('status, research_findings')
      .eq('id', bundleId)
      .single()

    if (error || !bundle) {
      return false
    }

    return bundle.status === 'awaiting_strategy_approval' && bundle.research_findings != null

  } catch (error) {
    console.error('Error checking research status:', error)
    return false
  }
}