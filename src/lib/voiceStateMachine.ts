/**
 * Voice State Machine
 * 
 * Defines the finite state machine for voice interactions.
 * States: idle → listening → processing → speaking → idle
 * 
 * State Diagram:
 * 
 *   ┌─────────┐   MIC_ON    ┌───────────┐
 *   │  IDLE   │────────────▶│ LISTENING  │
 *   └─────────┘             └───────────┘
 *       ▲                        │
 *       │                   SILENCE_DETECTED / SEND
 *       │                        ▼
 *       │                  ┌────────────┐
 *       │                  │ PROCESSING │
 *       │                  └────────────┘
 *       │                        │
 *       │                   TTS_READY
 *       │                        ▼
 *       │                  ┌──────────┐
 *       └──────────────────│ SPEAKING │
 *         SPEECH_ENDED     └──────────┘
 * 
 * Interrupts:
 *   - LISTENING can be cancelled → IDLE (MIC_OFF)
 *   - PROCESSING can be cancelled → IDLE (CANCEL) or → LISTENING (BARGE_IN)
 *   - SPEAKING can be interrupted → LISTENING (BARGE_IN)
 *   - Any state → IDLE on ERROR (with recovery)
 *   - Any state → IDLE on UNMOUNT (cleanup)
 */

export type VoiceState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

export type VoiceEvent =
  | { type: 'MIC_ON' }
  | { type: 'MIC_OFF' }
  | { type: 'SPEECH_RESULT'; transcript: string; isFinal: boolean }
  | { type: 'SILENCE_DETECTED'; text: string }
  | { type: 'SEND'; text: string }
  | { type: 'RESPONSE_RECEIVED'; text: string }
  | { type: 'TTS_STARTED' }
  | { type: 'TTS_ENDED' }
  | { type: 'TTS_ERROR'; error: string }
  | { type: 'BARGE_IN' }
  | { type: 'CANCEL' }
  | { type: 'ERROR'; error: string; code?: string }
  | { type: 'RECOVER' }
  | { type: 'UNMOUNT' }
  | { type: 'PUSH_TO_TALK_PRESSED' }
  | { type: 'PUSH_TO_TALK_RELEASED' };

export interface VoiceContext {
  state: VoiceState;
  micOn: boolean;
  transcript: string;          // Current interim + final display text
  pendingText: string;         // Text accumulated waiting for silence
  lastResponse: string;        // Last AI response text
  error: string | null;
  errorCode: string | null;
  autoRestart: boolean;        // Whether to auto-restart recognition after speaking
  interruptedWhileProcessing: boolean;
}

export interface VoiceTransition {
  context: VoiceContext;
  sideEffects: SideEffect[];
}

export type SideEffect =
  | { type: 'START_RECOGNITION' }
  | { type: 'STOP_RECOGNITION' }
  | { type: 'SEND_MESSAGE'; text: string }
  | { type: 'START_TTS'; text: string }
  | { type: 'STOP_TTS' }
  | { type: 'CLEAR_SILENCE_TIMER' }
  | { type: 'START_SILENCE_TIMER'; text: string }
  | { type: 'CLEANUP_AUDIO' }
  | { type: 'REVOKE_BLOB_URLS' }
  | { type: 'ABORT_REQUEST' }
  | { type: 'LOG'; message: string; level: 'info' | 'warn' | 'error' };

export function initialContext(): VoiceContext {
  return {
    state: 'idle',
    micOn: false,
    transcript: '',
    pendingText: '',
    lastResponse: '',
    error: null,
    errorCode: null,
    autoRestart: true,
    interruptedWhileProcessing: false,
  };
}

/**
 * Pure state transition function.
 * Given current context and event, returns new context + side effects.
 * No I/O here — all effects are described, not executed.
 */
