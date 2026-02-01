'use client';

import { memo, useRef, useCallback } from 'react';

interface OpieStatusWidgetProps {
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onClick?: () => void;
}

// Completely static component - never re-renders after initial mount
const OpieStatusWidget = memo(function OpieStatusWidget({ 
  size = 'medium',
  onClick 
}: OpieStatusWidgetProps) {
  const logoSize = size === 'small' ? 120 : size === 'medium' ? 180 : 240;
  
  // Store onClick in ref to avoid re-renders from new function references
  const onClickRef = useRef(onClick);
  onClickRef.current = onClick;
  
  const handleClick = useCallback(() => {
    onClickRef.current?.();
  }, []);

  return (
    <div 
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        minWidth: logoSize + 24,
        minHeight: logoSize + 24,
        contain: 'strict',
        contentVisibility: 'auto',
      }}
    >
      <img 
        src="/opie-logo-neon.png" 
        alt="Opie"
        width={logoSize}
        height={logoSize}
        loading="eager"
        decoding="sync"
        style={{
          width: logoSize,
          height: logoSize,
          objectFit: 'contain',
          transform: 'translate3d(0,0,0)',
          backfaceVisibility: 'hidden',
          willChange: 'transform',
          isolation: 'isolate',
        }}
      />
    </div>
  );
}, (prev, next) => {
  // Only re-render if size changes - ignore everything else
  return prev.size === next.size;
});

export default OpieStatusWidget;
