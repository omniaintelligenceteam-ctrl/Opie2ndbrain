// src/components/shared/LoadingSpinner.tsx
'use client';
import React, { memo } from 'react';

interface LoadingSpinnerProps {
  size?: number;
  color?: string;
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = memo(function LoadingSpinner({
  size = 32,
  color = '#667eea',
  label = 'Loading...',
}) {
  return (
    <div
      role="status"
      aria-label={label}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '24px',
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          border: `3px solid ${color}33`,
          borderTop: `3px solid ${color}`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {label && (
        <span
          style={{
            color: 'rgba(255,255,255,0.5)',
            fontSize: '0.85rem',
            fontWeight: 500,
          }}
        >
          {label}
        </span>
      )}
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
});

export default LoadingSpinner;
