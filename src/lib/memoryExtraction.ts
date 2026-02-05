// Memory extraction utilities

interface ExtractionResult {
  extracted: boolean;
  counts?: {
    facts: number;
    preferences: number;
    decisions: number;
    action_items: number;
  };
  reason?: string;
  error?: string;
}

// Trigger memory extraction for a conversation
export async function extractMemory(
  messages: Array<{ role: string; text?: string; content?: string }>,
  conversationId: string,
  sessionId: string = 'default'
): Promise<ExtractionResult> {
  try {
    const response = await fetch('/api/memory/extract', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        conversationId,
        sessionId
      })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('[MemoryExtraction] API error:', error);
      return { extracted: false, error };
    }

    const result = await response.json();
    console.log('[MemoryExtraction] Result:', result);
    return result;
  } catch (error) {
    console.error('[MemoryExtraction] Error:', error);
    return { extracted: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// Check if extraction should be triggered
export function shouldExtractMemory(
  messageCount: number,
  lastExtractionCount: number,
  threshold: number = 10
): boolean {
  // Extract every `threshold` new messages
  return messageCount >= threshold && 
         messageCount - lastExtractionCount >= threshold;
}

// Get user memory formatted for display
export async function getUserMemory(sessionId: string = 'default'): Promise<{
  facts: string[];
  preferences: string[];
  decisions: string[];
  action_items: string[];
  formatted: string;
}> {
  try {
    const response = await fetch(`/api/memory/get?sessionId=${sessionId}`);
    if (!response.ok) {
      return { facts: [], preferences: [], decisions: [], action_items: [], formatted: '' };
    }
    const data = await response.json();
    return {
      facts: data.memories?.facts || [],
      preferences: data.memories?.preferences || [],
      decisions: data.memories?.decisions || [],
      action_items: data.memories?.action_items || [],
      formatted: data.formatted || ''
    };
  } catch (error) {
    console.error('[Memory] Fetch error:', error);
    return { facts: [], preferences: [], decisions: [], action_items: [], formatted: '' };
  }
}
