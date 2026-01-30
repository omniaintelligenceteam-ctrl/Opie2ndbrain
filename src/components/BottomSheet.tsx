'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  height?: 'auto' | 'half' | 'full';
  showHandle?: boolean;
}

export default function BottomSheet({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  height = 'auto',
  showHandle = true,
}: BottomSheetProps) {
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const currentY = useRef(0);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startY.current = e.touches[0].clientY;
    currentY.current = 0;
    setIsDragging(true);
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    currentY.current = e.touches[0].clientY - startY.current;
    // Only allow dragging down
    if (currentY.current > 0) {
      setDragY(currentY.current);
    }
  }, [isDragging]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
    // If dragged more than 100px, close
    if (dragY > 100) {
      onClose();
    }
    setDragY(0);
  }, [dragY, onClose]);

  // Haptic on open
  useEffect(() => {
    if (isOpen && 'vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }, [isOpen]);

  const getMaxHeight = () => {
    switch (height) {
      case 'full': return '95vh';
      case 'half': return '50vh';
      default: return 'auto';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 1999,
          opacity: isOpen ? 1 - dragY / 300 : 0,
          transition: isDragging ? 'none' : 'opacity 0.3s ease',
        }}
      />

      {/* Sheet */}
      <div
        ref={sheetRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: getMaxHeight(),
          background: '#1a1a2e',
          borderTopLeftRadius: '20px',
          borderTopRightRadius: '20px',
          boxShadow: '0 -10px 40px rgba(0, 0, 0, 0.5)',
          zIndex: 2000,
          transform: `translateY(${dragY}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          paddingBottom: 'env(safe-area-inset-bottom, 16px)',
        }}
      >
        {/* Handle */}
        {showHandle && (
          <div
            style={{
              padding: '12px 0 8px',
              display: 'flex',
              justifyContent: 'center',
              cursor: 'grab',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '4px',
                background: 'rgba(255, 255, 255, 0.3)',
                borderRadius: '2px',
              }}
            />
          </div>
        )}

        {/* Header */}
        {(title || subtitle) && (
          <div
            style={{
              padding: '12px 20px 16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div>
              {title && (
                <h3 style={{ color: '#fff', fontSize: '1.1rem', fontWeight: 600, margin: 0 }}>
                  {title}
                </h3>
              )}
              {subtitle && (
                <p style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem', margin: '4px 0 0' }}>
                  {subtitle}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.6)',
                fontSize: '16px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ✕
            </button>
          </div>
        )}

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            WebkitOverflowScrolling: 'touch',
            padding: '16px 20px',
          }}
        >
          {children}
        </div>
      </div>
    </>
  );
}

// Floating Action Button component
export function FloatingActionButton({
  icon = '+',
  onClick,
  color = 'primary',
  visible = true,
  label,
}: {
  icon?: string;
  onClick: () => void;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  visible?: boolean;
  label?: string;
}) {
  const colors = {
    primary: 'linear-gradient(135deg, #667eea, #764ba2)',
    success: 'linear-gradient(135deg, #22c55e, #16a34a)',
    warning: 'linear-gradient(135deg, #f59e0b, #d97706)',
    danger: 'linear-gradient(135deg, #ef4444, #dc2626)',
  };

  const shadowColors = {
    primary: 'rgba(102, 126, 234, 0.4)',
    success: 'rgba(34, 197, 94, 0.4)',
    warning: 'rgba(245, 158, 11, 0.4)',
    danger: 'rgba(239, 68, 68, 0.4)',
  };

  const triggerHaptic = () => {
    if ('vibrate' in navigator) navigator.vibrate(15);
  };

  const handleClick = () => {
    triggerHaptic();
    onClick();
  };

  return (
    <button
      onClick={handleClick}
      style={{
        position: 'fixed',
        bottom: 'calc(80px + env(safe-area-inset-bottom, 0px))',
        right: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: colors[color],
        border: 'none',
        boxShadow: `0 4px 20px ${shadowColors[color]}`,
        color: '#fff',
        fontSize: '28px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999,
        transform: visible ? 'scale(1)' : 'scale(0)',
        opacity: visible ? 1 : 0,
        transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.2s ease',
        WebkitTapHighlightColor: 'transparent',
      }}
      title={label}
    >
      {icon}
    </button>
  );
}

// Pull to Refresh indicator
export function PullToRefreshIndicator({
  pullDistance,
  threshold,
  isRefreshing,
}: {
  pullDistance: number;
  threshold: number;
  isRefreshing: boolean;
}) {
  const progress = Math.min(pullDistance / threshold, 1);
  const rotation = progress * 360;
  const shouldTrigger = pullDistance >= threshold;

  if (pullDistance <= 0 && !isRefreshing) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 'calc(60px + env(safe-area-inset-top, 0px))',
        left: '50%',
        transform: `translateX(-50%) translateY(${Math.min(pullDistance, threshold * 1.2)}px)`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 998,
        transition: isRefreshing ? 'none' : 'transform 0.2s ease',
      }}
    >
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '50%',
          background: shouldTrigger || isRefreshing 
            ? 'linear-gradient(135deg, #667eea, #764ba2)'
            : 'rgba(255, 255, 255, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
          transition: 'background 0.2s ease',
        }}
      >
        <span
          style={{
            fontSize: '20px',
            transform: `rotate(${isRefreshing ? 0 : rotation}deg)`,
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            transition: isRefreshing ? 'none' : 'transform 0.1s ease',
          }}
        >
          {isRefreshing ? '⟳' : shouldTrigger ? '↓' : '↻'}
        </span>
      </div>
      
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

// Mobile card component with touch interactions
export function MobileCard({
  children,
  onClick,
  onLongPress,
  highlighted = false,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  highlighted?: boolean;
  style?: React.CSSProperties;
}) {
  const [isPressed, setIsPressed] = useState(false);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleTouchStart = () => {
    setIsPressed(true);
    if (onLongPress) {
      pressTimerRef.current = setTimeout(() => {
        if ('vibrate' in navigator) navigator.vibrate(25);
        onLongPress();
        setIsPressed(false);
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
    }
  };

  return (
    <div
      onClick={onClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        background: highlighted 
          ? 'rgba(102, 126, 234, 0.15)' 
          : 'rgba(255, 255, 255, 0.05)',
        borderRadius: '16px',
        padding: '16px',
        border: highlighted 
          ? '1px solid rgba(102, 126, 234, 0.3)' 
          : '1px solid rgba(255, 255, 255, 0.08)',
        cursor: onClick ? 'pointer' : 'default',
        transform: isPressed ? 'scale(0.98)' : 'scale(1)',
        transition: 'transform 0.1s ease, background 0.2s ease',
        WebkitTapHighlightColor: 'transparent',
        touchAction: 'manipulation',
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// Collapsible section for mobile
export function CollapsibleSection({
  title,
  icon,
  children,
  defaultOpen = false,
  badge,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  badge?: number | string;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState<number | 'auto'>(defaultOpen ? 'auto' : 0);

  useEffect(() => {
    if (contentRef.current) {
      setContentHeight(isOpen ? contentRef.current.scrollHeight : 0);
    }
  }, [isOpen]);

  const toggle = () => {
    if ('vibrate' in navigator) navigator.vibrate(10);
    setIsOpen(!isOpen);
  };

  return (
    <div
      style={{
        background: 'rgba(255, 255, 255, 0.03)',
        borderRadius: '12px',
        overflow: 'hidden',
        marginBottom: '12px',
      }}
    >
      {/* Header */}
      <button
        onClick={toggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: '#fff',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        {icon && <span style={{ fontSize: '20px' }}>{icon}</span>}
        <span style={{ flex: 1, textAlign: 'left', fontWeight: 500 }}>{title}</span>
        {badge !== undefined && (
          <span
            style={{
              padding: '4px 10px',
              background: 'rgba(102, 126, 234, 0.2)',
              borderRadius: '10px',
              fontSize: '0.8rem',
              color: '#667eea',
              fontWeight: 600,
            }}
          >
            {badge}
          </span>
        )}
        <span
          style={{
            transform: `rotate(${isOpen ? 180 : 0}deg)`,
            transition: 'transform 0.2s ease',
            color: 'rgba(255, 255, 255, 0.5)',
          }}
        >
          ▼
        </span>
      </button>

      {/* Content */}
      <div
        style={{
          height: typeof contentHeight === 'number' ? `${contentHeight}px` : contentHeight,
          overflow: 'hidden',
          transition: 'height 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div ref={contentRef} style={{ padding: '0 16px 16px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
