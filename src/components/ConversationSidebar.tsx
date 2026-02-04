'use client';
import React, { memo } from 'react';
import { Conversation } from '@/types/conversation';

interface ConversationSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  pinnedConversationIds?: string[];
  onPinConversation?: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function getPreview(conversation: Conversation): string {
  if (conversation.messages.length === 0) return 'No messages yet';
  const firstMsg = conversation.messages[0];
  const text = firstMsg.text || '';
  return text.length > 50 ? text.slice(0, 50) + '...' : text;
}

const ConversationItem = memo(function ConversationItem({
  conversation,
  isActive,
  isPinned,
  onSelect,
  onDelete,
  onPin,
}: {
  conversation: Conversation;
  isActive: boolean;
  isPinned: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onPin?: () => void;
}) {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <div
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        ...styles.conversationItem,
        background: isActive ? 'rgba(102, 126, 234, 0.2)' : isPinned ? 'rgba(234, 179, 102, 0.1)' : isHovered ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
        borderLeft: isActive ? '3px solid #667eea' : isPinned ? '3px solid #eab366' : '3px solid transparent',
      }}
    >
      <div style={styles.conversationContent}>
        <div style={styles.conversationHeader}>
          <span style={styles.conversationTitle}>
            {isPinned && <span style={{ marginRight: 4 }}>📌</span>}
            {conversation.title}
          </span>
          <span style={styles.conversationTime}>
            {formatRelativeTime(conversation.updatedAt)}
          </span>
        </div>
        <div style={styles.conversationPreview}>
          {getPreview(conversation)}
        </div>
        {conversation.parentId && (
          <div style={styles.forkBadge}>Forked</div>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {onPin && !isPinned && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPin();
            }}
            style={{
              ...styles.pinButton,
              opacity: isHovered ? 1 : 0,
            }}
            title="Pin to compare panel"
          >
            📌
          </button>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          style={{
            ...styles.deleteButton,
            opacity: isHovered ? 1 : 0,
          }}
          title="Delete conversation"
        >
          ×
        </button>
      </div>
    </div>
  );
});

export default function ConversationSidebar({
  isOpen,
  onClose,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  pinnedConversationIds = [],
  onPinConversation,
}: ConversationSidebarProps): React.ReactElement | null {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />

      {/* Sidebar */}
      <div style={styles.sidebar}>
        <div style={styles.sidebarHeader}>
          <h3 style={styles.sidebarTitle}>Conversations</h3>
          <button onClick={onClose} style={styles.closeButton}>×</button>
        </div>

        <button onClick={onNewConversation} style={styles.newChatButton}>
          + New Chat
        </button>

        <div style={styles.conversationList}>
          {conversations.length === 0 ? (
            <div style={styles.emptyState}>
              No conversations yet. Start chatting!
            </div>
          ) : (
            conversations
              .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
              .map(conv => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === activeConversationId}
                  isPinned={pinnedConversationIds.includes(conv.id)}
                  onSelect={() => onSelectConversation(conv.id)}
                  onDelete={() => onDeleteConversation(conv.id)}
                  onPin={onPinConversation && pinnedConversationIds.length < 2 ? () => onPinConversation(conv.id) : undefined}
                />
              ))
          )}
        </div>
      </div>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.5)',
    zIndex: 1001,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: 280,
    height: '100%',
    background: '#0d0d1a',
    borderRight: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 1002,
    display: 'flex',
    flexDirection: 'column',
    animation: 'slideInLeft 0.2s ease',
  },
  sidebarHeader: {
    padding: '16px',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sidebarTitle: {
    color: '#fff',
    fontSize: '1.1rem',
    fontWeight: 600,
    margin: 0,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: 'none',
    background: 'rgba(255, 255, 255, 0.1)',
    color: '#fff',
    fontSize: '18px',
    cursor: 'pointer',
  },
  newChatButton: {
    margin: '12px 16px',
    padding: '12px',
    borderRadius: 12,
    border: '1px dashed rgba(255, 255, 255, 0.3)',
    background: 'transparent',
    color: '#fff',
    fontSize: '0.9rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  conversationList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px 0',
  },
  conversationItem: {
    padding: '12px 16px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'flex-start',
    gap: 8,
    transition: 'background 0.15s',
  },
  conversationContent: {
    flex: 1,
    minWidth: 0,
  },
  conversationHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  conversationTitle: {
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    flex: 1,
  },
  conversationTime: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.75rem',
    marginLeft: 8,
    flexShrink: 0,
  },
  conversationPreview: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  forkBadge: {
    display: 'inline-block',
    marginTop: 4,
    padding: '2px 6px',
    borderRadius: 4,
    background: 'rgba(102, 126, 234, 0.2)',
    color: '#667eea',
    fontSize: '0.7rem',
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    color: 'rgba(255, 255, 255, 0.3)',
    fontSize: '16px',
    cursor: 'pointer',
    opacity: 0,
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  pinButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
    border: 'none',
    background: 'transparent',
    fontSize: '14px',
    cursor: 'pointer',
    opacity: 0,
    transition: 'opacity 0.15s',
    flexShrink: 0,
  },
  emptyState: {
    padding: '32px 16px',
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: '0.9rem',
  },
};

// Add animation via style tag (will be added to FloatingChat's animationStyles)
export const sidebarAnimationStyles = `
  @keyframes slideInLeft {
    from { transform: translateX(-100%); }
    to { transform: translateX(0); }
  }
`;
