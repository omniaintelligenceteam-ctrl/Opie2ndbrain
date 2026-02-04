// src/components/MessageContextMenu.tsx
'use client';
import React, { useEffect, useRef } from 'react';

interface MessageContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  onFork: () => void;
  onSummarize: () => void;
  onCopy: () => void;
  isAssistantMessage: boolean;
}

export default function MessageContextMenu({
  x,
  y,
  onClose,
  onFork,
  onSummarize,
  onCopy,
  isAssistantMessage,
}: MessageContextMenuProps): React.ReactElement {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedX = Math.min(x, window.innerWidth - 180);
  const adjustedY = Math.min(y, window.innerHeight - 150);

  return (
    <div
      ref={menuRef}
      style={{
        ...styles.menu,
        left: adjustedX,
        top: adjustedY,
      }}
    >
      <button onClick={() => { onFork(); onClose(); }} style={styles.menuItem}>
        <span style={styles.menuIcon}>↳</span>
        Fork from here
      </button>

      <button onClick={() => { onSummarize(); onClose(); }} style={styles.menuItem}>
        <span style={styles.menuIcon}>✨</span>
        Summarize & continue
      </button>

      <div style={styles.divider} />

      <button onClick={() => { onCopy(); onClose(); }} style={styles.menuItem}>
        <span style={styles.menuIcon}>⎘</span>
        Copy message
      </button>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  menu: {
    position: 'fixed',
    background: 'rgba(20, 20, 30, 0.98)',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: '6px 0',
    minWidth: 170,
    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
    zIndex: 2000,
    animation: 'fadeIn 0.1s ease',
  },
  menuItem: {
    width: '100%',
    padding: '10px 14px',
    border: 'none',
    background: 'transparent',
    color: '#fff',
    fontSize: '0.85rem',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    textAlign: 'left',
    transition: 'background 0.1s',
  },
  menuIcon: {
    width: 18,
    textAlign: 'center',
    opacity: 0.7,
  },
  divider: {
    height: 1,
    background: 'rgba(255, 255, 255, 0.1)',
    margin: '6px 0',
  },
};

export const contextMenuAnimationStyles = `
  @keyframes fadeIn {
    from { opacity: 0; transform: scale(0.95); }
    to { opacity: 1; transform: scale(1); }
  }
`;
