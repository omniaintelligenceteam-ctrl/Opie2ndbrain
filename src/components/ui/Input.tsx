'use client';

import React, { forwardRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error, icon, style, ...rest },
  ref
) {
  const { theme } = useTheme();
  const c = theme.colors;

  const wrapper: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  };

  const input: React.CSSProperties = {
    width: '100%',
    padding: icon ? '12px 16px 12px 40px' : '12px 16px',
    borderRadius: 12,
    border: `1px solid ${error ? c.error + '66' : c.border}`,
    background: 'rgba(255, 255, 255, 0.04)',
    color: c.textPrimary,
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box' as const,
    ...style,
  };

  const iconStyle: React.CSSProperties = {
    position: 'absolute',
    left: 14,
    color: c.textMuted,
    fontSize: '1rem',
    pointerEvents: 'none',
    display: 'flex',
    alignItems: 'center',
  };

  const errorStyle: React.CSSProperties = {
    fontSize: '0.75rem',
    color: c.error,
    marginTop: 4,
  };

  return (
    <div>
      <div style={wrapper}>
        {icon && <span style={iconStyle}>{icon}</span>}
        <input ref={ref} style={input} {...rest} />
      </div>
      {error && <div style={errorStyle}>{error}</div>}
    </div>
  );
});

export default Input;
