# Conversation Management for FloatingChat

## Overview

Add conversation history, branching, and auto-organization to FloatingChat component.

## Requirements

1. **History** - View and return to past conversations (local storage)
2. **Branching** - New conversation, fork from message, summary & continue
3. **Organization** - AI-generated titles based on content

## Data Model

```typescript
interface Conversation {
  id: string;                    // Unique ID (uuid)
  title: string;                 // AI-generated, e.g. "Debugging the auth flow"
  createdAt: Date;
  updatedAt: Date;
  messages: ChatMessage[];       // Existing message type
  parentId?: string;             // If forked, points to source conversation
  forkPointMessageId?: string;   // Which message this was forked from
  summary?: string;              // AI summary if using "summary & continue"
}

interface ConversationStore {
  conversations: Conversation[];
  activeConversationId: string | null;
}
```

**Storage:**
- LocalStorage key: `opie-conversations`
- Auto-save after each message (debounced 500ms)
- Max 100 conversations, 500 messages per conversation
- ~5MB storage cap with user warning

## UI Components

### ConversationSidebar (new)

- Width: 280px, slides in from left
- Toggle via history icon in chat header
- Sections:
  - "New Chat" button at top
  - Conversation list sorted by `updatedAt` (most recent first)
- Each item shows:
  - Title (AI-generated)
  - Relative time ("2h ago")
  - First message preview (truncated to ~50 chars)
- Hover reveals: delete button, fork icon

### Message Context Menu (enhancement)

- Trigger: Right-click or long-press on any message
- Options:
  - "Fork from here" - Create branch conversation
  - "Summarize & continue" - Start fresh with AI summary
  - "Copy" - Existing functionality

### Header Updates

- Add sidebar toggle button (hamburger/history icon)
- Show conversation title alongside "Opie"

## Core Flows

### New Conversation

1. User clicks "New Chat" button
2. Current conversation auto-saves
3. New conversation created with temporary title "New conversation"
4. After first AI response, generate title via API

### Fork from Message

1. User right-clicks message → "Fork from here"
2. System creates new conversation with messages up to that point (inclusive)
3. Sets `parentId` and `forkPointMessageId` for lineage tracking
4. Switches to new forked conversation

### Summary & Continue

1. User triggers from context menu or dedicated button
2. API call to generate 2-3 sentence summary
3. New conversation created with summary stored in `summary` field
4. Summary shown as context indicator in new conversation
5. Original conversation preserved in history

### Auto-title Generation

1. Triggered after first assistant response in new conversation
2. API call: "Generate a 3-5 word title for this conversation: [first exchange]"
3. Update conversation title
4. Save to storage

## Hook API

```typescript
// hooks/useConversations.ts

interface UseConversationsReturn {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  createConversation: () => Conversation;
  switchConversation: (id: string) => void;
  forkConversation: (fromMessageId: string) => Conversation;
  summarizeAndContinue: () => Promise<Conversation>;
  deleteConversation: (id: string) => void;
  updateMessages: (messages: ChatMessage[]) => void;
  generateTitle: (conversation: Conversation) => Promise<string>;
}
```

## Error Handling

| Scenario | Handling |
|----------|----------|
| Storage full | Toast warning, offer to export & clear old conversations |
| Title generation fails | Fallback to "Chat from [formatted date]" |
| Summary generation fails | Show error toast, let user retry or skip |
| Corrupt storage data | Attempt JSON recovery, worst case reset with warning dialog |
| Conversation not found | Redirect to new conversation, log error |

## Files to Create/Modify

### New Files

- `src/hooks/useConversations.ts` - Core conversation management hook
- `src/components/ConversationSidebar.tsx` - Sidebar component
- `src/components/MessageContextMenu.tsx` - Right-click menu
- `src/lib/conversationStorage.ts` - LocalStorage utilities
- `src/types/conversation.ts` - TypeScript interfaces

### Modified Files

- `src/components/FloatingChat.tsx` - Integrate sidebar, context menu, header updates
- `src/components/OpieKanban.tsx` - Lift conversation state up, connect to useConversations
- `src/app/api/chat/route.ts` - Add endpoints for title/summary generation (or reuse existing)

## Future Considerations (not in scope)

- Backend sync for cross-device access
- Conversation search
- Manual tags/folders
- Conversation sharing/export
- Tree visualization for forked conversations
