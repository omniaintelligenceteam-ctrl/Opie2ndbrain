// =============================================================================
// Input Parser — Silent AI Partner Content Request Parser
// =============================================================================
// Parses natural language input to extract content creation parameters

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ParsedContentRequest {
  topic: string
  trade?: string
  platforms: string[]
  tone: 'professional' | 'casual' | 'urgent' | 'educational' | 'conversational'
  intent: 'full_creation' | 'research_only'
  confidence: number
  needsClarification: boolean
  clarificationQuestions: string[]
}

// ---------------------------------------------------------------------------
// Parser Function
// ---------------------------------------------------------------------------

/**
 * Parse natural language content request into structured parameters
 */
export function parseContentRequest(userInput: string): ParsedContentRequest {
  const input = userInput.toLowerCase().trim()
  
  // Initialize result with defaults
  const result: ParsedContentRequest = {
    topic: '',
    trade: undefined,
    platforms: [],
    tone: 'professional',
    intent: 'full_creation',
    confidence: 0,
    needsClarification: false,
    clarificationQuestions: []
  }

  // Extract topic
  const topicResult = extractTopic(input)
  result.topic = topicResult.topic
  result.confidence += topicResult.confidence

  // Extract trade/industry
  const tradeResult = extractTrade(input)
  result.trade = tradeResult.trade
  result.confidence += tradeResult.confidence

  // Extract platforms
  const platformsResult = extractPlatforms(input)
  result.platforms = platformsResult.platforms
  result.confidence += platformsResult.confidence

  // Extract tone
  const toneResult = extractTone(input)
  result.tone = toneResult.tone
  result.confidence += toneResult.confidence

  // Extract intent
  const intentResult = extractIntent(input)
  result.intent = intentResult.intent
  result.confidence += intentResult.confidence

  // Calculate overall confidence (average)
  result.confidence = Math.round(result.confidence / 5)

  // Determine if clarification is needed
  const clarificationResult = determineClarificationNeeds(result, input)
  result.needsClarification = clarificationResult.needsClarification
  result.clarificationQuestions = clarificationResult.questions

  return result
}

// ---------------------------------------------------------------------------
// Extraction Functions
// ---------------------------------------------------------------------------

function extractTopic(input: string): { topic: string; confidence: number } {
  // Look for explicit topic indicators
  const topicPatterns = [
    /(?:content (?:about|for|on)|create content (?:about|for|on)|write about|post about)\s+([^,.]+)/i,
    /topic:?\s*([^,.]+)/i,
    /"([^"]+)"/g, // Quoted content
    /content (?:around|regarding)\s+([^,.]+)/i
  ]

  for (const pattern of topicPatterns) {
    const match = input.match(pattern)
    if (match) {
      return {
        topic: match[1].trim(),
        confidence: 90
      }
    }
  }

  // Try to extract topic from common phrases
  const commonPhrases = [
    /(?:how to|tips for|benefits of|guide to|ways to)\s+([^,.]+)/i,
    /([^,.]+)\s+(?:tips|benefits|guide|solutions|services)/i,
    /improve\s+([^,.]+)/i,
    /better\s+([^,.]+)/i
  ]

  for (const pattern of commonPhrases) {
    const match = input.match(pattern)
    if (match) {
      return {
        topic: match[1].trim(),
        confidence: 70
      }
    }
  }

  // Fallback: use first meaningful phrase
  const words = input.split(' ').filter(word => 
    !['create', 'content', 'post', 'write', 'about', 'for', 'on', 'the', 'a', 'an'].includes(word.toLowerCase())
  )

  if (words.length > 0) {
    return {
      topic: words.slice(0, 3).join(' '),
      confidence: 30
    }
  }

  return { topic: '', confidence: 0 }
}

