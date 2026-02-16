// =============================================================================
// Image Generation Service — Trade-specific images via Replicate Flux API
// =============================================================================

import { getSupabaseAdmin } from './supabase'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN || ''
const REPLICATE_BASE_URL = 'https://api.replicate.com'
const REPLICATE_MODEL = 'black-forest-labs/flux-schnell'

export const IMAGE_GEN_CONFIGURED = !!REPLICATE_API_TOKEN

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ImageGenerationParams {
  prompt: string
  aspectRatio: '1:1' | '4:5' | '16:9'
  style: 'commercial' | 'editorial' | 'cinematic'
  brandColors?: string[]
}

export interface ImageSize {
  name: string
  width: number
  height: number
  aspectRatio: '1:1' | '4:5' | '16:9'
  platform: string
}

export interface ImageGenerationJob {
  id: string
  bundle_id: string | null
  asset_id: string | null
  prediction_id: string | null
  status: string
  prompt: string
  style: string
  aspect_ratio: string
  size_name: string
  image_url: string | null
  storage_path: string | null
  error_message: string | null
  retry_count: number
  max_retries: number
  metadata: Record<string, unknown>
  created_at: string
  started_at: string | null
  completed_at: string | null
  updated_at: string
}

export interface PredictionStatus {
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string[]
  error?: string
}

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

export class ImageGenerationError extends Error {
  public statusCode?: number
  constructor(message: string, statusCode?: number) {
    super(message)
    this.name = 'ImageGenerationError'
    this.statusCode = statusCode
  }
}

// ---------------------------------------------------------------------------
// Internal: API fetch helper
// ---------------------------------------------------------------------------

async function replicateFetch<T>(
  path: string,
  options: RequestInit & { timeout?: number } = {}
): Promise<T> {
  if (!REPLICATE_API_TOKEN) {
    throw new ImageGenerationError('REPLICATE_API_TOKEN not configured')
  }

  const { timeout = 30000, headers: customHeaders, ...rest } = options

  const res = await fetch(`${REPLICATE_BASE_URL}${path}`, {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
      ...(customHeaders as Record<string, string>),
    },
    signal: AbortSignal.timeout(timeout),
  })

  if (!res.ok) {
    const text = await res.text().catch(() => 'Unknown error')
    throw new ImageGenerationError(`Replicate API error ${res.status}: ${text}`, res.status)
  }

  return res.json()
}

// ---------------------------------------------------------------------------
// ID generator
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Image sizes
// ---------------------------------------------------------------------------

export const IMAGE_SIZES: ImageSize[] = [
  { name: 'instagram', width: 1080, height: 1080, aspectRatio: '1:1', platform: 'Instagram' },
  { name: 'linkedin', width: 1200, height: 628, aspectRatio: '16:9', platform: 'LinkedIn' },
  { name: 'blog', width: 1920, height: 1080, aspectRatio: '16:9', platform: 'Blog/Website' },
]

// ---------------------------------------------------------------------------
// Trade-specific prompt templates (Nano Banana Pro style)
// ---------------------------------------------------------------------------

