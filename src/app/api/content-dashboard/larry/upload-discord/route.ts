import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN || ''

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
    const body = await request.json() as { jobId: string; channelId: string }
    const { jobId, channelId } = body

    if (!jobId || !channelId) {
      return NextResponse.json(
        { success: false, error: 'jobId and channelId are required' },
        { status: 400 }
      )
    }

    if (!DISCORD_BOT_TOKEN) {
      return NextResponse.json(
        { success: false, error: 'Discord bot token not configured' },
        { status: 503 }
      )
    }

    const supabase = getSupabaseAdmin()

    if (!supabase) {
      return NextResponse.json(
        { success: false, error: 'Database not configured' },
        { status: 503 }
      )
    }

    // Fetch job record
    const { data: job, error: jobError } = await supabase
      .from('larry_jobs')
      .select('*')
      .eq('id', jobId)
      .single()

    if (jobError || !job) {
      return NextResponse.json(
        { success: false, error: 'Job not found' },
        { status: 404 }
      )
    }

    if (job.status !== 'complete') {
      return NextResponse.json(
        { success: false, error: `Job is not complete (status: ${job.status})` },
        { status: 400 }
      )
    }

    // Determine video path
    const videoPath: string = job.video_path || `/tmp/larry-${jobId}.mp4`

    if (!fs.existsSync(videoPath)) {
      return NextResponse.json(
        { success: false, error: `Video file not found at ${videoPath}` },
        { status: 404 }
      )
    }

    // Upload to Discord
    const fileBuffer = fs.readFileSync(videoPath)
    const formData = new FormData()
    const blob = new Blob([fileBuffer], { type: 'video/mp4' })
    formData.append('file', blob, `larry-${jobId}.mp4`)
    formData.append('content', `🎬 TikTok video: "${job.topic}"`)

    const discordRes = await fetch(
      `https://discord.com/api/v10/channels/${channelId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
        },
        body: formData,
      }
    )

    if (!discordRes.ok) {
      const errText = await discordRes.text()
      console.error('Discord upload failed:', errText)
      return NextResponse.json(
        { success: false, error: `Discord upload failed: ${discordRes.status}` },
        { status: 502 }
      )
    }

    const discordData = await discordRes.json() as { id: string }
    const discordMessageId = discordData.id

    // Update job with discord info
    await supabase
      .from('larry_jobs')
      .update({
        discord_channel_id: channelId,
        discord_message_id: discordMessageId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', jobId)

    return NextResponse.json({
      success: true,
      discordMessageId,
      channelId,
    })
  } catch (error: unknown) {
    console.error('Larry upload-discord error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
