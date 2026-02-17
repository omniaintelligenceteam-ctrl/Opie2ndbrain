// =============================================================================
// Content Creation System — Silent AI Partner Content Command Center
// =============================================================================
// Core functions for creating content bundles and managing assets via agent spawning

import { getSupabaseAdmin } from './supabase'
import { invokeGatewayTool } from './gateway'
import { parseAgentOutput } from './contentParser'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentBundle {
  id: string
  topic: string
  trade: string | null
  status: 'creating' | 'review' | 'complete' | 'failed'
  quality_score: number
  assets: Record<string, unknown>
  created_at: string
  workflow_id: string | null
}

// Preset types that have specialized agent prompts
export const PRESET_ASSET_TYPES = ['email', 'linkedin', 'instagram', 'video_script', 'hooks', 'image_prompt'] as const
export type PresetAssetType = typeof PRESET_ASSET_TYPES[number]

export interface ContentAsset {
  id: string
  bundle_id: string
  type: string
  content: string
  status: 'generated' | 'selected' | 'regenerating' | 'dropped' | 'archived'
  metadata: Record<string, unknown> | null
  version: number
  created_at: string
}

export interface RegenerationOptions {
  angle?: 'professional' | 'casual' | 'urgent' | 'educational' | 'conversational'
  length?: 'shorter' | 'longer' | 'same'
  tone?: string
  focus?: string
  style?: string
}

export interface AgentSpawnResult {
  sessionId: string
  success: boolean
  error?: string
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getSupabase() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    throw new Error('Supabase not configured. Check environment variables.')
  }
  return supabase
}

// ---------------------------------------------------------------------------
// Agent Prompts — Specialized for each asset type
// ---------------------------------------------------------------------------