const TRADE_PROMPT_TEMPLATES: Record<string, (topic: string) => string> = {
  HVAC: (topic) =>
    `Professional commercial photography, HVAC technician in clean uniform working on residential AC unit, warm natural lighting, professional color grading, shallow depth of field, premium home services aesthetic, 8k resolution, photorealistic. Context: ${topic}`,

  Plumbing: (topic) =>
    `Professional commercial photography, plumber with modern tools fixing sink, clean bright bathroom setting, professional lighting, trustworthy service aesthetic, 8k, photorealistic. Context: ${topic}`,

  Electrical: (topic) =>
    `Professional commercial photography, licensed electrician working on modern electrical panel, safety gear, clean residential setting, professional lighting, reliable service aesthetic, 8k, photorealistic. Context: ${topic}`,

  Roofing: (topic) =>
    `Professional commercial photography, roofing crew installing new shingles on beautiful residential home, aerial perspective, golden hour lighting, clear blue sky, premium craftsmanship aesthetic, 8k, photorealistic. Context: ${topic}`,

  'General Contracting': (topic) =>
    `Professional commercial photography, general contractor reviewing blueprints at modern renovation site, hard hat and safety vest, clean construction environment, professional lighting, trusted builder aesthetic, 8k, photorealistic. Context: ${topic}`,

  Landscaping: (topic) =>
    `Professional commercial photography, landscaper designing beautiful residential garden, lush greenery, manicured lawn, natural sunlight, premium outdoor living aesthetic, 8k, photorealistic. Context: ${topic}`,

  Painting: (topic) =>
    `Professional commercial photography, professional painter applying fresh coat on interior walls, clean drop cloths, vibrant paint colors, bright natural light, home transformation aesthetic, 8k, photorealistic. Context: ${topic}`,

  Solar: (topic) =>
    `Professional commercial photography, solar panel installation on modern residential roof, bright blue sky with sun flare, clean energy technology, professional crew, sustainable living aesthetic, 8k, photorealistic. Context: ${topic}`,
}

const STYLE_MODIFIERS: Record<string, string> = {
  commercial:
    'Corporate marketing photography style, clean composition, product-focused, bright and inviting.',
  editorial:
    'Editorial magazine photography style, storytelling composition, candid feel, documentary aesthetic.',
  cinematic:
    'Cinematic photography, dramatic lighting, shallow depth of field, subtle film grain, movie-still quality.',
}

// ---------------------------------------------------------------------------
// Prompt builder
// ---------------------------------------------------------------------------

export function buildPrompt(
  trade: string,
  topic: string,
  style: string,
  brandColors?: string[]
): string {
  const templateFn = TRADE_PROMPT_TEMPLATES[trade]
  const base = templateFn
    ? templateFn(topic)
    : `Professional commercial photography for ${trade} business, ${topic}. Premium service aesthetic, 8k, photorealistic.`
  const styleMod = STYLE_MODIFIERS[style] || STYLE_MODIFIERS.commercial
  const colorNote = brandColors?.length
    ? ` Brand color palette: ${brandColors.join(', ')}.`
    : ''
  return `${base} ${styleMod}${colorNote}`
}

// ---------------------------------------------------------------------------
// Public API — Replicate operations
// ---------------------------------------------------------------------------

/** Submit a prediction to Replicate Flux model. */
export async function generateImage(params: {
  prompt: string
  aspectRatio: string
}): Promise<{ predictionId: string }> {
  const response = await replicateFetch<{ id: string }>(
    '/v1/predictions',
    {
      method: 'POST',
      body: JSON.stringify({
        model: REPLICATE_MODEL,
        input: {
          prompt: params.prompt,
          aspect_ratio: params.aspectRatio,
          num_outputs: 1,
          output_format: 'png',
          output_quality: 90,
        },
      }),
      timeout: 60000,
    }
  )

  return { predictionId: response.id }
}

/** Check status of a Replicate prediction. */
export async function getPredictionStatus(predictionId: string): Promise<PredictionStatus> {
  const response = await replicateFetch<{
    status: string
    output?: string[]
    error?: string
  }>(`/v1/predictions/${predictionId}`, { method: 'GET', timeout: 15000 })

  return {
    status: response.status as PredictionStatus['status'],
    output: response.output,
    error: response.error,
  }
}

// ---------------------------------------------------------------------------
// Internal: Download image and store in Supabase Storage
// ---------------------------------------------------------------------------

async function downloadAndStoreImage(
  imageUrl: string,
  storagePath: string
): Promise<string> {
  const db = getSupabaseAdmin()
  if (!db) throw new ImageGenerationError('Database not configured')

  // Download from Replicate temp URL
  const imageRes = await fetch(imageUrl, { signal: AbortSignal.timeout(30000) })
  if (!imageRes.ok) {
    throw new ImageGenerationError(`Failed to download image: ${imageRes.status}`)
  }

  const imageBuffer = Buffer.from(await imageRes.arrayBuffer())

  // Upload to Supabase Storage
  const { error: uploadError } = await db.storage
    .from('content-images')
    .upload(storagePath, imageBuffer, {
      contentType: 'image/png',
      upsert: true,
    })

  if (uploadError) {
    throw new ImageGenerationError(`Storage upload failed: ${uploadError.message}`)
  }

  // Get public URL
  const { data: urlData } = db.storage.from('content-images').getPublicUrl(storagePath)
  return urlData.publicUrl
}

