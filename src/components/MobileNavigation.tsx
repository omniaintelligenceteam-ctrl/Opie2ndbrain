'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ViewId } from '../hooks/useKeyboardShortcuts';

interface MobileNavItem {
  id: ViewId;
  icon: string;
  label: string;
  badge?: number;
}

interface MobileNavigationProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  agentCount?: number;
  taskCount?: number;
  isVisible?: boolean;
}

const NAV_ITEMS: MobileNavItem[] = [
  { id: 'dashboard', icon: '🏠', label: 'Home' },
  { id: 'agents', icon: '🤖', label: 'Agents' },
  { id: 'tasks', icon: '📋', label: 'Tasks' },
  { id: 'memory', icon: '🧠', label: 'Memory' },
  { id: 'voice', icon: '💬', label: 'Chat' },
];

export default function MobileNavigation({
  activeView,
  onNavigate,
  agentCount = 0,
  taskCount = 0,
  isVisible = true,
}: MobileNavigationProps) {
  const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });
  const navRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Update indicator position
  useEffect(() => {
    const activeIndex = NAV_ITEMS.findIndex(item => item.id === activeView);
    const activeButton = itemRefs.current[activeIndex];
    
    if (activeButton && navRef.current) {
      const navRect = navRef.current.getBoundingClientRect();
      const btnRect = activeButton.getBoundingClientRect();
      
      setIndicatorStyle({
        left: btnRect.left - navRect.left + btnRect.width / 2 - 20,
        width: 40,
      });
    }
  }, [activeView]);

  // Haptic feedback helper
  const triggerHaptic = useCallback(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(10);
    }
  }, []);

  const handleNavClick = (view: ViewId) => {
    triggerHaptic();
    onNavigate(view);
  };

  const getBadge = (id: ViewId): number | undefined => {
    if (id === 'agents' && agentCount > 0) return agentCount;
    if (id === 'tasks' && taskCount > 0) return taskCount;
    return undefined;
  };

  return (
    <>
      {/* Spacer to prevent content from being hidden behind nav */}
      <div style={{ height: 'calc(64px + env(safe-area-inset-bottom, 0px))' }} />
      
      <nav
        ref={navRef}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          background: 'rgba(13, 13, 21, 0.95)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          padding: '8px 0',
          paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))',
          zIndex: 1000,
          transform: isVisible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Animated indicator */}
        <div
          style={{
            position: 'absolute',
            top: '4px',
            left: indicatorStyle.left,
            width: indicatorStyle.width,
            height: '4px',
            background: 'linear-gradient(90deg, #667eea, #764ba2)',
            borderRadius: '2px',
            transition: 'left 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {NAV_ITEMS.map((item, index) => {
          const isActive = activeView === item.id;
          const badge = getBadge(item.id);
          
          return (
            <button
              key={item.id}
              ref={el => { itemRefs.current[index] = el; }}
              onClick={() => handleNavClick(item.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                padding: '8px 12px',
                minWidth: '64px',
                minHeight: '52px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
                touchAction: 'manipulation',
              }}
            >
              {/* Icon container with glow effect */}
              <div
                style={{
                  position: 'relative',
                  transform: isActive ? 'scale(1.15)' : 'scale(1)',
                  transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                }}
              >
                <span
                  style={{
                    fontSize: '24px',
                    filter: isActive ? 'drop-shadow(0 0 8px rgba(102, 126, 234, 0.5))' : 'none',
                    transition: 'filter 0.2s ease',
                  }}
                >
                  {item.icon}
                </span>
                
                {/* Badge */}
                {badge !== undefined && (
                  <span
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      right: '-8px',
                      minWidth: '18px',
                      height: '18px',
                      padding: '0 5px',
                      background: item.id === 'tasks' 
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : 'linear-gradient(135deg, #22c55e, #16a34a)',
                      borderRadius: '9px',
                      fontSize: '11px',
                      fontWeight: 700,
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
                    }}
                  >
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#fff' : 'rgba(255, 255, 255, 0.5)',
                  transition: 'color 0.2s ease',
                  letterSpacing: '0.02em',
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}

// Mobile Header component for top of screen
export function MobileHeader({
  title,
  subtitle,
  status,
  onMenuClick,
}: {
  title?: string;
  subtitle?: string;
  status?: 'online' | 'thinking' | 'speaking' | 'listening';
  onMenuClick?: () => void;
}) {
  const statusColors = {
    online: '#22c55e',
    thinking: '#667eea',
    speaking: '#f59e0b',
    listening: '#22c55e',
  };

  const statusLabels = {
    online: 'Online',
    thinking: 'Thinking...',
    speaking: 'Speaking...',
    listening: 'Listening...',
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 'calc(56px + env(safe-area-inset-top, 0px))',
        paddingTop: 'env(safe-area-inset-top, 0px)',
        background: 'rgba(13, 13, 21, 0.95)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingLeft: '16px',
        paddingRight: '16px',
        zIndex: 999,
      }}
    >
      {/* Left section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {onMenuClick && (
          <button
            onClick={onMenuClick}
            style={{
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              color: '#fff',
              fontSize: '24px',
              cursor: 'pointer',
              borderRadius: '12px',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            ☰
          </button>
        )}
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #667eea, #764ba2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
              boxShadow: '0 0 20px rgba(102, 126, 234, 0.4)',
            }}
          >
            ⚡
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 600, fontSize: '1rem', lineHeight: 1.2 }}>
              {title || 'Opie'}
            </div>
            {subtitle && (
              <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.75rem' }}>
                {subtitle}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status indicator */}
      {status && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
          }}
        >
          <div
            style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: statusColors[status],
              boxShadow: `0 0 8px ${statusColors[status]}`,
              animation: status === 'listening' ? 'pulse 1.5s infinite' : 'none',
              transition: 'background 0.3s ease, box-shadow 0.3s ease',
            }}
          />
          <span style={{ color: statusColors[status], fontSize: '0.75rem', fontWeight: 500 }}>
            {statusLabels[status]}
          </span>
        </div>
      )}
    </header>
  );
}
