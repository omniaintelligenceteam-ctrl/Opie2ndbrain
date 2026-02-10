// src/hooks/useMemory.ts
// Memory operations hook — extracts memory logic from OpieKanban
'use client';
import { useRef, useCallback } from 'react';
import { extractMemory, shouldExtractMemory } from '@/lib/memoryExtraction';
import { useMemoryRefresh } from './useMemoryRefresh';
import { ChatMessage } from '@/types/chat';

export interface UseMemoryReturn {
  memoryContext: string;
  checkAndExtractMemory: (messages: ChatMessage[], conversationId: string) => void;
}

/**
 * Manages memory extraction and refresh.
 * Auto-refreshes on tab focus/visibility, extracts memory every N messages.
 */
export function useMemory(extractionInterval = 10): UseMemoryReturn {
  const lastExtractionCountRef = useRef(0);
  const { memoryContext } = useMemoryRefresh();

  const checkAndExtractMemory = useCallback(
    (messages: ChatMessage[], conversationId: string) => {
      const currentMsgCount = messages.length;
      if (shouldExtractMemory(currentMsgCount, lastExtractionCountRef.current, extractionInterval)) {
        console.log('[Memory] Triggering auto-extraction at', currentMsgCount, 'messages');
        lastExtractionCountRef.current = currentMsgCount;
        extractMemory(messages, conversationId, 'default')
          .then((result) => console.log('[Memory] Extraction result:', result))
          .catch((err) => console.error('[Memory] Extraction error:', err));
      }
    },
    [extractionInterval]
  );

  return { memoryContext, checkAndExtractMemory };
}
