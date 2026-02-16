// =============================================================================
// HeyGen Service Module — Video generation via HeyGen Avatar API
// =============================================================================

import { getSupabaseAdmin } from './supabase'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HEYGEN_API_KEY = process.env.HEYGEN_API_KEY || ''
const HEYGEN_BASE_URL = 'https://api.heygen.com'
const HEYGEN_DEFAULT_AVATAR_ID = process.env.HEYGEN_DEFAULT_AVATAR_ID || ''
const HEYGEN_DEFAULT_VOICE_ID = process.env.HEYGEN_DEFAULT_VOICE_ID || ''
const HEYGEN_WEBHOOK_SECRET = process.env.HEYGEN_WEBHOOK_SECRET || ''

export const HEYGEN_CONFIGURED = !!HEYGEN_API_KEY

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface HeyGenAvatar {
  avatar_id: string
  avatar_name: string
  gender: string
  preview_image_url: string
  preview_video_url?: string
  default_voice_id: string
}

export interface HeyGenVideoStatus {
  status: 'pending' | 'waiting' | 'processing' | 'completed' | 'failed'
  video_url?: string
  thumbnail_url?: string
  duration?: number
  error?: string | null
}

export interface HeyGenJob {
  id: string
  bundle_id: string | null
  asset_id: string | null
  video_id: string | null
  status: string
  avatar_id: string
  avatar_name: string | null
  voice_id: string
  input_text: string
  video_url: string | null
  thumbnail_url: string | null
  duration: number | null
  video_url_expires_at: string | null
  error_message: string | null
  retry_count: number
  max_retries: number
  metadata: Record<string, unknown>
  created_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class HeyGenError extends Error {
  public statusCode?: number
  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'HeyGenError'
    this.statusCode = statusCode
  }
}

// ---------------------------------------------------------------------------
// Internal: API fetch helper
// ---------------------------------------------------------------------------

