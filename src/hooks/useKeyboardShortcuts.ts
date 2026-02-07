'use client';

import { useEffect, useCallback, useRef } from 'react';

export type ViewId = 'dashboard' | 'board' | 'agents' | 'organization' | 'skills' | 'tasks' | 'crons' | 'voice' | 'memory' | 'settings' | 'leaderboard' | 'context' | 'email' | 'calendar';

interface KeyboardShortcutsOptions {
  onNavigate?: (view: ViewId) => void;
  onOpenCommandPalette?: () => void;
  onNewMessage?: () => void;
  onCloseModal?: () => void;
  onShowHelp?: () => void;
  enabled?: boolean;
}

const VIEW_SHORTCUTS: Record<string, ViewId> = {
  '1': 'dashboard',
  '2': 'agents',
  '3': 'organization',
  '4': 'skills',
  '5': 'tasks',
  '6': 'crons',
};

export function useKeyboardShortcuts(options: KeyboardShortcutsOptions) {
  const {
    onNavigate,
    onOpenCommandPalette,
    onNewMessage,
    onCloseModal,
    onShowHelp,
    enabled = true,
  } = options;

  const callbacksRef = useRef({ onNavigate, onOpenCommandPalette, onNewMessage, onCloseModal, onShowHelp });

  // Update refs on each render
  useEffect(() => {
    callbacksRef.current = { onNavigate, onOpenCommandPalette, onNewMessage, onCloseModal, onShowHelp };
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;

    const { onNavigate, onOpenCommandPalette, onNewMessage, onCloseModal, onShowHelp } = callbacksRef.current;
    
    // Check if user is typing in an input
    const target = e.target as HTMLElement;
    const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

    const isMod = e.metaKey || e.ctrlKey;

    // Cmd/Ctrl + K - Command palette (works even when typing)
    if (isMod && e.key === 'k') {
      e.preventDefault();
      onOpenCommandPalette?.();
      return;
    }

    // Cmd/Ctrl + N - New message
    if (isMod && e.key === 'n') {
      e.preventDefault();
      onNewMessage?.();
      return;
    }

    // Don't handle other shortcuts when typing
    if (isTyping) return;

    // Escape - Close modal
    if (e.key === 'Escape') {
      e.preventDefault();
      onCloseModal?.();
      return;
    }

    // ? - Show help
    if (e.key === '?' || (e.shiftKey && e.key === '/')) {
      e.preventDefault();
      onShowHelp?.();
      return;
    }

    // Cmd/Ctrl + 1-5 - Switch views
    if (isMod && VIEW_SHORTCUTS[e.key]) {
      e.preventDefault();
      onNavigate?.(VIEW_SHORTCUTS[e.key]);
      return;
    }
  }, [enabled]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

// Helper to format shortcut for display
export function formatShortcut(keys: string[]): string {
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0;
  
  return keys
    .map((key) => {
      if (key === 'mod') return isMac ? '⌘' : 'Ctrl';
      if (key === 'shift') return isMac ? '⇧' : 'Shift';
      if (key === 'alt') return isMac ? '⌥' : 'Alt';
      if (key === 'escape') return 'Esc';
      return key.toUpperCase();
    })
    .join(isMac ? '' : '+');
}

export const SHORTCUTS = [
  { keys: ['mod', 'K'], description: 'Open command palette' },
  { keys: ['mod', 'N'], description: 'New message to Opie' },
  { keys: ['mod', '1'], description: 'Go to Dashboard' },
  { keys: ['mod', '2'], description: 'Go to Agents' },
  { keys: ['mod', '3'], description: 'Go to Organization' },
  { keys: ['mod', '4'], description: 'Go to Skills' },
  { keys: ['mod', '5'], description: 'Go to Tasks' },
  { keys: ['mod', '6'], description: 'Go to Crons' },
  { keys: ['escape'], description: 'Close modals' },
  { keys: ['?'], description: 'Show keyboard shortcuts' },
];
