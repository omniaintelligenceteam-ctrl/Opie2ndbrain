/**
 * @deprecated Use `useVoiceEngine` from `@/hooks/useVoiceEngine` instead.
 * 
 * This file is kept for backwards compatibility only.
 * The new voice system uses a proper state machine with:
 * - Clean audio context management (no memory leaks)
 * - Browser compatibility (Chrome, Safari, Edge, Firefox detection)
 * - Barge-in support (interrupt TTS by speaking)
 * - Automatic cleanup on unmount
 * - Error recovery
 * 
 * See: src/hooks/useVoiceEngine.ts
 * See: src/lib/voiceStateMachine.ts
 * See: src/lib/browserCompat.ts
 */

export { useVoiceEngine as useVoiceController } from '@/hooks/useVoiceEngine';
export { useVoiceEngine } from '@/hooks/useVoiceEngine';
export type { UseVoiceEngineOptions as VoiceControllerProps } from '@/hooks/useVoiceEngine';
export type { UseVoiceEngineReturn as VoiceControllerHandles } from '@/hooks/useVoiceEngine';

export default function useVoiceControllerLegacy() {
  console.warn('[VoiceController] Deprecated — use useVoiceEngine from @/hooks/useVoiceEngine');
}
