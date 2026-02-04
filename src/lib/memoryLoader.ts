/**
 * Memory context loader for DO IT mode
 * Fetches recent memories to include in system prompts
 */

export interface MemoryItem {
  title: string;
  preview?: string;
  timestamp?: string;
}

export interface MemoryContext {
  memories: MemoryItem[];
  formattedContext: string;
  lastUpdated: Date;
}

/**
 * Load recent memory context for system prompt injection
 */
export async function loadMemoryContext(): Promise<string> {
  try {
    const res = await fetch('/api/memory/recent?limit=5');
    if (!res.ok) return '';

    const data = await res.json();

    if (!data.memories || !Array.isArray(data.memories)) {
      return '';
    }

    return data.memories
      .map((m: MemoryItem) => `- ${m.title}${m.preview ? `: ${m.preview}` : ''}`)
      .join('\n') || '';
  } catch {
    return '';
  }
}

/**
 * Load full memory context with metadata
 */
export async function loadFullMemoryContext(): Promise<MemoryContext> {
  try {
    const res = await fetch('/api/memory/recent?limit=5');
    if (!res.ok) {
      return { memories: [], formattedContext: '', lastUpdated: new Date() };
    }

    const data = await res.json();
    const memories = data.memories || [];

    const formattedContext = memories
      .map((m: MemoryItem) => `- ${m.title}${m.preview ? `: ${m.preview}` : ''}`)
      .join('\n') || '';

    return {
      memories,
      formattedContext,
      lastUpdated: new Date(),
    };
  } catch {
    return { memories: [], formattedContext: '', lastUpdated: new Date() };
  }
}
