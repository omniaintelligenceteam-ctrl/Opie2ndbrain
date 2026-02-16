import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import crypto from 'crypto'

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

    const webhookId = params.id

    // Get webhook
    const { data: webhook, error: whError } = await supabase
      .from('webhooks')
      .select('*')
      .eq('id', webhookId)
      .single()

    if (whError || !webhook) {
      return NextResponse.json(
        { success: false, error: 'Webhook not found' },
        { status: 404 }
      )
    }

    // Send test payload
    const payload = {
      event: 'test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook from Opie 2nd Brain',
        webhook_id: webhookId,
        webhook_name: webhook.name,
      },
    }

    const bodyStr = JSON.stringify(payload)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': 'test',
      'X-Webhook-Timestamp': new Date().toISOString(),
    }

    // Add HMAC signature if secret is configured
    if (webhook.secret) {
      const signature = crypto
        .createHmac('sha256', webhook.secret)
        .update(bodyStr)
        .digest('hex')
      headers['X-Webhook-Signature'] = `sha256=${signature}`
    }

    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: bodyStr,
    })

    // Update last_triggered and last_status
    await supabase
      .from('webhooks')
      .update({
        last_triggered: new Date().toISOString(),
        last_status: response.status,
      })
      .eq('id', webhookId)

    return NextResponse.json({
      success: true,
      data: {
        status: response.status,
        statusText: response.statusText,
        triggered_at: new Date().toISOString(),
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Webhook test error:', error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to test webhook',
      },
      { status: 500 }
    )
  }
}