// ---------------------------------------------------------------------------
// Public API — High-level job operations (use Supabase)
// ---------------------------------------------------------------------------

/**
 * Create an image generation job from a bundle.
 * Creates an image_generation_jobs record, calls Replicate API, updates record.
 */
export async function createImageFromBundle(params: {
  bundleId: string
  assetId?: string
  prompt: string
  style: string
  aspectRatio: string
  sizeName: string
}): Promise<ImageGenerationJob> {
  const db = getSupabaseAdmin()
  if (!db) throw new ImageGenerationError('Database not configured')

  const jobId = generateId('igj')

  const { error: insertError } = await db
    .from('image_generation_jobs')
    .insert({
      id: jobId,
      bundle_id: params.bundleId,
      asset_id: params.assetId || null,
      prediction_id: null,
      status: 'pending',
      prompt: params.prompt,
      style: params.style,
      aspect_ratio: params.aspectRatio,
      size_name: params.sizeName,
      metadata: {},
    })

  if (insertError) {
    throw new ImageGenerationError(`Failed to create job: ${insertError.message}`)
  }

  try {
    const { predictionId } = await generateImage({
      prompt: params.prompt,
      aspectRatio: params.aspectRatio,
    })

    const { data: updatedJob, error: updateError } = await db
      .from('image_generation_jobs')
      .update({
        prediction_id: predictionId,
        status: 'processing',
        started_at: new Date().toISOString(),
      })
      .eq('id', jobId)
      .select()
      .single()

    if (updateError) {
      throw new ImageGenerationError(`Failed to update job: ${updateError.message}`)
    }

    return updatedJob as ImageGenerationJob
  } catch (err) {
    // Mark job as failed on API error
    await db
      .from('image_generation_jobs')
      .update({
        status: 'failed',
        error_message: err instanceof Error ? err.message : 'Unknown error',
      })
      .eq('id', jobId)
    throw err
  }
}

/**
 * Handle completion of a Replicate prediction (called by polling).
 * Downloads image to Supabase Storage, updates job and content_asset metadata.
 */
export async function handleImageCompletion(
  jobId: string,
  predictionStatus: PredictionStatus
): Promise<void> {
  const db = getSupabaseAdmin()
  if (!db) return

  const now = new Date()

  if (predictionStatus.status === 'succeeded' && predictionStatus.output?.[0]) {
    const tempUrl = predictionStatus.output[0]

    // Fetch the job to build storage path
    const { data: job } = await db
      .from('image_generation_jobs')
      .select('bundle_id, asset_id, size_name')
      .eq('id', jobId)
      .single()

    const storagePath = `${job?.bundle_id || 'unknown'}/${jobId}-${job?.size_name || 'image'}.png`

    try {
      const permanentUrl = await downloadAndStoreImage(tempUrl, storagePath)

      await db
        .from('image_generation_jobs')
        .update({
          status: 'completed',
          image_url: permanentUrl,
          storage_path: storagePath,
          completed_at: now.toISOString(),
        })
        .eq('id', jobId)

      // Update linked content_asset metadata with the new image
      if (job?.asset_id) {
        const { data: existingAsset } = await db
          .from('content_assets')
          .select('id, metadata')
          .eq('id', job.asset_id)
          .single()

        if (existingAsset) {
          const currentMeta = (existingAsset.metadata || {}) as Record<string, unknown>
          const images = (
            (currentMeta.images as Array<Record<string, unknown>>) || []
          ).slice()
          images.push({
            job_id: jobId,
            url: permanentUrl,
            size_name: job.size_name,
            storage_path: storagePath,
          })
          await db
            .from('content_assets')
            .update({
              status: images.length >= 3 ? 'published' : 'draft',
              metadata: { ...currentMeta, images },
            })
            .eq('id', existingAsset.id)
        }
      }
    } catch (storageErr) {
      // If storage fails, still save the temp URL so it's not completely lost
      await db
        .from('image_generation_jobs')
        .update({
          status: 'completed',
          image_url: tempUrl,
          error_message: `Storage failed: ${storageErr instanceof Error ? storageErr.message : 'unknown'}`,
          completed_at: now.toISOString(),
        })
        .eq('id', jobId)
    }
  } else if (
    predictionStatus.status === 'failed' ||
    predictionStatus.status === 'canceled'
  ) {
    await db
      .from('image_generation_jobs')
      .update({
        status: 'failed',
        error_message: predictionStatus.error || 'Image generation failed',
        completed_at: now.toISOString(),
      })
      .eq('id', jobId)
  }
}

