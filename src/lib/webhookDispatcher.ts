import { getSupabaseAdmin } from './supabase'
import crypto from 'crypto'

type WebhookEvent =
  | 'workflow.completed'
  | 'workflow.failed'
  | 'bundle.created'
  | 'asset.published'
  | 'test'

interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  data: Record<string, unknown>
}

/**
 * Dispatches a webhook event to all enabled webhooks that match the event.
 * Called from workflow completion, bundle creation, asset publishing, etc.
 */
export async function dispatchWebhook(
  event: WebhookEvent,
  data: Record<string, unknown>
): Promise<{ sent: number; failed: number }> {
  const supabase = getSupabaseAdmin()
  if (!supabase) return { sent: 0, failed: 0 }

  try {
    // Find all enabled webhooks that listen for this event
    const { data: webhooks, error } = await supabase
      .from('webhooks')
      .select('*')
      .eq('enabled', true)
      .contains('events', [event])

    if (error || !webhooks || webhooks.length === 0) {
      return { sent: 0, failed: 0 }
    }

    const payload: WebhookPayload = {
      event,
      timestamp: new Date().toISOString(),
      data,
    }

    const bodyStr = JSON.stringify(payload)

    let sent = 0
    let failed = 0

    // Fire all webhooks in parallel
    const results = await Promise.allSettled(
      webhooks.map(async (webhook) => {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'X-Webhook-Event': event,
          'X-Webhook-Timestamp': payload.timestamp,
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
          signal: AbortSignal.timeout(10000), // 10s timeout
        })

        // Update last_triggered and last_status
        await supabase
          .from('webhooks')
          .update({
            last_triggered: new Date().toISOString(),
            last_status: response.status,
          })
          .eq('id', webhook.id)

        return { webhookId: webhook.id, status: response.status }
      })
    )

    for (const result of results) {
      if (result.status === 'fulfilled') {
        sent++
      } else {
        failed++
        console.error('Webhook dispatch failed:', result.reason)
      }
    }

    return { sent, failed }
  } catch (error) {
    console.error('Webhook dispatcher error:', error)
    return { sent: 0, failed: 0 }
  }
}
