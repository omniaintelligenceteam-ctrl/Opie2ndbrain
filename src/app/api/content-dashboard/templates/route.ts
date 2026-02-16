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

    if (error) throw error

    return NextResponse.json({
      success: true,
      data: { templates: data || [] },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Templates GET error:', error)
    return NextResponse.json({
      success: true,
      data: { templates: [] },
      timestamp: new Date().toISOString(),
    })
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
    console.error('Templates POST error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to save template',
      },
      { status: 500 }
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
    console.error('Templates DELETE error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to remove template',
      },
      { status: 500 }
    )
  }
}
