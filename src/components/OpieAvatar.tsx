'use client';
import React, { memo } from 'react';
import './OpieAvatar.css';

interface OpieAvatarProps {
  size?: number;
  state?: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
  interactive?: boolean;
  onClick?: () => void;
}

export const OpieAvatar = memo(function OpieAvatar({
  size = 40,
  state = 'idle',
  interactive = false,
  onClick,
}: OpieAvatarProps) {
  return (
    <div
      className={`opie-avatar opie-avatar--${state} ${interactive ? 'opie-avatar--interactive' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
    >
      {/* Aurora gradient ring - rotates slowly */}
      <div className="opie-avatar__aurora" />

      {/* Dark center circle */}
      <div className="opie-avatar__center">
        {/* Core dot - the "eye" */}
        <div className="opie-avatar__core" />
      </div>

      {/* Speaking ripples (only visible in speaking state) */}
      <div className="opie-avatar__ripple opie-avatar__ripple--1" />
      <div className="opie-avatar__ripple opie-avatar__ripple--2" />
      <div className="opie-avatar__ripple opie-avatar__ripple--3" />
    </div>
  );
});

export default OpieAvatar;