const AGENT_PROMPTS = {
  email_agent: (topic: string, trade: string, researchFindings?: any, strategy?: any) => {
    const basePrompt = `Create a professional email sequence for "${topic}" in the ${trade} space.
    Create 3 emails: welcome, value-driven, and CTA.
    Each email should have:
    - Compelling subject line
    - Personal opening
    - Value proposition
    - Clear next step`

    if (researchFindings && strategy) {
      return `${basePrompt}
      
RESEARCH INSIGHTS TO INCORPORATE:
- Key Statistics: ${JSON.stringify(researchFindings.key_statistics, null, 2)}
- Viral Hooks: ${researchFindings.viral_hooks?.join(', ')}
- Brand Voice: ${researchFindings.brand_voice}
- Recommended CTA: ${researchFindings.recommended_cta}

EMAIL STRATEGY (from research):
${JSON.stringify(strategy.email_strategy, null, 2)}

REQUIREMENTS:
- Use one of these subject lines: ${strategy.email_strategy?.subject_line_options?.join(', ')}
- Incorporate key statistics from research
- Follow the story angle: ${strategy.email_strategy?.story_angle}
- Use the brand voice: ${researchFindings.brand_voice}
- Include this CTA approach: ${researchFindings.recommended_cta}

Format your output like this:
<content-output>
{"email": "EMAIL 1: Welcome\nSubject: [Research-based subject]\n[Email content with research stats]\n\nEMAIL 2: Value\nSubject: [Subject]\n[Email content]\n\nEMAIL 3: CTA\nSubject: [Subject]\n[Email content]", "research_influence": {"statistics": "key stats used", "hooks": "hook patterns applied", "brand_voice": "voice implementation", "strategy": "email strategy followed"}}
</content-output>`
    }

    return `${basePrompt}
    
    Format your output like this:
    <content-output>
    {"email": "EMAIL 1: Welcome\nSubject: [Subject]\n[Email content]\n\nEMAIL 2: Value\nSubject: [Subject]\n[Email content]\n\nEMAIL 3: CTA\nSubject: [Subject]\n[Email content]"}
    </content-output>`
  },

  linkedin_agent: (topic: string, trade: string, researchFindings?: any, strategy?: any) => {
    const basePrompt = `Create an engaging LinkedIn post about "${topic}" for the ${trade} audience.
    - Professional but approachable tone
    - 150-300 words
    - Include relevant hashtags
    - Clear value proposition
    - Engagement hook
    - Call-to-action`

    if (researchFindings && strategy) {
      return `${basePrompt}
      
RESEARCH INSIGHTS TO INCORPORATE:
- Trending Angles: ${researchFindings.trending_angles?.join(', ')}
- Key Statistics: ${JSON.stringify(researchFindings.key_statistics, null, 2)}
- Viral Hooks: ${researchFindings.viral_hooks?.join(', ')}
- Brand Voice: ${researchFindings.brand_voice}

LINKEDIN STRATEGY (from research):
${JSON.stringify(strategy.linkedin_strategy, null, 2)}

REQUIREMENTS:
- Start with this hook: ${strategy.linkedin_strategy?.hook}
- Follow this angle: ${strategy.linkedin_strategy?.angle}
- Use this body structure: ${strategy.linkedin_strategy?.body}
- Include this CTA: ${strategy.linkedin_strategy?.cta}
- Target length: ${strategy.linkedin_strategy?.length_target}
- Brand voice: ${researchFindings.brand_voice}

Format your output like this:
<content-output>
{"linkedin": "[Research-driven LinkedIn post with strategy implementation]", "research_influence": {"hook": "research hook used", "statistics": "stats incorporated", "angle": "strategic angle applied", "brand_voice": "voice consistency maintained"}}
</content-output>`
    }

    return `${basePrompt}
    
    Format your output like this:
    <content-output>
    {"linkedin": "[Your complete LinkedIn post with hashtags]"}
    </content-output>`
  },

  instagram_agent: (topic: string, trade: string, researchFindings?: any, strategy?: any) => {
    const basePrompt = `Create an Instagram caption about "${topic}" for the ${trade} niche.
    - Engaging and visual
    - Story-driven approach
    - Relevant hashtags (8-12)
    - Call-to-action
    - Emoji usage
    - Hook in first line`

    if (researchFindings && strategy) {
      return `${basePrompt}
      
RESEARCH INSIGHTS TO INCORPORATE:
- Viral Hooks: ${researchFindings.viral_hooks?.join(', ')}
- Trending Angles: ${researchFindings.trending_angles?.join(', ')}
- Brand Voice: ${researchFindings.brand_voice}

INSTAGRAM STRATEGY (from research):
${JSON.stringify(strategy.instagram_strategy, null, 2)}

REQUIREMENTS:
- Start with this hook: ${strategy.instagram_strategy?.hook}
- Follow this angle: ${strategy.instagram_strategy?.angle}
- Use this body structure: ${strategy.instagram_strategy?.body}
- Include hashtags: ${strategy.instagram_strategy?.hashtag_seeds?.join(', ')}
- Visual concept: ${strategy.instagram_strategy?.visual_concept}
- CTA: ${strategy.instagram_strategy?.cta}
- Brand voice: ${researchFindings.brand_voice}

Format your output like this:
<content-output>
{"instagram": "[Research-driven Instagram caption with strategy implementation]", "research_influence": {"viral_hooks": "hooks incorporated", "visual_concept": "visual strategy applied", "hashtag_strategy": "research-based hashtags", "brand_voice": "voice maintained"}}
</content-output>`
    }

    return `${basePrompt}
    
    Format your output like this:
    <content-output>
    {"instagram": "[Your complete Instagram caption with hashtags and emojis]"}
    </content-output>`
  },

  video_agent: (topic: string, trade: string, researchFindings?: any, strategy?: any) => {
    const basePrompt = `Create a short-form video script about "${topic}" for the ${trade} space.
    30-60 seconds duration for HeyGen AI video creation.
    Include:
    - Strong hook (first 3 seconds)
    - Clear problem/solution
    - Visual descriptions
    - Speaking directions
    - CTA`

    if (researchFindings && strategy) {
      return `${basePrompt}
      
RESEARCH INSIGHTS TO INCORPORATE:
- Key Statistics: ${JSON.stringify(researchFindings.key_statistics, null, 2)}
- Viral Hooks: ${researchFindings.viral_hooks?.join(', ')}
- Brand Voice: ${researchFindings.brand_voice}

VIDEO STRATEGY (from research):
${JSON.stringify(strategy.video_strategy, null, 2)}

REQUIREMENTS:
- Open with this hook: ${strategy.video_strategy?.hook}
- Follow this structure: ${strategy.video_strategy?.script_structure}
- Use this timing: ${strategy.video_strategy?.timing_breakdown}
- Include these visuals: ${strategy.video_strategy?.visual_elements?.join(', ')}
- End with CTA: ${strategy.video_strategy?.cta}
- Incorporate key statistics from research
- Match brand voice: ${researchFindings.brand_voice}

Format your output like this:
<content-output>
{"video_script": "[HOOK: 0-3s]\n[Visual: research-driven visual]\nSpoken: \"[Research-backed hook]\"\n\n[PROBLEM: 3-15s]\n[Visual: ...]\nSpoken: \"[Statistic-supported problem]\"\n\n[SOLUTION: 15-45s]\n[Visual: ...]\nSpoken: \"[Brand-aligned solution]\"\n\n[CTA: 45-60s]\n[Visual: ...]\nSpoken: \"[Strategy-based CTA]\"", "research_influence": {"hook_pattern": "viral hook applied", "statistics": "key stats used", "timing_strategy": "research-based pacing", "brand_alignment": "voice consistency"}}
</content-output>`
    }

    return `${basePrompt}
    
    Format your output like this:
    <content-output>
    {"video_script": "[HOOK: 0-3s]\n[Visual: ...]\nSpoken: \"...\"\n\n[PROBLEM: 3-15s]\n[Visual: ...]\nSpoken: \"...\"\n\n[SOLUTION: 15-45s]\n[Visual: ...]\nSpoken: \"...\"\n\n[CTA: 45-60s]\n[Visual: ...]\nSpoken: \"...\""}
    </content-output>`
  },

  hooks_agent: (topic: string, trade: string, researchFindings?: any, strategy?: any) => {
    const basePrompt = `Generate 10 compelling marketing hooks for "${topic}" targeting the ${trade} audience.
    Each hook should be attention-grabbing and trigger curiosity, urgency, or emotion.
    
    For each hook provide:
    1. The hook text (one powerful sentence)
    2. Platform recommendation
    3. Emotional trigger used
    4. Suggested follow-up`

    if (researchFindings && strategy) {
      return `${basePrompt}
      
RESEARCH INSIGHTS TO INCORPORATE:
- Proven Viral Hooks: ${researchFindings.viral_hooks?.join(', ')}
- Key Statistics: ${JSON.stringify(researchFindings.key_statistics, null, 2)}
- Trending Angles: ${researchFindings.trending_angles?.join(', ')}

HOOKS STRATEGY (from research):
${JSON.stringify(strategy.hooks_strategy, null, 2)}

REQUIREMENTS:
- Use these primary triggers: ${strategy.hooks_strategy?.primary_triggers?.join(', ')}
- Base hooks on these patterns: ${strategy.hooks_strategy?.hook_variations?.join(', ')}
- Incorporate key statistics where possible
- Follow trending angles from research
- Match proven viral hook formats
- Testing approach: ${strategy.hooks_strategy?.testing_approach}

Format your output like this:
<content-output>
{"hooks": "HOOK 1: [Research-backed hook with stats]\nPlatform: [platform]\nTrigger: [research-based trigger]\nFollow-up: [strategic next step]\nResearch Base: [which research element influenced this]\n\n[Continue for all 10 hooks]", "research_influence": {"viral_patterns": "proven hooks replicated", "statistics": "key stats incorporated", "emotional_triggers": "research-based psychology", "trending_angles": "current market trends used"}}
</content-output>`
    }

    return `${basePrompt}
    
    Format your output like this:
    <content-output>
    {"hooks": "HOOK 1: [Hook text]\nPlatform: [platform]\nTrigger: [emotion]\nFollow-up: [next step]\n\nHOOK 2: [Hook text]\nPlatform: [platform]\nTrigger: [emotion]\nFollow-up: [next step]\n\n[...continue for all 10 hooks]"}
    </content-output>`
  },

  image_agent: (topic: string, trade: string, researchFindings?: any, strategy?: any) => {
    const basePrompt = `Create 5 detailed image generation prompts for "${topic}" in the ${trade} space.
    Each prompt should be specific, visual, and ready for AI image generation.
    Include style, composition, colors, mood, and context.`

    if (researchFindings && strategy) {
      return `${basePrompt}
      
RESEARCH INSIGHTS TO INCORPORATE:
- Brand Voice: ${researchFindings.brand_voice}
- Trending Angles: ${researchFindings.trending_angles?.join(', ')}

IMAGE STRATEGY (from research):
${JSON.stringify(strategy.image_strategy, null, 2)}

REQUIREMENTS:
- Use these visual themes: ${strategy.image_strategy?.visual_themes?.join(', ')}
- Follow style guide: ${strategy.image_strategy?.style_guide}
- Composition notes: ${strategy.image_strategy?.composition_notes}
- Include brand elements: ${strategy.image_strategy?.brand_elements?.join(', ')}
- Match brand voice visually: ${researchFindings.brand_voice}
- Reflect trending angles in visuals

Format your output like this:
<content-output>
{"image_prompt": "PROMPT 1: [Strategy-aligned image description with brand elements]\n\nPROMPT 2: [Theme-based description matching research]\n\nPROMPT 3: [Visual concept supporting trending angles]\n\nPROMPT 4: [Brand-consistent professional imagery]\n\nPROMPT 5: [Research-informed visual storytelling]", "research_influence": {"visual_themes": "strategy themes applied", "brand_consistency": "voice reflected visually", "trending_angles": "market trends visualized", "style_guide": "research-based aesthetics"}}
</content-output>`
    }

    return `${basePrompt}
    
    Format your output like this:
    <content-output>
    {"image_prompt": "PROMPT 1: [Detailed image description]\n\nPROMPT 2: [Detailed image description]\n\nPROMPT 3: [Detailed image description]\n\nPROMPT 4: [Detailed image description]\n\nPROMPT 5: [Detailed image description]"}
    </content-output>`
  }
}

