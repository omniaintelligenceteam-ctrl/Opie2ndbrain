import { NextRequest, NextResponse } from 'next/server'
import { regenerateAsset, type RegenerationOptions } from '@/lib/contentCreation'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * POST /api/content-dashboard/assets/[id]/regenerate
 * Regenerates a specific content asset with customization options
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assetId = params.id
    const body = await request.json()

    // Validate asset ID
    if (!assetId || typeof assetId !== 'string') {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Asset ID is required' 
        },
        { status: 400 }
      )
    }

    // Parse regeneration options
    const options: RegenerationOptions = {}
    
    if (body.angle && typeof body.angle === 'string') {
      const validAngles = ['professional', 'casual', 'urgent', 'educational', 'conversational']
      if (validAngles.includes(body.angle)) {
        options.angle = body.angle as RegenerationOptions['angle']
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid angle. Valid options: ${validAngles.join(', ')}` 
          },
          { status: 400 }
        )
      }
    }

    if (body.length && typeof body.length === 'string') {
      const validLengths = ['shorter', 'longer', 'same']
      if (validLengths.includes(body.length)) {
        options.length = body.length as RegenerationOptions['length']
      } else {
        return NextResponse.json(
          { 
            success: false, 
            error: `Invalid length option. Valid options: ${validLengths.join(', ')}` 
          },
          { status: 400 }
        )
      }
    }

    if (body.tone && typeof body.tone === 'string') {
      options.tone = body.tone.trim()
    }

    if (body.focus && typeof body.focus === 'string') {
      options.focus = body.focus.trim()
    }

    if (body.style && typeof body.style === 'string') {
      options.style = body.style.trim()
    }

    console.log(`Regenerating asset ${assetId} with options:`, options)

    // Regenerate the asset
    const { sessionId, newAssetId } = await regenerateAsset(assetId, options)

    console.log(`Asset regeneration initiated: new asset ${newAssetId}, session ${sessionId}`)

    return NextResponse.json({
      success: true,
      data: {
        originalAssetId: assetId,
        newAssetId,
        sessionId,
        regenerationOptions: options,
        status: 'regenerating'
      },
      message: 'Asset regeneration initiated successfully',
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error(`Asset regeneration error for ${params.id}:`, error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    const status = errorMessage.includes('not found') ? 404 : 500
    
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        assetId: params.id,
        timestamp: new Date().toISOString(),
      },
      { status }
    )
  }
}

/**
 * GET /api/content-dashboard/assets/[id]/regenerate
 * Returns regeneration options and asset information
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const assetId = params.id

    if (!assetId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Asset ID is required' 
        },
        { status: 400 }
      )
    }

    const regenerationOptions = {
      angles: [
        { value: 'professional', label: 'Professional', description: 'Formal, business-focused tone' },
        { value: 'casual', label: 'Casual', description: 'Friendly, conversational approach' },
        { value: 'urgent', label: 'Urgent', description: 'Time-sensitive, action-oriented' },
        { value: 'educational', label: 'Educational', description: 'Informative, teaching-focused' },
        { value: 'conversational', label: 'Conversational', description: 'Natural, dialogue-style' }
      ],
      lengths: [
        { value: 'shorter', label: 'Shorter', description: 'More concise version' },
        { value: 'longer', label: 'Longer', description: 'More detailed version' },
        { value: 'same', label: 'Same Length', description: 'Keep similar length' }
      ],
      commonTones: [
        'Authoritative',
        'Friendly', 
        'Enthusiastic',
        'Empathetic',
        'Confident',
        'Helpful',
        'Inspiring',
        'Direct',
        'Warm',
        'Expert'
      ],
      commonFocusAreas: [
        'Pain points',
        'Benefits',
        'Solutions',
        'Results',
        'Process',
        'Value proposition',
        'Social proof',
        'Call to action',
        'Story/narrative',
        'Technical details'
      ],
      commonStyles: [
        'Bullet points',
        'Storytelling',
        'Question-based',
        'List format',
        'Case study',
        'How-to guide',
        'Problem-solution',
        'Before-after',
        'Step-by-step',
        'Testimonial-driven'
      ]
    }

    return NextResponse.json({
      success: true,
      data: {
        assetId,
        regenerationOptions,
        instructions: {
          angle: 'Choose the overall approach/perspective for the content',
          length: 'Adjust the content length compared to the original',
          tone: 'Specify the emotional tone or voice (custom text)',
          focus: 'What aspect should be emphasized (custom text)', 
          style: 'The format or structure approach (custom text)'
        }
      },
      timestamp: new Date().toISOString(),
    })

  } catch (error) {
    console.error(`Regeneration options fetch error for ${params.id}:`, error)
    
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch regeneration options',
        assetId: params.id,
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    )
  }
}