export function transition(ctx: VoiceContext, event: VoiceEvent): VoiceTransition {
  const effects: SideEffect[] = [];

  switch (ctx.state) {
    // ─── IDLE ────────────────────────────────────────────────────────
    case 'idle': {
      switch (event.type) {
        case 'MIC_ON':
          effects.push({ type: 'START_RECOGNITION' });
          return {
            context: {
              ...ctx,
              state: 'listening',
              micOn: true,
              transcript: '',
              pendingText: '',
              error: null,
              errorCode: null,
            },
            sideEffects: effects,
          };

        default:
          return { context: ctx, sideEffects: [] };
      }
    }

    // ─── LISTENING ───────────────────────────────────────────────────
    case 'listening': {
      switch (event.type) {
        case 'MIC_OFF':
          effects.push({ type: 'STOP_RECOGNITION' });
          effects.push({ type: 'CLEAR_SILENCE_TIMER' });
          return {
            context: {
              ...ctx,
              state: 'idle',
              micOn: false,
              transcript: '',
              pendingText: '',
            },
            sideEffects: effects,
          };

        case 'SPEECH_RESULT': {
          // transcript already contains all accumulated text (final + interim)
          // from the onresult handler — use it directly, don't append to pendingText
          const displayText = event.transcript;
          const newPending = event.isFinal ? displayText : ctx.pendingText;

          effects.push({ type: 'CLEAR_SILENCE_TIMER' });
          effects.push({ type: 'START_SILENCE_TIMER', text: newPending || displayText });

          return {
            context: {
              ...ctx,
              transcript: displayText,
              pendingText: newPending,
            },
            sideEffects: effects,
          };
        }

        case 'SILENCE_DETECTED':
          if (!event.text.trim()) {
            return { context: ctx, sideEffects: [] };
          }
          effects.push({ type: 'CLEAR_SILENCE_TIMER' });
          effects.push({ type: 'SEND_MESSAGE', text: event.text });
          return {
            context: {
              ...ctx,
              state: 'processing',
              transcript: '',
              pendingText: '',
            },
            sideEffects: effects,
          };

        case 'SEND':
          if (!event.text.trim()) {
            return { context: ctx, sideEffects: [] };
          }
          effects.push({ type: 'CLEAR_SILENCE_TIMER' });
          effects.push({ type: 'SEND_MESSAGE', text: event.text });
          return {
            context: {
              ...ctx,
              state: 'processing',
              transcript: '',
              pendingText: '',
            },
            sideEffects: effects,
          };

        case 'ERROR':
          effects.push({ type: 'LOG', message: `Listening error: ${event.error}`, level: 'error' });
          // For permission/hardware errors, go to idle
          if (event.code === 'not-allowed' || event.code === 'audio-capture') {
            effects.push({ type: 'STOP_RECOGNITION' });
            return {
              context: {
                ...ctx,
                state: 'error',
                micOn: false,
                error: event.error,
                errorCode: event.code || null,
              },
              sideEffects: effects,
            };
          }
          // For transient errors (no-speech, network), stay in listening and restart
          effects.push({ type: 'START_RECOGNITION' });
          return {
            context: ctx,
            sideEffects: effects,
          };

        case 'UNMOUNT':
          effects.push({ type: 'STOP_RECOGNITION' });
          effects.push({ type: 'CLEAR_SILENCE_TIMER' });
          effects.push({ type: 'CLEANUP_AUDIO' });
          return {
            context: initialContext(),
            sideEffects: effects,
          };

        default:
          return { context: ctx, sideEffects: [] };
      }
    }

    // ─── PROCESSING ──────────────────────────────────────────────────
    case 'processing': {
      switch (event.type) {
        case 'RESPONSE_RECEIVED':
          if (ctx.micOn) {
            effects.push({ type: 'START_TTS', text: event.text });
          }
          return {
            context: {
              ...ctx,
              state: ctx.micOn ? 'speaking' : 'idle',
              lastResponse: event.text,
            },
            sideEffects: effects,
          };

        case 'BARGE_IN':
          // User started talking while AI is processing — abort request and listen
          effects.push({ type: 'ABORT_REQUEST' });
          effects.push({ type: 'LOG', message: 'Barge-in during processing — aborting request', level: 'info' });
          return {
            context: {
              ...ctx,
              state: 'listening',
              interruptedWhileProcessing: true,
            },
            sideEffects: effects,
          };

        case 'CANCEL':
          effects.push({ type: 'LOG', message: 'Processing cancelled', level: 'info' });
          return {
            context: {
              ...ctx,
              state: ctx.micOn ? 'listening' : 'idle',
            },
            sideEffects: effects,
          };

        case 'MIC_OFF':
          effects.push({ type: 'STOP_RECOGNITION' });
          return {
            context: {
              ...ctx,
              micOn: false,
              // Stay in processing — still waiting for response
            },
            sideEffects: effects,
          };

        case 'ERROR':
          effects.push({ type: 'LOG', message: `Processing error: ${event.error}`, level: 'error' });
          return {
            context: {
              ...ctx,
              state: ctx.micOn ? 'listening' : 'idle',
              error: event.error,
            },
            sideEffects: effects,
          };

        case 'SPEECH_RESULT': {
          // User is speaking while processing — abort request, go back to listening
          // so they can add more context. The recognition's accumulated finals
          // naturally include the original text + new speech, so the next
          // SILENCE_DETECTED will send the full combined message.
          effects.push({ type: 'ABORT_REQUEST' });
          effects.push({ type: 'LOG', message: 'Speech during processing — interrupting to add more context', level: 'info' });

          const interruptTranscript = event.transcript;
          const interruptPending = event.isFinal ? interruptTranscript : ctx.pendingText;

          effects.push({ type: 'CLEAR_SILENCE_TIMER' });
          effects.push({ type: 'START_SILENCE_TIMER', text: interruptPending || interruptTranscript });

          return {
            context: {
              ...ctx,
              state: 'listening',
              transcript: interruptTranscript,
              pendingText: interruptPending,
              interruptedWhileProcessing: true,
            },
            sideEffects: effects,
          };
        }

        case 'UNMOUNT':
          effects.push({ type: 'CLEANUP_AUDIO' });
          return {
            context: initialContext(),
            sideEffects: effects,
          };

        default:
          return { context: ctx, sideEffects: [] };
      }
    }

    // ─── SPEAKING ────────────────────────────────────────────────────
    case 'speaking': {
      switch (event.type) {
        case 'TTS_ENDED':
          effects.push({ type: 'REVOKE_BLOB_URLS' });
          if (ctx.micOn) {
            effects.push({ type: 'START_RECOGNITION' });
          }
          return {
            context: {
              ...ctx,
              state: ctx.micOn ? 'listening' : 'idle',
            },
            sideEffects: effects,
          };

        case 'TTS_ERROR':
          effects.push({ type: 'REVOKE_BLOB_URLS' });
          effects.push({ type: 'LOG', message: `TTS error: ${event.error}`, level: 'error' });
          if (ctx.micOn) {
            effects.push({ type: 'START_RECOGNITION' });
          }
          return {
            context: {
              ...ctx,
              state: ctx.micOn ? 'listening' : 'idle',
              error: event.error,
            },
            sideEffects: effects,
          };

        case 'BARGE_IN':
        case 'SPEECH_RESULT':
          // User interrupted — stop TTS, go back to listening
          effects.push({ type: 'STOP_TTS' });
          effects.push({ type: 'REVOKE_BLOB_URLS' });
          effects.push({ type: 'LOG', message: 'Barge-in during speaking', level: 'info' });
          return {
            context: {
              ...ctx,
              state: 'listening',
              transcript: event.type === 'SPEECH_RESULT' ? event.transcript : '',
              pendingText: event.type === 'SPEECH_RESULT' && event.isFinal ? event.transcript : '',
            },
            sideEffects: effects,
          };

        case 'MIC_OFF':
          effects.push({ type: 'STOP_TTS' });
          effects.push({ type: 'STOP_RECOGNITION' });
          effects.push({ type: 'REVOKE_BLOB_URLS' });
          return {
            context: {
              ...ctx,
              state: 'idle',
              micOn: false,
            },
            sideEffects: effects,
          };

        case 'UNMOUNT':
          effects.push({ type: 'STOP_TTS' });
          effects.push({ type: 'STOP_RECOGNITION' });
          effects.push({ type: 'CLEANUP_AUDIO' });
          effects.push({ type: 'REVOKE_BLOB_URLS' });
          return {
            context: initialContext(),
            sideEffects: effects,
          };

        default:
          return { context: ctx, sideEffects: [] };
      }
    }

    // ─── ERROR ───────────────────────────────────────────────────────
    case 'error': {
      switch (event.type) {
        case 'RECOVER':
        case 'MIC_ON':
          effects.push({ type: 'START_RECOGNITION' });
          return {
            context: {
              ...ctx,
              state: 'listening',
              micOn: true,
              error: null,
              errorCode: null,
            },
            sideEffects: effects,
          };

        case 'UNMOUNT':
          effects.push({ type: 'CLEANUP_AUDIO' });
          return {
            context: initialContext(),
            sideEffects: effects,
          };

        default:
          return { context: ctx, sideEffects: [] };
      }
    }

    default:
      return { context: ctx, sideEffects: [] };
  }
}