function extractTrade(input: string): { trade?: string; confidence: number } {
  const tradeKeywords = {
    'hvac': ['hvac', 'heating', 'cooling', 'air conditioning', 'furnace', 'heat pump'],
    'plumbing': ['plumbing', 'plumber', 'pipes', 'drainage', 'water systems', 'sewer'],
    'electrical': ['electrical', 'electrician', 'wiring', 'electric', 'power systems'],
    'roofing': ['roofing', 'roofer', 'roof repair', 'shingles', 'gutters'],
    'landscaping': ['landscaping', 'lawn care', 'gardening', 'outdoor', 'yard work'],
    'cleaning': ['cleaning', 'janitorial', 'housekeeping', 'commercial cleaning'],
    'pest_control': ['pest control', 'exterminator', 'bugs', 'insects', 'rodents'],
    'security': ['security', 'alarm', 'surveillance', 'protection'],
    'home_improvement': ['home improvement', 'renovation', 'remodeling', 'construction'],
    'auto_services': ['auto', 'automotive', 'car repair', 'mechanic', 'vehicle'],
    'restaurant': ['restaurant', 'food service', 'dining', 'catering'],
    'real_estate': ['real estate', 'property', 'homes', 'buying', 'selling'],
    'healthcare': ['healthcare', 'medical', 'doctor', 'clinic', 'health'],
    'fitness': ['fitness', 'gym', 'personal training', 'wellness', 'exercise'],
    'professional_services': ['consulting', 'accounting', 'legal', 'business services']
  }

  for (const [trade, keywords] of Object.entries(tradeKeywords)) {
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        return {
          trade: trade.replace('_', ' '),
          confidence: 80
        }
      }
    }
  }

  // Look for explicit trade mentions
  const tradePatterns = [
    /(?:for|targeting)\s+([a-z\s]+)\s+(?:businesses|companies|contractors|professionals)/i,
    /([a-z\s]+)\s+(?:industry|sector|field)/i,
    /trade:?\s*([^,.]+)/i
  ]

  for (const pattern of tradePatterns) {
    const match = input.match(pattern)
    if (match) {
      return {
        trade: match[1].trim(),
        confidence: 60
      }
    }
  }

  return { trade: undefined, confidence: 0 }
}

function extractPlatforms(input: string): { platforms: string[]; confidence: number } {
  const platformKeywords = {
    'linkedin': ['linkedin', 'linkedin post', 'professional network'],
    'instagram': ['instagram', 'ig', 'insta', 'social media post'],
    'email': ['email', 'email campaign', 'newsletter', 'email sequence'],
    'video': ['video', 'youtube', 'video script', 'short form video'],
    'hooks': ['hooks', 'marketing hooks', 'attention grabbers'],
    'images': ['images', 'graphics', 'visuals', 'photos']
  }

  const foundPlatforms: string[] = []
  let totalConfidence = 0

  for (const [platform, keywords] of Object.entries(platformKeywords)) {
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        if (!foundPlatforms.includes(platform)) {
          foundPlatforms.push(platform)
          totalConfidence += 90
        }
      }
    }
  }

  // If no specific platforms mentioned, check for general social media
  if (foundPlatforms.length === 0) {
    if (input.includes('social media') || input.includes('social')) {
      foundPlatforms.push('linkedin', 'instagram')
      totalConfidence = 60
    } else if (input.includes('content') && !input.includes('research only')) {
      // Default platforms for general content creation
      foundPlatforms.push('linkedin', 'instagram', 'email')
      totalConfidence = 40
    }
  }

  return {
    platforms: foundPlatforms,
    confidence: foundPlatforms.length > 0 ? Math.round(totalConfidence / foundPlatforms.length) : 0
  }
}

