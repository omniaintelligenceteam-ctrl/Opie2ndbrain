import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json({
        success: true,
        data: { templates: [] },
        timestamp: new Date().toISOString(),
      })
    }

    const { data, error } = await supabase
      .from('content_bundles')
      .select('*')
      .eq('is_template', true)
      .order('use_count', { ascending: false })

    if (error) {
      if (error.message?.includes('does not exist') || error.code === '42703') {
        console.warn('Templates: columns missing — run migration 20260216_p2_features.sql')
        return NextResponse.json({
          success: true,
          data: { templates: [] },
          timestamp: new Date().toISOString(),
        })
      }
      throw error
    }

    return NextResponse.json({
      success: true,
      data: { templates: data || [] },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Templates GET error:', error)
    const message = error instanceof Error ? error.message : 'Failed to fetch templates'
    const isMigration = message.includes('does not exist')
    return NextResponse.json(
      {
        success: false,
        error: isMigration ? 'Templates require migration 20260216_p2_features.sql' : message,
      },
      { status: isMigration ? 503 : 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bundleId, templateName } = body

    if (!bundleId || !templateName) {
      return NextResponse.json(
        { success: false, error: 'bundleId and templateName are required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data, error } = await supabase
      .from('content_bundles')
      .update({
        is_template: true,
        template_name: templateName,
      })
      .eq('id', bundleId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to save template'
    const isMigration = message.includes('does not exist')
    console.error('Templates POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: isMigration ? 'Templates require migration 20260216_p2_features.sql' : message,
      },
      { status: isMigration ? 503 : 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { bundleId } = body

    if (!bundleId) {
      return NextResponse.json(
        { success: false, error: 'bundleId is required' },
        { status: 400 }
      )
    }

    const supabase = getSupabaseAdmin()
    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    const { data, error } = await supabase
      .from('content_bundles')
      .update({
        is_template: false,
        template_name: null,
      })
      .eq('id', bundleId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      data,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to remove template'
    const isMigration = message.includes('does not exist')
    console.error('Templates DELETE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: isMigration ? 'Templates require migration 20260216_p2_features.sql' : message,
      },
      { status: isMigration ? 503 : 500 }
    )
  }
}
