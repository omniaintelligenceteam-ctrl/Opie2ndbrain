'use client';

import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'default' | 'destructive';
  style?: React.CSSProperties;
}

export function Alert({ children, variant = 'default', style }: AlertProps) {
  const variantStyles = {
    default: {
      background: 'rgba(102, 126, 234, 0.1)',
      border: '1px solid rgba(102, 126, 234, 0.2)',
      color: '#667eea',
    },
    destructive: {
      background: 'rgba(239, 68, 68, 0.1)',
      border: '1px solid rgba(239, 68, 68, 0.2)',
      color: '#ef4444',
    },
  };

  return (
    <div
      style={{
        padding: '12px 16px',
        borderRadius: 10,
        fontSize: '0.85rem',
        ...variantStyles[variant],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function AlertDescription({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return <div style={{ marginTop: 4, opacity: 0.8, ...style }}>{children}</div>;
}

export default Alert;
