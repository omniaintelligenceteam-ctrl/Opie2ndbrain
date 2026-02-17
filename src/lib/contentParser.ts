// =============================================================================
// Content Parser — Extracts structured content from agent output
// =============================================================================

export interface ParsedContent {
  email?: string
  linkedin?: string
  instagram?: string
  video_script?: string
  hooks?: string
  image_prompt?: string
  blog_outline?: string
  raw?: string
  research_influence?: Record<string, string> | null
}

/**
 * Parse raw agent output text into structured content pieces.
 *
 * Strategy:
 * 1. Try <content-output> JSON tags (structured output from prompt suffix)
 * 2. Fallback: split on labeled section headers
 * 3. Last resort: return as raw text
 */
export function parseAgentOutput(rawText: string): ParsedContent {
  if (!rawText || typeof rawText !== 'string') {
    return { raw: rawText || '' }
  }

  // Strategy 1: <content-output> JSON tags
  const tagMatch = rawText.match(/<content-output>\s*([\s\S]*?)\s*<\/content-output>/)
  if (tagMatch) {
    try {
      const parsed = JSON.parse(tagMatch[1])
      if (typeof parsed === 'object' && parsed !== null) {
        return {
          email: parsed.email || undefined,
          linkedin: parsed.linkedin || undefined,
          instagram: parsed.instagram || undefined,
          video_script: parsed.video_script || undefined,
          hooks: parsed.hooks || undefined,
          image_prompt: parsed.image_prompt || undefined,
          blog_outline: parsed.blog_outline || undefined,
          research_influence: parsed.research_influence || undefined,
        }
      }
    } catch {
      // JSON parse failed — fall through to strategy 2
    }
  }

  // Strategy 2: Section header splitting
  const result: ParsedContent = {}
  type ContentKey = 'email' | 'linkedin' | 'instagram' | 'video_script' | 'blog_outline' | 'raw'
  const sectionPatterns: Array<{ key: ContentKey; patterns: RegExp[] }> = [
    {
      key: 'email',
      patterns: [
        /(?:^|\n)#+\s*(?:\d+[\.\)]\s*)?email[^\n]*\n([\s\S]*?)(?=\n#+\s*(?:\d+[\.\)]\s*)?(?:linkedin|instagram|video|blog|short)|$)/i,
        /(?:^|\n)(?:\d+[\.\)]\s*)?email[^\n]*(?:newsletter)?[^\n]*\n([\s\S]*?)(?=\n(?:\d+[\.\)]\s*)?(?:linkedin|instagram|video|blog|short)|$)/i,
      ],
    },
    {
      key: 'linkedin',
      patterns: [
        /(?:^|\n)#+\s*(?:\d+[\.\)]\s*)?linkedin[^\n]*\n([\s\S]*?)(?=\n#+\s*(?:\d+[\.\)]\s*)?(?:instagram|video|blog|short)|$)/i,
        /(?:^|\n)(?:\d+[\.\)]\s*)?linkedin[^\n]*\n([\s\S]*?)(?=\n(?:\d+[\.\)]\s*)?(?:instagram|video|blog|short)|$)/i,
      ],
    },
    {
      key: 'instagram',
      patterns: [
        /(?:^|\n)#+\s*(?:\d+[\.\)]\s*)?instagram[^\n]*\n([\s\S]*?)(?=\n#+\s*(?:\d+[\.\)]\s*)?(?:video|blog|short)|$)/i,
        /(?:^|\n)(?:\d+[\.\)]\s*)?instagram[^\n]*\n([\s\S]*?)(?=\n(?:\d+[\.\)]\s*)?(?:video|blog|short)|$)/i,
      ],
    },
    {
      key: 'video_script',
      patterns: [
        /(?:^|\n)#+\s*(?:\d+[\.\)]\s*)?(?:video|short[- ]?form)[^\n]*\n([\s\S]*?)(?=\n#+\s*(?:\d+[\.\)]\s*)?(?:blog)|$)/i,
        /(?:^|\n)(?:\d+[\.\)]\s*)?(?:video|short[- ]?form)[^\n]*\n([\s\S]*?)(?=\n(?:\d+[\.\)]\s*)?(?:blog)|$)/i,
      ],
    },
    {
      key: 'blog_outline',
      patterns: [
        /(?:^|\n)#+\s*(?:\d+[\.\)]\s*)?blog[^\n]*\n([\s\S]*?)$/i,
        /(?:^|\n)(?:\d+[\.\)]\s*)?blog[^\n]*\n([\s\S]*?)$/i,
      ],
    },
  ]

  let foundAny = false
  for (const { key, patterns } of sectionPatterns) {
    for (const pattern of patterns) {
      const match = rawText.match(pattern)
      if (match?.[1]?.trim()) {
        result[key] = match[1].trim()
        foundAny = true
        break
      }
    }
  }

  if (foundAny) return result

  // Strategy 3: Return raw text
  return { raw: rawText }
}

/** Asset type mapping from parsed content keys to DB types */
const CONTENT_TYPE_MAP: Record<string, string> = {
  email: 'email',
  linkedin: 'linkedin',
  instagram: 'instagram',
  video_script: 'heygen',
  hooks: 'hooks',
  image_prompt: 'image_prompt',
  blog_outline: 'blog_outline',
}

/**
 * Convert parsed content into content_assets DB records.
 */
export function parsedContentToAssetRecords(
  bundleId: string,
  parsed: ParsedContent
): Array<{
  id: string
  bundle_id: string
  type: string
  content: string
  status: string
  metadata: Record<string, unknown> | null
}> {
  const records: Array<{
    id: string
    bundle_id: string
    type: string
    content: string
    status: string
    metadata: Record<string, unknown> | null
  }> = []

  // If we only have raw text, create a single generic asset
  if (parsed.raw && Object.keys(parsed).length === 1) {
    records.push({
      id: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bundle_id: bundleId,
      type: 'email', // Default type
      content: parsed.raw,
      status: 'draft',
      metadata: { source: 'raw_output' },
    })
    return records
  }

  const entries = Object.entries(parsed).filter(
    ([key, val]) => key !== 'raw' && key !== 'research_influence' && val && typeof val === 'string'
  ) as Array<[string, string]>

  for (const [key, content] of entries) {
    const dbType = CONTENT_TYPE_MAP[key] || 'email'
    records.push({
      id: `ast_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      bundle_id: bundleId,
      type: dbType,
      content,
      status: 'draft',
      metadata: { content_key: key },
    })
  }

  return records
}
