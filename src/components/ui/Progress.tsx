'use client';

import React from 'react';

interface ProgressProps {
  value: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Progress({ value, className, style }: ProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));

  return (
    <div
      className={className}
      style={{
        width: '100%',
        height: 8,
        background: 'rgba(255,255,255,0.1)',
        borderRadius: 4,
        overflow: 'hidden',
        ...style,
      }}
    >
      <div
        style={{
          width: `${clampedValue}%`,
          height: '100%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          borderRadius: 4,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
}

export default Progress;
