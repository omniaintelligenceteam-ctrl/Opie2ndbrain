'use client';

import { memo, useRef, useEffect } from 'react';

interface OpieStatusWidgetProps {
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onClick?: () => void;
}

// Custom comparison - only re-render if size or showDetails changes
// Ignore onClick since it's often a new function reference
function arePropsEqual(prev: OpieStatusWidgetProps, next: OpieStatusWidgetProps) {
  return prev.size === next.size && prev.showDetails === next.showDetails;
}

const OpieStatusWidget = memo(function OpieStatusWidget({ 
  size = 'medium',
  onClick 
}: OpieStatusWidgetProps) {
  const logoSize = size === 'small' ? 120 : size === 'medium' ? 180 : 240;
  const imgRef = useRef<HTMLImageElement>(null);

  // Ensure image is always visible after load
  useEffect(() => {
    if (imgRef.current) {
      imgRef.current.style.opacity = '1';
    }
  }, []);

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        minWidth: logoSize + 24,
        minHeight: logoSize + 24,
        // Container stability
        contain: 'layout style',
      }}
      onClick={onClick}
    >
      <img 
        ref={imgRef}
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
          // Aggressive anti-flicker
          transform: 'translate3d(0,0,0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
          perspective: 1000,
          // Prevent any opacity changes
          opacity: 1,
          // Keep on GPU layer
          willChange: 'transform',
          // No transitions that could cause flicker
          transition: 'none',
        }}
      />
    </div>
  );
}, arePropsEqual);

export default OpieStatusWidget;
