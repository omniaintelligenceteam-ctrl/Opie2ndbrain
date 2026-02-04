'use client';
import React, { memo } from 'react';

interface IconProps {
  size?: number;
  active?: boolean;
}

export const MicIcon = memo(function MicIcon({ size = 24, active = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transition: 'all 0.2s ease',
        filter: active ? 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.6))' : 'none',
      }}
    >
      {/* Mic body */}
      <rect
        x="9"
        y="2"
        width="6"
        height="11"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Base arc */}
      <path
        d="M5 10v1a7 7 0 0 0 14 0v-1"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Stem */}
      <path
        d="M12 18v4"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Base */}
      <path
        d="M8 22h8"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});

export const CameraIcon = memo(function CameraIcon({ size = 24, active = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transition: 'all 0.2s ease',
        filter: active ? 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.6))' : 'none',
      }}
    >
      {/* Camera body */}
      <rect
        x="2"
        y="6"
        width="20"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Lens */}
      <circle
        cx="12"
        cy="13"
        r="4"
        stroke="currentColor"
        strokeWidth="2"
      />
      {/* Flash/viewfinder */}
      <path
        d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
});

export const SendIcon = memo(function SendIcon({ size = 24, active = false }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        transition: 'all 0.2s ease',
        filter: active ? 'drop-shadow(0 0 6px rgba(139, 92, 246, 0.6))' : 'none',
      }}
    >
      {/* Arrow */}
      <path
        d="M22 2L11 13"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22 2L15 22L11 13L2 9L22 2Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
});
