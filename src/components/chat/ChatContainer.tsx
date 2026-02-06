// src/components/chat/ChatContainer.tsx
// Manages the floating chat + pinned chat windows composition
'use client';
import React, { memo } from 'react';
import FloatingChat, { ChatMessage, InteractionMode, AIModel } from '../FloatingChat';
import { Conversation } from '@/types/conversation';

interface ChatContainerProps {
  // Main chat
  messages: ChatMessage[];
  input: string;
  setInput: (val: string) => void;
  isLoading: boolean;
  onSend: (text?: string, image?: string, mode?: InteractionMode) => void;
  micOn: boolean;
  onMicToggle: () => void;
  isSpeaking: boolean;
  onStopSpeaking: () => void;
  transcript: string;
  interactionMode: InteractionMode;
  onInteractionModeChange: (mode: InteractionMode) => void;
  selectedModel: AIModel;
  onModelChange: (model: AIModel) => Promise<void>;

  // Conversation management
  conversations: Conversation[];
  activeConversationId: string | null;
  onConversationCreate: () => Conversation;
  onConversationSwitch: (id: string) => void;
  onConversationDelete: (id: string) => void;
  onConversationFork: (fromMessageId: string) => Conversation;
  onSummarizeAndContinue: () => Promise<void>;

  // Pinned conversations
  pinnedConversationIds: string[];
  onPinConversation: (id: string) => void;
  onUnpinConversation: (id: string) => void;
  pinnedInputs: Record<string, string>;
  onPinnedInputChange: (id: string, val: string) => void;
  pinnedLoading: Record<string, boolean>;
  onSendToPinned: (conversationId: string, text: string, mode?: InteractionMode) => Promise<void>;

  // Secondary chat creation
  onCreateSecondaryConversation: () => Conversation;
}

const ChatContainer: React.FC<ChatContainerProps> = memo(function ChatContainer({
  messages,
  input,
  setInput,
  isLoading,
  onSend,
  micOn,
  onMicToggle,
  isSpeaking,
  onStopSpeaking,
  transcript,
  interactionMode,
  onInteractionModeChange,
  selectedModel,
  onModelChange,
  conversations,
  activeConversationId,
  onConversationCreate,
  onConversationSwitch,
  onConversationDelete,
  onConversationFork,
  onSummarizeAndContinue,
  pinnedConversationIds,
  onPinConversation,
  onUnpinConversation,
  pinnedInputs,
  onPinnedInputChange,
  pinnedLoading,
  onSendToPinned,
  onCreateSecondaryConversation,
}) {
  return (
    <>
      {/* Secondary Chat Windows */}
      {pinnedConversationIds.map((pinnedId, index) => {
        const pinnedConv = conversations.find((c) => c.id === pinnedId);
        if (!pinnedConv) return null;

        return (
          <FloatingChat
            key={pinnedId}
            messages={pinnedConv.messages}
            isSecondary={true}
            windowIndex={index}
            onClose={() => onUnpinConversation(pinnedId)}
            pinnedTitle={pinnedConv.title}
            conversationId={pinnedId}
            input={pinnedInputs[pinnedId] || ''}
            setInput={(val) => onPinnedInputChange(pinnedId, val)}
            isLoading={pinnedLoading[pinnedId] || false}
            micOn={false}
            onMicToggle={() => {}}
            isSpeaking={false}
            transcript=""
            onSend={(text, image, mode) =>
              onSendToPinned(pinnedId, text || pinnedInputs[pinnedId] || '', mode)
            }
            interactionMode={interactionMode}
            onInteractionModeChange={onInteractionModeChange}
          />
        );
      })}

      {/* Spawn New Chat Button */}
      {pinnedConversationIds.length < 2 && (
        <button
          onClick={() => {
            const newConv = onCreateSecondaryConversation();
            onPinConversation(newConv.id);
          }}
          style={{
            position: 'fixed',
            bottom: 90,
            right: 24,
            width: 48,
            height: 48,
            borderRadius: '50%',
            border: '1px solid rgba(168, 85, 247, 0.4)',
            background:
              'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(6, 182, 212, 0.15) 100%)',
            color: '#a855f7',
            fontSize: '24px',
            fontWeight: 300,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 997,
            boxShadow: '0 4px 20px rgba(168, 85, 247, 0.3)',
            transition: 'all 0.3s ease',
          }}
          title="Open new chat window"
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)';
            e.currentTarget.style.boxShadow = '0 6px 25px rgba(168, 85, 247, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 20px rgba(168, 85, 247, 0.3)';
          }}
        >
          +
        </button>
      )}

      {/* Floating Chat Box */}
      <FloatingChat
        messages={messages}
        input={input}
        setInput={setInput}
        isLoading={isLoading}
        onSend={onSend}
        micOn={micOn}
        onMicToggle={onMicToggle}
        isSpeaking={isSpeaking}
        onStopSpeaking={onStopSpeaking}
        transcript={transcript}
        interactionMode={interactionMode}
        onInteractionModeChange={onInteractionModeChange}
        selectedModel={selectedModel}
        onModelChange={onModelChange}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onConversationCreate={onConversationCreate}
        onConversationSwitch={onConversationSwitch}
        onConversationDelete={onConversationDelete}
        onConversationFork={onConversationFork}
        onSummarizeAndContinue={onSummarizeAndContinue}
        pinnedConversationIds={pinnedConversationIds}
        onPinConversation={onPinConversation}
      />
    </>
  );
});

export default ChatContainer;
