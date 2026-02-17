// =============================================================================
// Image Generation System — Silent AI Partner Gemini/Nano Banana Integration
// =============================================================================
// Generates content images using Gemini API with Nano Banana style

import { getSupabaseAdmin } from './supabase'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''
export const IMAGE_GEN_CONFIGURED = !!GEMINI_API_KEY

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
const IMAGEN_MODEL = 'imagen-4.0-generate-001'
const GEMINI_FLASH_MODEL = 'gemini-2.5-flash-preview-04-17'
const IMAGE_BUCKET = 'content-images'

// ---------------------------------------------------------------------------
// Error Classes
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
// Types
// ---------------------------------------------------------------------------

export interface ImageGenerationRequest {
  bundleId: string
  prompts: string[]
  style?: 'commercial_photography' | 'illustration' | 'infographic' | 'social_media'
  aspectRatio?: '1:1' | '16:9' | '4:5' | '9:16'
  quality?: 'draft' | 'standard' | 'high'
}

export interface GeneratedImage {
  id: string
  bundle_id: string
  prompt: string
  url: string
  style: string
  aspect_ratio: string
  generated_at: string
  metadata: Record<string, unknown>
}

export interface GeminiImageResponse {
  success: boolean
  image_url?: string
  error?: string
  metadata?: Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Helper Functions
// ---------------------------------------------------------------------------

function getSupabase() {
  const supabase = getSupabaseAdmin()
  if (!supabase) {
    throw new Error('Supabase not configured. Check environment variables.')
  }
  return supabase
}

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

// ---------------------------------------------------------------------------
// Image Generation
// ---------------------------------------------------------------------------

// Trade-based generation interface for compatibility
export interface TradeImageGenerationRequest {
  bundleId: string
  trade: string
  topic: string
  count?: number
  style?: string
  brandColors?: string[]
}

/**
 * Generate content images using Gemini API with Nano Banana flavor
 * Supports both original prompts-based and trade-based generation
 */
export async function generateContentImages(
  request: ImageGenerationRequest | TradeImageGenerationRequest
): Promise<{ success: boolean; images?: GeneratedImage[]; error?: string; jobs?: any[] }> {
  const supabase = getSupabase()

  try {
    const generatedImages: GeneratedImage[] = []

    // Convert trade-based request to prompts-based
    const prompts = 'prompts' in request
      ? request.prompts
      : Array.from({ length: request.count || 3 }, (_, i) =>
          `${request.topic} for ${request.trade} - variation ${i + 1}`
        )

    // Process each prompt
    for (const prompt of prompts) {
      try {
        const enhancedPrompt = enhancePromptWithNanoBananaStyle(prompt, request.style)
        
        const aspectRatio = ('aspectRatio' in request ? request.aspectRatio : undefined) || '1:1'
        const quality = ('quality' in request ? request.quality : undefined) || 'standard'
        const style = request.style || 'commercial_photography'

        const result = await generateSingleImageWithGemini(enhancedPrompt, {
          aspectRatio,
          style,
          quality,
          bundleId: request.bundleId,
        })

        if (result.success && result.image_url) {
          const imageId = generateId('img')
          
          // Save image record
          const { error: saveError } = await supabase
            .from('content_images')
            .insert({
              id: imageId,
              bundle_id: request.bundleId,
              prompt: enhancedPrompt,
              original_prompt: prompt,
              url: result.image_url,
              style,
              aspect_ratio: aspectRatio,
              status: 'generated',
              generated_at: new Date().toISOString(),
              metadata: {
                gemini_metadata: result.metadata,
                generation_params: {
                  style,
                  aspectRatio,
                  quality
                }
              }
            })

          if (saveError) {
            console.error('Error saving image record:', saveError)
          } else {
            generatedImages.push({
              id: imageId,
              bundle_id: request.bundleId,
              prompt: enhancedPrompt,
              url: result.image_url,
              style,
              aspect_ratio: aspectRatio,
              generated_at: new Date().toISOString(),
              metadata: result.metadata || {}
            })
          }
        } else {
          console.error(`Image generation failed for prompt: ${prompt}`, result.error)
        }

      } catch (error) {
        console.error(`Error generating image for prompt "${prompt}":`, error)
      }

      // Small delay between generations to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return {
      success: generatedImages.length > 0,
      images: generatedImages,
      error: generatedImages.length === 0 ? 'No images were generated successfully' : undefined
    }

  } catch (error) {
    console.error('Image generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Enhance prompt with Nano Banana commercial photography style
 */
function enhancePromptWithNanoBananaStyle(
  basePrompt: string,
  style: string = 'commercial_photography'
): string {
  const styleEnhancements = {
    commercial_photography: `Professional commercial photography, ${basePrompt}, warm natural lighting, premium service aesthetic, 8k resolution, photorealistic, sharp focus, professional composition, branded elements, clean modern style, high-end commercial look`,
    
    illustration: `Professional illustration, ${basePrompt}, clean vector style, modern design aesthetic, premium branding elements, professional color palette, minimalist composition, commercial illustration style`,
    
    infographic: `Professional infographic design, ${basePrompt}, clean data visualization, modern typography, branded color scheme, professional layout, easy to read, engaging visual hierarchy`,
    
    social_media: `Social media optimized design, ${basePrompt}, eye-catching composition, mobile-friendly layout, engaging visual style, branded elements, platform-optimized formatting`
  }

  return styleEnhancements[style as keyof typeof styleEnhancements] || styleEnhancements.commercial_photography
}

// ---------------------------------------------------------------------------
// Supabase Storage Upload
// ---------------------------------------------------------------------------

/**
 * Upload base64 image data to Supabase Storage and return a public URL.
 * Auto-creates the storage bucket on first use.
 */
async function uploadImageToStorage(
  base64Data: string,
  bundleId: string,
  mimeType: string = 'image/png'
): Promise<string> {
  const supabase = getSupabase()

  const ext = mimeType === 'image/jpeg' ? 'jpg' : 'png'
  const fileName = `${bundleId}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`
  const buffer = Buffer.from(base64Data, 'base64')

  // Try upload
  let { data, error } = await supabase.storage
    .from(IMAGE_BUCKET)
    .upload(fileName, buffer, { contentType: mimeType, upsert: false })

  // If bucket doesn't exist, create it and retry
  if (error && (error.message.includes('not found') || error.message.includes('does not exist') || error.message.includes('Bucket'))) {
    console.log(`[ImageGen] Creating storage bucket '${IMAGE_BUCKET}'`)
    await supabase.storage.createBucket(IMAGE_BUCKET, {
      public: true,
      fileSizeLimit: 10485760, // 10MB
    })
    const retry = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(fileName, buffer, { contentType: mimeType, upsert: false })
    data = retry.data
    error = retry.error
  }

  if (error || !data) {
    throw new Error(`Image upload failed: ${error?.message || 'Unknown error'}`)
  }

  const { data: urlData } = supabase.storage
    .from(IMAGE_BUCKET)
    .getPublicUrl(data.path)

  return urlData.publicUrl
}

// ---------------------------------------------------------------------------
// Gemini / Imagen API Calls
// ---------------------------------------------------------------------------

/**
 * Generate a single image using Imagen 4 API, with Gemini Flash fallback.
 */
async function generateSingleImageWithGemini(
  prompt: string,
  options: {
    aspectRatio: string
    style: string
    quality: string
    bundleId: string
  }
): Promise<GeminiImageResponse> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'GEMINI_API_KEY not configured' }
  }

  // Map aspect ratios to Imagen-supported values
  const aspectRatioMap: Record<string, string> = {
    '1:1': '1:1',
    '16:9': '16:9',
    '9:16': '9:16',
    '4:5': '3:4',
    '4:3': '4:3',
    '3:4': '3:4',
  }
  const aspectRatio = aspectRatioMap[options.aspectRatio] || '1:1'

  try {
    // --- Try Imagen 4 first (dedicated image generation, higher quality) ---
    const imagenResponse = await fetch(
      `${GEMINI_API_BASE}/models/${IMAGEN_MODEL}:predict`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          instances: [{ prompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio,
          },
        }),
        signal: AbortSignal.timeout(60000),
      }
    )

