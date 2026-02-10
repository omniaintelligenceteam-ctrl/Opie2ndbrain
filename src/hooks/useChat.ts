// src/hooks/useChat.ts
// Chat logic extracted from OpieKanban — handles messaging, voice, TTS, streaming
'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage, InteractionMode, AIModel } from '@/components/FloatingChat';
import { useConversations } from './useConversations';
import { useMemory } from './useMemory';
import { useAgentPersonality } from '../contexts/AgentPersonalityContext';

// ============================================================================
// Helpers
// ============================================================================

function getSessionId(): string {
  if (typeof window === 'undefined') return 'server';
  let id = localStorage.getItem('opie-session-id');
  if (!id) {
    id = `2ndbrain-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    localStorage.setItem('opie-session-id', id);
  }
  return id;
}

function generateMessageId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Tiered compression strategy for long conversations */
function prepareMessagesWithContext(
  messages: ChatMessage[]
): Array<{ role: string; content: string }> {
  const total = messages.length;

  if (total <= 15) {
    return messages.map((m) => ({ role: m.role, content: m.text }));
  }

  const recentFull = messages.slice(-15);
  const older = messages.slice(0, total - 15);

  let contextBlock = '';

  if (older.length > 0) {
    const tier1 = older.slice(0, 10);
    if (tier1.length > 0) {
      const summary1 = tier1
        .map(
          (m) =>
            `${m.role === 'user' ? 'Q' : 'A'}: ${m.text.slice(0, 80)}${m.text.length > 80 ? '...' : ''}`
        )
        .join('\n');
      contextBlock += `Earlier (messages ${Math.max(1, total - 14 - tier1.length)}-${total - 15}):\n${summary1}\n\n`;
    }

    const tier2 = older.slice(10, 20);
    if (tier2.length > 0) {
      const keyPoints = tier2.map((m) => m.text.slice(0, 60)).join('; ');
      contextBlock += `Previous (${tier2.length} msgs): ${keyPoints.slice(0, 150)}...\n\n`;
    }

    const tier3 = older.slice(20, 30);
    if (tier3.length > 0) {
      const topics = tier3.map((m) => m.text.split('.')[0].slice(0, 40)).join('. ');
      contextBlock += `Earlier context: We discussed ${topics}.\n\n`;
    }

    const tier4 = older.slice(30, 85);
    if (tier4.length > 0) {
      contextBlock += `Prior context includes ${tier4.length} additional messages about lead generation, pricing, and system setup.\n`;
    }
  }

  return [
    ...(contextBlock
      ? [{ role: 'system', content: `Conversation history:\n${contextBlock.trim()}` }]
      : []),
    ...recentFull.map((m) => ({ role: m.role, content: m.text })),
  ];
}

/** Poll for async response from Supabase (EXECUTE mode) */
async function pollForAsyncResponse(
  pollUrl: string,
  _userMsgId: string,
  _assistantMsgId: string
): Promise<string> {
  const maxAttempts = 60;
  const pollInterval = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(pollUrl);
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, pollInterval));
        continue;
      }
      const data = await res.json();
      if (data.status === 'complete' && data.response) return data.response;
      if (data.status === 'error') return `Error: ${data.error || 'Unknown error'}`;
    } catch (e) {
      console.error('[Poll] Error:', e);
    }
    await new Promise((r) => setTimeout(r, pollInterval));
  }
  return 'Error: Timed out waiting for response (120s)';
}

// ============================================================================
// Voice Engine (DEPRECATED — only used by OpieKanban.refactored.tsx backup)
// The active voice system uses src/hooks/useVoiceEngine.ts with a finite state machine.
// DO NOT use this in new code.
// ============================================================================

interface VoiceEngineOptions {
  onTranscriptChange: (text: string) => void;
  onSilenceDetected: (text: string) => void;
  stopSpeaking: () => void;
  cancelPendingRequest: () => void;
  isSpeakingRef: React.MutableRefObject<boolean>;
  isLoadingRef: React.MutableRefObject<boolean>;
}

function useVoiceEngine(options: VoiceEngineOptions) {
  const {
    onTranscriptChange,
    onSilenceDetected,
    stopSpeaking,
    cancelPendingRequest,
    isSpeakingRef,
    isLoadingRef,
  } = options;

  const [micOn, setMicOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const micOnRef = useRef(false);
  const recognitionRef = useRef<ReturnType<typeof Object.create>>(null);
  const recognitionRestartingRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const pendingTranscriptRef = useRef('');
  const accumulatedTranscriptRef = useRef('');
  const SILENCE_TIMEOUT_MS = 1000;

  useEffect(() => {
    micOnRef.current = micOn;
  }, [micOn]);
  useEffect(() => {
    isSpeakingRef.current = isSpeaking;
  }, [isSpeaking, isSpeakingRef]);

  const startRecognition = useCallback(() => {
    if (recognitionRef.current && micOnRef.current) {
      try {
        recognitionRef.current.start();
      } catch (_e) {
        /* ignore */
      }
    }
  }, []);

  // Audio element setup
  useEffect(() => {
    if (typeof window === 'undefined') return;
    audioRef.current = new Audio();
    audioRef.current.onended = () => {
      setIsSpeaking(false);
      setTimeout(() => startRecognition(), 300);
    };
    audioRef.current.onerror = () => {
      setIsSpeaking(false);
      setTimeout(() => startRecognition(), 300);
    };
  }, [startRecognition]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    };
  }, []);

  // Speech recognition setup
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('webkitSpeechRecognition' in window)) return;
    const SR = (window as unknown as Record<string, unknown>).webkitSpeechRecognition as new () => SpeechRecognition;
    const recognition = new SR();
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      if (isSpeakingRef.current) stopSpeaking();
      if (isLoadingRef.current) cancelPendingRequest();

      let finalText = '';
      let interimText = '';
      for (let i = 0; i < e.results.length; i++) {
        const result = e.results[i];
        if (result.isFinal) {
          finalText += result[0].transcript + ' ';
        } else {
          interimText += result[0].transcript;
        }
      }

      if (finalText.trim()) {
        accumulatedTranscriptRef.current = finalText.trim();
      }

      const displayText = (accumulatedTranscriptRef.current + ' ' + interimText).trim();
      onTranscriptChange(displayText);
      pendingTranscriptRef.current = displayText;

      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = setTimeout(() => {
        const textToSend =
          accumulatedTranscriptRef.current.trim() || pendingTranscriptRef.current.trim();
        if (textToSend && !isLoadingRef.current && !isSpeakingRef.current) {
          accumulatedTranscriptRef.current = '';
          pendingTranscriptRef.current = '';
          onTranscriptChange('');
          onSilenceDetected(textToSend);
        }
      }, SILENCE_TIMEOUT_MS);
    };

    recognition.onend = () => {
      if (micOnRef.current && !recognitionRestartingRef.current) {
        recognitionRestartingRef.current = true;
        setTimeout(() => {
          recognitionRestartingRef.current = false;
          try { recognition.start(); } catch (_e) { /* ignore */ }
        }, 150);
      }
    };

    recognition.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error === 'no-speech') {
        if (micOnRef.current && !recognitionRestartingRef.current) {
          recognitionRestartingRef.current = true;
          setTimeout(() => {
            recognitionRestartingRef.current = false;
            try { recognition.start(); } catch (_e) { /* ignore */ }
          }, 300);
        }
        return;
      }
      if (e.error === 'aborted') return;
      if (e.error === 'not-allowed' || e.error === 'audio-capture') {
        setMicOn(false);
        return;
      }
      if (micOnRef.current && !recognitionRestartingRef.current) {
        recognitionRestartingRef.current = true;
        setTimeout(() => {
          recognitionRestartingRef.current = false;
          try { recognition.start(); } catch (_e) { /* ignore */ }
        }, 500);
      }
    };

    recognitionRef.current = recognition;
  }, [stopSpeaking, cancelPendingRequest, isSpeakingRef, isLoadingRef, onTranscriptChange, onSilenceDetected]);

  const doStopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  const toggleMic = useCallback(() => {
    if (!micOn) {
      if (!recognitionRef.current) {
        alert('Voice input not available. Try Chrome or Edge.');
        return;
      }
      setMicOn(true);
      try { recognitionRef.current?.stop(); } catch (_e) { /* ignore */ }
      setTimeout(() => {
        try {
          recognitionRef.current?.start();
        } catch (_e) {
          setMicOn(false);
        }
      }, 100);
    } else {
      setMicOn(false);
      try { recognitionRef.current?.stop(); } catch (_e) { /* ignore */ }
      onTranscriptChange('');
      pendingTranscriptRef.current = '';
      if (silenceTimerRef.current) clearTimeout(silenceTimerRef.current);
    }
  }, [micOn, onTranscriptChange]);

  const speak = useCallback(
    async (text: string) => {
      setIsSpeaking(true);
      try {
        const res = await fetch('/api/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        });
        if (!res.ok || !res.headers.get('content-type')?.includes('audio')) {
          setIsSpeaking(false);
          setTimeout(() => startRecognition(), 300);
          return;
        }
        const blob = await res.blob();
        if (blob.size < 1000) {
          setIsSpeaking(false);
          setTimeout(() => startRecognition(), 300);
          return;
        }
        const url = URL.createObjectURL(blob);
        if (audioRef.current) {
          audioRef.current.src = url;
          try {
            await audioRef.current.play();
          } catch (_e) {
            setIsSpeaking(false);
            setTimeout(() => startRecognition(), 300);
            URL.revokeObjectURL(url);
          }
        }
      } catch (_err) {
        setIsSpeaking(false);
        setTimeout(() => startRecognition(), 300);
      }
    },
    [startRecognition]
  );

  return {
    micOn,
    setMicOn,
    isSpeaking,
    setIsSpeaking,
    toggleMic,
    speak,
    stopSpeaking: doStopSpeaking,
    startRecognition,
    silenceTimerRef,
    pendingTranscriptRef,
  };
}

// ============================================================================
// Main useChat hook
// ============================================================================

export interface UseChatReturn {
  // Messages
  messages: ChatMessage[];
  setMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  messagesRef: React.MutableRefObject<ChatMessage[]>;

  // Input
  input: string;
  setInput: (val: string) => void;

  // Send
  handleSend: (text?: string, image?: string) => Promise<void>;
  handleSendToPinned: (conversationId: string, text: string, mode?: InteractionMode) => Promise<void>;
  isLoading: boolean;

  // Voice
  micOn: boolean;
  toggleMic: () => void;
  isSpeaking: boolean;
  transcript: string;
  stopSpeaking: () => void;

  // Interaction mode
  interactionMode: InteractionMode;
  setInteractionMode: (mode: InteractionMode) => void;

  // Model
  selectedModel: AIModel;
  handleModelChange: (model: AIModel) => Promise<void>;
  showModelDropdown: boolean;
  setShowModelDropdown: (v: boolean) => void;

  // Conversation management (forwarded from useConversations)
  conversations: ReturnType<typeof useConversations>['conversations'];
  activeConversation: ReturnType<typeof useConversations>['activeConversation'];
  pinnedConversationIds: ReturnType<typeof useConversations>['pinnedConversationIds'];
  createConversation: ReturnType<typeof useConversations>['createConversation'];
  createConversationForSecondary: ReturnType<typeof useConversations>['createConversationForSecondary'];
  switchConversation: ReturnType<typeof useConversations>['switchConversation'];
  forkConversation: ReturnType<typeof useConversations>['forkConversation'];
  deleteConversation: ReturnType<typeof useConversations>['deleteConversation'];
  updateTitle: ReturnType<typeof useConversations>['updateTitle'];
  pinConversation: ReturnType<typeof useConversations>['pinConversation'];
  unpinConversation: ReturnType<typeof useConversations>['unpinConversation'];
  handleSummarizeAndContinue: () => Promise<void>;

  // Pinned chat inputs
  pinnedInputs: Record<string, string>;
  setPinnedInputs: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  pinnedLoading: Record<string, boolean>;

  // Session
  sessionId: string;
}

export function useChat(): UseChatReturn {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interactionMode, setInteractionMode] = useState<InteractionMode>('plan');
  const [selectedModel, setSelectedModel] = useState<AIModel>('kimi');
  const [showModelDropdown, setShowModelDropdown] = useState(false);
  const [sessionId, setSessionId] = useState('');
  const [pinnedInputs, setPinnedInputs] = useState<Record<string, string>>({});
  const [pinnedLoading, setPinnedLoading] = useState<Record<string, boolean>>({});

  const isLoadingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  useEffect(() => {
    setSessionId(getSessionId());
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const { currentParameters: personalityParams } = useAgentPersonality();
  const { memoryContext, checkAndExtractMemory } = useMemory();

  // Conversations
  const conversationHook = useConversations();
  const {
    conversations,
    activeConversation,
    pinnedConversationIds,
    createConversation,
    createConversationForSecondary,
    switchConversation,
    forkConversation,
    deleteConversation,
    updateMessages,
    updateMessagesForConversation,
    updateTitle,
    setSummary,
    pinConversation,
    unpinConversation,
  } = conversationHook;

  const messages = activeConversation?.messages || [];
  const messagesRef = useRef(messages);
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const setMessages = useCallback(
    (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
      updateMessages(updater);
    },
    [updateMessages]
  );

  // Cancel pending request
  const cancelPendingRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoading(false);
  }, []);

  // Voice engine
  const voiceEngine = useVoiceEngine({
    onTranscriptChange: setTranscript,
    onSilenceDetected: (text: string) => {
      handleSendImpl(text);
    },
    stopSpeaking: () => {
      // Will be set properly after voice engine init
    },
    cancelPendingRequest,
    isSpeakingRef,
    isLoadingRef,
  });

  // Initialize conversation on first load
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation();
    }
  }, [conversations.length, createConversation]);

  // Auto-generate title from first user message
  useEffect(() => {
    if (!activeConversation) return;
    if (activeConversation.title !== 'New conversation') return;
    if (activeConversation.messages.length === 0) return;
    const firstUserMsg = activeConversation.messages.find((m) => m.role === 'user');
    if (!firstUserMsg || !firstUserMsg.text) return;
    let title = firstUserMsg.text.trim();
    if (title.length > 35) {
      title = title.slice(0, 35);
      const lastSpace = title.lastIndexOf(' ');
      if (lastSpace > 20) title = title.slice(0, lastSpace);
      title += '...';
    }
    updateTitle(activeConversation.id, title);
  }, [activeConversation?.messages.length, activeConversation?.id, activeConversation?.title, updateTitle]);

  // Model switching
  const handleModelChange = useCallback(async (model: AIModel) => {
    setSelectedModel(model);
    setShowModelDropdown(false);
    try {
      const res = await fetch('/api/model', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model }),
      });
      if (!res.ok) console.error('Failed to switch model:', await res.text());
    } catch (error) {
      console.error('Model switch error:', error);
    }
  }, []);

  // Summarize and continue
  const handleSummarizeAndContinue = useCallback(async () => {
    if (!activeConversation || activeConversation.messages.length === 0) return;
    try {
      const response = await fetch('/api/chat/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: activeConversation.messages }),
      });
      const data = await response.json();
      if (data.summary) {
        const newConv = createConversation();
        setSummary(newConv.id, data.summary);
      }
    } catch (error) {
      console.error('Failed to summarize:', error);
    }
  }, [activeConversation, createConversation, setSummary]);

  // Main send implementation
  const handleSendImpl = useCallback(
    async (text?: string, image?: string) => {
      const messageText = text || input;
      if ((!messageText.trim() && !image) || isLoading) return;

      if (!activeConversation) {
        createConversation();
        await new Promise((r) => setTimeout(r, 50));
      }

      const userMsg = messageText.trim();

      // Clear silence timer
      if (voiceEngine.silenceTimerRef.current) clearTimeout(voiceEngine.silenceTimerRef.current);
      voiceEngine.pendingTranscriptRef.current = '';

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        text: userMsg || (image ? '[Image]' : ''),
        timestamp: new Date(),
        status: 'sending',
        image,
      };

      const currentMessages = messagesRef.current;
      const updatedMessages = [...currentMessages, userMessage];
      setMessages(updatedMessages);
      setInput('');
      setIsLoading(true);

      setTimeout(() => {
        setMessages((prev) =>
          prev.map((m) => (m.id === userMessage.id ? { ...m, status: 'sent' as const } : m))
        );
      }, 300);

      abortControllerRef.current = new AbortController();
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 120_000);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: userMsg || 'What do you see in this image?',
            messages: prepareMessagesWithContext(updatedMessages),
            _debug: `Sending ${updatedMessages.length} messages`,
            sessionId,
            personality: personalityParams,
            image,
            interactionMode,
            memoryContext: interactionMode === 'execute' ? memoryContext : undefined,
          }),
          signal: abortControllerRef.current.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(`Server error (${res.status}): ${errorText.slice(0, 100)}`);
        }

        const contentType = res.headers.get('content-type') || '';
        const isStreaming = contentType.includes('text/event-stream');
        let reply: string | null = null;
        const assistantMsgId = generateMessageId();

        if (isStreaming && res.body) {
          const assistantMessage: ChatMessage = {
            id: assistantMsgId,
            role: 'assistant',
            text: '',
            timestamp: new Date(),
          };
          setMessages((prev) => [
            ...prev.map((m) =>
              m.id === userMessage.id ? { ...m, status: 'delivered' as const } : m
            ),
            assistantMessage,
          ]);

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let fullText = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.error) {
                    fullText = `Error: ${parsed.error}`;
                  } else if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    fullText += parsed.delta.text;
                  } else if (parsed.choices?.[0]?.delta?.content) {
                    fullText += parsed.choices[0].delta.content;
                  }
                  // Filter out internal markers like "<final>" that may leak through
                  fullText = fullText.replace(/<(final|start|end)>/g, '');
                  setMessages((prev) =>
                    prev.map((m) => (m.id === assistantMsgId ? { ...m, text: fullText } : m))
                  );
                } catch {
                  /* ignore parse errors */
                }
              }
            }
          }

          reply = fullText || 'No response received';
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, text: reply! } : m))
          );
          setIsLoading(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMessage.id ? { ...m, status: 'read' as const } : m
            )
          );

          if (reply && reply !== 'No response received') {
            await voiceEngine.speak(reply);
          }

          checkAndExtractMemory(messagesRef.current, activeConversation?.id || 'default');
        } else {
          const data = await res.json();

          if (data.mode === 'async' && data.poll_url) {
            reply = await pollForAsyncResponse(data.poll_url, userMessage.id, assistantMsgId);
          } else if (data.reply && typeof data.reply === 'string' && data.reply.trim().length > 0) {
            reply = data.reply;
          } else if (data.error) {
            reply = `Sorry, something went wrong: ${data.error === true ? 'Unknown error' : data.error}`;
          }

          if (!reply) {
            reply = "Hmm, I didn't get a response. The server may be busy - please try again.";
          }

          if (data.mode && data.mode !== interactionMode) {
            setInteractionMode(data.mode);
          }

          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMessage.id ? { ...m, status: 'delivered' as const } : m
            )
          );

          const assistantMessage: ChatMessage = {
            id: generateMessageId(),
            role: 'assistant',
            text: reply,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, assistantMessage]);
          setIsLoading(false);
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMessage.id ? { ...m, status: 'read' as const } : m
            )
          );

          if (reply && !data.error) {
            await voiceEngine.speak(reply);
          }
        }
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const error = err as Error & { name?: string };

        if (error?.name === 'AbortError') {
          const isTimeout = !abortControllerRef.current;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === userMessage.id
                ? {
                    ...m,
                    status: 'error' as const,
                    text: userMsg + (isTimeout ? ' (request timed out after 120s)' : ' (cancelled)'),
                  }
                : m
            )
          );
          setIsLoading(false);

          if (isTimeout) {
            const timeoutMessage: ChatMessage = {
              id: generateMessageId(),
              role: 'assistant',
              text: 'Sorry, the request timed out. The server might be busy - please try again.',
              timestamp: new Date(),
            };
            setMessages((prev) => [...prev, timeoutMessage]);
          }
          return;
        }

        const errorText = error?.message || 'Unknown error';
        const errorMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          text: `Sorry, something went wrong: ${errorText.slice(0, 150)}`,
          timestamp: new Date(),
        };
        setMessages((prev) =>
          prev.map((m) =>
            m.id === userMessage.id ? { ...m, status: 'error' as const } : m
          )
        );
        setMessages((prev) => [...prev, errorMessage]);
        setIsLoading(false);
        voiceEngine.startRecognition();
      }
    },
    [
      input,
      isLoading,
      activeConversation,
      createConversation,
      setMessages,
      sessionId,
      personalityParams,
      interactionMode,
      memoryContext,
      voiceEngine,
      checkAndExtractMemory,
    ]
  );

  // Handle send for secondary/pinned chat windows
  const handleSendToPinned = useCallback(
    async (conversationId: string, text: string, mode?: InteractionMode) => {
      if (!text.trim() || pinnedLoading[conversationId]) return;
      const conv = conversations.find((c) => c.id === conversationId);
      if (!conv) return;

      setPinnedLoading((prev) => ({ ...prev, [conversationId]: true }));
      setPinnedInputs((prev) => ({ ...prev, [conversationId]: '' }));

      const userMessage: ChatMessage = {
        id: generateMessageId(),
        role: 'user',
        text: text.trim(),
        timestamp: new Date(),
        status: 'sending',
      };

      updateMessagesForConversation(conversationId, [...conv.messages, userMessage]);

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: text.trim(),
            messages: conv.messages.slice(-10),
            sessionId: getSessionId(),
            personality: personalityParams,
            interactionMode: mode || interactionMode,
            memoryContext: (mode || interactionMode) === 'execute' ? memoryContext : undefined,
          }),
        });

        if (!res.ok) throw new Error(`Server error (${res.status})`);

        const contentType = res.headers.get('content-type') || '';
        const isStreaming = contentType.includes('text/event-stream');
        let reply = '';
        const assistantMsgId = generateMessageId();

        if (isStreaming && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          const assistantMessage: ChatMessage = {
            id: assistantMsgId,
            role: 'assistant',
            text: '',
            timestamp: new Date(),
          };
          updateMessagesForConversation(conversationId, [
            ...conv.messages,
            userMessage,
            assistantMessage,
          ]);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') continue;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                    reply += parsed.delta.text;
                  } else if (parsed.choices?.[0]?.delta?.content) {
                    reply += parsed.choices[0].delta.content;
                  }
                  const currentConv = conversations.find((c) => c.id === conversationId);
                  if (currentConv) {
                    const updatedMsgs = currentConv.messages.map((m) =>
                      m.id === assistantMsgId ? { ...m, text: reply } : m
                    );
                    updateMessagesForConversation(conversationId, updatedMsgs);
                  }
                } catch {
                  /* ignore */
                }
              }
            }
          }
          reply = reply || 'No response received';
        } else {
          const data = await res.json();
          reply = data.reply || data.error || 'No response received';
          const assistantMessage: ChatMessage = {
            id: assistantMsgId,
            role: 'assistant',
            text: reply,
            timestamp: new Date(),
          };
          const currentConv = conversations.find((c) => c.id === conversationId);
          if (currentConv) {
            updateMessagesForConversation(conversationId, [
              ...currentConv.messages,
              assistantMessage,
            ]);
          }
        }
      } catch (err: unknown) {
        const error = err as Error;
        const errorMessage: ChatMessage = {
          id: generateMessageId(),
          role: 'assistant',
          text: `Sorry, something went wrong: ${error?.message || 'Unknown error'}`,
          timestamp: new Date(),
        };
        const currentConv = conversations.find((c) => c.id === conversationId);
        if (currentConv) {
          updateMessagesForConversation(conversationId, [...currentConv.messages, errorMessage]);
        }
      } finally {
        setPinnedLoading((prev) => ({ ...prev, [conversationId]: false }));
      }
    },
    [conversations, pinnedLoading, updateMessagesForConversation, personalityParams, interactionMode, memoryContext]
  );

  return {
    messages,
    setMessages,
    messagesRef,
    input,
    setInput,
    handleSend: handleSendImpl,
    handleSendToPinned,
    isLoading,
    micOn: voiceEngine.micOn,
    toggleMic: voiceEngine.toggleMic,
    isSpeaking: voiceEngine.isSpeaking,
    transcript,
    stopSpeaking: voiceEngine.stopSpeaking,
    interactionMode,
    setInteractionMode,
    selectedModel,
    handleModelChange,
    showModelDropdown,
    setShowModelDropdown,
    conversations,
    activeConversation,
    pinnedConversationIds,
    createConversation,
    createConversationForSecondary,
    switchConversation,
    forkConversation,
    deleteConversation,
    updateTitle,
    pinConversation,
    unpinConversation,
    handleSummarizeAndContinue,
    pinnedInputs,
    setPinnedInputs,
    pinnedLoading,
    sessionId,
  };
}
