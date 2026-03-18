import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const GATEWAY_URL = process.env.OPENCLAW_GATEWAY_URL || 'http://127.0.0.1:19001'
const GATEWAY_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || process.env.GATEWAY_TOKEN || ''

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_KEY
  if (!url || !key) return null
  try {
    return createClient(url, key)
  } catch {
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { topic, discordChannelId } = body as { topic?: string; discordChannelId?: string }

    if (!topic || typeof topic !== 'string' || topic.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Topic is required' },
        { status: 400 }
      )
    }

    const sanitizedTopic = topic.trim().slice(0, 500)
    const jobId = `larry_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    // Try to persist job to Supabase (graceful if fails)
    const supabase = getSupabaseAdmin()
    if (supabase) {
      try {
        await supabase.from('larry_jobs').insert({
          id: jobId,
          topic: sanitizedTopic,
          status: 'generating',
          discord_channel_id: discordChannelId || null,
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('Failed to insert larry_jobs row (continuing):', err)
      }
    }

    // Spawn OpenClaw session for video generation
    try {
      await fetch(`${GATEWAY_URL}/tools/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GATEWAY_TOKEN}`,
        },
        body: JSON.stringify({
          tool: 'sessions_spawn',
          args: {
            task: `Run the Larry TikTok video pipeline: cd /root/.openclaw/workspace/skills/larry && node index.js --make-video --topic "${sanitizedTopic}" --output /tmp/larry-${jobId}.mp4. Report output path when done.`,
            label: `larry-video-${jobId}`,
            timeoutSeconds: 300,
            cleanup: 'keep',
          },
        }),
      })
    } catch (err) {
      console.error('Failed to spawn OpenClaw session:', err)
      // Update job status to failed if we can
      if (supabase) {
        try {
          await supabase
            .from('larry_jobs')
            .update({ status: 'failed', error: 'Failed to spawn generation session' })
            .eq('id', jobId)
        } catch {
          // ignore
        }
      }
      return NextResponse.json(
        { success: false, error: 'Failed to start video generation', jobId },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      jobId,
      status: 'generating',
    })
  } catch (error: any) {
    console.error('Larry generate API error:', error)
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