async function heygenFetch<T>(
  path: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<T> {
  if (!HEYGEN_API_KEY) {
    throw new HeyGenError('HEYGEN_API_KEY not configured')
  }

  const { timeout = 30000, headers: customHeaders, ...rest } = options

  const res = await fetch(`${HEYGEN_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': HEYGEN_API_KEY,
      ...(customHeaders as Record<string, string>),
    },
    signal: AbortSignal.timeout(timeout),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new HeyGenError(`HeyGen API error ${res.status}: ${text}`, res.status)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// Avatar cache (in-memory, 30-minute TTL)
// ---------------------------------------------------------------------------

let _avatarCache: HeyGenAvatar[] | null = null
let _avatarCacheTime = 0
const AVATAR_CACHE_TTL = 30 * 60 * 1000

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Public API — Avatar operations
// ---------------------------------------------------------------------------

/** List available HeyGen avatars. Results cached for 30 minutes. */
export async function listAvatars(forceRefresh = false): Promise<HeyGenAvatar[]> {
  if (!forceRefresh && _avatarCache && Date.now() - _avatarCacheTime < AVATAR_CACHE_TTL) {
    return _avatarCache
  }

  const response = await heygenFetch<{ data: { avatars: HeyGenAvatar[] } }>(
    '/v2/avatars',
    { method: 'GET', timeout: 15000 }
  )

  _avatarCache = response.data.avatars || []
  _avatarCacheTime = Date.now()
  return _avatarCache
}

/** Get avatar by ID, or find a default (env → "Sarah" → first female → first). */
export async function getAvatar(avatarId?: string): Promise<HeyGenAvatar | null> {
  const avatars = await listAvatars()
  if (!avatars.length) return null

  if (avatarId) {
    return avatars.find(a => a.avatar_id === avatarId) || null
  }

  if (HEYGEN_DEFAULT_AVATAR_ID) {
    const defaultAvatar = avatars.find(a => a.avatar_id === HEYGEN_DEFAULT_AVATAR_ID)
    if (defaultAvatar) return defaultAvatar
  }

  const sarah = avatars.find(a => a.avatar_name.toLowerCase().includes('sarah'))
  if (sarah) return sarah

  const female = avatars.find(a => a.gender === 'female')
  if (female) return female

  return avatars[0]
}

// ---------------------------------------------------------------------------
// Public API — Video generation
// ---------------------------------------------------------------------------

/** Generate a video via HeyGen. Returns the HeyGen video_id. */
export async function generateVideo(params: {
  scriptText: string
  avatarId: string
  voiceId: string
  callbackUrl?: string
  callbackId?: string
  width?: number
  height?: number
}): Promise<string> {
  const body: Record<string, unknown> = {
    video_inputs: [{
      character: {
        type: 'avatar',
        avatar_id: params.avatarId,
        avatar_style: 'normal',
      },
      voice: {
        type: 'text',
        voice_id: params.voiceId,
        input_text: params.scriptText,
        speed: 1.0,
      },
    }],
    dimension: {
      width: params.width || 1920,
      height: params.height || 1080,
    },
  }

  if (params.callbackUrl) body.callback_url = params.callbackUrl
  if (params.callbackId) body.callback_id = params.callbackId

  const response = await heygenFetch<{ data: { video_id: string } }>(
    '/v2/video/generate',
    { method: 'POST', body: JSON.stringify(body), timeout: 60000 }
  )

  return response.data.video_id
}

/** Check status of a HeyGen video by video_id. */
export async function getVideoStatus(videoId: string): Promise<HeyGenVideoStatus> {
  const response = await heygenFetch<{ data: HeyGenVideoStatus }>(
    `/v1/video_status.get?video_id=${encodeURIComponent(videoId)}`,
    { method: 'GET', timeout: 15000 }
  )

  return response.data
}

// ---------------------------------------------------------------------------
// Public API — High-level job operations (use Supabase)
// ---------------------------------------------------------------------------

/**
 * Create a video job from a content asset's script text.
 * Creates a heygen_jobs record, calls HeyGen API, updates the record.
 */
export async function createVideoFromBundle(params: {
  bundleId: string
  assetId?: string
  scriptText: string
  avatarId?: string
  voiceId?: string
  callbackUrl?: string
}): Promise<HeyGenJob> {
  const db = getSupabaseAdmin()
  if (!db) throw new HeyGenError('Database not configured')

  // Resolve avatar
  const avatar = await getAvatar(params.avatarId)
  if (!avatar) throw new HeyGenError('No avatar available')

  const voiceId = params.voiceId || HEYGEN_DEFAULT_VOICE_ID || avatar.default_voice_id
  if (!voiceId) throw new HeyGenError('No voice ID available')

  const jobId = generateId('hgj')

  // Insert pending job record
  const { error: insertError } = await db
    .from('heygen_jobs')
    .insert({
      id: jobId,
      bundle_id: params.bundleId,
      asset_id: params.assetId || null,
      video_id: null,
      status: 'pending',
      avatar_id: avatar.avatar_id,
      avatar_name: avatar.avatar_name,
      voice_id: voiceId,
      input_text: params.scriptText,
      metadata: { dimension: { width: 1920, height: 1080 } },
    })

  if (insertError) throw new HeyGenError(`Failed to create job: ${insertError.message}`)

  // Call HeyGen API
  try {
    const videoId = await generateVideo({
      scriptText: params.scriptText,
      avatarId: avatar.avatar_id,
      voiceId,
      callbackUrl: params.callbackUrl,
      callbackId: jobId,
    })

    const { data: updatedJob, error: updateError } = await db
      .from('heygen_jobs')
      .update({
        video_id: videoId,
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select()
      .single()

    if (updateError) throw new HeyGenError(`Failed to update job: ${updateError.message}`)
    return updatedJob as HeyGenJob
  } catch (err) {
    // Mark job as failed on API error
    await db.from('heygen_jobs').update({
      status: 'failed',
      error_message: err instanceof Error ? err.message : 'Unknown error',
    }).eq('id', jobId)
    throw err
  }
}

/**
 * Handle completion of a HeyGen video (called by polling or webhook).
 * Updates heygen_jobs and content_assets metadata.
 */
export async function handleVideoCompletion(
  jobId: string,
  videoStatus: HeyGenVideoStatus
): Promise<void> {
  const db = getSupabaseAdmin()
  if (!db) return

  const now = new Date()
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days

  if (videoStatus.status === 'completed' && videoStatus.video_url) {
    await db.from('heygen_jobs').update({
      status: 'completed',
      video_url: videoStatus.video_url,
      thumbnail_url: videoStatus.thumbnail_url || null,
      duration: videoStatus.duration || null,
      video_url_expires_at: expiresAt.toISOString(),
      completed_at: now.toISOString(),
    }).eq('id', jobId)

    // Update linked content_asset with video metadata
    const { data: job } = await db
      .from('heygen_jobs')
      .select('asset_id')
      .eq('id', jobId)
      .single()

    if (job?.asset_id) {
      await db.from('content_assets').update({
        status: 'published',
        metadata: {
          heygen_job_id: jobId,
          video_url: videoStatus.video_url,
          thumbnail_url: videoStatus.thumbnail_url || null,
          duration: videoStatus.duration || null,
          video_url_expires_at: expiresAt.toISOString(),
        },
      }).eq('id', job.asset_id)
    }
  } else if (videoStatus.status === 'failed') {
    await db.from('heygen_jobs').update({
      status: 'failed',
      error_message: videoStatus.error || 'Video generation failed',
      completed_at: now.toISOString(),
    }).eq('id', jobId)
  }
}

/** Retry a failed HeyGen job. */
export async function retryJob(jobId: string): Promise<HeyGenJob> {
  const db = getSupabaseAdmin()
  if (!db) throw new HeyGenError('Database not configured')

  const { data: job, error } = await db
    .from('heygen_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !job) throw new HeyGenError('Job not found')

  const typedJob = job as HeyGenJob
  if (typedJob.retry_count >= typedJob.max_retries) {
    throw new HeyGenError(`Max retries (${typedJob.max_retries}) exceeded`)
  }

  // Reset job state
  await db.from('heygen_jobs').update({
    status: 'pending',
    video_id: null,
    video_url: null,
    thumbnail_url: null,
    error_message: null,
    completed_at: null,
    retry_count: typedJob.retry_count + 1,
  }).eq('id', jobId)

  // Re-submit to HeyGen
  const videoId = await generateVideo({
    scriptText: typedJob.input_text,
    avatarId: typedJob.avatar_id,
    voiceId: typedJob.voice_id,
  })

  const { data: updatedJob, error: updateError } = await db
    .from('heygen_jobs')
    .update({
      video_id: videoId,
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single()

  if (updateError) throw new HeyGenError(`Failed to update retried job: ${updateError.message}`)
  return updatedJob as HeyGenJob
}

// ---------------------------------------------------------------------------
// Webhook signature verification
// ---------------------------------------------------------------------------

/** Verify HeyGen webhook HMAC-SHA256 signature. */
export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  if (!HEYGEN_WEBHOOK_SECRET) return true // No secret = skip verification

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto')
  const expected = crypto
    .createHmac('sha256', HEYGEN_WEBHOOK_SECRET)
    .update(payload)
    .digest('hex')

  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  )
}
