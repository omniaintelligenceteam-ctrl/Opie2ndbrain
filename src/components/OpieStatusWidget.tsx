'use client';

import { memo } from 'react';

interface OpieStatusWidgetProps {
  size?: 'small' | 'medium' | 'large';
  showDetails?: boolean;
  onClick?: () => void;
}

// Memoized to prevent re-renders from parent state changes
const OpieStatusWidget = memo(function OpieStatusWidget({ 
  size = 'medium',
  onClick 
}: OpieStatusWidgetProps) {
  const logoSize = size === 'small' ? 120 : size === 'medium' ? 180 : 240;

  return (
    <div 
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '12px',
        // Prevent layout shift during re-renders
        minWidth: logoSize + 24,
        minHeight: logoSize + 24,
      }}
      onClick={onClick}
    >
      <img 
        src="/opie-logo-neon.png" 
        alt="Opie"
        width={logoSize}
        height={logoSize}
        loading="eager"
        decoding="async"
        style={{
          width: logoSize,
          height: logoSize,
          objectFit: 'contain',
          // Prevent flicker with GPU acceleration
          transform: 'translateZ(0)',
          willChange: 'auto',
          // Ensure image doesn't flash
          backfaceVisibility: 'hidden',
        }}
      />
    </div>
  );
});

export default OpieStatusWidget;
