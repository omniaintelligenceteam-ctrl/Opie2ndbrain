import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { createWorkflow, startWorkflow } from '@/lib/workflowEngine'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const templateId = params.id

    // Get the template bundle
    let template
    try {
      const { data: tplData, error: templateError } = await supabase
        .from('content_bundles')
        .select('*')
        .eq('id', templateId)
        .eq('is_template', true)
        .single()

      if (templateError || !tplData) {
        const msg = templateError?.message || ''
        if (msg.includes('does not exist') || templateError?.code === '42703') {
          return NextResponse.json(
            { success: false, error: 'Templates require migration 20260216_p2_features.sql' },
            { status: 503 }
          )
        }
        return NextResponse.json(
          { success: false, error: 'Template not found' },
          { status: 404 }
        )
      }
      template = tplData
    } catch (queryError) {
      const msg = queryError instanceof Error ? queryError.message : ''
      if (msg.includes('does not exist')) {
        return NextResponse.json(
          { success: false, error: 'Templates require migration 20260216_p2_features.sql' },
          { status: 503 }
        )
      }
      throw queryError
    }

    // Get template assets
    const { data: templateAssets } = await supabase
      .from('content_assets')
      .select('*')
      .eq('bundle_id', templateId)

    // Create workflow for the new bundle
    const workflow = await createWorkflow('content-machine', {
      topic: template.topic,
      trade: template.trade,
      fromTemplate: templateId,
    })

    // Create new bundle
    const bundleId = `bnd_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const { data: bundle, error: bundleError } = await supabase
      .from('content_bundles')
      .insert({
        id: bundleId,
        topic: template.topic,
        trade: template.trade,
        quality_score: 0,
        status: 'creating',
        assets: template.assets || {},
        workflow_id: workflow.id,
      })
      .select()
      .single()

    if (bundleError) throw bundleError

    // Copy assets from template
    if (templateAssets && templateAssets.length > 0) {
      const newAssets = templateAssets.map(asset => ({
        id: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        bundle_id: bundleId,
        type: asset.type,
        content: asset.content,
        status: 'draft',
        metadata: asset.metadata,
      }))

      await supabase.from('content_assets').insert(newAssets)
    }

    // Increment use_count on the template (non-critical, skip if column missing)
    try {
      await supabase
        .from('content_bundles')
        .update({ use_count: (template.use_count || 0) + 1 })
        .eq('id', templateId)
    } catch {
      // Silently ignore if use_count column doesn't exist yet
    }

    // Start the workflow
    const startedWorkflow = await startWorkflow(workflow.id)

    return NextResponse.json({
      success: true,
      data: {
        bundle,
        workflow: startedWorkflow,
        bundleId: bundle.id,
        workflowId: startedWorkflow.id,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Template duplicate error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to duplicate template',
      },
      { status: 500 }
    )
  }
}
