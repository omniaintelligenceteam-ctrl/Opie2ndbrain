import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseAdmin()

    if (!supabase) {
      // Fallback when Supabase is not configured
      return NextResponse.json({
        success: true,
        data: {
          activeWorkflows: 0,
          queuedWorkflows: 0,
          approvedContent: 0,
          queuedTopics: 0,
          avgAgentHealth: 0,
          scheduledPosts: 0,
          timestamp: new Date().toISOString(),
          fallback: true,
        },
      })
    }

    // Run all count queries in parallel
    const [
      activeResult,
      queuedResult,
      approvedResult,
      bundlesResult,
      completedResult,
      failedResult,
    ] = await Promise.all([
      supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'running'),
      supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .in('status', ['queued', 'pending']),
      supabase
        .from('content_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'complete'),
      supabase
        .from('content_bundles')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'creating'),
      supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'completed'),
      supabase
        .from('workflows')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'failed'),
    ])

    const active = activeResult.count || 0
    const queued = queuedResult.count || 0
    const approved = approvedResult.count || 0
    const creating = bundlesResult.count || 0
    const completed = completedResult.count || 0
    const failed = failedResult.count || 0

    // Calculate agent health as completion rate
    const totalFinished = completed + failed
    const avgAgentHealth = totalFinished > 0
      ? Math.round((completed / totalFinished) * 100) / 100
      : 1.0 // Default to 100% when no data

    return NextResponse.json({
      success: true,
      data: {
        activeWorkflows: active,
        queuedWorkflows: queued,
        approvedContent: approved,
        queuedTopics: creating,
        avgAgentHealth,
        scheduledPosts: 0, // No scheduling system yet
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error('Analytics API error:', error)

    return NextResponse.json({
      success: true,
      data: {
        activeWorkflows: 0,
        queuedWorkflows: 0,
        approvedContent: 0,
        queuedTopics: 0,
        avgAgentHealth: 0,
        scheduledPosts: 0,
        timestamp: new Date().toISOString(),
        error: true,
      },
    })
  }
}
