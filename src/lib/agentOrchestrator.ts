// =============================================================================
// Agent Orchestrator — Silent AI Partner Research-First Content Creation
// =============================================================================
// Coordinates sequential agent execution: Research → Strategy → Content Creation

import { getSupabaseAdmin } from './supabase'
import { startResearchProcess, processResearchCompletion, ResearchRequest } from './research'
import { generateContentStrategy, processStrategyCompletion, approveStrategy, StrategyRequest } from './contentStrategy'
import { createContentBundle } from './contentCreation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ContentRequest {
  topic: string
  trade: string
  platforms: string[]
  tone?: 'professional' | 'casual' | 'urgent' | 'educational' | 'conversational'
  intent?: 'full_creation' | 'research_only'
  autoApprove?: boolean
}

export interface OrchestrationResult {
  bundleId: string
  sessionIds: {
    research?: string
    strategy?: string
    content?: Record<string, string>
  }
  success: boolean
  currentPhase: 'research' | 'strategy' | 'content' | 'complete' | 'failed'
  error?: string
}

export interface ProcessingUpdate {
  bundleId: string
  sessionId: string
  phase: 'research' | 'strategy' | 'content'
  rawOutput: string
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

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Main Orchestration
// ---------------------------------------------------------------------------

/**
 * Start the complete research-first content creation process
 */
export async function startResearchFirstContentCreation(
  request: ContentRequest
): Promise<OrchestrationResult> {
  const supabase = getSupabase()

  try {
    // Create the bundle record
    const bundleId = generateId('bnd')
    const { error: bundleError } = await supabase
      .from('content_bundles')
      .insert({
        id: bundleId,
        topic: request.topic,
        trade: request.trade,
        status: 'researching',
        quality_score: 0,
        assets: {
          request_metadata: {
            platforms: request.platforms,
            tone: request.tone || 'professional',
            intent: request.intent || 'full_creation',
            autoApprove: request.autoApprove || false,
            created_at: new Date().toISOString()
          }
        },
      })

    if (bundleError) {
      throw new Error(`Failed to create bundle: ${bundleError.message}`)
    }

    // Phase 1: Start Research
    const researchRequest: ResearchRequest = {
      topic: request.topic,
      trade: request.trade,
      platforms: request.platforms,
      tone: request.tone,
      intent: request.intent
    }

    const researchResult = await startResearchProcess(bundleId, researchRequest)

    if (!researchResult.success) {
      return {
        bundleId,
        sessionIds: {},
        success: false,
        currentPhase: 'failed',
        error: researchResult.error
      }
    }

    return {
      bundleId,
      sessionIds: {
        research: researchResult.sessionId
      },
      success: true,
      currentPhase: 'research'
    }

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('Orchestration start error:', errorMessage)

    return {
      bundleId: '',
      sessionIds: {},
      success: false,
      currentPhase: 'failed',
      error: errorMessage
    }
  }
}

/**
 * Process agent completion and advance to next phase
 */
export async function processAgentCompletion(
  update: ProcessingUpdate
): Promise<{ success: boolean; nextPhase?: string; error?: string }> {
  const { bundleId, sessionId, phase, rawOutput } = update

  try {
    switch (phase) {
      case 'research':
        return await processResearchPhaseCompletion(bundleId, sessionId, rawOutput)
      
      case 'strategy':
        return await processStrategyPhaseCompletion(bundleId, sessionId, rawOutput)
      
      case 'content':
        // Content phase handled by existing contentCreation.ts
        return { success: true, nextPhase: 'complete' }
      
      default:
        throw new Error(`Unknown phase: ${phase}`)
    }

  } catch (error) {
    console.error(`Phase ${phase} processing error:`, error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Process research completion and start strategy phase
 */
async function processResearchPhaseCompletion(
  bundleId: string,
  sessionId: string,
  rawOutput: string
): Promise<{ success: boolean; nextPhase?: string; error?: string }> {
  const supabase = getSupabase()

  try {
    // Idempotency: check bundle is still in 'researching' status
    const { data: currentBundle } = await supabase
      .from('content_bundles')
      .select('status')
      .eq('id', bundleId)
      .single()

    if (!currentBundle || currentBundle.status !== 'researching') {
      console.log(`[Orchestrator] Bundle ${bundleId} already past research phase (status: ${currentBundle?.status}), skipping`)
      return { success: true, nextPhase: currentBundle?.status || 'unknown' }
    }

    // Process research findings
    const researchResult = await processResearchCompletion(sessionId, rawOutput)
    
    if (!researchResult.success || !researchResult.findings) {
      throw new Error(researchResult.error || 'Failed to process research findings')
    }

    // Get bundle metadata for strategy generation
    const { data: bundle, error: fetchError } = await supabase
      .from('content_bundles')
      .select('topic, trade, assets')
      .eq('id', bundleId)
      .single()

    if (fetchError || !bundle) {
      throw new Error('Bundle not found for strategy generation')
    }

    const requestMetadata = (bundle.assets as any)?.request_metadata || {}
    const selectedPlatforms = requestMetadata.platforms || ['linkedin', 'instagram', 'email']

    // Start strategy phase
    const strategyRequest: StrategyRequest = {
      bundleId,
      selectedPlatforms,
      researchFindings: researchResult.findings,
      topic: bundle.topic,
      trade: bundle.trade || 'General'
    }

    const strategyResult = await generateContentStrategy(strategyRequest)

    if (!strategyResult.success) {
      throw new Error(strategyResult.error || 'Failed to start strategy generation')
    }

    // Update bundle with strategy session ID
    await supabase
      .from('content_bundles')
      .update({
        assets: {
          ...bundle.assets,
          strategy_session_id: strategyResult.sessionId
        }
      })
      .eq('id', bundleId)

    return { 
      success: true, 
      nextPhase: 'strategy' 
    }

  } catch (error) {
    // Mark bundle as failed
    await supabase
      .from('content_bundles')
      .update({ status: 'failed' })
      .eq('id', bundleId)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Research processing failed'
    }
  }
}

/**
 * Process strategy completion and start content creation
 */
async function processStrategyPhaseCompletion(
  bundleId: string,
  sessionId: string,
  rawOutput: string
): Promise<{ success: boolean; nextPhase?: string; error?: string }> {
  const supabase = getSupabase()

  try {
    // Idempotency: check bundle doesn't already have a strategy_doc
    const { data: currentBundle } = await supabase
      .from('content_bundles')
      .select('status, strategy_doc')
      .eq('id', bundleId)
      .single()

    if (!currentBundle || currentBundle.strategy_doc != null) {
      console.log(`[Orchestrator] Bundle ${bundleId} already has strategy, skipping`)
      return { success: true, nextPhase: currentBundle?.status || 'unknown' }
    }

    // Process strategy document
    const strategyResult = await processStrategyCompletion(sessionId, rawOutput)
    
    if (!strategyResult.success || !strategyResult.strategy) {
      throw new Error(strategyResult.error || 'Failed to process strategy document')
    }

    // Get bundle metadata
    const { data: bundle, error: fetchError } = await supabase
      .from('content_bundles')
      .select('topic, trade, assets, research_findings')
      .eq('id', bundleId)
      .single()

    if (fetchError || !bundle) {
      throw new Error('Bundle not found for content creation')
    }

    const requestMetadata = (bundle.assets as any)?.request_metadata || {}
    const autoApprove = requestMetadata.autoApprove || false

    if (autoApprove) {
      // Auto-approve strategy and start content creation
      const approveResult = await approveStrategy(bundleId)
      
      if (!approveResult.success) {
        throw new Error(approveResult.error || 'Failed to approve strategy')
      }

      // Start content creation with research-enhanced prompts
      const selectedPlatforms = requestMetadata.platforms || ['linkedin', 'instagram', 'email']
      const contentAssets = selectedPlatforms.map((platform: string) => {
        if (platform === 'video') return 'video_script'
        if (platform === 'hooks') return 'hooks'
        if (platform === 'images') return 'image_prompt'
        return platform
      })

      const contentResult = await createResearchDrivenContentBundle(
        bundleId,
        bundle.topic,
        bundle.trade || 'General',
        contentAssets,
        bundle.research_findings,
        strategyResult.strategy
      )

      if (!contentResult.success) {
        throw new Error(contentResult.error || 'Failed to start content creation')
      }

      return { 
        success: true, 
        nextPhase: 'content' 
      }

    } else {
      // Wait for manual strategy approval
      return { 
        success: true, 
        nextPhase: 'awaiting_approval' 
      }
    }

  } catch (error) {
    // Mark bundle as failed
    await supabase
      .from('content_bundles')
      .update({ status: 'failed' })
      .eq('id', bundleId)

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Strategy processing failed'
    }
  }
}

/**
 * Create content bundle enhanced with research findings and strategy
 */
async function createResearchDrivenContentBundle(
  bundleId: string,
  topic: string,
  trade: string,
  selectedAssets: string[],
  researchFindings: any,
  strategy: any
): Promise<{ success: boolean; sessionIds?: Record<string, string>; error?: string }> {
  try {
    // Use existing content creation system with research-enhanced prompts
    const { sessionIds } = await createContentBundle(
      topic,
      trade,
      selectedAssets,
      researchFindings,
      strategy,
      bundleId // Reuse existing bundle instead of creating a duplicate
    )

    return {
      success: true,
      sessionIds
    }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Content creation failed'
    }
  }
}

// Research-enhanced prompts are built directly in contentCreation.ts AGENT_PROMPTS
// Each agent prompt builder accepts optional researchFindings and strategy params

/**
 * Get orchestration status for a bundle
 */
export async function getOrchestrationStatus(bundleId: string): Promise<{
  bundle: any | null
  currentPhase: string
  progress: any
  canProceed: boolean
}> {
  const supabase = getSupabase()

  try {
    const { data: bundle, error } = await supabase
      .from('content_bundles')
      .select('*')
      .eq('id', bundleId)
      .single()

    if (error || !bundle) {
      return {
        bundle: null,
        currentPhase: 'not_found',
        progress: null,
        canProceed: false
      }
    }

    let currentPhase = 'unknown'
    let canProceed = false

    switch (bundle.status) {
      case 'researching':
        currentPhase = 'research'
        canProceed = false
        break
      case 'awaiting_strategy_approval':
        currentPhase = 'strategy_approval'
        canProceed = true
        break
      case 'creating':
        currentPhase = 'content_creation'
        canProceed = false
        break
      case 'review':
      case 'complete':
        currentPhase = 'complete'
        canProceed = true
        break
      case 'failed':
        currentPhase = 'failed'
        canProceed = false
        break
    }

    return {
      bundle,
      currentPhase,
      progress: (bundle.assets as any)?.research_progress || null,
      canProceed
    }

  } catch (error) {
    console.error('Error getting orchestration status:', error)
    return {
      bundle: null,
      currentPhase: 'error',
      progress: null,
      canProceed: false
    }
  }
}

/**
 * Manually approve strategy and proceed to content creation
 */
export async function approveStrategyAndProceed(bundleId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = getSupabase()

  try {
    // Get bundle data
    const { data: bundle, error: fetchError } = await supabase
      .from('content_bundles')
      .select('topic, trade, assets, research_findings, strategy_doc, status')
      .eq('id', bundleId)
      .single()

    if (fetchError || !bundle) {
      throw new Error('Bundle not found')
    }

    if (bundle.status !== 'awaiting_strategy_approval') {
      throw new Error('Bundle is not awaiting strategy approval')
    }

    // Approve strategy
    const approveResult = await approveStrategy(bundleId)
    if (!approveResult.success) {
      throw new Error(approveResult.error || 'Failed to approve strategy')
    }

    // Start content creation
    const requestMetadata = (bundle.assets as any)?.request_metadata || {}
    const selectedPlatforms = requestMetadata.platforms || ['linkedin', 'instagram', 'email']
    const contentAssets = selectedPlatforms.map((platform: string) => {
      if (platform === 'video') return 'video_script'
      if (platform === 'hooks') return 'hooks'
      if (platform === 'images') return 'image_prompt'
      return platform
    })

    const contentResult = await createResearchDrivenContentBundle(
      bundleId,
      bundle.topic,
      bundle.trade || 'General',
      contentAssets,
      bundle.research_findings,
      bundle.strategy_doc
    )

    if (!contentResult.success) {
      throw new Error(contentResult.error || 'Failed to start content creation')
    }

    return { success: true }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}