    if (imagenResponse.ok) {
      const data = await imagenResponse.json()
      const prediction = data.predictions?.[0]
      const imageBytes = prediction?.bytesBase64Encoded

      if (imageBytes) {
        const mimeType = prediction.mimeType || 'image/png'
        const imageUrl = await uploadImageToStorage(imageBytes, options.bundleId, mimeType)

        return {
          success: true,
          image_url: imageUrl,
          metadata: {
            model: IMAGEN_MODEL,
            aspectRatio,
            timestamp: new Date().toISOString(),
          },
        }
      }
      console.warn('[ImageGen] Imagen 4 returned no image data, trying Gemini Flash')
    } else {
      const errorText = await imagenResponse.text().catch(() => 'unknown')
      console.warn(`[ImageGen] Imagen 4 failed (${imagenResponse.status}): ${errorText.slice(0, 200)}`)
    }

    // --- Fallback: Gemini Flash with image generation ---
    return await generateWithGeminiFlash(prompt, aspectRatio, apiKey, options.bundleId)

  } catch (error) {
    console.error('[ImageGen] Generation error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Image generation failed',
    }
  }
}

/**
 * Fallback image generation using Gemini Flash model.
 */
async function generateWithGeminiFlash(
  prompt: string,
  aspectRatio: string,
  apiKey: string,
  bundleId: string
): Promise<GeminiImageResponse> {
  const response = await fetch(
    `${GEMINI_API_BASE}/models/${GEMINI_FLASH_MODEL}:generateContent`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `Generate an image: ${prompt}` }] }],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
        },
      }),
      signal: AbortSignal.timeout(60000),
    }
  )

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'unknown')
    throw new Error(`Gemini Flash image generation failed (${response.status}): ${errorText.slice(0, 200)}`)
  }

  const data = await response.json()
  const parts = data.candidates?.[0]?.content?.parts || []
  const imagePart = parts.find(
    (p: { inline_data?: { mime_type?: string; data?: string } }) =>
      p.inline_data?.mime_type?.startsWith('image/')
  )

  if (!imagePart?.inline_data?.data) {
    throw new Error('Gemini Flash returned no image data')
  }

  const imageUrl = await uploadImageToStorage(
    imagePart.inline_data.data,
    bundleId,
    imagePart.inline_data.mime_type
  )

  return {
    success: true,
    image_url: imageUrl,
    metadata: {
      model: GEMINI_FLASH_MODEL,
      aspectRatio,
      timestamp: new Date().toISOString(),
    },
  }
}