/** Retry a failed image generation job. */
export async function retryImageJob(jobId: string): Promise<ImageGenerationJob> {
  const db = getSupabaseAdmin()
  if (!db) throw new ImageGenerationError('Database not configured')

  const { data: job, error } = await db
    .from('image_generation_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error || !job) throw new ImageGenerationError('Job not found')

  const typedJob = job as ImageGenerationJob
  if (typedJob.retry_count >= typedJob.max_retries) {
    throw new ImageGenerationError(`Max retries (${typedJob.max_retries}) exceeded`)
  }

  // Reset job state
  await db
    .from('image_generation_jobs')
    .update({
      status: 'pending',
      prediction_id: null,
      image_url: null,
      storage_path: null,
      error_message: null,
      completed_at: null,
      retry_count: typedJob.retry_count + 1,
    })
    .eq('id', jobId)

  // Re-submit to Replicate
  const { predictionId } = await generateImage({
    prompt: typedJob.prompt,
    aspectRatio: typedJob.aspect_ratio,
  })

  const { data: updatedJob, error: updateError } = await db
    .from('image_generation_jobs')
    .update({
      prediction_id: predictionId,
      status: 'processing',
      started_at: new Date().toISOString(),
    })
    .eq('id', jobId)
    .select()
    .single()

  if (updateError) {
    throw new ImageGenerationError(`Failed to update retried job: ${updateError.message}`)
  }

  return updatedJob as ImageGenerationJob
}

// ---------------------------------------------------------------------------
// Public API — Orchestrator (main entry point)
// ---------------------------------------------------------------------------

/**
 * Generate content images for a bundle.
 * Creates an image asset, then spawns one job per size.
 *
 * @example
 * await generateContentImages({
 *   bundleId: 'bnd_123',
 *   trade: 'HVAC',
 *   topic: 'Why contractors miss calls',
 *   count: 3,
 * })
 */
export async function generateContentImages(params: {
  bundleId: string
  trade: string
  topic: string
  count?: number
  style?: string
  brandColors?: string[]
}): Promise<ImageGenerationJob[]> {
  const db = getSupabaseAdmin()
  if (!db) throw new ImageGenerationError('Database not configured')

  const count = Math.min(params.count || 3, 3)
  const style = params.style || 'commercial'

  // Pick sizes in priority order: instagram, linkedin, blog
  const sizesToGenerate = IMAGE_SIZES.slice(0, count)

  // Create a single image asset record in the bundle
  const assetId = generateId('ast')
  await db.from('content_assets').insert({
    id: assetId,
    bundle_id: params.bundleId,
    type: 'image',
    content: `Generated ${count} images for "${params.topic}" (${params.trade})`,
    status: 'draft',
    metadata: { images: [], trade: params.trade, style },
  })

  const jobs: ImageGenerationJob[] = []

  for (const size of sizesToGenerate) {
    const prompt = buildPrompt(params.trade, params.topic, style, params.brandColors)

    const job = await createImageFromBundle({
      bundleId: params.bundleId,
      assetId,
      prompt,
      style,
      aspectRatio: size.aspectRatio,
      sizeName: size.name,
    })
    jobs.push(job)
  }

  return jobs
}