/**
 * Generic prompt builder for any custom content type.
 * Produces high-quality content even without a specialized prompt template.
 */
function buildGenericPrompt(
  contentType: string,
  topic: string,
  trade: string,
  researchFindings?: any,
  strategy?: any
): string {
  const readableName = contentType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  let prompt = `You are a professional content creator. Create a high-quality "${readableName}" about "${topic}" for the ${trade} industry/niche.

Produce comprehensive, publication-ready content appropriate for the "${readableName}" format.

Consider:
- The typical structure, length, and conventions of a "${readableName}"
- Professional tone appropriate for the ${trade} space
- A compelling hook or opening
- Clear value proposition
- A call-to-action where appropriate`

  if (researchFindings && strategy) {
    prompt += `

RESEARCH INSIGHTS TO INCORPORATE:
- Key Statistics: ${JSON.stringify(researchFindings.key_statistics, null, 2)}
- Viral Hooks: ${researchFindings.viral_hooks?.join(', ')}
- Trending Angles: ${researchFindings.trending_angles?.join(', ')}
- Brand Voice: ${researchFindings.brand_voice}
- Recommended CTA: ${researchFindings.recommended_cta}

Use the research insights to make the content data-driven and targeted.`
  }

  prompt += `

Format your output like this:
<content-output>
{"${contentType}": "[Your complete ${readableName} content here]"${researchFindings ? `, "research_influence": {"summary": "how research was applied"}` : ''}}
</content-output>`

  return prompt
}

