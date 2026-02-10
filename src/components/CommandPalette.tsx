'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { formatShortcut, SHORTCUTS, ViewId } from '../hooks/useKeyboardShortcuts';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: ViewId) => void;
  onNewMessage: () => void;
}

interface Command {
  id: string;
  title: string;
  description?: string;
  icon: string;
  shortcut?: string[];
  action: () => void;
  category: 'navigation' | 'action' | 'settings';
}

export default function CommandPalette({ isOpen, onClose, onNavigate, onNewMessage }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const commands: Command[] = [
    // Navigation — Home
    { id: 'dashboard', title: 'Go to Dashboard', icon: '🏠', shortcut: ['mod', '1'], action: () => onNavigate('dashboard'), category: 'navigation' },
    // Navigation — Agents group
    { id: 'agents', title: 'Go to Agents', description: 'Agent list and management', icon: '🤖', shortcut: ['mod', '2'], action: () => onNavigate('agents'), category: 'navigation' },
    { id: 'organization', title: 'Go to Organization', description: 'Agent org chart', icon: '🏛️', action: () => onNavigate('organization'), category: 'navigation' },
    { id: 'skills', title: 'Go to Skills', description: 'Agent skill registry', icon: '🛠️', shortcut: ['mod', '3'], action: () => onNavigate('skills'), category: 'navigation' },
    { id: 'leaderboard', title: 'Go to Leaderboard', description: 'Agent performance rankings', icon: '🏆', action: () => onNavigate('leaderboard'), category: 'navigation' },
    { id: 'context', title: 'Go to Context', description: 'Context window visualizer', icon: '🧠', action: () => onNavigate('context'), category: 'navigation' },
    // Navigation — Work group
    { id: 'board', title: 'Go to Project Board', description: 'Kanban project board', icon: '📋', action: () => onNavigate('board'), category: 'navigation' },
    { id: 'tasks', title: 'Go to Tasks', description: 'Active task tracker', icon: '✅', shortcut: ['mod', '4'], action: () => onNavigate('tasks'), category: 'navigation' },
    { id: 'crons', title: 'Go to Crons', description: 'Scheduled automations', icon: '⏰', shortcut: ['mod', '5'], action: () => onNavigate('crons'), category: 'navigation' },
    // Navigation — Knowledge group
    { id: 'memory', title: 'Go to Memory', description: 'Knowledge base and files', icon: '📁', action: () => onNavigate('memory'), category: 'navigation' },
    { id: 'voice', title: 'Go to Chat', description: 'Voice and text chat', icon: '💬', action: () => onNavigate('voice'), category: 'navigation' },
    { id: 'model-counsel', title: 'Go to Model Counsel', description: 'Multi-model AI panel', icon: '🎯', action: () => onNavigate('model-counsel'), category: 'navigation' },
    // Settings
    { id: 'settings', title: 'Go to Settings', icon: '⚙️', action: () => onNavigate('settings'), category: 'settings' },

    // Actions
    { id: 'new-message', title: 'New Message to Opie', description: 'Start a conversation', icon: '💬', shortcut: ['mod', 'N'], action: onNewMessage, category: 'action' },
    { id: 'deploy-agent', title: 'Deploy New Agent', description: 'Launch an AI agent', icon: '🚀', action: () => onNavigate('agents'), category: 'action' },
    { id: 'create-cron', title: 'Create Scheduled Job', description: 'Set up automation', icon: '📅', action: () => onNavigate('crons'), category: 'action' },
  ];

  const filteredCommands = commands.filter((cmd) => {
    if (!query) return true;
    const searchText = `${cmd.title} ${cmd.description || ''} ${cmd.category}`.toLowerCase();
    return searchText.includes(query.toLowerCase());
  });

  // Group by category
  const grouped = filteredCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, Command[]>);

  const flatList = Object.values(grouped).flat();

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.min(prev + 1, flatList.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatList[selectedIndex]) {
        flatList[selectedIndex].action();
        onClose();
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }, [flatList, selectedIndex, onClose]);

  // Scroll selected item into view
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const selected = list.querySelector(`[data-index="${selectedIndex}"]`) as HTMLElement;
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' });
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  const categoryLabels: Record<string, string> = {
    navigation: 'Navigation',
    action: 'Actions',
    settings: 'Settings',
  };

  return (
    <>
      {/* Backdrop */}
      <div style={styles.backdrop} onClick={onClose} />
      
      {/* Palette */}
      <div style={styles.palette}>
        {/* Search Input */}
        <div style={styles.inputWrapper}>
          <span style={styles.searchIcon}>🔍</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type a command or search..."
            style={styles.input}
          />
          <kbd style={styles.escKey}>ESC</kbd>
        </div>

        {/* Commands List */}
        <div ref={listRef} style={styles.list}>
          {flatList.length === 0 && (
            <div style={styles.empty}>
              <span style={styles.emptyIcon}>🔎</span>
              <span>No commands found</span>
            </div>
          )}
          
          {Object.entries(grouped).map(([category, cmds]) => (
            <div key={category}>
              <div style={styles.categoryHeader}>{categoryLabels[category]}</div>
              {cmds.map((cmd) => {
                const index = flatList.indexOf(cmd);
                const isSelected = index === selectedIndex;
                
                return (
                  <button
                    key={cmd.id}
                    data-index={index}
                    onClick={() => {
                      cmd.action();
                      onClose();
                    }}
                    onMouseEnter={() => setSelectedIndex(index)}
                    style={{
                      ...styles.command,
                      ...(isSelected ? styles.commandSelected : {}),
                    }}
                  >
                    <span style={styles.commandIcon}>{cmd.icon}</span>
                    <div style={styles.commandText}>
                      <span style={styles.commandTitle}>{cmd.title}</span>
                      {cmd.description && (
                        <span style={styles.commandDesc}>{cmd.description}</span>
                      )}
                    </div>
                    {cmd.shortcut && (
                      <kbd style={styles.shortcutKey}>
                        {formatShortcut(cmd.shortcut)}
                      </kbd>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.footerHint}>
            <kbd style={styles.footerKey}>↑↓</kbd> to navigate
          </span>
          <span style={styles.footerHint}>
            <kbd style={styles.footerKey}>Enter</kbd> to select
          </span>
          <span style={styles.footerHint}>
            <kbd style={styles.footerKey}>?</kbd> all shortcuts
          </span>
        </div>
      </div>
    </>
  );
}

// Keyboard Shortcuts Help Modal
export function ShortcutsHelp({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  if (!isOpen) return null;

  return (
    <>
      <div style={styles.backdrop} onClick={onClose} />
      <div style={{ ...styles.palette, maxWidth: '400px' }}>
        <div style={styles.helpHeader}>
          <h3 style={styles.helpTitle}>⌨️ Keyboard Shortcuts</h3>
          <button onClick={onClose} style={styles.closeBtn}>✕</button>
        </div>
        <div style={styles.helpList}>
          {SHORTCUTS.map((shortcut, i) => (
            <div key={i} style={styles.helpRow}>
              <span style={styles.helpDesc}>{shortcut.description}</span>
              <kbd style={styles.helpKey}>{formatShortcut(shortcut.keys)}</kbd>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  backdrop: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'var(--overlay, rgba(0,0,0,0.6))',
    backdropFilter: 'blur(4px)',
    zIndex: 9998,
  },
  palette: {
    position: 'fixed',
    top: '15%',
    left: '50%',
    transform: 'translateX(-50%)',
    width: '100%',
    maxWidth: '560px',
    background: 'var(--bg-secondary, #0d0d15)',
    borderRadius: '16px',
    border: '1px solid var(--border, rgba(255,255,255,0.1))',
    boxShadow: '0 20px 60px var(--shadow, rgba(0,0,0,0.5))',
    overflow: 'hidden',
    zIndex: 9999,
  },
  inputWrapper: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
    gap: '12px',
  },
  searchIcon: {
    fontSize: '18px',
    opacity: 0.5,
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--text-primary, #fff)',
    fontSize: '1rem',
  },
  escKey: {
    padding: '4px 8px',
    background: 'var(--bg-hover, rgba(255,255,255,0.05))',
    borderRadius: '4px',
    fontSize: '0.7rem',
    color: 'var(--text-muted, rgba(255,255,255,0.5))',
  },
  list: {
    maxHeight: '360px',
    overflowY: 'auto',
    padding: '8px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    color: 'var(--text-muted, rgba(255,255,255,0.4))',
    gap: '12px',
  },
  emptyIcon: {
    fontSize: '32px',
    opacity: 0.5,
  },
  categoryHeader: {
    padding: '8px 12px',
    fontSize: '0.7rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    color: 'var(--text-muted, rgba(255,255,255,0.4))',
    letterSpacing: '0.05em',
  },
  command: {
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    padding: '10px 12px',
    background: 'transparent',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    gap: '12px',
    textAlign: 'left',
    transition: 'background 0.1s ease',
  },
  commandSelected: {
    background: 'var(--bg-active, rgba(102,126,234,0.15))',
  },
  commandIcon: {
    fontSize: '18px',
    width: '24px',
    textAlign: 'center',
  },
  commandText: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },
  commandTitle: {
    color: 'var(--text-primary, #fff)',
    fontSize: '0.9rem',
    fontWeight: 500,
  },
  commandDesc: {
    color: 'var(--text-muted, rgba(255,255,255,0.5))',
    fontSize: '0.75rem',
  },
  shortcutKey: {
    padding: '4px 8px',
    background: 'var(--bg-hover, rgba(255,255,255,0.05))',
    borderRadius: '4px',
    fontSize: '0.7rem',
    color: 'var(--text-muted, rgba(255,255,255,0.5))',
    fontFamily: 'monospace',
  },
  footer: {
    display: 'flex',
    justifyContent: 'center',
    gap: '24px',
    padding: '12px 20px',
    borderTop: '1px solid var(--border, rgba(255,255,255,0.08))',
    background: 'var(--bg-tertiary, rgba(255,255,255,0.02))',
  },
  footerHint: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '0.75rem',
    color: 'var(--text-muted, rgba(255,255,255,0.4))',
  },
  footerKey: {
    padding: '2px 6px',
    background: 'var(--bg-hover, rgba(255,255,255,0.05))',
    borderRadius: '3px',
    fontSize: '0.7rem',
  },
  
  // Help Modal styles
  helpHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid var(--border, rgba(255,255,255,0.08))',
  },
  helpTitle: {
    margin: 0,
    color: 'var(--text-primary, #fff)',
    fontSize: '1rem',
    fontWeight: 600,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-muted, rgba(255,255,255,0.5))',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '4px 8px',
  },
  helpList: {
    padding: '12px 20px',
  },
  helpRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border-light, rgba(255,255,255,0.05))',
  },
  helpDesc: {
    color: 'var(--text-secondary, rgba(255,255,255,0.8))',
    fontSize: '0.85rem',
  },
  helpKey: {
    padding: '4px 10px',
    background: 'var(--bg-tertiary, rgba(255,255,255,0.05))',
    borderRadius: '6px',
    fontSize: '0.8rem',
    color: 'var(--text-muted, rgba(255,255,255,0.6))',
    fontFamily: 'monospace',
  },
};