/**
 * Get generated images for a bundle
 */
export async function getBundleImages(bundleId: string): Promise<GeneratedImage[]> {
  const supabase = getSupabase()

  try {
    const { data, error } = await supabase
      .from('content_images')
      .select('*')
      .eq('bundle_id', bundleId)
      .eq('status', 'generated')
      .order('generated_at', { ascending: false })

    if (error) {
      console.error('Error fetching bundle images:', error)
      return []
    }

    return (data as GeneratedImage[]) || []

  } catch (error) {
    console.error('Error getting bundle images:', error)
    return []
  }
}

/**
 * Regenerate specific image with new parameters
 */
export async function regenerateImage(
  imageId: string,
  newPrompt?: string,
  options?: Partial<ImageGenerationRequest>
): Promise<{ success: boolean; newImage?: GeneratedImage; error?: string }> {
  const supabase = getSupabase()

  try {
    // Get original image
    const { data: originalImage, error: fetchError } = await supabase
      .from('content_images')
      .select('*')
      .eq('id', imageId)
      .single()

    if (fetchError || !originalImage) {
      throw new Error('Original image not found')
    }

    // Archive original image
    await supabase
      .from('content_images')
      .update({ status: 'archived' })
      .eq('id', imageId)

    // Generate new image
    const prompt = newPrompt || originalImage.original_prompt || originalImage.prompt
    const enhancedPrompt = enhancePromptWithNanoBananaStyle(
      prompt,
      options?.style || originalImage.style
    )

    const result = await generateSingleImageWithGemini(enhancedPrompt, {
      aspectRatio: options?.aspectRatio || originalImage.aspect_ratio,
      style: options?.style || originalImage.style,
      quality: options?.quality || 'standard',
      bundleId: originalImage.bundle_id,
    })

    if (!result.success || !result.image_url) {
      throw new Error(result.error || 'Failed to generate new image')
    }

    // Save new image
    const newImageId = generateId('img')
    const { error: saveError } = await supabase
      .from('content_images')
      .insert({
        id: newImageId,
        bundle_id: originalImage.bundle_id,
        prompt: enhancedPrompt,
        original_prompt: prompt,
        url: result.image_url,
        style: options?.style || originalImage.style,
        aspect_ratio: options?.aspectRatio || originalImage.aspect_ratio,
        status: 'generated',
        generated_at: new Date().toISOString(),
        metadata: {
          gemini_metadata: result.metadata,
          regeneration_of: imageId,
          generation_params: options
        }
      })

    if (saveError) {
      throw new Error(`Failed to save new image: ${saveError.message}`)
    }

    const newImage: GeneratedImage = {
      id: newImageId,
      bundle_id: originalImage.bundle_id,
      prompt: enhancedPrompt,
      url: result.image_url,
      style: options?.style || originalImage.style,
      aspect_ratio: options?.aspectRatio || originalImage.aspect_ratio,
      generated_at: new Date().toISOString(),
      metadata: result.metadata || {}
    }

    return { success: true, newImage }

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Batch generate images from strategy-based prompts
 */
export async function generateImagesFromStrategy(
  bundleId: string,
  strategy: any,
  trade: string
): Promise<{ success: boolean; images?: GeneratedImage[]; error?: string }> {
  try {
    // Extract image prompts from strategy
    const imageStrategy = strategy.image_strategy || {}
    const visualThemes = imageStrategy.visual_themes || []
    const styleGuide = imageStrategy.style_guide || 'professional commercial photography'

    // Create trade-specific prompts
    const prompts = visualThemes.map((theme: string) =>
      `${theme} in ${trade} industry context, ${styleGuide}, premium service aesthetic, professional contractor environment, clean modern composition`
    )

    // If no themes, create default prompts
    if (prompts.length === 0) {
      prompts.push(
        `Professional ${trade} contractor in clean uniform, modern workspace, premium service aesthetic`,
        `${trade} tools and equipment, professional layout, clean composition, branded elements`,
        `Before and after ${trade} service results, professional documentation style`,
        `Happy customer with ${trade} contractor, professional service interaction, warm lighting`,
        `${trade} business success metrics visualization, professional infographic style`
      )
    }

    return await generateContentImages({
      bundleId,
      prompts: prompts.slice(0, 5), // Limit to 5 images
      style: 'commercial_photography',
      aspectRatio: '1:1',
      quality: 'standard'
    })

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Strategy-based generation failed'
    }
  }
}

// ---------------------------------------------------------------------------
// Compatibility Functions for Legacy API Routes
// ---------------------------------------------------------------------------

/**
 * Check prediction status - compatibility function for legacy routes
 */
export async function getPredictionStatus(predictionId: string): Promise<{
  status: 'starting' | 'processing' | 'succeeded' | 'failed' | 'canceled'
  output?: string[]
  error?: string
}> {
  // This is a placeholder for compatibility with legacy routes
  // In a full implementation, this would check Gemini API job status
  return {
    status: 'failed',
    error: 'Legacy prediction status checking not implemented in Gemini version'
  }
}

/**
 * Handle image completion - compatibility function for legacy routes
 */
export async function handleImageCompletion(
  jobId: string,
  predictionStatus: any
): Promise<void> {
  // This is a placeholder for compatibility with legacy routes
  // In a full implementation, this would handle Gemini API completion
  console.warn('Legacy image completion handler called - not implemented in Gemini version')
}

/**
 * Retry image job - compatibility function for legacy routes
 */
export async function retryImageJob(jobId: string): Promise<any> {
  // This is a placeholder for compatibility with legacy routes
  throw new ImageGenerationError('Legacy retry functionality not implemented in Gemini version')
}