// ---------------------------------------------------------------------------
// Core Functions
// ---------------------------------------------------------------------------

/**
 * Create a complete content bundle by spawning specialized agents.
 * If existingBundleId is provided, reuse that bundle instead of creating a new one
 * (used by the research-first pipeline to keep assets on the same bundle as research/strategy).
 */
export async function createContentBundle(
  topic: string,
  trade: string,
  selectedAssets: string[] = ['email', 'linkedin', 'instagram', 'video_script', 'hooks', 'image_prompt'],
  researchFindings?: any,
  strategy?: any,
  existingBundleId?: string
): Promise<{ bundleId: string; sessionIds: Record<string, string> }> {
  const supabase = getSupabase()

  let bundleId: string

  if (existingBundleId) {
    // Reuse existing bundle (research-first pipeline)
    bundleId = existingBundleId
    const { error: updateError } = await supabase
      .from('content_bundles')
      .update({
        status: 'creating',
      })
      .eq('id', bundleId)

    if (updateError) {
      throw new Error(`Failed to update bundle status: ${updateError.message}`)
    }
  } else {
    // Create a new bundle record (legacy/direct mode)
    bundleId = generateId('bnd')
    const { error: bundleError } = await supabase
      .from('content_bundles')
      .insert({
        id: bundleId,
        topic,
        trade,
        status: 'creating',
        quality_score: 0,
        assets: {},
      })

    if (bundleError) {
      throw new Error(`Failed to create bundle: ${bundleError.message}`)
    }
  }

  // Spawn agents for each selected asset type
  const sessionIds: Record<string, string> = {}
  const spawnPromises = selectedAssets.map(async (assetType) => {
    const agentName = `${assetType}_agent` as keyof typeof AGENT_PROMPTS
    const promptBuilder = AGENT_PROMPTS[agentName]

    try {
      // Use specialized prompt for preset types, generic for custom types
      const prompt = promptBuilder
        ? promptBuilder(topic, trade, researchFindings, strategy)
        : buildGenericPrompt(assetType, topic, trade, researchFindings, strategy)
      const result = await spawnAgentForAsset(bundleId, assetType, prompt)
      if (result.success) {
        sessionIds[assetType] = result.sessionId
      } else {
        console.error(`Failed to spawn agent for ${assetType}:`, result.error)
      }
    } catch (error) {
      console.error(`Error spawning ${assetType} agent:`, error)
    }
  })

  await Promise.allSettled(spawnPromises)

  return { bundleId, sessionIds }
}