function extractTone(input: string): { tone: ParsedContentRequest['tone']; confidence: number } {
  const toneKeywords = {
    'casual': ['casual', 'relaxed', 'friendly', 'conversational', 'laid back'],
    'urgent': ['urgent', 'immediate', 'asap', 'quick', 'fast', 'emergency'],
    'educational': ['educational', 'informative', 'teach', 'learn', 'guide', 'tutorial'],
    'conversational': ['conversational', 'chat', 'discussion', 'talk', 'engaging'],
    'professional': ['professional', 'formal', 'business', 'corporate', 'official']
  }

  for (const [tone, keywords] of Object.entries(toneKeywords)) {
    for (const keyword of keywords) {
      if (input.includes(keyword)) {
        return {
          tone: tone as ParsedContentRequest['tone'],
          confidence: 80
        }
      }
    }
  }

  // Default to professional
  return { tone: 'professional', confidence: 50 }
}

function extractIntent(input: string): { intent: ParsedContentRequest['intent']; confidence: number } {
  const researchOnlyKeywords = [
    'research only', 'just research', 'research trending', 'analyze trends',
    'what\'s trending', 'market research', 'competitive analysis'
  ]

  for (const keyword of researchOnlyKeywords) {
    if (input.includes(keyword)) {
      return { intent: 'research_only', confidence: 90 }
    }
  }

  const fullCreationKeywords = [
    'create content', 'generate content', 'write content', 'make content',
    'full campaign', 'complete package', 'everything'
  ]

  for (const keyword of fullCreationKeywords) {
    if (input.includes(keyword)) {
      return { intent: 'full_creation', confidence: 80 }
    }
  }

  // Default to full creation
  return { intent: 'full_creation', confidence: 60 }
}

function determineClarificationNeeds(
  result: ParsedContentRequest, 
  originalInput: string
): { needsClarification: boolean; questions: string[] } {
  const questions: string[] = []

  // Check if topic is clear enough
  if (!result.topic || result.topic.length < 3) {
    questions.push("WHAT TOPIC should the content be about?")
  }

  // Check if trade is unclear
  if (!result.trade && !originalInput.includes('general')) {
    questions.push("WHAT INDUSTRY/TRADE are you targeting? (HVAC, plumbing, etc.)")
  }

  // Check if platforms need clarification
  if (result.platforms.length === 0) {
    questions.push("WHICH PLATFORMS do you want content for? (LinkedIn, Instagram, Email, Video)")
  }

  // Check overall confidence
  if (result.confidence < 60) {
    questions.push("Could you provide more details about your content requirements?")
  }

  return {
    needsClarification: questions.length > 0,
    questions
  }
}

// ---------------------------------------------------------------------------
// Utility Functions
// ---------------------------------------------------------------------------

/**
 * Format clarification questions for user
 */
export function formatClarificationQuestions(questions: string[]): string {
  if (questions.length === 0) return ''

  if (questions.length === 1) {
    return questions[0]
  }

  return questions
    .map((q, i) => `${i + 1}. ${q}`)
    .join('\n')
}

/**
 * Check if input is a "take the wheel" request
 */
export function isTakeTheWheelRequest(input: string): boolean {
  const takeWheelPhrases = [
    'take the wheel',
    'take control',
    'guide me',
    'walk me through',
    'help me create',
    'lead the way'
  ]

  return takeWheelPhrases.some(phrase => 
    input.toLowerCase().includes(phrase)
  )
}

/**
 * Generate a summary of the parsed request
 */
export function summarizeParsedRequest(parsed: ParsedContentRequest): string {
  const parts = []

  parts.push(`Topic: "${parsed.topic}"`)
  
  if (parsed.trade) {
    parts.push(`Industry: ${parsed.trade}`)
  }

  if (parsed.platforms.length > 0) {
    parts.push(`Platforms: ${parsed.platforms.join(', ')}`)
  }

  parts.push(`Tone: ${parsed.tone}`)
  parts.push(`Intent: ${parsed.intent === 'full_creation' ? 'Full content creation' : 'Research only'}`)
  parts.push(`Confidence: ${parsed.confidence}%`)

  return parts.join(' • ')
}