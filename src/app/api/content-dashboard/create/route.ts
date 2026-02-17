import { NextRequest, NextResponse } from 'next/server'
import { startResearchFirstContentCreation } from '@/lib/agentOrchestrator'
import { createContentBundle } from '@/lib/contentCreation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/content-dashboard/create
 * Creates a new content bundle using research-first approach
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      topic, 
      trade, 
      selectedAssets = ['email', 'linkedin', 'instagram', 'video_script', 'hooks', 'image_prompt'],
      tone = 'professional',
      intent = 'full_creation',
      autoApprove = false,
      skipResearch = false  // Allow bypassing research for backward compatibility
    } = body

    // Validate input
    if (!topic || typeof topic !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Topic is required and must be a string' 
        },
        { status: 400 }
      )
    }

    if (trade && typeof trade !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Trade must be a string' 
        },
        { status: 400 }
      )
    }

    if (!Array.isArray(selectedAssets) || selectedAssets.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'selectedAssets must be a non-empty array' 
        },
        { status: 400 }
      )
    }

    // Validate asset types are non-empty strings (any content type is allowed)
    const invalidAssets = selectedAssets.filter(
      (asset: unknown) => typeof asset !== 'string' || (asset as string).trim().length === 0
    )

    if (invalidAssets.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'All asset types must be non-empty strings'
        },
        { status: 400 }
      )
    }

    // Convert asset types to platform types
    const platforms = selectedAssets.map(asset => {
      if (asset === 'video_script') return 'video'
      if (asset === 'image_prompt') return 'images'
      return asset
    })

    console.log(`Creating content bundle: topic="${topic}", trade="${trade}", platforms=[${platforms.join(', ')}], research-first=${!skipResearch}`)

    if (skipResearch) {
      // Legacy mode - skip research and create content directly
      const { bundleId, sessionIds } = await createContentBundle(
        topic.trim(),
        trade?.trim() || '',
        selectedAssets
      )

      const spawnedCount = Object.keys(sessionIds).length
      const expectedCount = selectedAssets.length

      console.log(`Bundle created (legacy mode): ${bundleId}, spawned ${spawnedCount}/${expectedCount} agents`)

      return NextResponse.json({
        success: true,
        data: {
          bundleId,
          sessionIds,
          spawnedAgents: spawnedCount,
          expectedAgents: expectedCount,
          topic,
          trade: trade || '',
          selectedAssets,
          mode: 'legacy',
          currentPhase: 'content'
        },
        message: `Content bundle created successfully (legacy mode). ${spawnedCount} agents spawned for content generation.`,
        timestamp: new Date().toISOString(),
      })

    } else {
      // Research-first mode (default)
      const result = await startResearchFirstContentCreation({
        topic: topic.trim(),
        trade: trade?.trim() || '',
        platforms,
        tone,
        intent,
        autoApprove
      })

      if (!result.success) {
        throw new Error(result.error || 'Failed to start research-first content creation')
      }

      console.log(`Research-first bundle created: ${result.bundleId}, phase: ${result.currentPhase}`)

      return NextResponse.json({
        success: true,
        data: {
          bundleId: result.bundleId,
          sessionIds: result.sessionIds,
          topic,
          trade: trade || '',
          platforms,
          tone,
          intent,
          autoApprove,
          mode: 'research-first',
          currentPhase: result.currentPhase
        },
        message: `Research-first content creation started. Currently in ${result.currentPhase} phase.`,
        timestamp: new Date().toISOString(),
      })
    }

  } catch (error) {
    console.error('Content bundle creation error:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/content-dashboard/create
 * Returns available asset types and configuration info
 */
export async function GET() {
  try {
    const availableAssetTypes = [
      { 
        type: 'email', 
        name: 'Email Sequence', 
        description: 'Professional email sequence (welcome, value, CTA)',
        agent: 'email_agent'
      },
      { 
        type: 'linkedin', 
        name: 'LinkedIn Post', 
        description: 'Professional LinkedIn post with engagement hooks',
        agent: 'linkedin_agent'
      },
      { 
        type: 'instagram', 
        name: 'Instagram Caption', 
        description: 'Engaging Instagram caption with hashtags',
        agent: 'instagram_agent'
      },
      { 
        type: 'video_script', 
        name: 'Video Script', 
        description: '30-60 second video script for HeyGen',
        agent: 'video_agent'
      },
      { 
        type: 'hooks', 
        name: 'Marketing Hooks', 
        description: '10 compelling marketing hooks with triggers',
        agent: 'hooks_agent'
      },
      { 
        type: 'image_prompt', 
        name: 'Image Prompts', 
        description: '5 detailed AI image generation prompts',
        agent: 'image_agent'
      }
    ]

    const tradeOptions = [
      'HVAC',
      'Plumbing', 
      'Electrical',
      'Roofing',
      'Landscaping',
      'Cleaning Services',
      'Pest Control',
      'Security Systems',
      'Home Improvement',
      'Property Management',
      'Real Estate',
      'General Contracting',
      'Auto Services',
      'Restaurant',
      'Retail',
      'Professional Services',
      'Healthcare',
      'Fitness',
      'Education',
      'Technology',
      'Other'
    ]

    return NextResponse.json({
      success: true,
      data: {
        availableAssetTypes,
        tradeOptions,
        defaultAssets: ['email', 'linkedin', 'instagram', 'video_script', 'hooks', 'image_prompt'],
        maxAssets: 6,
        estimatedTime: '2-5 minutes per asset'
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error('Configuration fetch error:', error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch configuration',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}