/**
 * Spawn a single agent for a specific asset type
 */
async function spawnAgentForAsset(
  bundleId: string,
  assetType: string,
  prompt: string
): Promise<AgentSpawnResult> {
  const label = `content-${bundleId}-${assetType}`
  
  try {
    const result = await invokeGatewayTool('sessions_spawn', {
      task: prompt,
      label,
      model: 'anthropic/claude-sonnet-4',
      thinking: 'low',
      runTimeoutSeconds: 300,
      delivery: {
        mode: 'announce',
        channel: 'webhook',
        url: process.env.NEXT_PUBLIC_WEBHOOK_URL || 'https://second-brain-app-lime.vercel.app/api/content-dashboard/complete',
      },
    }, { timeout: 30000 })

    if (!result.ok) {
      return {
        sessionId: '',
        success: false,
        error: result.error?.message || 'Failed to spawn agent'
      }
    }

    const sessionId = (result.result as any)?.sessionId || (result.result as any)?.childSessionKey || label

    return {
      sessionId,
      success: true
    }
  } catch (error) {
    return {
      sessionId: '',
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process completed agent output and save as content asset
 */
export async function processAgentCompletion(
  sessionId: string,
  rawOutput: string
): Promise<{ success: boolean; assetId?: string; error?: string }> {
  const supabase = getSupabase()

  try {
    // Parse session ID to get bundle and asset type
    const sessionMatch = sessionId.match(/^content-([^-]+)-(.+)$/)
    if (!sessionMatch) {
      throw new Error(`Invalid session ID format: ${sessionId}`)
    }

    const [, bundleId, assetType] = sessionMatch

    // Parse agent output
    const parsed = parseAgentOutput(rawOutput)
    const contentKey = Object.keys(parsed).find(key => key !== 'raw' && key !== 'research_influence' && parsed[key as keyof typeof parsed])
    const content = contentKey ? parsed[contentKey as keyof typeof parsed] as string : parsed.raw || rawOutput
    const researchInfluence = parsed.research_influence || null

    if (!content) {
      throw new Error('No content extracted from agent output')
    }

    // Create asset record
    const assetId = generateId('ast')
    const { error: assetError } = await supabase
      .from('content_assets')
      .insert({
        id: assetId,
        bundle_id: bundleId,
        type: assetType,
        content,
        status: 'generated',
        research_influence: researchInfluence,
        metadata: {
          session_id: sessionId,
          raw_output: rawOutput,
          content_key: contentKey,
          generated_at: new Date().toISOString(),
          research_enhanced: researchInfluence != null
        },
        version: 1
      })

    if (assetError) {
      throw new Error(`Failed to save asset: ${assetError.message}`)
    }

    // Check if all assets for this bundle are complete
    await checkBundleCompletion(bundleId)

    return { success: true, assetId }
  } catch (error) {
    console.error('Agent completion processing error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Check if bundle is complete and update status
 */
async function checkBundleCompletion(bundleId: string): Promise<void> {
  const supabase = getSupabase()

  try {
    const { data: assets, error } = await supabase
      .from('content_assets')
      .select('*')
      .eq('bundle_id', bundleId)
      .eq('version', 1)

    if (error) throw error

    if (assets && assets.length >= 3) { // Consider complete if at least 3 assets
      await supabase
        .from('content_bundles')
        .update({
          status: 'review',
          quality_score: Math.min(85, 70 + assets.length * 3) // Basic quality score
        })
        .eq('id', bundleId)
    }
  } catch (error) {
    console.error(`Error checking bundle completion for ${bundleId}:`, error)
  }
}

/**
 * Regenerate a specific asset with options
 */
export async function regenerateAsset(
  assetId: string,
  options: RegenerationOptions = {}
): Promise<{ sessionId: string; newAssetId: string }> {
  const supabase = getSupabase()

  // Get current asset
  const { data: asset, error: fetchError } = await supabase
    .from('content_assets')
    .select('*')
    .eq('id', assetId)
    .single()

  if (fetchError || !asset) {
    throw new Error('Asset not found')
  }

  // Archive current version
  await supabase
    .from('content_assets')
    .update({ status: 'archived' })
    .eq('id', assetId)

  // Get bundle info
  const { data: bundle, error: bundleError } = await supabase
    .from('content_bundles')
    .select('topic, trade')
    .eq('id', asset.bundle_id)
    .single()

  if (bundleError || !bundle) {
    throw new Error('Bundle not found')
  }

  // Build regeneration prompt — use specialized prompt for preset types, generic for custom
  const agentName = `${asset.type}_agent` as keyof typeof AGENT_PROMPTS
  const presetBuilder = AGENT_PROMPTS[agentName]
  const basePromptText = presetBuilder
    ? presetBuilder(bundle.topic, bundle.trade || 'General')
    : buildGenericPrompt(asset.type, bundle.topic, bundle.trade || 'General')

  let regenerationInstructions = ''
  if (options.angle) regenerationInstructions += `\nAngle: Make it more ${options.angle}.`
  if (options.length) regenerationInstructions += `\nLength: Make it ${options.length}.`
  if (options.tone) regenerationInstructions += `\nTone: ${options.tone}.`
  if (options.focus) regenerationInstructions += `\nFocus: Emphasize ${options.focus}.`
  if (options.style) regenerationInstructions += `\nStyle: ${options.style}.`

  const enhancedPrompt = basePromptText +
    `\n\nREGENERATION REQUEST:${regenerationInstructions}\n\nPrevious version for reference:\n"${asset.content}"`

  // Spawn regeneration agent
  const result = await spawnAgentForAsset(asset.bundle_id, asset.type, enhancedPrompt)
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to spawn regeneration agent')
  }

  // Create new asset record for the regenerated version
  const newAssetId = generateId('ast')
  const nextVersion = (asset.version || 1) + 1

  await supabase
    .from('content_assets')
    .insert({
      id: newAssetId,
      bundle_id: asset.bundle_id,
      type: asset.type,
      content: '', // Will be filled when agent completes
      status: 'regenerating',
      metadata: {
        session_id: result.sessionId,
        regeneration_options: options,
        original_asset_id: assetId,
        regenerated_at: new Date().toISOString()
      },
      version: nextVersion
    })

  return { 
    sessionId: result.sessionId, 
    newAssetId 
  }
}

/**
 * Get bundle with all its assets
 */
export async function getBundleWithAssets(bundleId: string): Promise<{
  bundle: ContentBundle | null
  assets: ContentAsset[]
}> {
  const supabase = getSupabase()

  const [bundleResult, assetsResult] = await Promise.all([
    supabase
      .from('content_bundles')
      .select('*')
      .eq('id', bundleId)
      .single(),
    supabase
      .from('content_assets')
      .select('*')
      .eq('bundle_id', bundleId)
      .neq('status', 'archived')
      .order('created_at', { ascending: true })
  ])

  return {
    bundle: bundleResult.data as ContentBundle | null,
    assets: (assetsResult.data as ContentAsset[]) || []
  }
}

/**
 * Update asset status (selected, dropped, etc.)
 */
export async function updateAssetStatus(
  assetId: string, 
  status: ContentAsset['status']
): Promise<void> {
  const supabase = getSupabase()

  const { error } = await supabase
    .from('content_assets')
    .update({ status })
    .eq('id', assetId)

  if (error) {
    throw new Error(`Failed to update asset status: ${error.message}`)
  }
}

/**
 * Get all bundles with pagination and filtering
 */
export async function getContentBundles(
  limit = 20,
  offset = 0,
  filters: { trade?: string; status?: string } = {}
): Promise<{ bundles: ContentBundle[]; totalCount: number }> {
  const supabase = getSupabase()

  let query = supabase
    .from('content_bundles')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (filters.trade) query = query.eq('trade', filters.trade)
  if (filters.status) query = query.eq('status', filters.status)

  const { data: bundles, count, error } = await query

  if (error) {
    throw new Error(`Failed to fetch bundles: ${error.message}`)
  }

  return {
    bundles: (bundles as ContentBundle[]) || [],
    totalCount: count || 0
  }
}