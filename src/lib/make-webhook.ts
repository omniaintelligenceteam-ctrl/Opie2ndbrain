// Make.com Webhook Integration Service
// Sends data to Make.com trigger scenarios

const MAKE_WEBHOOK_URL = 'https://hook.us2.make.com/7jux85ndgjg9mpr6o7choquk1h072sbp'

/**
 * Send workflow completion data to Make.com
 */
export async function sendToMake(event: string, data: any) {
  try {
    const response = await fetch(MAKE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        data,
      }),
    })

    if (!response.ok) {
      throw new Error(`Make webhook failed: ${response.status}`)
    }

    console.log('✅ Sent to Make.com:', event)
    return { success: true }
  } catch (error) {
    console.error('❌ Failed to send to Make:', error)
    return { success: false, error }
  }
}

/**
 * Workflow completed - send all content data to Make
 */
export async function notifyWorkflowCompleted(bundleData: {
  bundleId: string
  topic: string
  trade: string
  qualityScore: number
  status: string
  assets: {
    email?: string
    linkedin?: string
    instagram?: string
    heygenScript?: string
    images?: number
  }
}) {
  return sendToMake('workflow_completed', bundleData)
}

/**
 * New lead captured - send lead data to Make
 */
export async function notifyLeadCaptured(leadData: {
  leadId: string
  source: string
  trade: string
  urgency: string
  phone?: string
  email?: string
}) {
  return sendToMake('lead_captured', leadData)
}

/**
 * Demo booked - send booking data to Make
 */
export async function notifyDemoBooked(bookingData: {
  bookingId: string
  trade: string
  date: string
  prospectName: string
  source: string
}) {
  return sendToMake('demo_booked', bookingData)
}

/**
 * High quality content created - trigger premium actions
 */
export async function notifyHighQualityContent(contentData: {
  bundleId: string
  topic: string
  trade: string
  qualityScore: number
  assets: any
}) {
  if (contentData.qualityScore >= 90) {
    return sendToMake('high_quality_content', contentData)
  }
  return { skipped: true, reason: 'Quality score below threshold' }
}
